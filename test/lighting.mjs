// Lighting budget.
//
// A headless test cannot look at the screen, but it CAN do the arithmetic the
// GPU does. This walks the exact path a ground pixel takes — average baked
// albedo, sRGB->linear, hemisphere + sun + hero light irradiance, the Lambert
// BRDF, three's ACES curve (which includes its /0.6 exposure scale), sRGB
// encode, then the colour-grade contrast — and reports the final 0..255 value.
//
// Why this exists: every biome deck was rendering at roughly RGB(9,5,35) and
// the grade pass crushed that to RGB(2,1,20). The game looked like it was
// running with the lights off, and nothing in the test suite could see it.
import * as THREE from 'three';

const ctx2d = () => ({
  createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
  putImageData(img) { this._last = img; }, drawImage() {}, fillRect() {}, clearRect() {}, fillText() {},
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

const { BIOMES } = await import('../src/game/biomes.js');
const { groundTexture } = await import('../src/core/textures.js');
const { GradeShader } = await import('../src/core/grade.js');
const { normalisedLightRGB } = await import('../src/core/light.js');
const { skyTexture, alienSkin } = await import('../src/core/textures.js');

/* ---------------------------------------------------------------- colour */
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

// three's ACESFilmicToneMapping, verbatim (note the /0.6 exposure scale)
const ACES_IN = [
  [0.59719, 0.35458, 0.04823],
  [0.07600, 0.90834, 0.01566],
  [0.02840, 0.13383, 0.83777],
];
const ACES_OUT = [
  [1.60475, -0.53108, -0.07367],
  [-0.10208, 1.10813, -0.00605],
  [-0.00327, -0.07276, 1.07602],
];
const mul = (m, v) => m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
const rrt = (v) => {
  const a = v * (v + 0.0245786) - 0.000090537;
  const b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
};
function acesFilmic(rgb, exposure) {
  let c = rgb.map((v) => (v * exposure) / 0.6);
  c = mul(ACES_IN, c);
  c = c.map(rrt);
  c = mul(ACES_OUT, c);
  return c.map((v) => Math.min(1, Math.max(0, v)));
}

const hexLinear = (hex) => [
  srgbToLinear(((hex >> 16) & 255) / 255),
  srgbToLinear(((hex >> 8) & 255) / 255),
  srgbToLinear(hex & 255) / 1,
].map((v, i) => (i === 2 ? srgbToLinear((hex & 255) / 255) : v));

/* --------------------------------------------- average albedo of the deck */
const albedoCache = new Map();
function averageAlbedo(b) {
  if (albedoCache.has(b.id)) return albedoCache.get(b.id); // groundTexture caches: only one bake per biome
  // groundTexture writes through putImageData; the stub keeps the last buffer
  const cvs = [];
  const realCreate = globalThis.document.createElement;
  globalThis.document.createElement = (tag) => {
    const el = realCreate(tag);
    if (tag === 'canvas') { const c = el.getContext(); el.getContext = () => c; cvs.push(el); }
    return el;
  };
  groundTexture(200 + b.id, b.ground.style, b.ground.base, b.ground.accent, b.ground.glow);
  globalThis.document.createElement = realCreate;

  const img = cvs.map((c) => c.getContext()._last).find((d) => d && d.width >= 512);
  if (!img) throw new Error('albedo buffer not captured');
  let r = 0, g = 0, bl = 0;
  const n = img.width * img.height;
  for (let i = 0; i < n; i++) {
    r += img.data[i * 4]; g += img.data[i * 4 + 1]; bl += img.data[i * 4 + 2];
  }
  const out = [r / n / 255, g / n / 255, bl / n / 255].map(srgbToLinear);
  albedoCache.set(b.id, out);
  return out;
}

/* ---------------------------------- irradiance arriving from the sky probe */
// The PMREM probe lights every surface. For an up-facing normal the incoming
// irradiance is the mean radiance of the sky's upper hemisphere, so measure it
// straight off the baked equirect rather than guessing.
function skyIrradiance(b, intensity) {
  const cvs = [];
  const realCreate = globalThis.document.createElement;
  globalThis.document.createElement = (tag) => {
    const el = realCreate(tag);
    if (tag === 'canvas') { const c = el.getContext(); el.getContext = () => c; cvs.push(el); }
    return el;
  };
  skyTexture(300 + b.id, ...b.sky, b.stars, b.sunPos, b.skyFeature);
  globalThis.document.createElement = realCreate;
  const img = cvs.map((c) => c.getContext()._last).find((d) => d && d.width >= 1024);
  if (!img) return [0, 0, 0];
  const half = Math.floor(img.height / 2); // above the horizon only
  let r = 0, g = 0, bl = 0, n = 0;
  for (let y = 0; y < half; y++) {
    // cos-weighted: light arriving near the horizon barely reaches a flat deck
    const theta = (y / img.height) * Math.PI;
    const w = Math.cos(theta) * Math.sin(theta);
    if (w <= 0) continue;
    for (let x = 0; x < img.width; x += 4) {
      const i = (y * img.width + x) * 4;
      r += srgbToLinear(img.data[i] / 255) * w;
      g += srgbToLinear(img.data[i + 1] / 255) * w;
      bl += srgbToLinear(img.data[i + 2] / 255) * w;
      n += w;
    }
  }
  if (!n) return [0, 0, 0];
  return [r / n, g / n, bl / n].map((c) => c * Math.PI * intensity);
}

/* ------------------------------------------------------------- the model */
const HERO = { intensity: 6.4, height: 4.4, back: 5.0, color: 0xd6e8ff };

function trackPixel(b, opts = {}) {
  const albedo = opts.albedo || averageAlbedo(b);
  const N = [0, 1, 0]; // the deck faces straight up

  // hemisphere: for an up-facing normal this is the full sky colour
  const hemiC = normalisedLightRGB(b.hemi[0], 1);
  const hemiI = b.hemi[2] * (opts.hemiScale ?? 1);
  let irr = hemiC.map((c) => c * hemiI);

  // sun
  const sp = b.sunPos;
  const len = Math.hypot(sp[0], sp[1], sp[2]);
  const NdotL = Math.max(0, (sp[0] * N[0] + sp[1] * N[1] + sp[2] * N[2]) / len);
  const sunC = normalisedLightRGB(b.sun[0], 1);
  irr = irr.map((c, i) => c + sunC[i] * b.sun[1] * NdotL);

  // hero point light riding behind the runner (physical inverse-square decay)
  const d = Math.hypot(HERO.height, HERO.back);
  const atten = 1 / Math.max(d * d, 1e-4);
  const hNdotL = HERO.height / d;
  const heroC = normalisedLightRGB(opts.heroColor ?? HERO.color, 1);
  const heroI = opts.heroIntensity ?? HERO.intensity;
  irr = irr.map((c, i) => c + heroC[i] * heroI * atten * hNdotL);

  // fill light coming over the player's shoulder
  const fp = [18, 12, 26];
  const fl = Math.hypot(...fp);
  const fillC = normalisedLightRGB(b.accent, 1);
  irr = irr.map((c, i) => c + fillC[i] * 0.35 * (fp[1] / fl));

  // image-based lighting from the biome's own sky
  const env = opts.envIrradiance ?? skyIrradiance(b, opts.envIntensity ?? 0.8);
  irr = irr.map((c, i) => c + env[i]);

  // Lambert
  const radiance = irr.map((c, i) => (c * albedo[i]) / Math.PI);

  const toned = acesFilmic(radiance, opts.exposure ?? 1.5);
  let srgb = toned.map(linearToSrgb);

  if (opts.grade !== false) {
    const contrast = opts.contrast ?? GradeShader.uniforms.uContrast.value;
    const lift = opts.lift ?? GradeShader.uniforms.uLift.value;
    const pivot = opts.pivot ?? GradeShader.uniforms.uPivot.value;
    srgb = srgb.map((c) => Math.max(0, (c - pivot) * contrast + pivot));
    srgb = srgb.map((c) => Math.max(0, c + lift * (1 - c)));
  }
  return { albedo, srgb, bytes: srgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255)) };
}

