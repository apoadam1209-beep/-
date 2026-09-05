// Headless smoke test: boots the real Game class against a jsdom DOM with a
// stubbed 2D canvas + stubbed WebGL renderer, then simulates thousands of
// frames of play (with inputs, biome warps, mutations, flips) looking for
// runtime errors. Run with: npm run test:smoke
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

/* ------------------------------------------------- mirror src with a shim */
const tmp = '/tmp/xenorun-test';
fs.rmSync(tmp, { recursive: true, force: true });
fs.cpSync(path.join(root, 'src'), path.join(tmp, 'src'), { recursive: true });
fs.writeFileSync(path.join(tmp, 'three-shim.js'), `
export * from '${path.join(root, 'node_modules/three/build/three.module.js')}';
import * as REAL from '${path.join(root, 'node_modules/three/build/three.module.js')}';
export class WebGLRenderer {
  constructor(opts = {}) {
    this.domElement = opts.canvas || { width: 1, height: 1, style: {} };
    this.shadowMap = { enabled: false, type: 0 };
    this.capabilities = { isWebGL2: true, maxTextureSize: 4096, getMaxAnisotropy: () => 8 };
    this.info = { render: {}, memory: {} };
    this._pr = 1; this._w = 800; this._h = 600;
    this.outputColorSpace = ''; this.toneMapping = 0; this.toneMappingExposure = 1;
    this.autoClear = true;
  }
  setPixelRatio(v) { this._pr = v; }
  getPixelRatio() { return this._pr; }
  setSize(w, h) { this._w = w; this._h = h; }
  getSize(t) { if (t && t.set) t.set(this._w, this._h); return t || { width: this._w, height: this._h }; }
  getDrawingBufferSize(t) { if (t && t.set) t.set(this._w * this._pr, this._h * this._pr); return t; }
  getContext() { return {}; }
  getRenderTarget() { return null; }
  setRenderTarget() {}
  getClearColor(t) { return t; }
  getClearAlpha() { return 1; }
  setClearColor() {}
  clear() {}
  render() { this.renders = (this.renders || 0) + 1; }
  compile() {}
  dispose() {}
}
`);

// rewrite bare 'three' imports inside the copied tree
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!p.endsWith('.js')) continue;
    let s = fs.readFileSync(p, 'utf8');
    s = s.replace(/from 'three\/examples\/jsm\/(.*?)'/g,
      `from '${path.join(root, 'node_modules/three/examples/jsm')}/$1'`);
    s = s.replace(/from 'three'/g, `from '${path.join(tmp, 'three-shim.js')}'`);
    fs.writeFileSync(p, s);
  }
}
walk(path.join(tmp, 'src'));
// postprocessing modules also import bare 'three' — patch a local copy path map
const ppDir = path.join(root, 'node_modules/three/examples/jsm');
// (they resolve 'three' fine from node_modules, using the real renderer class only at runtime)

/* ---------------------------------------------------------------- the DOM */
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dom = new JSDOM(html, { pretendToBeVisual: false, url: 'https://xeno.test/' });
const { window } = dom;

function fakeCtx(canvas) {
  const ctx = {
    canvas,
    fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, lineWidth: 1, font: '',
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: () => {},
    fillRect: () => {}, clearRect: () => {}, strokeRect: () => {},
    beginPath: () => {}, closePath: () => {}, moveTo: () => {}, lineTo: () => {},
    arc: () => {}, ellipse: () => {}, rect: () => {}, fill: () => {}, stroke: () => {},
    save: () => {}, restore: () => {}, translate: () => {}, rotate: () => {}, scale: () => {},
    drawImage: () => {}, measureText: () => ({ width: 10 }), fillText: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createPattern: () => ({}),
  };
  return ctx;
}
window.HTMLCanvasElement.prototype.getContext = function (type) {
  if (type === '2d') { this.__ctx ||= fakeCtx(this); return this.__ctx; }
  return null;
};

let now = 0;
let rafCb = null;
window.requestAnimationFrame = (cb) => { rafCb = cb; return 1; };
window.cancelAnimationFrame = () => {};
Object.defineProperty(window, 'performance', { value: { now: () => now }, configurable: true });
Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
Object.defineProperty(window.navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17) Mobile', configurable: true });

const def = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
def('window', window);
def('document', window.document);
def('navigator', window.navigator);
def('performance', window.performance);
def('requestAnimationFrame', window.requestAnimationFrame);
def('localStorage', window.localStorage);
def('HTMLCanvasElement', window.HTMLCanvasElement);
def('Image', window.Image);
def('self', window);
Object.defineProperty(window, 'innerWidth', { value: 412, configurable: true });
Object.defineProperty(window, 'innerHeight', { value: 915, configurable: true });

const errors = [];
const origError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(' ')); origError(...a); };

/* -------------------------------------------------------------- run it */
const { Game } = await import(path.join(tmp, 'src/game/game.js'));
const canvas = window.document.getElementById('game-canvas');
const game = new Game(canvas);

function step(dt = 1 / 60) {
  now += dt * 1000;
  if (!rafCb) throw new Error('no animation frame scheduled');
  const cb = rafCb;
  rafCb = null;
  cb(now);
}

