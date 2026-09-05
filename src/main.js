import { Game } from './game/game.js';

const canvas = document.getElementById('game-canvas');
const loadingText = document.getElementById('loading-text');

const steps = [
  'Growing alien tissue…',
  'Baking crystal canyons…',
  'Wiring neon signage…',
  'Seeding the spore jungle…',
  'Tapping the magma core…',
  'Freezing the aurora glacier…',
  'Waking THE REAPER…',
];
let i = 0;
const tick = setInterval(() => {
  i = (i + 1) % steps.length;
  loadingText.textContent = steps[i];
}, 420);

function fail(title, detail) {
  clearInterval(tick);
  loadingText.innerHTML =
    `<b style="color:#ff6b6b">${title}</b><br><small style="opacity:.75">${String(detail).slice(0, 300)}</small>` +
    `<br><br><small>Try another browser (Chrome / Safari) or set Graphics to LOW.</small>`;
}

// nothing may fail silently on a phone we cannot inspect
window.addEventListener('error', (e) => fail('Startup error', e.message || e.error));
window.addEventListener('unhandledrejection', (e) => fail('Startup error', e.reason && e.reason.message));

function boot() {
  // make sure WebGL really exists before we build a world
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl') || probe.getContext('experimental-webgl');
    if (!gl) { fail('WebGL is not available', 'This browser has 3D graphics disabled.'); return; }
  } catch (err) {
    fail('WebGL is not available', err.message);
    return;
  }
  try {
    window.__game = new Game(canvas);
  } catch (err) {
    console.error(err);
    fail('Failed to start', err && err.message);
    return;
  }
  clearInterval(tick);
}

// give the browser one paint for the loader, then build the world
requestAnimationFrame(() => setTimeout(boot, 60));

// keep the page from bouncing / zooming on mobile
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
window.addEventListener('contextmenu', (e) => e.preventDefault());
