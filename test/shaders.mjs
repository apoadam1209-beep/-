// Shader guard.
//
// The headless smoke test uses a stubbed WebGLRenderer, so nothing ever
// compiles GLSL — a typo in an onBeforeCompile injection would sail through
// every test and land on the player's phone as a black floor. This does two
// things no other test can: it proves each string replacement actually matched
// three's real shader source (a silent no-op replace is the classic failure),
// and it parses the injected GLSL for syntax errors.
import * as THREE from 'three';
import { parser } from '@shaderfrog/glsl-parser';

/* Minimal canvas stub: the texture bakery only needs pixel buffers and the
 * gradient/draw API to no-op — we are validating GLSL here, not images. */
const ctx2d = () => ({
  createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
  putImageData() {}, drawImage() {}, fillRect() {}, clearRect() {}, fillText() {},
  beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {}, arc() {},
  save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, setTransform() {},
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
  fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
  globalCompositeOperation: '', imageSmoothingEnabled: true, imageSmoothingQuality: 'high',
});
globalThis.document = {
  createElement: (tag) => (tag === 'canvas'
    ? { width: 1, height: 1, getContext: ctx2d, tagName: 'CANVAS', style: {} }
    : { style: {}, appendChild() {}, setAttribute() {} }),
};

let failures = 0;
const fail = (msg) => { console.log('  ✗ ' + msg); failures++; };
const pass = (msg) => console.log('  ✓ ' + msg);

/* --------------------------------------------------------------------------
 * 1. Every include we splice into must exist in the material three actually
 *    builds, otherwise .replace() quietly does nothing.
 * ------------------------------------------------------------------------ */
const standard = THREE.ShaderLib.standard;
const required = {
  'vertex #include <common>': standard.vertexShader.includes('#include <common>'),
  'vertex #include <begin_vertex>': standard.vertexShader.includes('#include <begin_vertex>'),
  'fragment #include <common>': standard.fragmentShader.includes('#include <common>'),
  'fragment #include <map_fragment>': standard.fragmentShader.includes('#include <map_fragment>'),
  'fragment #include <roughnessmap_fragment>': standard.fragmentShader.includes('#include <roughnessmap_fragment>'),
};
console.log('anchor points in THREE.ShaderLib.standard:');
for (const [name, ok] of Object.entries(required)) (ok ? pass : fail)(name);

/* --------------------------------------------------------------------------
 * 2. Run the real injection against that real source and prove it changed.
 * ------------------------------------------------------------------------ */
const { biomeGroundMaterial } = await import('../src/game/biomes.js');
const { BIOMES } = await import('../src/game/biomes.js');

// biomes.js only needs a canvas for texture baking; give it a tiny stub DOM
// (the smoke test's jsdom is not loaded here).
console.log('\ninjection applied to each biome ground material:');
for (const b of BIOMES) {
  const mat = biomeGroundMaterial(b);
  if (typeof mat.onBeforeCompile !== 'function') { fail(`${b.name}: no onBeforeCompile`); continue; }
  const shader = {
    uniforms: {},
    vertexShader: standard.vertexShader,
    fragmentShader: standard.fragmentShader,
  };
  mat.onBeforeCompile(shader, {});
  const vOk = shader.vertexShader !== standard.vertexShader && shader.vertexShader.includes('vXWorld =');
  const fOk = shader.fragmentShader !== standard.fragmentShader
    && shader.fragmentShader.includes('xfbm(')
    && shader.fragmentShader.includes('roughnessFactor = clamp');
  if (vOk && fOk) pass(`${b.name}`); else fail(`${b.name}: vertex=${vOk} fragment=${fOk}`);

  // 3. syntax-check the injected code on its own, in a minimal valid shader
  if (b.id === 0) {
    const injected = shader.fragmentShader
      .split('#include <common>')[1]
      .split('varying vec3 vXWorld;')[1]
      .split('float xhash')[0];
    void injected;
    const helpers = shader.fragmentShader.slice(
      shader.fragmentShader.indexOf('float xhash'),
      shader.fragmentShader.indexOf('#include <color_fragment>')
    );
    const body = helpers.slice(0, helpers.indexOf('#include <'));
    const probe = `precision highp float;\nvarying vec3 vXWorld;\nuniform float uWear;\n${body}\nvoid main() {\n  float wear = xfbm(vXWorld.xz * 0.035);\n  gl_FragColor = vec4(vec3(wear), 1.0);\n}\n`;
    try {
      parser.parse(probe);
      pass('injected GLSL parses cleanly');
    } catch (err) {
      fail('injected GLSL syntax error: ' + err.message.split('\n')[0]);
    }
  }
}

/* --------------------------------------------------------------------------
 * 4. The colour-grade pass is a full custom shader: parse both stages.
 * ------------------------------------------------------------------------ */
const { GradeShader } = await import('../src/core/grade.js');
console.log('\ncolour grade pass:');
for (const [stage, src] of [['vertex', GradeShader.vertexShader], ['fragment', GradeShader.fragmentShader]]) {
  const prelude = stage === 'fragment' ? 'precision highp float;\n' : 'attribute vec2 uv;\nattribute vec3 position;\nuniform mat4 projectionMatrix;\nuniform mat4 modelViewMatrix;\n';
  try {
    parser.parse(prelude + src);
    pass(`${stage} shader parses`);
  } catch (err) {
    fail(`${stage} shader syntax error: ` + err.message.split('\n')[0]);
  }
}
for (const name of Object.keys(GradeShader.uniforms)) {
  if (name === 'tDiffuse') continue;
  if (!GradeShader.fragmentShader.includes(name)) fail(`uniform ${name} declared but never used`);
}

console.log('\n---------------------------------------------');
if (failures) {
  console.log(`SHADER TEST FAILED ✗  (${failures} problem${failures > 1 ? 's' : ''})`);
  process.exit(1);
}
console.log('SHADER TEST PASSED ✔');
process.exit(0);
