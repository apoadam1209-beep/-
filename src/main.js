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

function boot() {
  try {
    window.__game = new Game(canvas);
  } catch (err) {
    console.error(err);
    loadingText.innerHTML = `WebGL failed to start.<br><small>${err.message}</small>`;
    clearInterval(tick);
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