// CIE L*: perceptual lightness. Plain luma over-weights green and would call a
// saturated red deck "black" purely because it has no green in it.
function lightness(bytes) {
  const lin = bytes.map((v) => srgbToLinear(v / 255));
  const Y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y;
}

export { trackPixel, averageAlbedo, lightness };
if (process.env.XENO_LIGHTING_IMPORT) { /* imported for parameter sweeps */ } else {
/* ------------------------------------- albedo of anything else that matters */
function captureAverage(fn, minWidth) {
  const cvs = [];
  const realCreate = globalThis.document.createElement;
  globalThis.document.createElement = (tag) => {
    const el = realCreate(tag);
    if (tag === 'canvas') { const c = el.getContext(); el.getContext = () => c; cvs.push(el); }
    return el;
  };
  fn();
  globalThis.document.createElement = realCreate;
  const img = cvs.map((c) => c.getContext()._last).find((d) => d && d.width >= minWidth);
  if (!img) throw new Error('buffer not captured');
  let r = 0, g = 0, b = 0;
  const n = img.width * img.height;
  for (let i = 0; i < n; i++) { r += img.data[i * 4]; g += img.data[i * 4 + 1]; b += img.data[i * 4 + 2]; }
  return [r / n / 255, g / n / 255, b / n / 255].map(srgbToLinear);
}

/* ------------------------------------------------------------------ run */
const MIN_L = 30;  // below this the deck reads as black on a phone in daylight
const MAX_L = 74;  // above this it is milky and the neon stops popping

console.log('ground deck as it reaches the eye (0-255 sRGB, after tone map + grade)');
console.log('biome              albedo(lin)        final RGB          L*');
console.log('-----------------------------------------------------------------');
let failures = 0;
for (const b of BIOMES) {
  const { albedo, bytes } = trackPixel(b);
  const luma = lightness(bytes);
  const ok = luma >= MIN_L && luma <= MAX_L;
  if (!ok) failures++;
  console.log(
    `${b.name.padEnd(17)} ` +
    `${albedo.map((v) => v.toFixed(3)).join(' ')}   ` +
    `${bytes.map((v) => String(v).padStart(3)).join(' ')}   ` +
    `${luma.toFixed(0).padStart(4)}  ${ok ? '✓' : '✗ ' + (luma < MIN_L ? 'TOO DARK' : 'BLOWN OUT')}`
  );
}
console.log('-----------------------------------------------------------------');

/* The hero must not be a silhouette. Same lighting rig, the creature's own
 * albedo, and the hero light sits closer to it than to the deck. */
const skinAlbedo = captureAverage(() => alienSkin(), 256);
console.log('\nthe creature against the deck it stands on');
console.log('biome              alien RGB         L*    deck L*   separation');
console.log('-----------------------------------------------------------------');
for (const b of BIOMES) {
  const deckL = lightness(trackPixel(b).bytes);
  const alien = trackPixel(b, { albedo: skinAlbedo, heroIntensity: HERO.intensity * 1.35 });
  const aL = lightness(alien.bytes);
  const sep = Math.abs(aL - deckL);
  const ok = aL >= 26 && sep >= 4;
  if (!ok) failures++;
  console.log(
    `${b.name.padEnd(17)} ${alien.bytes.map((v) => String(v).padStart(3)).join(' ')}   ` +
    `${aL.toFixed(0).padStart(4)}   ${deckL.toFixed(0).padStart(6)}   ${sep.toFixed(0).padStart(6)}  ` +
    `${ok ? '✓' : '✗ ' + (aL < 26 ? 'SILHOUETTE' : 'BLENDS INTO FLOOR')}`
  );
}
console.log('-----------------------------------------------------------------');
console.log(`readable range: deck L* ${MIN_L}..${MAX_L}, alien L* >= 26, separation >= 4`);

/* ---------------------------------------------------- scenery parity check
 * Spore Jungle looked far better than Crystal Canyon for two measurable
 * reasons: it had four times the geometry per site, and its scenery spanned a
 * wide value range (dark trunks, bright caps) against a mid-tone floor, while
 * crystal was pale violet rock on a pale violet floor. Both are checked here so
 * the five worlds cannot drift apart again.
 */
function sceneryStats(b, samples = 40) {
  const pieces = [];
  let tris = 0;
  for (let i = 0; i < samples; i++) {
    b.prop().traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry;
      const t = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      tris += t;
      const m = o.material;
      if (m && m.color) {
        pieces.push({ y: 0.2126 * m.color.r + 0.7152 * m.color.g + 0.0722 * m.color.b, w: t });
      }
    });
  }
  pieces.sort((p, q) => p.y - q.y);
  const total = pieces.reduce((a, p) => a + p.w, 0);
  const at = (frac) => {
    let acc = 0;
    for (const p of pieces) { acc += p.w; if (acc >= total * frac) return p.y; }
    return pieces.length ? pieces[pieces.length - 1].y : 0;
  };
  return { tris: tris / samples, dark: lightness255(at(0.2)), bright: lightness255(at(0.8)) };
}
const lightness255 = (Y) => (Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y);

