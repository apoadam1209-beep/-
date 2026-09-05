import { Game } from './game/game.js';

const canvas = document.getElementById('game-canvas');
const loadingText = document.getElementById('loading-text');

/* ------------------------------------------------------------ error bar */
const bar = document.createElement('div');
bar.id = 'error-bar';
bar.style.cssText = [
  'position:fixed', 'left:0', 'right:0', 'top:0', 'z-index:9999', 'display:none',
  'padding:calc(10px + env(safe-area-inset-top,0px)) 14px 10px', 'background:rgba(150,10,10,.94)',
  'color:#fff', 'font:600 13px/1.35 system-ui,sans-serif', 'text-align:center',
  'box-shadow:0 6px 24px rgba(0,0,0,.5)',
].join(';');
bar.addEventListener('pointerdown', () => { bar.style.display = 'none'; });
document.body.appendChild(bar);

window.__xenoError = (title, detail) => {
  bar.innerHTML = `<b>${title}</b><br><span style="opacity:.85;font-weight:500">${String(detail || '').slice(0, 220)}</span><br><small style="opacity:.7">tap to dismiss</small>`;
  bar.style.display = 'block';
};
window.__xenoHideError = () => { bar.style.display = 'none'; };

/* ------------------------------------------------- optional diagnostics */
let diag = null;
if (/[?&](debug|diag)=1/.test(location.search)) {
  diag = document.createElement('div');
  diag.style.cssText = [
    'position:fixed', 'left:50%', 'transform:translateX(-50%)',
    'top:calc(4px + env(safe-area-inset-top,0px))', 'z-index:9998',
    'padding:5px 10px', 'border-radius:8px', 'background:rgba(0,0,0,.72)', 'color:#7cffea',
    'font:600 10px/1.4 ui-monospace,monospace', 'pointer-events:none', 'white-space:nowrap',
  ].join(';');
  document.body.appendChild(diag);
  window.__xenoDiag = (d) => {
    diag.textContent = `${d.state} ${d.fps}fps ${d.dt}ms ts${d.ts} v${d.speed} ${d.dist}m ${d.q} obj${d.live} [${d.act}]`;
  };
}

/* ---------------------------------------------------------- boot loader */
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
  window.__xenoError(title, detail);
}

// nothing may fail silently on a phone we cannot inspect
window.addEventListener('error', (e) => {
  const msg = e.message || (e.error && e.error.message) || 'unknown';
  if (window.__game) window.__xenoError('Runtime error', msg);
  else fail('Startup error', msg);
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = (e.reason && (e.reason.message || e.reason)) || 'unknown';
  if (window.__game) window.__xenoError('Runtime error', msg);
  else fail('Startup error', msg);
});

function boot() {
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
