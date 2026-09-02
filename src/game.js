/* ===== اللعبة الرئيسية: الحلقة، المشاهد، الرسم ===== */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input();
    this.state = 'title';          // title | play | win | lose
    this.W = 0; this.H = 0; this.dpr = 1;
    this.lives = 3; this.score = 0; this.detection = 0; this.alertT = 0;
    this.time = 0; this.collected = 0; this.totalParts = 0;
    this.player = null; this.level = null;

    this._resize();
    var self = this;
    window.addEventListener('resize', function () { self._resize(); });
    this.canvas.addEventListener('pointerdown', function (e) { self._onTap(e); });

    this.last = performance.now();
    requestAnimationFrame(function (t) { self._frame(t); });
  }

  _resize() {
    var w = window.innerWidth, h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    if (!this.H) { this.H = h; this.W = w; this._build(); }
    else { this.W = w; }
  }

  _build() {
    this.level = buildLevel(this.H);
    this.totalParts = this.level.parts.length;
    this.player = new Player(this.level.spawn.x, this.level.spawn.y);
  }

  startGame() {
    audio();
    this._build();
    this.lives = 3; this.score = 0; this.detection = 0;
    this.time = 0; this.collected = 0;
    this.state = 'play';
  }

  respawn() {
    sfx('caught');
    this.lives--;
    if (this.lives <= 0) { this.state = 'lose'; return; }
    this.detection = 0;
    this.player.x = this.level.spawn.x;
    this.player.y = this.level.spawn.y;
    this.player.vx = 0; this.player.vy = 0;
    this.player.gravityDir = 1;
    this.player.energy = this.player.maxEnergy;
    this.player.morphed = false; this.player.cloaked = false;
  }

  _onTap() {
    audio();
    if (this.state === 'title' || this.state === 'win' || this.state === 'lose') {
      this.startGame();
    }
  }

  _frame(now) {
    var dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.033) dt = 0.033;
    this.update(dt);
    this.render();
    var self = this;
    requestAnimationFrame(function (t) { self._frame(t); });
  }

  update(dt) {
    this.time += dt;
    if (this.state !== 'play') return;
    var pl = this.player, L = this.level;

    pl.update(dt, this.input, L, this);
    var i;
    for (i = 0; i < L.humans.length; i++) L.humans[i].update(dt, pl);
    for (i = 0; i < L.cams.length; i++) L.cams[i].update(dt, pl);

    var pc = pl.center();
    for (i = 0; i < L.parts.length; i++) {
      var p = L.parts[i];
      if (!p.collected) {
        p.update(dt);
        if (dist2(pc.x, pc.y, p.x, p.y) < (p.r + 22) * (p.r + 22)) {
          p.collected = true; this.collected++; this.score += 100; sfx('collect');
        }
      }
    }
    for (i = 0; i < L.cells.length; i++) {
      var c = L.cells[i];
      if (!c.taken) {
        c.update(dt);
        if (dist2(pc.x, pc.y, c.x, c.y) < (c.r + 22) * (c.r + 22)) {
          c.taken = true;
          pl.energy = Math.min(pl.maxEnergy, pl.energy + 45);
          this.score += 20; sfx('cell');
        }
      }
    }

    // كشف البشر/الكاميرات
    var spotted = false;
    for (i = 0; i < L.humans.length; i++) if (L.humans[i].seeing) spotted = true;
    for (i = 0; i < L.cams.length; i++) if (L.cams[i].seeing) spotted = true;
    if (spotted) { this.detection = Math.min(100, this.detection + 55 * dt); this.alertT = 0.25; }
    else { this.detection = Math.max(0, this.detection - 30 * dt); }
    if (this.alertT > 0) this.alertT -= dt;
    if (this.detection >= 100) { this.respawn(); return; }

    if (this.collected >= this.totalParts) { this.state = 'win'; sfx('win'); }
  }

  /* ===================== الرسم ===================== */
  render() {
    var ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    this._drawBg(ctx);
    if (this.state === 'title') { this._drawTitle(ctx); return; }

    var camX = clamp(this.player.x + this.player.w / 2 - this.W * 0.42, 0,
                     Math.max(0, this.level.worldW - this.W));
    ctx.save();
    ctx.translate(-camX, 0);
    this._drawWorld(ctx);
    ctx.restore();

    this._drawHud(ctx);
    if (this.state === 'win') this._drawWin(ctx);
    if (this.state === 'lose') this._drawLose(ctx);
  }

  _drawBg(ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, '#0a1030');
    g.addColorStop(0.6, '#161a3a');
    g.addColorStop(1, '#241b3a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (var i = 0; i < 70; i++) {
      var sx = (i * 137.5) % this.W;
      var sy = (i * 89.3) % (this.H * 0.6);
      var tw = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 2 + i));
      ctx.globalAlpha = tw * 0.8;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;

    var off = (this.player ? this.player.x : 0) * 0.15;
    ctx.fillStyle = 'rgba(40,30,70,0.6)';
    for (var k = -1; k < this.W / 200 + 2; k++) {
      var hx = k * 200 - (off % 200);
      ctx.beginPath();
      ctx.arc(hx + 100, this.H, 170, Math.PI, 0);
      ctx.fill();
    }
  }

  _drawWorld(ctx) {
    var L = this.level, i, p;
    // المنصّات
    for (i = 0; i < L.platforms.length; i++) {
      p = L.platforms[i];
      ctx.fillStyle = '#23304d';
      roundRect(ctx, p.x, p.y, p.w, p.h, 6); ctx.fill();
      ctx.fillStyle = '#3a7d44';
      ctx.fillRect(p.x, p.y, p.w, 8);
    }
    // السفينة
    this._drawShip(ctx, L.ship.x, L.ship.y);
    // أجزاء السفينة
    for (i = 0; i < L.parts.length; i++) {
      var pt = L.parts[i]; if (pt.collected) continue;
      var yy = pt.y + Math.sin(pt.t * 2) * 4;
      ctx.save();
      ctx.translate(pt.x, yy); ctx.rotate(pt.t * 0.8);
      ctx.fillStyle = '#ffd24a'; ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(0, 0, pt.r, 0, 7); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#7a5a00';
      for (var s = 0; s < 6; s++) {
        var a = s / 6 * Math.PI * 2;
        ctx.fillRect(Math.cos(a) * pt.r - 2, Math.sin(a) * pt.r - 2, 4, 10);
      }
      ctx.restore();
    }
    // خلايا الطاقة
    for (i = 0; i < L.cells.length; i++) {
      var c = L.cells[i]; if (c.taken) continue;
      var cy = c.y + Math.sin(c.t * 2.4) * 4;
      ctx.save();
      ctx.translate(c.x, cy);
      ctx.fillStyle = '#39d0ff'; ctx.shadowColor = '#39d0ff'; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, -c.r); ctx.lineTo(c.r, 0); ctx.lineTo(0, c.r); ctx.lineTo(-c.r, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // البشر
    for (i = 0; i < L.humans.length; i++) this._drawHuman(ctx, L.humans[i]);
    // الكاميرات
    for (i = 0; i < L.cams.length; i++) this._drawCam(ctx, L.cams[i]);
    // اللاعب
    this._drawPlayer(ctx);
  }

  _drawShip(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#9aa7c7';
    ctx.beginPath(); ctx.ellipse(0, 30, 72, 22, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#dfe6f5';
    ctx.beginPath(); ctx.ellipse(0, 18, 34, 20, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd24a';
    for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 22, 30, 4, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  _drawHuman(ctx, h) {
    var ex = h.x + h.w / 2, ey = h.y + 12;
    var base = h.dir > 0 ? 0 : Math.PI;
    var a0 = base - h.fov, a1 = base + h.fov;
    ctx.fillStyle = h.seeing ? 'rgba(255,60,60,0.22)' : 'rgba(255,200,80,0.10)';
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.arc(ex, ey, h.visionRange, a0, a1);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#3b5bdb';
    ctx.fillRect(h.x + 4, h.y + 18, h.w - 8, h.h - 26);
    ctx.fillStyle = '#ffd9a0';
    ctx.beginPath(); ctx.arc(ex, h.y + 12, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(h.x + (h.dir > 0 ? h.w - 14 : 6), h.y + 22, 8, 10);
  }

  _drawCam(ctx, c) {
    var a0 = c.angle - c.fov, a1 = c.angle + c.fov;
    ctx.fillStyle = c.seeing ? 'rgba(255,60,60,0.22)' : 'rgba(120,200,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.arc(c.x, c.y, c.range, a0, a1);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#444'; ctx.fillRect(c.x - 12, c.y - 8, 24, 16);
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = c.seeing ? '#ff5050' : '#88c0ff'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x + Math.cos(c.angle) * 14, c.y + Math.sin(c.angle) * 14);
    ctx.stroke();
  }

  _drawPlayer(ctx) {
    var pl = this.player;
    ctx.save();
    if (pl.morphed) {
      ctx.fillStyle = '#a9743b'; ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      ctx.strokeStyle = '#6e4a22'; ctx.lineWidth = 3; ctx.strokeRect(pl.x + 2, pl.y + 2, pl.w - 4, pl.h - 4);
      ctx.beginPath();
      ctx.moveTo(pl.x, pl.y); ctx.lineTo(pl.x + pl.w, pl.y + pl.h);
      ctx.moveTo(pl.x + pl.w, pl.y); ctx.lineTo(pl.x, pl.y + pl.h);
      ctx.stroke();
    } else {
      this._drawAlien(ctx, pl.x, pl.y, pl.w, pl.h, pl.facing, pl.animT, pl.cloaked);
    }
    if (pl.gravityDir === -1) {
      ctx.fillStyle = 'rgba(120,255,200,0.9)';
      ctx.font = '14px sans-serif';
      ctx.fillText('🌀', pl.x - 2, pl.y - 6);
    }
    ctx.restore();
  }

  _drawAlien(ctx, x, y, w, h, facing, t, cloaked) {
    ctx.save();
    ctx.globalAlpha = cloaked ? 0.28 : 1;
    var cx = x + w / 2, cy = y + h / 2;
    // جسم
    ctx.fillStyle = '#7CFFB2';
    ctx.beginPath(); ctx.ellipse(cx, cy + 4, w / 2, h / 2 - 2, 0, 0, 7); ctx.fill();
    // بطن
    ctx.fillStyle = '#bfffd9';
    ctx.beginPath(); ctx.ellipse(cx, cy + 10, w / 3, h / 3, 0, 0, 7); ctx.fill();
    // هوائيات
    ctx.strokeStyle = '#7CFFB2'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 6, y + 4); ctx.lineTo(cx - 10, y - 8);
    ctx.moveTo(cx + 6, y + 4); ctx.lineTo(cx + 10, y - 8);
    ctx.stroke();
    ctx.fillStyle = '#ff7ce0';
    ctx.beginPath(); ctx.arc(cx - 10, y - 9, 3, 0, 7); ctx.arc(cx + 10, y - 9, 3, 0, 7); ctx.fill();
    // عيون
    var ex = facing >= 0 ? 4 : -4;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(cx + ex - 6, cy - 2, 6, 8, 0, 0, 7);
    ctx.ellipse(cx + ex + 6, cy - 2, 6, 8, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(cx + ex - 6 + facing * 2, cy - 1, 3, 0, 7);
    ctx.arc(cx + ex + 6 + facing * 2, cy - 1, 3, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  /* ===================== HUD ===================== */
  _bar(ctx, x, y, w, h, frac, color, label) {
    frac = clamp(frac, 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w * frac, h, h / 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif';
    ctx.fillText(label, x + 6, y + h - 3);
  }

  _drawHud(ctx) {
    ctx.fillStyle = 'rgba(8,12,28,0.55)';
    ctx.fillRect(0, 0, this.W, 84);
    var pad = 12, y = 14, bw = this.W * 0.42;
    this._bar(ctx, pad, y, bw, 14, this.collected / this.totalParts, '#ffd24a',
              'الإصلاح ' + this.collected + '/' + this.totalParts);
    this._bar(ctx, pad, y + 26, bw, 14, this.player.energy / this.player.maxEnergy, '#39d0ff', 'الطاقة');
    this._bar(ctx, pad, y + 52, bw, 14, this.detection / 100,
              this.detection > 60 ? '#ff5050' : '#ff9f43', 'الكشف');

    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('النقاط: ' + this.score, this.W - pad, y + 14);
    ctx.fillText('المحاولات: ' + this.lives, this.W - pad, y + 40);
    ctx.textAlign = 'left';

    if (this.alertT > 0) {
      ctx.fillStyle = 'rgba(255,40,40,' + (0.3 + 0.3 * Math.sin(this.time * 30)) + ')';
      ctx.fillRect(0, 0, this.W, 6);
    }
  }

  /* ===================== شاشات ===================== */
  _drawTitle(ctx) {
    ctx.fillStyle = 'rgba(5,8,20,0.80)'; ctx.fillRect(0, 0, this.W, this.H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7CFFB2'; ctx.font = 'bold 46px sans-serif';
    ctx.fillText('ZUGO', this.W / 2, this.H * 0.30);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText('الهروب الأخير 🛸', this.W / 2, this.H * 0.30 + 34);
    ctx.fillStyle = '#bcd'; ctx.font = '15px sans-serif';
    wrapText(ctx,
      'تحطمت سفينة زوغو على الأرض! اجمع أجزاء السفينة الستة وتجنّب البشر والكاميرات، واستخدم قدراتك الخارقة لتعود إلى كوكبه.',
      this.W / 2, this.H * 0.45, this.W * 0.82, 22);
    var blink = 0.5 + 0.5 * Math.sin(this.time * 4);
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText('انقر للبدء', this.W / 2, this.H * 0.70);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  _drawWin(ctx) {
    ctx.fillStyle = 'rgba(5,20,10,0.82)'; ctx.fillRect(0, 0, this.W, this.H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7CFFB2'; ctx.font = 'bold 30px sans-serif';
    ctx.fillText('تم إصلاح السفينة! 🛸', this.W / 2, this.H * 0.38);
    ctx.fillStyle = '#fff'; ctx.font = '17px sans-serif';
    ctx.fillText('عاد زوغو إلى كوكبه بأمان', this.W / 2, this.H * 0.38 + 32);
    ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText('النقاط: ' + this.score, this.W / 2, this.H * 0.55);
    var blink = 0.5 + 0.5 * Math.sin(this.time * 4);
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText('انقر للعبة جديدة', this.W / 2, this.H * 0.68);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  _drawLose(ctx) {
    ctx.fillStyle = 'rgba(30,5,10,0.82)'; ctx.fillRect(0, 0, this.W, this.H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b6b'; ctx.font = 'bold 30px sans-serif';
    ctx.fillText('تم القبض عليك! 🚨', this.W / 2, this.H * 0.40);
    ctx.fillStyle = '#fff'; ctx.font = '17px sans-serif';
    ctx.fillText('اكتشفك البشر قبل إصلاح السفينة', this.W / 2, this.H * 0.40 + 32);
    ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText('النقاط: ' + this.score, this.W / 2, this.H * 0.55);
    var blink = 0.5 + 0.5 * Math.sin(this.time * 4);
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText('انقر للمحاولة مجددًا', this.W / 2, this.H * 0.68);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
