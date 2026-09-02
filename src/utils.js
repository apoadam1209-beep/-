/* ===== أدوات مساعدة عامة ===== */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }

// تداخل مستطيلين (أعلى-يسار x,y مع العرض w والارتفاع h)
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
// أصغر فرق زاوي بين زاويتين (-PI..PI)
function angDiff(a, b) {
  var d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}
function dist2(ax, ay, bx, by) {
  var dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

/* ===== رسم مساعد ===== */
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ===== صوت بسيط عبر WebAudio (بلا ملفات) ===== */
var _actx = null;
function audio() {
  if (!_actx) {
    try { _actx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { _actx = null; }
  }
  if (_actx && _actx.state === 'suspended') { _actx.resume(); }
  return _actx;
}
function beep(freq, dur, type, vol) {
  var a = audio(); if (!a) return;
  var o = a.createOscillator(), g = a.createGain();
  o.type = type || 'square'; o.frequency.value = freq;
  g.gain.value = vol || 0.07;
  o.connect(g); g.connect(a.destination);
  var t = a.currentTime;
  o.start(t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.stop(t + dur + 0.02);
}
function sfx(name) {
  switch (name) {
    case 'jump':    beep(420, 0.12, 'square', 0.05); break;
    case 'collect': beep(660, 0.10, 'triangle', 0.08); beep(880, 0.12, 'triangle', 0.06); break;
    case 'cell':    beep(520, 0.12, 'sine', 0.07); break;
    case 'cloak':   beep(300, 0.18, 'sine', 0.05); break;
    case 'morph':   beep(240, 0.20, 'sawtooth', 0.05); break;
    case 'gravity': beep(180, 0.25, 'sawtooth', 0.06); break;
    case 'caught':  beep(140, 0.40, 'sawtooth', 0.09); break;
    case 'win':
      beep(523, 0.15, 'triangle', 0.08);
      setTimeout(function () { beep(659, 0.15, 'triangle', 0.08); }, 150);
      setTimeout(function () { beep(784, 0.32, 'triangle', 0.08); }, 320);
      break;
  }
}

/* ===== نص عربي متعدد الأسطر ===== */
function wrapText(ctx, text, x, y, maxW, lh) {
  var words = text.split(' '), line = '', yy = y;
  for (var i = 0; i < words.length; i++) {
    var test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy); line = words[i]; yy += lh;
    } else { line = test; }
  }
  ctx.fillText(line, x, yy);
}
