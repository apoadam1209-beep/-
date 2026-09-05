// Touch-first input, hardened for real phones:
//  · only the first finger is tracked; stray palm/edge contacts are ignored
//  · a lost touchend can never wedge the controls (stale-touch watchdog)
//  · a held drag can fire several swipes in a row for fast double lane changes
//  · full keyboard parity for desktop testing
export class Input {
  constructor(el) {
    this.el = el;
    this.listeners = new Set();
    this.touch = null;
    this.usingTouch = false;
    this.SWIPE = 24;
    this.TAP_MS = 320;
    this.STALE_MS = 2000;

    el.addEventListener('touchstart', (e) => this._start(e), { passive: false });
    el.addEventListener('touchmove', (e) => this._move(e), { passive: false });
    el.addEventListener('touchend', (e) => this._end(e), { passive: false });
    el.addEventListener('touchcancel', (e) => this._cancel(e), { passive: false });

    // mouse fallback (desktop only — disabled as soon as a real touch appears)
    el.addEventListener('mousedown', (e) => {
      if (this.usingTouch) return;
      this.touch = { x: e.clientX, y: e.clientY, t: performance.now(), fired: false, id: 'mouse' };
    });
    el.addEventListener('mousemove', (e) => {
      if (this.usingTouch || !this.touch) return;
      this._delta(e.clientX, e.clientY);
    });
    el.addEventListener('mouseup', () => {
      if (this.usingTouch || !this.touch) return;
      if (!this.touch.fired && performance.now() - this.touch.t < this.TAP_MS) this.emit('phase');
      this.touch = null;
    });

    // a finger that never reports its end must not wedge the controls
    window.addEventListener('blur', () => { this.touch = null; });

    window.addEventListener('keydown', (e) => this._key(e));
  }

  on(fn) { this.listeners.add(fn); }

  emit(a) {
    for (const l of this.listeners) {
      try { l(a); } catch (err) { console.error('input handler failed', err); }
    }
  }

  _find(list, id) {
    for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i];
    return null;
  }

  _start(e) {
    e.preventDefault();
    const now = performance.now();
    // drop a stale finger (a touchend we never received) and take the new one
    if (this.touch && now - this.touch.t > this.STALE_MS) this.touch = null;
    if (this.touch) return; // already tracking one finger — ignore extra contacts
    this.usingTouch = true;
    const t = e.changedTouches[0];
    if (!t) return;
    this.touch = { x: t.clientX, y: t.clientY, t: now, fired: false, id: t.identifier };
  }

  _delta(x, y) {
    if (!this.touch) return;
    const dx = x - this.touch.x;
    const dy = y - this.touch.y;
    if (Math.abs(dx) < this.SWIPE && Math.abs(dy) < this.SWIPE) return;
    this.touch.fired = true;
    // re-arm from the new origin so a long drag can chain swipes
    this.touch.x = x;
    this.touch.y = y;
    if (Math.abs(dx) > Math.abs(dy)) this.emit(dx > 0 ? 'right' : 'left');
    else this.emit(dy > 0 ? 'slide' : 'jump');
  }

  _move(e) {
    e.preventDefault();
    if (!this.touch) return;
    const t = this._find(e.changedTouches, this.touch.id);
    if (!t) return;
    this._delta(t.clientX, t.clientY);
  }

  _end(e) {
    e.preventDefault();
    if (!this.touch) return;
    const mine = this._find(e.changedTouches, this.touch.id);
    // if our finger lifted — or the screen is empty again — release the gesture
    if (!mine && e.touches.length > 0) return;
    if (!this.touch.fired && performance.now() - this.touch.t < this.TAP_MS) this.emit('phase');
    this.touch = null;
  }

  _cancel(e) {
    if (e && e.cancelable) e.preventDefault();
    this.touch = null;
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
