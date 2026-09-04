export class Input {
  constructor(game) {
    this.game = game;
    this.state = {
      swiping: false,
      startX: 0,
      startY: 0,
      startT: 0,
    };

    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    window.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onUp(e));

    // robust mobile touch support
    window.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      this.onDown({ target: e.target, clientX: t.clientX, clientY: t.clientY, preventDefault: () => e.preventDefault() });
    }, { passive: false });
    window.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      const ev = { clientX: t.clientX, clientY: t.clientY };
      this.onMove(ev);
    }, { passive: true });
    window.addEventListener('touchend', () => this.onUp());
  }

  onKey(e) {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.game.moveLane(-1);
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.game.moveLane(1);
        break;
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        e.preventDefault();
        this.game.jump();
        break;
      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        this.game.slide(true);
        break;
      case 'Digit1':
        this.game.setForm('plasma');
        break;
      case 'Digit2':
        this.game.setForm('crystal');
        break;
      case 'Digit3':
        this.game.setForm('shadow');
        break;
      default:
        break;
    }
  }

  onKeyUp(e) {
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      this.game.slide(false);
    }
  }

  onDown(e) {
    if (e.target && e.target.closest && e.target.closest('button')) return;
    this.state.swiping = true;
    this.state.startX = e.clientX;
    this.state.startY = e.clientY;
    this.state.startT = performance.now();
  }

  onMove(e) {
    if (!this.state.swiping) return;
    const dx = e.clientX - this.state.startX;
    const dy = e.clientY - this.state.startY;
    if (Math.abs(dx) > 40 || Math.abs(dy) > 40) {
      this.state.swiping = false;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.game.moveLane(dx > 0 ? 1 : -1);
      } else {
        if (dy < 0) {
          this.game.jump();
        } else {
          this.game.slide(true);
          setTimeout(() => this.game.slide(false), 650);
        }
      }
    }
  }

  onUp() {
    this.state.swiping = false;
  }
}
