/* فَرْقِع! — منطق خالص (قابل للاختبار في Node) + متحكّم متصفح */
(function (root) {
  "use strict";
  const POP = (root.POP = root.POP || {});

  /* ثوابت */
  const BOMB = 99;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  POP.BOMB = BOMB;

  /* ألوان وأشكال الجواهر */
  POP.GEMS = [
    { c: "#ff4d6d", light: "#ff9db1", dark: "#b31b3f", shape: "circle", name: "أحمر" },
    { c: "#ffd93d", light: "#fff0a3", dark: "#c79a00", shape: "diamond", name: "أصفر" },
    { c: "#4dc9ff", light: "#a8e6ff", dark: "#0f7fb3", shape: "square", name: "أزرق" },
    { c: "#6bff8f", light: "#c0ffd0", dark: "#1fb354", shape: "tri", name: "أخضر" },
    { c: "#c46bff", light: "#e3b8ff", dark: "#7d2bb3", shape: "plus", name: "بنفسجي" },
  ];

  const rnd = (n) => Math.floor(Math.random() * n);

  function newGrid(cols, rows, colors) {
    const g = new Array(cols * rows);
    for (let i = 0; i < g.length; i++) g[i] = 1 + rnd(colors);
    return g;
  }
  POP.newGrid = newGrid;

  /** مجموعة الخلايا المتصلة نفس اللون (فيضان) */
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
        if (!seen.has(ni) && grid[ni] === color) {
          seen.add(ni);
          stack.push(ni);
        }
      }
    }
    return out;
  }
  POP.groupAt = groupAt;

  /** نقاط مجموعة: تربيعية لتشجيع التجميع */
  function pointsFor(size, combo) {
    const base = size * 10 + Math.max(0, size - 2) * 10;
    return Math.round(base * (1 + combo * 0.25));
  }
  POP.pointsFor = pointsFor;

  /** إسقاط الأعمدة وملء الأعلى، يعيد قائمة الخلايا الجديدة */
  function collapse(grid, cols, rows, colors) {
    const spawned = [];
    for (let x = 0; x < cols; x++) {
      let write = rows - 1;
      for (let y = rows - 1; y >= 0; y--) {
        const i = y * cols + x;
        if (grid[i] !== 0) {
          const wi = write * cols + x;
          if (wi !== i) {
            grid[wi] = grid[i];
            grid[i] = 0;
          }
          write--;
        }
      }
      for (let y = write; y >= 0; y--) {
        const i = y * cols + x;
        grid[i] = 1 + rnd(colors);
        spawned.push(i);
      }
    }
    return spawned;
  }
  POP.collapse = collapse;

  /** انفجار قنبلة: نصف قطر 1 (3×3) ويعيد الخلايا المتأثرة ويفجّر القنابل المتسلسلة */
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

  /** هل توجد حركة ممكنة (مجموعة ≥2 أو قنبلة)؟ */
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

  /* ══════════ متحكّم المتصفح ══════════ */
  if (typeof window === "undefined") return;

  const $ = (s) => document.getElementById(s);
  const canvas = $("cv");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const COLS = 7, ROWS = 9;
  const SAVE = "farqia.v1";

  const state = {
    grid: [], colors: 4,
    score: 0, target: 1500, moves: 20, level: 1,
    combo: 0, comboAt: 0,
    particles: [], floats: [], shake: 0,
    mode: "start", // start | play | win | lose
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
    const o = c.createOscillator(); o.type = type || "square"; o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + (dur || 0.12) + 0.02);
  }
  function popSound(size, combo) {
    const f = 320 + Math.min(10, size) * 40 + combo * 30;
    tone(f, 0.1, "square", 0.1); tone(f * 1.5, 0.08, "square", 0.06);
  }
  function boom() { if (!state.sound) return; const c = ac(); const t = c.currentTime;
    const s = c.createBufferSource(); const b = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    s.buffer = b; const g = c.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  }
  function jingle() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, "square", 0.1, ac().currentTime + i * 0.1)); }

  /* ── أنماط بكسل للأشكال (7×7): 0 فارغ 1 أساسي 2 فاتح 3 غامق ── */
  const PAT = {
    circle: ["0011100","0122210","1222221","1222221","1222221","0133310","0033300"],
    diamond:["0001000","0012100","0122210","1222221","0122210","0013100","0003000"],
    square: ["0111110","1222221","1222221","1222221","1222221","1222221","0133310"],
    tri:    ["0001000","0012100","0122210","0122210","1222221","1222221","1333331"],
    plus:   ["0012100","0012100","1122211","2222222","1122211","0013100","0013100"],
  };
  const PAT_BOMB = ["0000020","0000220","0011100","0111110","1111111","1111111","0111110"];

  const spriteCache = {};
  function sprite(type, idx) {
    const key = type + idx;
    if (spriteCache[key]) return spriteCache[key];
    const pat = type === "bomb" ? PAT_BOMB : PAT[type];
    const px = 8; const cv = document.createElement("canvas");
    cv.width = 7 * px; cv.height = 7 * px;
    const g = cv.getContext("2d");
    const gem = POP.GEMS[idx] || { c: "#222", light: "#555", dark: "#000" };
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const v = pat[y][x];
      if (v === "0") continue;
      g.fillStyle = type === "bomb"
        ? (v === "1" ? "#2b2b3b" : v === "2" ? "#ffd93d" : "#14141f")
        : (v === "1" ? gem.c : v === "2" ? gem.light : gem.dark);
      g.fillRect(x * px, y * px, px, px);
    }
    spriteCache[key] = cv;
    return cv;
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
    ctx.imageSmoothingEnabled = false;
    state.ox = state.pad; state.oy = state.pad;
  }
  window.addEventListener("resize", () => { layout(); });

  function startLevel(lv) {
    state.level = lv;
    state.colors = lv >= 4 ? 5 : 4;
    state.target = 1200 + (lv - 1) * 900;
    state.moves = 20;
    state.score = 0;
    state.combo = 0;
    state.grid = newGrid(COLS, ROWS, state.colors);
    state.particles = []; state.floats = [];
    state.mode = "play";
    hideOverlays();
    hud();
  }

  function hud() {
    $("hud-score").textContent = String(state.score);
    $("hud-target").textContent = String(state.target);
    $("hud-moves").textContent = String(state.moves);
    $("hud-level").textContent = String(state.level);
    const bar = $("bar-fill");
    bar.style.width = Math.min(100, (state.score / state.target) * 100) + "%";
  }

  function cellAt(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left - state.ox) / state.cell);
    const y = Math.floor((e.clientY - r.top - state.oy) / state.cell);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return -1;
    return y * COLS + x;
  }

  function burst(x, y, colorIdx, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 3.4;
      state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.4,
        life: 1, c: Math.random() < 0.5 ? POP.GEMS[colorIdx].c : POP.GEMS[colorIdx].light,
        s: 2 + Math.random() * 3,
      });
    }
  }

  function tap(i) {
    if (state.mode !== "play") return;
    const g = state.grid;
    if (g[i] === BOMB) {
      const cells = bombBlast(g, COLS, ROWS, i);
      doRemove(cells, i, true);
      return;
    }
    const grp = groupAt(g, COLS, ROWS, i);
    if (grp.length < 2) {
      // نبضة صغيرة فقط
      state.shake = Math.max(state.shake, 2);
      tone(160, 0.05, "square", 0.05);
      return;
    }
    doRemove(grp, i, false);
  }

  function doRemove(cells, at, isBomb) {
    const g = state.grid;
    // كومبو
    const now = performance.now();
    state.combo = now - state.comboAt < 1600 ? state.combo + 1 : 0;
    state.comboAt = now;

    let pts = isBomb ? pointsFor(cells.length + 2, state.combo) : pointsFor(cells.length, state.combo);
    state.score += pts;
    state.moves--;

    // جسيمات ونص عائم
    for (const c of cells) {
      const x = c % COLS, y = (c - x) / COLS;
      const cxp = state.ox + x * state.cell + state.cell / 2;
      const cyp = state.oy + y * state.cell + state.cell / 2;
      const t = g[c] === BOMB ? 0 : g[c] - 1;
      burst(cxp, cyp, Math.max(0, t), isBomb ? 8 : 5);
      g[c] = 0;
    }
    const ax = at % COLS, ay = (at - ax) / COLS;
    state.floats.push({ x: state.ox + ax * state.cell + state.cell / 2, y: state.oy + ay * state.cell, txt: "+" + pts, life: 1, big: isBomb || cells.length >= 6 });
    if (state.combo > 0) state.floats.push({ x: state.ox + ax * state.cell + state.cell / 2, y: state.oy + ay * state.cell - 20, txt: "كومبو ×" + (state.combo + 1), life: 1, combo: true });

    // قنبلة من مجموعة كبيرة
    if (!isBomb && cells.length >= 7) g[at] = BOMB;

    collapse(g, COLS, ROWS, state.colors);
    state.shake = Math.max(state.shake, isBomb ? 9 : cells.length >= 6 ? 6 : 3);
    if (isBomb) boom(); else popSound(cells.length, state.combo);

    hud();
    // نتيجة؟
    if (state.score >= state.target) { win(); return; }
    if (state.moves <= 0) { lose(); return; }
    if (!hasMove(g, COLS, ROWS)) {
      // خلط مجاني
      state.grid = newGrid(COLS, ROWS, state.colors);
      state.floats.push({ x: canvas.width / dpr / 2, y: 60, txt: "خلط!", life: 1, big: true });
    }
  }

  function stars() { return state.moves >= 6 ? 3 : state.moves >= 3 ? 2 : 1; }

  function win() {
    state.mode = "win";
    const s = stars();
    state.best.best = Math.max(state.best.best, state.score);
    state.best.level = Math.max(state.best.level, state.level + 1);
    state.best.sound = state.sound;
    save();
    jingle();
    confetti();
    $("win-stars").textContent = "★".repeat(s) + "☆".repeat(3 - s);
    $("win-score").textContent = String(state.score);
    $("win-moves").textContent = String(state.moves);
    show("ov-win");
  }
  function lose() {
    state.mode = "lose";
    state.best.best = Math.max(state.best.best, state.score);
    state.best.sound = state.sound;
    save();
    tone(180, 0.3, "sawtooth", 0.12);
    $("lose-score").textContent = String(state.score);
    $("lose-target").textContent = String(state.target);
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
      el.style.setProperty("--dx", (Math.random() * 140 - 70) + "px");
      el.style.setProperty("--rot", Math.random() * 720 - 360 + "deg");
      el.style.animationDuration = 1.4 + Math.random() * 1.2 + "s";
      el.style.animationDelay = Math.random() * 0.3 + "s";
      box.appendChild(el);
    }
    setTimeout(() => (box.innerHTML = ""), 3200);
  }

  /* ── الرسم ── */
  let lastT = performance.now();
  function frame(t) {
    const dt = Math.min(0.04, (t - lastT) / 1000); lastT = t;
    draw(dt);
    requestAnimationFrame(frame);
  }

  function draw(dt) {
    const w = canvas.width / dpr, h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    if (state.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
      state.shake *= 0.86;
    }
    // خلفية رقعة
    ctx.fillStyle = "#191636";
    rr(0, 0, w, h, 10); ctx.fill();
    // خلايا باهتة
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      rr(state.ox + x * state.cell + 2, state.oy + y * state.cell + 2, state.cell - 4, state.cell - 4, 5); ctx.fill();
    }
    // الجواهر
    for (let i = 0; i < state.grid.length; i++) {
      const v = state.grid[i];
      if (!v) continue;
      const x = i % COLS, y = (i - x) / COLS;
      const px = state.ox + x * state.cell, py = state.oy + y * state.cell;
      const m = state.cell * 0.08;
      if (v === BOMB) ctx.drawImage(sprite("bomb", 0), px + m, py + m, state.cell - m * 2, state.cell - m * 2);
      else ctx.drawImage(sprite(POP.GEMS[v - 1].shape, v - 1), px + m, py + m, state.cell - m * 2, state.cell - m * 2);
    }
    // تمييز عند التحويم (ماوس)
    if (state.cursor >= 0 && state.mode === "play") {
      const x = state.cursor % COLS, y = (state.cursor - x) / COLS;
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2;
      rr(state.ox + x * state.cell + 2, state.oy + y * state.cell + 2, state.cell - 4, state.cell - 4, 5); ctx.stroke();
    }
    // جسيمات
    for (const p of state.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.life -= dt * 1.6;
      if (p.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
    state.particles = state.particles.filter((p) => p.life > 0);
    // نصوص عائمة
    for (const f of state.floats) {
      f.y -= 34 * dt; f.life -= dt * 1.1;
      if (f.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.font = (f.big ? "20px " : "15px ") + '"Lalezar", "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillStyle = f.combo ? "#ffd93d" : "#fff";
      ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    state.floats = state.floats.filter((f) => f.life > 0);
    ctx.restore();
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
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
  $("btn-menu").addEventListener("click", () => { state.mode = "start"; show("ov-start"); });
  $("btn-sound").addEventListener("click", () => { state.sound = !state.sound; state.best.sound = state.sound; save(); syncSound(); if (state.sound) tone(700, 0.08); });

  function syncSound() { const b = $("btn-sound"); b.textContent = state.sound ? "♪" : "✕"; b.classList.toggle("on", state.sound); }

  /* ── إقلاع ── */
  state.sound = state.best.sound !== false;
  syncSound();
  layout();
  state.grid = newGrid(COLS, ROWS, 4);
  $("best-line").textContent = state.best.best > 0 ? `أفضل نتيجة: ${state.best.best} · وصلت للمرحلة ${state.best.level}` : "لعبة جديدة — بالتوفيق!";
  show("ov-start");
  requestAnimationFrame((t) => { lastT = t; frame(t); });
  window.addEventListener("pointerdown", () => ac(), { once: true });

  // خطّاف اختبار (يُستعمل في e2e فقط)
  POP._ = { state, tap, startLevel, hud };
})(typeof window !== "undefined" ? window : globalThis);
