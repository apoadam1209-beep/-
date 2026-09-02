/* ===== اللعبة الرئيسية — نسخة سينمائية (معبد قديم + إضاءة + جسيمات) ===== */
class Game {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.input = new Input(); this.state = 'title';
    this.W = 0; this.H = 0; this.dpr = 1;
    this.lives = 3; this.score = 0; this.detection = 0; this.alertT = 0;
    this.time = 0; this.collected = 0; this.totalParts = 0;
    this.player = null; this.level = null;
    this.particles = [];
    this._resize();
    var self = this;
    window.addEventListener('resize', function () { self._resize(); });
    this.canvas.addEventListener('pointerdown', function () { self._onTap(); });
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
    if (!this.H) {
      this.H = h; this.W = w; this._build();
      for (var i = 0; i < 70; i++) {
        this.particles.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 8, vy: -6 - Math.random() * 14,
          r: 0.6 + Math.random() * 1.8, a: 0.2 + Math.random() * 0.5
        });
      }
    } else { this.W = w; }
  }
  _build() {
    this.level = buildLevel(this.H);
    this.totalParts = this.level.parts.length;
    this.player = new Player(this.level.spawn.x, this.level.spawn.y);
  }
  startGame() {
    audio(); this._build();
    this.lives = 3; this.score = 0; this.detection = 0;
    this.time = 0; this.collected = 0; this.state = 'play';
  }
  respawn() {
    sfx('caught'); this.lives--;
    if (this.lives <= 0) { this.state = 'lose'; return; }
    this.detection = 0;
    this.player.x = this.level.spawn.x; this.player.y = this.level.spawn.y;
    this.player.vx = 0; this.player.vy = 0; this.player.gravityDir = 1;
    this.player.energy = this.player.maxEnergy;
    this.player.morphed = false; this.player.cloaked = false;
  }
  _onTap() { audio(); if (this.state === 'title' || this.state === 'win' || this.state === 'lose') this.startGame(); }
  _frame(now) {
    var dt = (now - this.last) / 1000; this.last = now;
    if (dt > 0.033) dt = 0.033;
    this.update(dt); this.render();
    var self = this; requestAnimationFrame(function (t) { self._frame(t); });
  }
  update(dt) {
    this.time += dt;
    if (this.state !== 'play') return;
    var pl = this.player, L = this.level;
    pl.update(dt, this.input, L, this);
    var i;
    for (i = 0; i < L.humans.length; i++) L.humans[i].update(dt, pl);
    for (i = 0; i < L.cams.length; i++) L.cams[i].update(dt, pl);
    // فخاخ الأشواك
    var pa = pl.aabb();
    for (i = 0; i < L.spikes.length; i++) {
      if (aabb(pa, L.spikes[i])) { this.respawn(); return; }
    }
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
    var camX = clamp(this.player.x + this.player.w / 2 - this.W * 0.42, 0, Math.max(0, this.level.worldW - this.W));
    ctx.save(); ctx.translate(-camX, 0); this._drawWorld(ctx); ctx.restore();
    this._drawParticles(ctx);
    this._drawVignette(ctx);
    this._drawHud(ctx);
    if (this.state === 'win') this._drawWin(ctx);
    if (this.state === 'lose') this._drawLose(ctx);
  }
  _img(name) { var a = window.ASSETS; return (a && a[name] && a[name].complete && a[name].naturalWidth) ? a[name] : null; }
  _ensure(name) {
    var A = window.ASSETS; if (!A || !A[name]) return null;
    if (A[name + '_spr']) return A[name + '_spr'];
    var img = A[name];
    if (img && img.complete && img.naturalWidth) {
      try { A[name + '_spr'] = this._makeSprite(img); } catch (e) { A[name + '_spr'] = null; }
      return A[name + '_spr'];
    }
    return null;
  }
  _makeSprite(img) {
    var cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    var c = cv.getContext('2d'); c.drawImage(img, 0, 0);
    var d = c.getImageData(0, 0, cv.width, cv.height), px = d.data;
    function avg(x0, y0, x1, y1) {
      var r = 0, g = 0, b = 0, n = 0;
      for (var y = y0; y < y1; y += 3) for (var x = x0; x < x1; x += 3) {
        var i = (y * cv.width + x) * 4; r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
      }
      return [r / n, g / n, b / n];
    }
    var a0 = avg(0, 0, 16, 16), a1 = avg(cv.width - 16, 0, cv.width, 16),
        a2 = avg(0, cv.height - 16, 16, cv.height), a3 = avg(cv.width - 16, cv.height - 16, cv.width, cv.height);
    var R = (a0[0] + a1[0] + a2[0] + a3[0]) / 4,
        G = (a0[1] + a1[1] + a2[1] + a3[1]) / 4,
        B = (a0[2] + a1[2] + a2[2] + a3[2]) / 4;
    var T = 75;
    for (var k = 0; k < px.length; k += 4) {
      var dr = px[k] - R, dg = px[k + 1] - G, db = px[k + 2] - B;
      var dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist < T) px[k + 3] = 0;
      else if (dist < T * 2) px[k + 3] = Math.floor((dist - T) / T * 255);
      else px[k + 3] = 255;
    }
    c.putImageData(d, 0, 0);
    return cv;
  }
  _drawSprite(ctx, spr, cx, footY, h, facing) {
    var iw = spr.width, ih = spr.height, w = h * (iw / ih);
    ctx.save();
    ctx.translate(cx, footY);
    ctx.scale(facing >= 0 ? 1 : -1, 1);
    ctx.drawImage(spr, -w / 2, -h, w, h);
    ctx.restore();
  }
  _drawBg(ctx) {
    var bg = this._img('bg');
    if (bg) {
      var iw = bg.naturalWidth, ih = bg.naturalHeight;
      var scale = Math.max(this.W / iw, this.H / ih);
      var dw = iw * scale, dh = ih * scale;
      ctx.drawImage(bg, (this.W - dw) / 2, (this.H - dh) / 2, dw, dh);
    } else {
      var g = ctx.createLinearGradient(0, 0, 0, this.H);
      g.addColorStop(0, '#0a1030'); g.addColorStop(1, '#241b3a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);
    }
    // طبقة ركام شبه شفافة (parallax)
    var ru = this._img('ruins');
    if (ru) {
      var rw = ru.naturalWidth, rh = ru.naturalHeight;
      var s = this.H / rh, dw2 = rw * s;
      var cam = (this.player ? this.player.x : 0) * 0.4;
      var startX = -((cam) % dw2); if (startX > 0) startX -= dw2;
      ctx.save(); ctx.globalAlpha = 0.45;
      for (var x = startX; x < this.W; x += dw2) ctx.drawImage(ru, x, this.H - rh * s, dw2, rh * s);
      ctx.restore();
    }
  }
  _drawWorld(ctx) {
    var L = this.level, i, p;
    // منصّات حجرية
    for (i = 0; i < L.platforms.length; i++) {
      p = L.platforms[i];
      ctx.fillStyle = '#2b2620'; roundRect(ctx, p.x, p.y, p.w, p.h, 5); ctx.fill();
      ctx.fillStyle = '#4a4036'; ctx.fillRect(p.x, p.y, p.w, 6);
      ctx.fillStyle = '#5e8f4f'; ctx.fillRect(p.x, p.y, p.w, 3); // طحالب
    }
    // فخاخ الأشواك
    for (i = 0; i < L.spikes.length; i++) {
      var sp = L.spikes[i];
      ctx.fillStyle = '#1b1712'; ctx.fillRect(sp.x, sp.y + sp.h - 4, sp.w, 4);
      ctx.fillStyle = '#9aa0a6';
      var n = Math.floor(sp.w / 12), step = sp.w / n;
      for (var k = 0; k < n; k++) {
        var sx = sp.x + k * step;
        ctx.beginPath(); ctx.moveTo(sx, sp.y + sp.h); ctx.lineTo(sx + step / 2, sp.y); ctx.lineTo(sx + step, sp.y + sp.h); ctx.closePath(); ctx.fill();
      }
    }
    // السفينة
    this._drawShip(ctx, L.ship.x, L.ship.y);
    // بلورات (أجزاء السفينة) — توهّج بأسلوب addit
    var cr = this._img('crystal');
    for (i = 0; i < L.parts.length; i++) {
      var pt = L.parts[i]; if (pt.collected) continue;
      var yy = pt.y + Math.sin(pt.t * 2) * 4;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (cr) {
        var cw = 60, ch = cw * (cr.naturalHeight / cr.naturalWidth);
        ctx.drawImage(cr, pt.x - cw / 2, yy - ch / 2, cw, ch);
      } else {
        ctx.fillStyle = '#ffd24a'; ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(pt.x, yy, 16, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
    // خلايا الطاقة
    for (i = 0; i < L.cells.length; i++) {
      var c = L.cells[i]; if (c.taken) continue;
      var cy = c.y + Math.sin(c.t * 2.4) * 4;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#39d0ff'; ctx.shadowColor = '#39d0ff'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(c.x, cy - 14); ctx.lineTo(c.x + 14, cy); ctx.lineTo(c.x, cy + 14); ctx.lineTo(c.x - 14, cy); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // الشعلات (إضاءة + لهب)
    for (i = 0; i < L.torches.length; i++) this._drawTorch(ctx, L.torches[i]);
    // الحرّاس (البشر)
    for (i = 0; i < L.humans.length; i++) this._drawGuardian(ctx, L.humans[i]);
    // العيون الساهرة (الكاميرات)
    for (i = 0; i < L.cams.length; i++) this._drawSentry(ctx, L.cams[i]);
    // اللاعب + توهّجه
    this._drawPlayerGlow(ctx);
    this._drawPlayer(ctx);
  }
  _drawTorch(ctx, t) {
    var fx = t.x, fy = t.y - 54 + Math.sin(this.time * 9 + t.x) * 3;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(fx, fy, 4, fx, fy, 150);
    g.addColorStop(0, 'rgba(255,180,90,0.55)'); g.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, 150, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath(); ctx.ellipse(fx, fy, 6, 12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff8a3c';
    ctx.beginPath(); ctx.ellipse(fx, fy, 3, 7, 0, 0, 7); ctx.fill();
    ctx.restore();
    // حامل الشعلة
    ctx.fillStyle = '#3a2f24'; ctx.fillRect(t.x - 3, t.y - 54, 6, 54);
  }
  _drawShip(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#8fa0bf'; ctx.beginPath(); ctx.ellipse(0, 30, 72, 22, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#dfe6f5'; ctx.beginPath(); ctx.ellipse(0, 18, 34, 20, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd24a';
    for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 22, 30, 4, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  _drawGuardian(ctx, h) {
    var ex = h.x + h.w / 2, ey = h.y + 12;
    var base = h.dir > 0 ? 0 : Math.PI, a0 = base - h.fov, a1 = base + h.fov;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(ex, ey, 4, ex, ey, h.visionRange);
    g.addColorStop(0, h.seeing ? 'rgba(255,60,60,0.30)' : 'rgba(255,200,80,0.12)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.arc(ex, ey, h.visionRange, a0, a1); ctx.closePath(); ctx.fill();
    ctx.restore();
    var spr = this._ensure('guardian');
    if (spr) {
      this._drawSprite(ctx, spr, h.x + h.w / 2, h.y + h.h, h.h * 2.4, h.dir);
    } else {
      ctx.fillStyle = '#5b4636'; ctx.fillRect(h.x + 3, h.y + 16, h.w - 6, h.h - 22);
      ctx.fillStyle = '#3c2f24'; ctx.fillRect(h.x + 3, h.y + 16, h.w - 6, 8);
      ctx.fillStyle = '#caa46a'; ctx.beginPath(); ctx.arc(ex, h.y + 11, 9, 0, 7); ctx.fill();
      ctx.fillStyle = h.seeing ? '#ff5555' : '#ffcf6b';
      ctx.beginPath(); ctx.arc(ex + h.dir * 3, h.y + 11, 3, 0, 7); ctx.fill();
    }
  }
  _drawSentry(ctx, c) {
    var a0 = c.angle - c.fov, a1 = c.angle + c.fov;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, c.range);
    g.addColorStop(0, c.seeing ? 'rgba(255,60,60,0.30)' : 'rgba(120,200,255,0.14)');
    g.addColorStop(1, 'rgba(80,160,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.arc(c.x, c.y, c.range, a0, a1); ctx.closePath(); ctx.fill();
    ctx.restore();
    var spr = this._ensure('sentry');
    if (spr) {
      this._drawSprite(ctx, spr, c.x, c.y + 40, 80, 1);
    } else {
      ctx.fillStyle = '#2a2620'; ctx.fillRect(c.x - 14, c.y - 10, 28, 20);
      ctx.fillStyle = c.seeing ? '#ff4040' : '#7fd0ff';
      ctx.beginPath(); ctx.arc(c.x, c.y, 7, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = c.seeing ? '#ff5050' : '#88c0ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + Math.cos(c.angle) * 16, c.y + Math.sin(c.angle) * 16); ctx.stroke();
  }
  _drawPlayerGlow(ctx) {
    var pl = this.player;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var col = pl.cloaked ? 'rgba(120,160,255,0.5)' : (pl.gravityDir === -1 ? 'rgba(120,255,200,0.45)' : 'rgba(120,255,200,0.18)');
    var g = ctx.createRadialGradient(pl.x + pl.w / 2, pl.y + pl.h / 2, 4, pl.x + pl.w / 2, pl.y + pl.h / 2, 70);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pl.x + pl.w / 2, pl.y + pl.h / 2, 70, 0, 7); ctx.fill();
    ctx.restore();
  }
  _drawPlayer(ctx) {
    var pl = this.player; ctx.save();
    if (pl.morphed) {
      ctx.fillStyle = '#7a5a36'; ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
      ctx.strokeStyle = '#4e3a22'; ctx.lineWidth = 3; ctx.strokeRect(pl.x + 2, pl.y + 2, pl.w - 4, pl.h - 4);
      ctx.beginPath(); ctx.moveTo(pl.x, pl.y); ctx.lineTo(pl.x + pl.w, pl.y + pl.h);
      ctx.moveTo(pl.x + pl.w, pl.y); ctx.lineTo(pl.x, pl.y + pl.h); ctx.stroke();
    } else {
      var spr = this._ensure('alien');
      if (spr) {
        var bob = Math.abs(Math.sin(pl.animT * 6)) * 2;
        var cx = pl.x + pl.w / 2, footY = pl.y + pl.h + bob;
        if (pl.cloaked) ctx.globalAlpha = 0.35;
        this._drawSprite(ctx, spr, cx, footY, pl.h * 2.2, pl.facing);
      } else {
        this._drawAlien(ctx, pl.x, pl.y, pl.w, pl.h, pl.facing, pl.animT, pl.cloaked);
      }
    }
    if (pl.gravityDir === -1) { ctx.fillStyle = 'rgba(120,255,200,0.9)'; ctx.font = '14px sans-serif'; ctx.fillText('🌀', pl.x - 2, pl.y - 6); }
    ctx.restore();
  }
  _drawAlien(ctx, x, y, w, h, facing, t, cloaked) {
    ctx.save(); ctx.globalAlpha = cloaked ? 0.3 : 1;
    var cx = x + w / 2, cy = y + h / 2;
    var bob = Math.sin(t * 6) * 1.5;
    // هالة بدلة
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var gg = ctx.createRadialGradient(cx, cy, 4, cx, cy, 30);
    gg.addColorStop(0, 'rgba(120,255,200,0.35)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, 7); ctx.fill();
    ctx.restore();
    // جسم بتدرّج
    var bg = ctx.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2);
    bg.addColorStop(0, '#a8ffd0'); bg.addColorStop(1, '#5fe0a0');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(cx, cy + 4 + bob, w / 2, h / 2 - 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d8ffe9'; ctx.beginPath(); ctx.ellipse(cx, cy + 10 + bob, w / 3, h / 3, 0, 0, 7); ctx.fill();
    // هوائيات
    ctx.strokeStyle = '#7CFFB2'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 6, y + 4); ctx.lineTo(cx - 10, y - 8); ctx.moveTo(cx + 6, y + 4); ctx.lineTo(cx + 10, y - 8); ctx.stroke();
    ctx.fillStyle = '#ff7ce0'; ctx.beginPath(); ctx.arc(cx - 10, y - 9, 3, 0, 7); ctx.arc(cx + 10, y - 9, 3, 0, 7); ctx.fill();
    // عيون
    var ex = facing >= 0 ? 4 : -4;
    ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.ellipse(cx + ex - 6, cy - 2, 6, 8, 0, 0, 7); ctx.ellipse(cx + ex + 6, cy - 2, 6, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath();
    ctx.arc(cx + ex - 6 + facing * 2, cy - 1, 3, 0, 7); ctx.arc(cx + ex + 6 + facing * 2, cy - 1, 3, 0, 7); ctx.fill();
    ctx.restore();
  }
  _drawParticles(ctx) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      p.x += p.vx * 0.016; p.y += p.vy * 0.016;
      if (p.y < -5) { p.y = this.H + 5; p.x = Math.random() * this.W; }
      if (p.x < -5) p.x = this.W + 5; if (p.x > this.W + 5) p.x = -5;
      ctx.fillStyle = 'rgba(255,220,150,' + p.a + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  _drawVignette(ctx) {
    var g = ctx.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.35, this.W / 2, this.H / 2, this.H * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);
  }
  _bar(ctx, x, y, w, h, frac, color, label) {
    frac = clamp(frac, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = color; roundRect(ctx, x, y, w * frac, h, h / 2); ctx.fill();
    ctx.fillStyle = '#ffe9b0'; ctx.font = '11px sans-serif'; ctx.fillText(label, x + 6, y + h - 3);
  }
  _drawHud(ctx) {
    ctx.fillStyle = 'rgba(10,8,6,0.5)'; ctx.fillRect(0, 0, this.W, 84);
    ctx.strokeStyle = 'rgba(255,200,120,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 84); ctx.lineTo(this.W, 84); ctx.stroke();
    var pad = 12, y = 14, bw = this.W * 0.42;
    this._bar(ctx, pad, y, bw, 14, this.collected / this.totalParts, '#ffd24a', 'الإصلاح ' + this.collected + '/' + this.totalParts);
    this._bar(ctx, pad, y + 26, bw, 14, this.player.energy / this.player.maxEnergy, '#39d0ff', 'الطاقة');
    this._bar(ctx, pad, y + 52, bw, 14, this.detection / 100, this.detection > 60 ? '#ff5050' : '#ff9f43', 'الكشف');
    ctx.fillStyle = '#ffe9b0'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('النقاط: ' + this.score, this.W - pad, y + 14);
    ctx.fillText('المحاولات: ' + this.lives, this.W - pad, y + 40);
    ctx.textAlign = 'left';
    if (this.alertT > 0) { ctx.fillStyle = 'rgba(255,40,40,' + (0.3 + 0.3 * Math.sin(this.time * 30)) + ')'; ctx.fillRect(0, 0, this.W, 6); }
  }
  _drawTitle(ctx) {
    ctx.fillStyle = 'rgba(5,6,12,0.72)'; ctx.fillRect(0, 0, this.W, this.H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9affc8'; ctx.font = 'bold 44px sans-serif'; ctx.fillText('ZUGO', this.W / 2, this.H * 0.28);
    ctx.fillStyle = '#ffe9b0'; ctx.font = 'bold 22px sans-serif'; ctx.fillText('الهروب الأخير 🛸', this.W / 2, this.H * 0.28 + 34);
    ctx.fillStyle = '#cbd'; ctx.font = '15px sans-serif';
    wrapText(ctx, 'تحطمت سفينة زوغو في معبد قديم على الأرض! اجمع بلورات السفينة الست وتجنّب الحرّاس والعيون الساهرة، مستخدمًا قدراتك الخارقة للعودة إلى كوكبه.', this.W / 2, this.H * 0.45, this.W * 0.82, 22);
    var blink = 0.5 + 0.5 * Math.sin(this.time * 4);
    ctx.globalAlpha = blink; ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText('انقر للبدء', this.W / 2, this.H * 0.70); ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
  _drawWin(ctx) {
    ctx.fillStyle = 'rgba(5,20,10,0.8)'; ctx.fillRect(0, 0, this.W, this.H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9affc8'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('تم إصلاح السفينة! 🛸', this.W / 2, this.H * 0.38);
    ctx.fillStyle = '#fff'; ctx.font = '17px sans-serif'; ctx.fillText('عاد زوغو إلى كوكبه بأمان', this.W / 2, this.H * 0.38 + 32);
    ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('النقاط: ' + this.score, this.W / 2, this.H * 0.55);
    var blink = 0.5 + 0.5 * Math.sin(this.time * 4);
    ctx.globalAlpha = blink; ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText('انقر للعبة جديدة', this.W / 2, this.H * 0.68); ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
  _drawLose(ctx) {
    ctx.fillStyle = 'rgba(30,5,10,0.8)'; ctx.fillRect(0, 0, this.W, this.H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b6b'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('تم القبض عليك! 🚨', this.W / 2, this.H * 0.40);
    ctx.fillStyle = '#fff'; ctx.font = '17px sans-serif'; ctx.fillText('اكتشفك الحرّاس قبل إصلاح السفينة', this.W / 2, this.H * 0.40 + 32);
    ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('النقاط: ' + this.score, this.W / 2, this.H * 0.55);
    var blink = 0.5 + 0.5 * Math.sin(this.time * 4);
    ctx.globalAlpha = blink; ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText('انقر للمحاولة مجددًا', this.W / 2, this.H * 0.68); ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
}
