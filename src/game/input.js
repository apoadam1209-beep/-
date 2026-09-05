// Touch-first input: swipes for movement, tap for phase shift, plus full
// keyboard parity for desktop testing.
export class Input {
  constructor(el) {
    this.el = el;
    this.listeners = new Set();
    this.touch = null;
    this.SWIPE = 26;

    el.addEventListener('touchstart', (e) => this._start(e), { passive: false });
    el.addEventListener('touchmove', (e) => this._move(e), { passive: false });
    el.addEventListener('touchend', (e) => this._end(e), { passive: false });
    el.addEventListener('touchcancel', () => { this.touch = null; }, { passive: true });

    // mouse fallback
    el.addEventListener('mousedown', (e) => {
      this.touch = { x: e.clientX, y: e.clientY, t: performance.now(), fired: false, id: 'm' };
    });
    el.addEventListener('mousemove', (e) => {
      if (this.touch) this._delta(e.clientX, e.clientY);
    });
    el.addEventListener('mouseup', () => {
      if (this.touch && !this.touch.fired && performance.now() - this.touch.t < 320) this.emit('phase');
      this.touch = null;
    });

    window.addEventListener('keydown', (e) => this._key(e));
  }

  on(fn) { this.listeners.add(fn); }
  emit(a) { for (const l of this.listeners) l(a); }

  _start(e) {
    if (e.touches.length >= 2) { this.emit('overdrive'); this.touch = null; return; }
    const t = e.changedTouches[0];
    this.touch = { x: t.clientX, y: t.clientY, t: performance.now(), fired: false, id: t.identifier };
    e.preventDefault();
  }

  _delta(x, y) {
    if (!this.touch || this.touch.fired) return;
    const dx = x - this.touch.x;
    const dy = y - this.touch.y;
    if (Math.abs(dx) < this.SWIPE && Math.abs(dy) < this.SWIPE) return;
    this.touch.fired = true;
    if (Math.abs(dx) > Math.abs(dy)) this.emit(dx > 0 ? 'right' : 'left');
    else this.emit(dy > 0 ? 'slide' : 'jump');
  }

  _move(e) {
    if (!this.touch) return;
    const t = [...e.changedTouches].find((c) => c.identifier === this.touch.id);
    if (!t) return;
    this._delta(t.clientX, t.clientY);
    e.preventDefault();
  }

  _end(e) {
    if (!this.touch) return;
    const t = [...e.changedTouches].find((c) => c.identifier === this.touch.id);
    if (!t) return;
    if (!this.touch.fired && performance.now() - this.touch.t < 320) this.emit('phase');
    this.touch = null;
    e.preventDefault();
  }

  _key(e) {
    const map = {
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
      ArrowDown: 'slide', KeyS: 'slide',
      KeyF: 'phase', ShiftLeft: 'phase', KeyE: 'phase',
      KeyQ: 'overdrive', KeyR: 'overdrive',
      Escape: 'pause', KeyP: 'pause',
      Enter: 'confirm',
    };
    const a = map[e.code];
    if (a) { e.preventDefault(); this.emit(a); }
  }
}