const MIN_TRIS = 650;     // below this a world feels empty next to its neighbours
const MIN_CONTRAST = 22;  // scenery must sit clearly above or below its floor

console.log('\nscenery parity: is every world as furnished as the best one?');
console.log('biome              tris/site   dark L*  bright L*   vs floor   ');
console.log('-----------------------------------------------------------------');
for (const b of BIOMES) {
  const st = sceneryStats(b);
  const floor = lightness(trackPixel(b).bytes);
  const contrast = Math.max(Math.abs(st.bright - floor), Math.abs(st.dark - floor));
  const ok = st.tris >= MIN_TRIS && contrast >= MIN_CONTRAST;
  if (!ok) failures++;
  console.log(
    `${b.name.padEnd(17)} ${Math.round(st.tris).toString().padStart(9)}   ${st.dark.toFixed(0).padStart(7)}  ` +
    `${st.bright.toFixed(0).padStart(9)}   ${contrast.toFixed(0).padStart(8)}   ` +
    `${ok ? '✓' : '✗ ' + (st.tris < MIN_TRIS ? 'TOO EMPTY' : 'NO CONTRAST')}`
  );
}
console.log('-----------------------------------------------------------------');
console.log(`required: >= ${MIN_TRIS} tris/site, >= ${MIN_CONTRAST} L* against the floor`);
if (failures) {
  console.log(`\nLIGHTING TEST FAILED ✗  (${failures}/${BIOMES.length} biomes unreadable)`);
  process.exit(1);
}
console.log('\nLIGHTING TEST PASSED ✔');
process.exit(0);
}
