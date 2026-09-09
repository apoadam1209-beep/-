/* فَرْقِع! — أسلوب كرتوني · ١٠٠ مرحلة
 * منطق خالص (قابل للاختبار في Node) + متحكّم متصفح */
(function (root) {
  "use strict";
  const POP = (root.POP = root.POP || {});

  const BOMB = 99;
  const MAXL = 100;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  POP.BOMB = BOMB;
  POP.MAXL = MAXL;

  /* جواهر كرتونية: لون + شكل + اسم */
  POP.GEMS = [
    { c: "#ff5d73", light: "#ffb1c0", dark: "#d1264b", shape: "circle", name: "أحمر" },
    { c: "#ffcf3f", light: "#ffe9a3", dark: "#e0a400", shape: "star", name: "أصفر" },
    { c: "#4db8ff", light: "#b0e2ff", dark: "#1179c2", shape: "square", name: "أزرق" },
    { c: "#5df08d", light: "#c2ffdb", dark: "#17b45e", shape: "tri", name: "أخضر" },
    { c: "#c06bff", light: "#e6c4ff", dark: "#8a2fd1", shape: "diamond", name: "بنفسجي" },
    { c: "#ff9440", light: "#ffd2ab", dark: "#e06a00", shape: "heart", name: "برتقالي" },
  ];

  const rnd = (n) => Math.floor(Math.random() * n);

  function newGrid(cols, rows, colors) {
    const g = new Array(cols * rows);
    for (let i = 0; i < g.length; i++) g[i] = 1 + rnd(colors);
    return g;
  }
  POP.newGrid = newGrid;

  function groupAt(grid, cols, rows, start) {
    const color = grid[start];
    if (color <= 0 || color === BOMB) return color === BOMB ? [start] : [];
    const seen = new Set([start]);
    const stack = [start];
    const out = [];
    while (stack.length) {
      const i = stack.pop();
      out.push(i);
      const x = i % cols, y = (i - x) / cols;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const ni = ny * cols + nx;
        if (!seen.has(ni) && grid[ni] === color) { seen.add(ni); stack.push(ni); }
      }
    }
    return out;
  }
  POP.groupAt = groupAt;

  function pointsFor(size, combo) {
    const base = size * 10 + Math.max(0, size - 2) * 10;
    return Math.round(base * (1 + combo * 0.25));
  }
  POP.pointsFor = pointsFor;

  function collapse(grid, cols, rows, colors) {
    const spawned = [];
    for (let x = 0; x < cols; x++) {
      let write = rows - 1;
      for (let y = rows - 1; y >= 0; y--) {
        const i = y * cols + x;
        if (grid[i] !== 0) {
          const wi = write * cols + x;
          if (wi !== i) { grid[wi] = grid[i]; grid[i] = 0; }
          write--;
        }
      }
      for (let y = write; y >= 0; y--) { const i = y * cols + x; grid[i] = 1 + rnd(colors); spawned.push(i); }
    }
    return spawned;
  }
  POP.collapse = collapse;

  function bombBlast(grid, cols, rows, start) {
    const removed = new Set();
    const done = new Set();
    const queue = [start];
    while (queue.length) {
      const c = queue.pop();
      if (done.has(c)) continue;
      done.add(c);
      const x = c % cols, y = (c - x) / cols;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const ni = ny * cols + nx;
          removed.add(ni);
          if (grid[ni] === BOMB && !done.has(ni)) queue.push(ni);
        }
    }
    return [...removed];
  }
  POP.bombBlast = bombBlast;

  function hasMove(grid, cols, rows) {
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === BOMB) return true;
      if (grid[i] <= 0) continue;
      const x = i % cols, y = (i - x) / cols;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx >= cols || ny >= rows) continue;
        if (grid[ny * cols + nx] === grid[i]) return true;
      }
    }
    return false;
  }
  POP.hasMove = hasMove;

  /* إعدادات مرحلة (تدرّج حتى ١٠) */
  function cfg(lv) {
    const colors = lv < 6 ? 4 : lv < 30 ? 5 : 6;
    const moves = lv < 10 ? 20 : lv < 35 ? 18 : lv < 70 ? 16 : 15;
    const target = 600 + (lv - 1) * 160 + Math.floor((lv - 1) / 10) * 500 + (colors - 4) * 250;
    return { colors, moves, target };
  }
  POP.cfg = cfg;

  const ar = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  POP.ar = ar;

  /* ══════════ متحكّم المتصفح ══════════ */
  if (typeof window === "undefined") return;

  const $ = (s) => document.getElementById(s);
  const canvas = $("cv");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const COLS = 7, ROWS = 9;
  const SAVE = "farqia.v2";

  const state = {
    grid: [], colors: 4,
    score: 0, target: 600, moves: 20, level: 1,
    combo: 0, comboAt: 0,
    particles: [], floats: [], shake: 0,
    mode: "start",
    sound: true,
    best: load(),
    cell: 40, pad: 8, ox: 0, oy: 0,
    cursor: -1,
  };

  function load() {
    try { return Object.assign({ level: 1, best: 0, sound: true }, JSON.parse(localStorage.getItem(SAVE) || "{}")); }
    catch (e) { return { level: 1, best: 0, sound: true }; }
  }
  function save() { try { localStorage.setItem(SAVE, JSON.stringify(state.best)); } catch (e) {} }

  /* ── الصوت ── */
  let AC = null;
  function ac() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); return AC; }
  function tone(freq, dur, type, vol, when) {
    if (!state.sound) return;
    const c = ac(); const t = (when || c.currentTime);
    const o = c.createOscillator(); o.type = type || "triangle"; o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + (dur || 0.12) + 0.02);
  }
  function popSound(size, combo) { const f = 340 + Math.min(10, size) * 40 + combo * 30; tone(f, 0.1, "triangle", 0.12); tone(f * 1.5, 0.08, "triangle", 0.07); }
  function boom() { if (!state.sound) return; const c = ac(); const t = c.currentTime;
    const s = c.createBufferSource(); const b = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    s.buffer = b; const g = c.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  }
  function jingle() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, "triangle", 0.12, ac().currentTime + i * 0.1)); }

  /* ── رسم كرتوني ── */
  function rr(x, y, w, h, r) {
    const k = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + k, y); ctx.arcTo(x + w, y, x + w, y + h, k); ctx.arcTo(x + w, y + h, x, y + h, k);
    ctx.arcTo(x, y + h, x, y, k); ctx.arcTo(x, y, x + w, y, k); ctx.closePath();
  }
  function starPath(cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.5;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  function heartPath(cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.9);
    ctx.bezierCurveTo(cx - r * 1.3, cy - r * 0.1, cx - r * 0.7, cy - r * 1.0, cx, cy - r * 0.35);
    ctx.bezierCurveTo(cx + r * 0.7, cy - r * 1.0, cx + r * 1.3, cy - r * 0.1, cx, cy + r * 0.9);
    ctx.closePath();
  }
  function gemPath(shape, cx, cy, r) {
    if (shape === "circle") { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); }
    else if (shape === "square") rr(cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8, r * 0.5);
    else if (shape === "diamond") { ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath(); }
    else if (shape === "tri") { ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.95, cy + r * 0.75); ctx.lineTo(cx - r * 0.95, cy + r * 0.75); ctx.closePath(); }
    else if (shape === "star") starPath(cx, cy, r);
    else heartPath(cx, cy, r);
  }
  function face(cx, cy, r) {
    const ey = cy - r * 0.05;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(cx - r * 0.34, ey, r * 0.22, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.34, ey, r * 0.22, 0, 7); ctx.fill();
    ctx.fillStyle = "#252840";
    ctx.beginPath(); ctx.arc(cx - r * 0.30, ey, r * 0.10, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.38, ey, r * 0.10, 0, 7); ctx.fill();
    ctx.strokeStyle = "#252840"; ctx.lineWidth = Math.max(1.4, r * 0.10); ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.22, r * 0.30, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  }
  function drawGem(cx, cy, size, idx) {
    const gem = POP.GEMS[idx]; const r = size * 0.40;
    ctx.save();
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.shadowColor = "rgba(20,18,43,0.35)"; ctx.shadowOffsetY = size * 0.07; ctx.shadowBlur = 0;
    const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, r * 0.2, cx, cy, r * 1.25);
    g.addColorStop(0, gem.light); g.addColorStop(0.55, gem.c); g.addColorStop(1, gem.dark);
    ctx.fillStyle = g; ctx.strokeStyle = gem.dark; ctx.lineWidth = r * 0.26;
    gemPath(gem.shape, cx, cy, r);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy - r * 0.45, r * 0.30, r * 0.17, -0.5, 0, Math.PI * 2); ctx.fill();
    face(cx, cy, r);
    ctx.restore();
  }
  function drawBomb(cx, cy, size) {
    const r = size * 0.34;
    ctx.save(); ctx.lineJoin = "round";
    ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = r * 0.24; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.7); ctx.quadraticCurveTo(cx + r * 0.4, cy - r * 1.3, cx + r * 0.8, cy - r * 1.0); ctx.stroke();
    ctx.fillStyle = "#ffd93d"; ctx.beginPath(); ctx.arc(cx + r * 0.85, cy - r * 1.05, r * 0.26, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, r * 0.2, cx, cy, r * 1.2);
    g.addColorStop(0, "#63637e"); g.addColorStop(1, "#181824");
    ctx.fillStyle = g; ctx.strokeStyle = "#0b0b13"; ctx.lineWidth = r * 0.18;
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.1, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy - r * 0.15, r * 0.26, r * 0.15, -0.5, 0, 7); ctx.fill();
    // عيون غاضبة لطيفة
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(cx - r * 0.32, cy, r * 0.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.32, cy, r * 0.2, 0, 7); ctx.fill();
    ctx.fillStyle = "#252840";
    ctx.beginPath(); ctx.arc(cx - r * 0.28, cy, r * 0.09, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.36, cy, r * 0.09, 0, 7); ctx.fill();
    ctx.restore();
  }

  /* ── التخطيط ── */
  function layout() {
    const maxW = Math.min(window.innerWidth - 20, 460);
    const maxH = Math.max(240, window.innerHeight - 210);
    state.cell = Math.max(24, Math.min(52, Math.floor(Math.min(maxW / COLS, maxH / ROWS))));
    const w = state.cell * COLS + state.pad * 2;
    const h = state.cell * ROWS + state.pad * 2;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.ox = state.pad; state.oy = state.pad;
  }
  window.addEventListener("resize", layout);

  function startLevel(lv) {
    state.level = Math.min(MAXL, Math.max(1, lv));
    const c = cfg(state.level);
    state.colors = c.colors; state.target = c.target; state.moves = c.moves;
    state.score = 0; state.combo = 0;
    state.grid = newGrid(COLS, ROWS, state.colors);
    state.particles = []; state.floats = [];
    state.mode = "play";
    hideOverlays();
    hud();
  }

  function hud() {
    $("hud-score").textContent = String(state.score);
    $("hud-target").textContent = String(state.target);
    $("hud-moves").textContent = ar(state.moves);
    $("hud-level").textContent = ar(state.level) + "/" + ar(MAXL);
    $("bar-fill").style.width = Math.min(100, (state.score / state.target) * 100) + "%";
  }

  function cellAt(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left - state.ox) / state.cell);
    const y = Math.floor((e.clientY - r.top - state.oy) / state.cell);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return -1;
    return y * COLS + x;
  }

  function burst(x, y, colorIdx, n) {
    const gem = POP.GEMS[Math.max(0, colorIdx)];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 3.4;
      state.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.4, life: 1, c: Math.random() < 0.5 ? gem.c : gem.light, s: 2 + Math.random() * 4, round: Math.random() < 0.5 });
    }
  }

  function tap(i) {
    if (state.mode !== "play") return;
    const g = state.grid;
    if (g[i] === BOMB) { doRemove(bombBlast(g, COLS, ROWS, i), i, true); return; }
    const grp = groupAt(g, COLS, ROWS, i);
    if (grp.length < 2) { state.shake = Math.max(state.shake, 2); tone(160, 0.05, "triangle", 0.05); return; }
    doRemove(grp, i, false);
  }

  function doRemove(cells, at, isBomb) {
    const g = state.grid;
    const now = performance.now();
    state.combo = now - state.comboAt < 1600 ? state.combo + 1 : 0;
    state.comboAt = now;

    const pts = isBomb ? pointsFor(cells.length + 2, state.combo) : pointsFor(cells.length, state.combo);
    state.score += pts; state.moves--;

    for (const c of cells) {
      const x = c % COLS, y = (c - x) / COLS;
      burst(state.ox + x * state.cell + state.cell / 2, state.oy + y * state.cell + state.cell / 2, g[c] === BOMB ? 1 : g[c] - 1, isBomb ? 8 : 5);
      g[c] = 0;
    }
    const ax = at % COLS, ay = (at - ax) / COLS;
    state.floats.push({ x: state.ox + ax * state.cell + state.cell / 2, y: state.oy + ay * state.cell, txt: "+" + pts, life: 1, big: isBomb || cells.length >= 6 });
    if (state.combo > 0) state.floats.push({ x: state.ox + ax * state.cell + state.cell / 2, y: state.oy + ay * state.cell - 20, txt: "كومبو ×" + ar(state.combo + 1), life: 1, combo: true });

    if (!isBomb && cells.length >= 7) g[at] = BOMB;

    collapse(g, COLS, ROWS, state.colors);
    state.shake = Math.max(state.shake, isBomb ? 9 : cells.length >= 6 ? 6 : 3);
    if (isBomb) boom(); else popSound(cells.length, state.combo);

    hud();
    if (state.score >= state.target) { win(); return; }
    if (state.moves <= 0) { lose(); return; }
    if (!hasMove(g, COLS, ROWS)) {
      state.grid = newGrid(COLS, ROWS, state.colors);
      state.floats.push({ x: canvas.width / dpr / 2, y: 60, txt: "خلط!", life: 1, big: true });
    }
  }

  function stars() { return state.moves >= 6 ? 3 : state.moves >= 3 ? 2 : 1; }

  function win() {
    state.mode = "win";
    const s = stars();
    state.best.best = Math.max(state.best.best, state.score);
    state.best.level = Math.min(MAXL, Math.max(state.best.level, state.level + 1));
    state.best.sound = state.sound;
    save();
    jingle(); confetti();
    $("win-stars").textContent = "★".repeat(s) + "☆".repeat(3 - s);
    const final = state.level >= MAXL;
    $("win-title").textContent = final ? "🏆 أسطورة فَرْقِع!" : "أحسنت!";
    $("win-sub").textContent = final ? "أنهيت المائة مرحلة كاملة!" : `نتيجتك ${ar(state.score)} · تبقّى ${ar(state.moves)} حركة`;
    $("btn-next").style.display = final ? "none" : "";
    show("ov-win");
  }
  function lose() {
    state.mode = "lose";
    state.best.best = Math.max(state.best.best, state.score);
    state.best.sound = state.sound;
    save();
    tone(180, 0.3, "sawtooth", 0.12);
    $("lose-score").textContent = ar(state.score);
    $("lose-target").textContent = ar(state.target);
    show("ov-lose");
  }

  function show(id) { ["ov-start", "ov-win", "ov-lose"].forEach((o) => $(o).classList.toggle("hidden", o !== id)); }
  function hideOverlays() { ["ov-start", "ov-win", "ov-lose"].forEach((o) => $(o).classList.add("hidden")); }

  function confetti() {
    const box = $("confetti"); box.innerHTML = "";
    const cols = POP.GEMS.map((g) => g.c);
    for (let i = 0; i < 60; i++) {
      const el = document.createElement("i");
      el.style.left = Math.random() * 100 + "vw";
      el.style.background = cols[i % cols.length];
      el.style.borderRadius = Math.random() < 0.5 ? "50%" : "3px";
      el.style.setProperty("--dx", (Math.random() * 140 - 70) + "px");
      el.style.setProperty("--rot", Math.random() * 720 - 360 + "deg");
      el.style.animationDuration = 1.4 + Math.random() * 1.2 + "s";
      el.style.animationDelay = Math.random() * 0.3 + "s";
      box.appendChild(el);
    }
    setTimeout(() => (box.innerHTML = ""), 3200);
  }

  /* ── الرسم ─ */
  let lastT = performance.now();
  function frame(t) { const dt = Math.min(0.04, (t - lastT) / 1000); lastT = t; draw(dt); requestAnimationFrame(frame); }

  function draw(dt) {
    const w = canvas.width / dpr, h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    if (state.shake > 0.2) { ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake); state.shake *= 0.86; }
    // خلفية كرتونية متدرجة
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#2a2650"); bg.addColorStop(1, "#201c40");
    ctx.fillStyle = bg; rr(0, 0, w, h, 14); ctx.fill();
    // خلايا فاتحة مستديرة
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      rr(state.ox + x * state.cell + 2, state.oy + y * state.cell + 2, state.cell - 4, state.cell - 4, 9); ctx.fill();
    }
    // الجواهر
    for (let i = 0; i < state.grid.length; i++) {
      const v = state.grid[i];
      if (!v) continue;
      const x = i % COLS, y = (i - x) / COLS;
      const cx = state.ox + x * state.cell + state.cell / 2, cy = state.oy + y * state.cell + state.cell / 2;
      if (v === BOMB) drawBomb(cx, cy, state.cell);
      else drawGem(cx, cy, state.cell, v - 1);
    }
    if (state.cursor >= 0 && state.mode === "play") {
      const x = state.cursor % COLS, y = (state.cursor - x) / COLS;
      ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2.5;
      rr(state.ox + x * state.cell + 2, state.oy + y * state.cell + 2, state.cell - 4, state.cell - 4, 9); ctx.stroke();
    }
    for (const p of state.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.life -= dt * 1.6;
      if (p.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.c;
      if (p.round) { ctx.beginPath(); ctx.arc(p.x, p.y, p.s / 2, 0, 7); ctx.fill(); }
      else ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const f of state.floats) {
      f.y -= 34 * dt; f.life -= dt * 1.1;
      if (f.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.font = (f.big ? "22px " : "16px ") + '"Baloo Bhaijaan 2", sans-serif';
      ctx.textAlign = "center";
      ctx.fillStyle = f.combo ? "#ffcf3f" : "#fff";
      ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    state.floats = state.floats.filter((f) => f.life > 0);
    ctx.restore();
  }

  /* ── إدخال ── */
  canvas.addEventListener("pointerdown", (e) => { ac(); const i = cellAt(e); if (i >= 0) tap(i); });
  canvas.addEventListener("pointermove", (e) => { state.cursor = cellAt(e); });
  canvas.addEventListener("pointerleave", () => (state.cursor = -1));
  window.addEventListener("keydown", (e) => {
    if (state.mode !== "play") return;
    const cur = state.cursor < 0 ? Math.floor(COLS / 2) + COLS * Math.floor(ROWS / 2) : state.cursor;
    const x = cur % COLS, y = (cur - x) / COLS;
    if (e.key === "ArrowLeft") state.cursor = y * COLS + Math.max(0, x - 1);
    else if (e.key === "ArrowRight") state.cursor = y * COLS + Math.min(COLS - 1, x + 1);
    else if (e.key === "ArrowUp") state.cursor = Math.max(0, y - 1) * COLS + x;
    else if (e.key === "ArrowDown") state.cursor = Math.min(ROWS - 1, y + 1) * COLS + x;
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(state.cursor); }
  });

  /* ── أزرار ── */
  $("btn-start").addEventListener("click", () => { ac(); startLevel(1); });
  $("btn-continue").addEventListener("click", () => { ac(); startLevel(state.best.level || 1); });
  $("btn-next").addEventListener("click", () => { ac(); startLevel(state.level + 1); });
  $("btn-retry").addEventListener("click", () => { ac(); startLevel(state.level); });
  $("btn-again-win").addEventListener("click", () => { ac(); startLevel(state.level); });
  $("btn-menu").addEventListener("click", () => { state.mode = "start"; $("best-line").textContent = bestLine(); show("ov-start"); });
  $("btn-sound").addEventListener("click", () => { state.sound = !state.sound; state.best.sound = state.sound; save(); syncSound(); if (state.sound) tone(700, 0.08); });

  function bestLine() {
    return state.best.best > 0 ? `أفضل نتيجة: ${ar(state.best.best)} · وصلت للمرحلة ${ar(Math.min(MAXL, state.best.level))} من ${ar(MAXL)}` : "لعبة جديدة — بالتوفيق!";
  }
  function syncSound() { const b = $("btn-sound"); b.textContent = state.sound ? "♪" : "✕"; b.classList.toggle("on", state.sound); }

  /* ── إقلاع ── */
  state.sound = state.best.sound !== false;
  syncSound();
  layout();
  state.grid = newGrid(COLS, ROWS, 4);
  $("best-line").textContent = bestLine();
  show("ov-start");
  requestAnimationFrame((t) => { lastT = t; frame(t); });
  window.addEventListener("pointerdown", () => ac(), { once: true });

  POP._ = { state, tap, startLevel, hud };
})(typeof window !== "undefined" ? window : globalThis);