step(); // first frame in menu
console.log('state after boot:', game.state);

game.startRun();
game.beginAfterTutorial?.();
if (game.state === 'ready') game.onAction('jump');
console.log('state after start:', game.state);

const actions = ['left', 'right', 'jump', 'slide', 'phase', 'overdrive'];
let mutationPicks = 0;
let flips = 0;
let maxActive = 0;
const seenBiomes = new Set();

// Phase A — mortal random bot (exercises damage, death, restart)
for (let i = 0; i < 6000; i++) {
  step();
  if (game.state === 'mutation') {
    const card = window.document.querySelector('#mut-cards .mut-card');
    if (card) { card.onclick(); mutationPicks++; }
  }
  if (game.state === 'over') {
    console.log(`run ended at frame ${i} (distance ${Math.round(game.distance)}m)`);
    game.startRun();
    if (game.state === 'ready') game.onAction('jump');
  }
  if (i % 23 === 0) game.onAction(actions[(Math.random() * actions.length) | 0]);
  if (i % 7 === 0 && game.state === 'running') game.onAction(Math.random() < 0.5 ? 'jump' : 'slide');
  if (game.p?.flip) flips++;
  maxActive = Math.max(maxActive, game.pool.active.length);
  seenBiomes.add(game.world.biome.id);
}

// Phase B — immortal endurance bot: reach every biome, every corridor type
game.startRun();
if (game.state === 'ready') game.onAction('jump');
game.damage = () => {};
game.hunter.caught = () => false;
for (let i = 0; i < 60 * 420; i++) {
  step();
  if (game.state === 'mutation') {
    const card = window.document.querySelector('#mut-cards .mut-card');
    if (card) { card.onclick(); mutationPicks++; }
  }
  if (i % 19 === 0) game.onAction(actions[(Math.random() * actions.length) | 0]);
  if (i % 5 === 0) game.onAction(Math.random() < 0.5 ? 'jump' : 'slide');
  if (game.p?.flip) flips++;
  maxActive = Math.max(maxActive, game.pool.active.length);
  seenBiomes.add(game.world.biome.id);
}

// ---- framing check: is the hero actually well framed on screen? ----------
{
  const THREE = await import(path.join(tmp, 'three-shim.js'));
  game.camera.updateMatrixWorld(true);
  game.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(game.alien.rig);
  const size = new THREE.Vector3(); box.getSize(size);
  const corners = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    corners.push(new THREE.Vector3(x, y, z).project(game.camera));
  }
  const nx = corners.map(c => c.x), ny = corners.map(c => c.y);
  const minX = Math.min(...nx), maxX = Math.max(...nx), minY = Math.min(...ny), maxY = Math.max(...ny);
  console.log('alien size (m)   :', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2));
  console.log('alien NDC x      :', minX.toFixed(2), '→', maxX.toFixed(2));
  console.log('alien NDC y      :', minY.toFixed(2), '→', maxY.toFixed(2));
  console.log('screen coverage  :', (((maxY - minY) / 2) * 100).toFixed(1) + '% of height,',
    (((maxX - minX) / 2) * 100).toFixed(1) + '% of width');
  const bodyBox = new THREE.Box3().setFromObject(game.alien.hips);
  const bs = new THREE.Vector3(); bodyBox.getSize(bs);
  console.log('creature body    :', bs.x.toFixed(2), 'x', bs.y.toFixed(2), 'x', bs.z.toFixed(2), 'm');
  const hunterBox = new THREE.Box3().setFromObject(game.hunter.group);
  const hc = new THREE.Vector3(); hunterBox.getCenter(hc); hc.project(game.camera);
  console.log('reaper NDC       :', hc.x.toFixed(2), hc.y.toFixed(2), 'depth', hc.z.toFixed(3));
  const near = game.pool.active.filter(e => e.mesh.position.z < game.p.z && e.mesh.position.z > game.p.z - 120).length;
  console.log('objects ahead    :', near);
}

console.log('---------------------------------------------');
console.log('frames simulated :', 6000 + 60 * 420);
console.log('state            :', game.state);
console.log('distance         :', Math.round(game.distance), 'm');
console.log('score            :', Math.round(game.score));
console.log('orbs             :', game.orbs);
console.log('integrity        :', game.integrity, '/', game.maxIntegrity);
console.log('mutations picked :', mutationPicks);
console.log('inverted frames  :', flips);
console.log('max live objects :', maxActive);
console.log('biomes visited   :', [...seenBiomes].sort().join(', '));
console.log('renderer draws   :', game.renderer.renders);
console.log('scene children   :', game.scene.children.length);
console.log('console errors   :', errors.length);
console.log('---------------------------------------------');

if (errors.length) { console.log(errors.slice(0, 5)); process.exit(1); }
if (seenBiomes.size < 5) { console.log('FAIL: not all biomes reached'); process.exit(1); }
if (maxActive > 900) { console.log('FAIL: entity leak'); process.exit(1); }
console.log('SMOKE TEST PASSED ✔');
process.exit(0); // background timers (biome prebake) would otherwise hold the loop
