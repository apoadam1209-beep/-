/* ===== مدير الإدخال: لمس (الموبايل) + لوحة مفاتيح (للاختبار) ===== */
class Input {
  constructor() {
    this.left = false;
    this.right = false;
    this.cloakHeld = false;
    this._jump = false;
    this._morph = false;
    this._gravity = false;
    this._bindKeyboard();
    this._bindButtons();
  }

  _bindButton(id, onDown, onUp) {
    var el = document.getElementById(id);
    if (!el) return;
    var down = function (e) { e.preventDefault(); if (onDown) onDown(); };
    var up = function (e) { e.preventDefault(); if (onUp) onUp(); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('pointercancel', up);
  }

  _bindButtons() {
    var self = this;
    this._bindButton('btn-left',  function () { self.left = true; },  function () { self.left = false; });
    this._bindButton('btn-right', function () { self.right = true; }, function () { self.right = false; });
    this._bindButton('btn-jump',  function () { self._jump = true; }, null);
    this._bindButton('btn-cloak', function () { self.cloakHeld = true; }, function () { self.cloakHeld = false; });
    this._bindButton('btn-morph', function () { self._morph = true; }, null);
    this._bindButton('btn-gravity', function () { self._gravity = true; }, null);
  }

  _bindKeyboard() {
    var self = this;
    window.addEventListener('keydown', function (e) {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': self.left = true; break;
        case 'ArrowRight': case 'KeyD': self.right = true; break;
        case 'Space': case 'ArrowUp': case 'KeyW': self._jump = true; break;
        case 'KeyJ': self.cloakHeld = true; break;
        case 'KeyK': self._morph = true; break;
        case 'KeyL': self._gravity = true; break;
      }
    });
    window.addEventListener('keyup', function (e) {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': self.left = false; break;
        case 'ArrowRight': case 'KeyD': self.right = false; break;
        case 'KeyJ': self.cloakHeld = false; break;
      }
    });
  }

  consumeJump()    { var v = this._jump;    this._jump = false;    return v; }
  consumeMorph()   { var v = this._morph;   this._morph = false;   return v; }
  consumeGravity() { var v = this._gravity; this._gravity = false; return v; }
}
