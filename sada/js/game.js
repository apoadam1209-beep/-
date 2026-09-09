/* صَدَى — اللعبة */
(function () {
  "use strict";
  const S = window.SADA;
  const A = S.audio;
  const $ = (id) => document.getElementById(id);
  const LEVELS = S.RAW_LEVELS.map(S.parseLevel);
  const KEY = "sada.progress.v1";

  /* ══════════ التقدّم المحفوظ ══════════ */
  const store = {
    data: { done: {}, sound: true, auto: true }, // الصوت يعمل افتراضياً
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) this.data = Object.assign(this.data, JSON.parse(raw));
      } catch (e) {}
      A.setMuted(!this.data.sound);
    },
    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (e) {}
    },
    stars(id) {
      return (this.data.done[id] && this.data.done[id].stars) || 0;
    },
    mark(id, stars, attempts) {
      const cur = this.data.done[id] || { stars: 0, attempts: 99 };
      this.data.done[id] = {
        stars: Math.max(cur.stars, stars),
        attempts: Math.min(cur.attempts, attempts),
      };
      this.save();
    },
    unlocked(idx) {
      if (idx <= 0) return true;
      return !!this.data.done[LEVELS[idx - 1].id];
    },
    totalStars() {
      return Object.values(this.data.done).reduce((a, d) => a + (d.stars || 0), 0);
    },
    reset() {
      this.data.done = {};
      this.save();
    },
  };
  store.load();

  /* ══════════ حالة التطبيق ══════════ */
  const ui = {
    screen: "menu",
    idx: 0,
    level: null,
    bells: [],
    hand: null, // اللون المحمول
    selected: null,
    cursor: { x: 0, y: 0 },
    undo: [],
    attempts: 0,
    hinted: false,
    hintCell: null,
    solved: false,
    view: null,
    fx: null,
    anim: null,
  };

  /* ══════════ أدوات الرسم ══════════ */
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function layoutFor(level, maxW, maxH) {
    const pad = 10;
    const cell = Math.max(20, Math.min(62, Math.floor(Math.min((maxW - pad * 2) / level.cols, (maxH - pad * 2) / level.rows))));
    const w = cell * level.cols + pad * 2;
    const h = cell * level.rows + pad * 2;
    return { cell, pad, w, h };
  }

  function sizeCanvas(canvas, view) {
    canvas.width = Math.round(view.w * dpr);
    canvas.height = Math.round(view.h * dpr);
    canvas.style.width = view.w + "px";
    canvas.style.height = view.h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function rr(ctx, x, y, w, h, r) {
    const k = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + k, y);
    ctx.arcTo(x + w, y, x + w, y + h, k);
    ctx.arcTo(x + w, y + h, x, y + h, k);
    ctx.arcTo(x, y + h, x, y, k);
    ctx.arcTo(x, y, x + w, y, k);
    ctx.closePath();
  }

  function cx(view, x) {
    return view.pad + x * view.cell + view.cell / 2;
  }
  function cy(view, y) {
    return view.pad + y * view.cell + view.cell / 2;
  }

  /** الرسم الأساسي للوحة */
  function drawBoard(ctx, view, level, bells, fx) {
    const { cell } = view;
    ctx.clearRect(0, 0, view.w, view.h);

    const wall = new Set(level.walls.map(([x, y]) => S.idxOf(level, x, y)));
    const src = new Set(level.sources.map(([x, y]) => S.idxOf(level, x, y)));
    const lan = new Set(level.lanterns.map(([x, y]) => S.idxOf(level, x, y)));
    const gate = new Map();
    level.gates.forEach(([ax, ay, bx, by]) => {
      gate.set(S.idxOf(level, ax, ay), [bx, by]);
      gate.set(S.idxOf(level, bx, by), [ax, ay]);
    });
    const fixedAt = new Map(level.fixed.map((f) => [S.idxOf(level, f.x, f.y), f.c]));
    const bellAt = new Map(bells.map((b) => [S.idxOf(level, b.x, b.y), b]));

    // شبكة نقطية خفيفة
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    for (let y = 0; y < level.rows; y++)
      for (let x = 0; x < level.cols; x++) {
        const i = S.idxOf(level, x, y);
        if (wall.has(i)) continue;
        ctx.beginPath();
        ctx.arc(cx(view, x), cy(view, y), 1.3, 0, Math.PI * 2);
        ctx.fill();
      }

    // الموجة
    if (fx && fx.dist && fx.t > 0) {
      const t = fx.t;
      for (let i = 0; i < fx.dist.length; i++) {
        const d = fx.dist[i];
        if (d < 0 || d > t) continue;
        const age = t - d;
        if (age > 3) continue;
        const x = i % level.cols;
        const y = (i - x) / level.cols;
        const a = d === 0 ? 0 : Math.max(0, 1 - age / 3);
        const front = age < 0.75 ? 1 : 0;
        ctx.fillStyle = front
          ? `rgba(217,196,138,${0.30 + 0.34 * a})`
          : `rgba(140,175,225,${0.16 * a})`;
        const inset = front ? cell * 0.14 : cell * 0.24;
        rr(ctx, view.pad + x * cell + inset, view.pad + y * cell + inset, cell - inset * 2, cell - inset * 2, cell * 0.22);
        ctx.fill();
      }
    }

    // الجدران
    for (const [x, y] of level.walls) {
      ctx.fillStyle = "#1a2029";
      rr(ctx, view.pad + x * cell + 2, view.pad + y * cell + 2, cell - 4, cell - 4, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // المشاعل (زينة تُضاء مع الموجة)
    for (const [x, y] of level.lanterns) {
      const lit = fx && fx.litNow && fx.litNow.has(S.idxOf(level, x, y));
      const X = cx(view, x), Y = cy(view, y), r = cell * 0.2;
      ctx.save();
      ctx.translate(X, Y);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = lit ? "rgba(217,196,138,0.95)" : "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1.6;
      rr(ctx, -r, -r, r * 2, r * 2, 3);
      ctx.stroke();
      if (lit) {
        ctx.fillStyle = "rgba(217,196,138,0.9)";
        ctx.shadowColor = "rgba(217,196,138,0.9)";
        ctx.shadowBlur = 14;
        ctx.fill();
      }
      ctx.restore();
    }

    // البوّابات
    for (const [ax, ay, bx, by] of level.gates) {
      for (const [x, y] of [[ax, ay], [bx, by]]) {
        const X = cx(view, x), Y = cy(view, y), r = cell * 0.27;
        ctx.strokeStyle = "rgba(217,196,138,0.75)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(X, Y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(X, Y, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(217,196,138,0.55)";
        ctx.fill();
      }
      // خيط يربط البوّابتين
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = "rgba(217,196,138,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx(view, ax), cy(view, ay));
      ctx.lineTo(cx(view, bx), cy(view, by));
      ctx.stroke();
      ctx.restore();
    }

    // الحَجَر (المصدر)
    for (const [x, y] of level.sources) {
      const X = cx(view, x), Y = cy(view, y);
      const pulse = fx && fx.playing ? 0 : (Math.sin(Date.now() / 620) + 1) / 2;
      ctx.strokeStyle = `rgba(217,196,138,${0.25 + pulse * 0.35})`;
      ctx.lineWidth = 1.2;
      for (let k = 1; k <= 3; k++) {
        ctx.beginPath();
        ctx.arc(X, Y, cell * 0.1 * k + (k === 3 ? pulse * 3 : 0), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(X, Y, cell * 0.09, 0, Math.PI * 2);
      ctx.fillStyle = "#d9c48a";
      ctx.fill();
    }

    // الأجراس
    const draw = (b, extra) => {
      const col = S.COLORS[b.c];
      const X = cx(view, b.x), Y = cy(view, b.y);
      const ring = extra && extra.ring ? extra.ring : 0;
      const scale = extra && extra.scale ? extra.scale : 1;
      const r = cell * 0.3 * scale;
      ctx.save();
      ctx.shadowColor = col.hex;
      ctx.shadowBlur = ring > 0 ? 22 : 10;
      ctx.fillStyle = col.hex;
      ctx.beginPath();
      ctx.arc(X, Y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // لمعة
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(X - r * 0.3, Y - r * 0.34, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      if (ring > 0) {
        ctx.strokeStyle = col.hex;
        ctx.globalAlpha = Math.max(0, 1 - ring);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(X, Y, r + ring * cell * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (b.fixed) {
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.arc(X, Y, r + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (extra && extra.dim) {
        ctx.fillStyle = "rgba(11,14,20,0.55)";
        ctx.beginPath();
        ctx.arc(X, Y, r + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    for (const f of level.fixed) draw({ x: f.x, y: f.y, c: f.c, fixed: true });
    for (const b of bells) {
      let extra = null;
      if (fx && fx.ringing) {
        const rr2 = fx.ringing.find((q) => q.x === b.x && q.y === b.y);
        if (rr2) extra = { ring: rr2.age, scale: 1 + 0.22 * Math.max(0, 1 - rr2.age * 4) };
      }
      if (fx && fx.dimmed && fx.dimmed.has(S.idxOf(level, b.x, b.y))) extra = Object.assign(extra || {}, { dim: true });
      draw(b, extra);
    }

    // التلميح
    if (fx && fx.hint) {
      const { x, y, c } = fx.hint;
      const X = cx(view, x), Y = cy(view, y);
      const p = (Math.sin(Date.now() / 260) + 1) / 2;
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = S.COLORS[c].hex;
      ctx.globalAlpha = 0.45 + p * 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X, Y, cell * 0.33, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // المؤشّر (لوحة المفاتيح)
    if (fx && fx.cursor) {
      const { x, y } = fx.cursor;
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      rr(ctx, view.pad + x * cell + 3, view.pad + y * cell + 3, cell - 6, cell - 6, 7);
      ctx.stroke();
      ctx.restore();
    }

    // الجرس المحمول
    if (fx && fx.ghost) {
      const col = S.COLORS[fx.ghost.c];
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.shadowColor = col.hex;
      ctx.shadowBlur = 16;
      ctx.fillStyle = col.hex;
      ctx.beginPath();
      ctx.arc(fx.ghost.px, fx.ghost.py, cell * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // معاينة موضع الإفلات
    if (fx && fx.preview) {
      const { x, y, ok } = fx.preview;
      ctx.save();
      ctx.strokeStyle = ok ? "rgba(255,255,255,0.6)" : "rgba(255,107,129,0.6)";
      ctx.lineWidth = 1.5;
      rr(ctx, view.pad + x * cell + 3, view.pad + y * cell + 3, cell - 6, cell - 6, 7);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ══════════ شاشة اللعب ══════════ */
  const canvas = $("board");
  let ctx2d = null;

  function openLevel(idx) {
    ui.idx = Math.max(0, Math.min(LEVELS.length - 1, idx));
    ui.level = LEVELS[ui.idx];
    ui.bells = ui.level.fixed.map((f) => ({ x: f.x, y: f.y, c: f.c, fixed: true }));
    ui.hand = null;
    ui.selected = firstColor();
    ui.cursor = { x: Math.floor(ui.level.cols / 2), y: Math.floor(ui.level.rows / 2) };
    ui.undo = [];
    ui.attempts = 0;
    ui.hinted = false;
    ui.hintCell = null;
    ui.solved = false;
    ui.anim = null;
    ui.fx = { t: 0, playing: false };
    $("play-chapter").textContent = `الفصل ${arabicNum(ui.level.chapter)} · ${(S.CHAPTERS.find((c) => c.id === ui.level.chapter) || {}).name || ""}`;
    $("play-name").textContent = `${arabicNum(ui.level.id)}. ${ui.level.name}`;
    $("play-tip").textContent = ui.level.tip || "";
    $("play-stars").textContent = "★".repeat(store.stars(ui.level.id)) + "☆".repeat(3 - store.stars(ui.level.id));
    $("btn-prev").disabled = ui.idx === 0;
    $("btn-next").disabled = ui.idx === LEVELS.length - 1;
    renderTarget();
    renderTray();
    resize();
    show("play");
  }

  function firstColor() {
    for (const c of S.COLOR_ORDER) if ((ui.level.supply[c] || 0) > 0) return c;
    return null;
  }
  function remaining(c) {
    const used = ui.bells.filter((b) => b.c === c && !b.fixed).length;
    return (ui.level.supply[c] || 0) - used;
  }

  function renderTarget() {
    const wrap = $("target-beats");
    wrap.innerHTML = "";
    ui.level.target.forEach((beat, i) => {
      const d = document.createElement("div");
      d.className = "beat";
      d.dataset.i = i;
      const idx = document.createElement("div");
      idx.className = "idx";
      idx.textContent = arabicNum(i + 1);
      d.appendChild(idx);
      for (const c of beat) {
        const n = document.createElement("span");
        n.className = "note " + c;
        n.title = S.COLORS[c].ar;
        d.appendChild(n);
      }
      wrap.appendChild(d);
    });
  }

  function renderTray() {
    const tray = $("tray");
    tray.innerHTML = "";
    for (const c of S.COLOR_ORDER) {
      const total = ui.level.supply[c] || 0;
      if (!total) continue;
      const left = remaining(c);
      const el = document.createElement("div");
      el.className = "chip" + (ui.hand === c || (ui.hand == null && ui.selected === c) ? " sel" : "") + (left <= 0 ? " empty" : "");
      el.dataset.c = c;
      el.innerHTML = `<span class="note ${c}"></span><span class="ct">${arabicNum(left)}</span>`;
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        A.resume();
        if (left <= 0) {
          // ارفعه من اللوحة إن وُجد
          const last = ui.bells.filter((b) => b.c === c && !b.fixed).pop();
          if (last) {
            pushUndo();
            ui.bells = ui.bells.filter((b) => b !== last);
            ui.hand = c;
            A.click(300);
            renderTray();
            afterChange();
          }
          return;
        }
        ui.hand = c;
        ui.selected = c;
        pointer.down = true;
        pointer.moved = false;
        pointer.pickCell = null;
        A.click(660);
        renderTray();
      });
      tray.appendChild(el);
    }
  }

  function pushUndo() {
    ui.undo.push(ui.bells.map((b) => ({ ...b })));
    if (ui.undo.length > 60) ui.undo.shift();
  }
  function undo() {
    const s = ui.undo.pop();
    if (!s) return;
    ui.bells = s;
    ui.hand = null;
    A.click(360);
    renderTray();
    afterChange();
  }

  function canPlace(x, y) {
    if (x < 0 || y < 0 || x >= ui.level.cols || y >= ui.level.rows) return false;
    const i = S.idxOf(ui.level, x, y);
    if (S.blockedSet(ui.level).has(i)) return false;
    if (ui.level.fixed.some((f) => f.x === x && f.y === y)) return false;
    if (ui.bells.some((b) => b.x === x && b.y === y)) return false;
    return true;
  }

  function place(x, y, c) {
    if (!canPlace(x, y)) return false;
    if (remaining(c) <= 0) return false;
    pushUndo();
    ui.bells.push({ x, y, c });
    ui.hintCell = null;
    A.bell(S.COLORS[c].note, null, 0.28);
    renderTray();
    afterChange();
    return true;
  }

  function pickAt(x, y) {
    const b = ui.bells.find((q) => q.x === x && q.y === y && !q.fixed);
    if (!b) return false;
    pushUndo();
    ui.bells = ui.bells.filter((q) => q !== b);
    ui.hand = b.c;
    ui.selected = b.c;
    A.click(300);
    renderTray();
    afterChange();
    return true;
  }

  function afterChange() {
    ui.solved = false;
    if ($("chk-auto").checked) {
      clearTimeout(afterChange._t);
      afterChange._t = setTimeout(() => {
        if (ui.anim || ui.solved) return;
        if (ui.bells.some((b) => !b.fixed) && ui.screen === "play") playWave(true);
      }, 320);
    }
  }

  /* ── تشغيل الموجة ── */
  function playWave(fast) {
    if (ui.screen !== "play") return;
    clearTimeout(afterChange._t); // العزف اليدوي يلغي المؤجَّل
    A.resume();
    const level = ui.level;
    const bells = ui.bells;
    const w = S.waveFor(level, bells);
    const result = S.check(level, bells);
    if (!fast) ui.attempts++;
    if (!fast) A.whoosh(0.15);
    const speed = fast ? 7.5 : 3.4;
    ui.anim = {
      t: 0,
      speed,
      dist: w.dist,
      beats: w.beats,
      bellSteps: w.bellSteps,
      lit: w.lit,
      maxStep: w.maxStep,
      rang: new Set(),
      ringing: [],
      litNow: new Set(),
      result,
      evaluate: !fast,
      done: false,
    };
    ui.fx = { t: 0, playing: true, dist: w.dist, ringing: [], litNow: new Set() };
    highlightBeat(-1);
  }

  function highlightBeat(i) {
    [...document.querySelectorAll("#target-beats .beat")].forEach((el, k) => {
      el.classList.toggle("now", k === i);
    });
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (ui.anim && !ui.anim.done) {
      const a = ui.anim;
      a.t += dt * a.speed;
      // أجراس
      for (const bs of a.bellSteps) {
        if (bs.step < 0) continue;
        const key = bs.bell.x + "," + bs.bell.y;
        if (a.t >= bs.step && !a.rang.has(key)) {
          a.rang.add(key);
          a.ringing.push({ x: bs.bell.x, y: bs.bell.y, age: 0 });
          A.bell(S.COLORS[bs.bell.c].note, null, 0.45);
          const bi = a.beats.findIndex((b) => b.step === bs.step);
          highlightBeat(bi);
        }
      }
      // مشاعل
      for (let i = 0; i < a.dist.length; i++) {
        if (a.lit.has(i) && a.t >= a.dist[i]) a.litNow.add(i);
      }
      a.ringing.forEach((r) => (r.age += dt * 1.6));
      a.ringing = a.ringing.filter((r) => r.age < 1);
      ui.fx = {
        t: a.t,
        playing: true,
        dist: a.dist,
        ringing: a.ringing,
        litNow: a.litNow,
        cursor: ui.cursor,
        ghost: ghostFx(),
        preview: previewFx(),
        hint: ui.hintCell,
      };
      if (!a.judged && a.t > a.maxStep + 1.4) {
        a.judged = true;
        highlightBeat(-1);
        if (a.evaluate) verdict(a.result);
      }
      if (a.t > a.maxStep + 4.4) {
        a.done = true;
        ui.anim = null;
        ui.fx = { t: 0, playing: false };
      }
    } else if (ui.screen === "play" || ui.screen === "studio") {
      ui.fx = Object.assign(ui.fx || {}, {
        cursor: ui.cursor,
        ghost: ghostFx(),
        preview: previewFx(),
        hint: ui.hintCell,
      });
    }
    if (ui.screen === "play" && ctx2d) drawBoard(ctx2d, ui.view, ui.level, ui.bells, ui.fx);
    if (ui.screen === "studio") drawStudio();
    requestAnimationFrame(frame);
  }

  function ghostFx() {
    if (!ui.hand || !pointer.inside) return null;
    return { c: ui.hand, px: pointer.x, py: pointer.y };
  }
  function previewFx() {
    if (!ui.hand || !pointer.inside || !pointer.cell) return null;
    const { x, y } = pointer.cell;
    return { x, y, ok: canPlace(x, y) && remaining(ui.hand) > 0 };
  }

  function verdict(res) {
    if (res.ok) {
      if (ui.solved) return;
      ui.solved = true;
      let stars = ui.attempts <= 1 ? 3 : ui.attempts <= 3 ? 2 : 1;
      if (ui.hinted) stars = Math.min(stars, 2);
      store.mark(ui.level.id, stars, ui.attempts);
      $("play-stars").textContent = "★".repeat(store.stars(ui.level.id)) + "☆".repeat(3 - store.stars(ui.level.id));
      A.sparkle(res.beats.flatMap((b) => b.colors.map((c) => S.COLORS[c].note)));
      confetti();
      showWin(stars);
    } else {
      flash(res.message, "bad");
      A.thud();
    }
  }

  function flash(msg, kind) {
    const f = $("flash");
    f.textContent = msg;
    f.className = "flash show " + kind;
    clearTimeout(flash._t);
    flash._t = setTimeout(() => (f.className = "flash " + kind), 1900);
  }

  /* ── المؤشّر والتفاعل ── */
  const pointer = { x: 0, y: 0, inside: false, cell: null, down: false, moved: false };

  function cellFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const v = ui.view;
    if (!v) return null;
    const cxp = Math.floor((x - v.pad) / v.cell);
    const cyp = Math.floor((y - v.pad) / v.cell);
    if (cxp < 0 || cyp < 0 || cxp >= ui.level.cols || cyp >= ui.level.rows) return null;
    return { x: cxp, y: cyp };
  }

  canvas.addEventListener("pointerdown", (e) => {
    A.resume();
    canvas.focus();
    const cell = cellFromEvent(e);
    if (!cell) return;
    pointer.down = true;
    pointer.moved = false;
    pointer.pickCell = null;
    pointer.inside = true;
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.cell = cell;
    ui.cursor = { x: cell.x, y: cell.y };
    const occupied = ui.bells.some((b) => b.x === cell.x && b.y === cell.y && !b.fixed);
    if (ui.hand) {
      if (place(cell.x, cell.y, ui.hand)) ui.hand = null;
      else if (occupied) pickAt(cell.x, cell.y);
    } else if (occupied) {
      pickAt(cell.x, cell.y);
      pointer.pickCell = cell;
    } else {
      const c = ui.selected && remaining(ui.selected) > 0 ? ui.selected : null;
      if (c && place(cell.x, cell.y, c)) ui.hand = null;
    }
    renderTray();
  });

  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.inside = true;
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.cell = cellFromEvent(e);
    if (pointer.down) pointer.moved = true;
  });
  canvas.addEventListener("pointerleave", () => {
    pointer.inside = false;
    pointer.cell = null;
  });
  window.addEventListener("pointerup", (e) => {
    if (!pointer.down) return;
    pointer.down = false;
    const cell = ui.screen === "play" ? cellFromEvent(e) : null;
    const same = pointer.pickCell && cell.x === pointer.pickCell.x && cell.y === pointer.pickCell.y;
    if (cell && ui.hand && !same && (pointer.moved || !ui.bells.some((b) => b.x === cell.x && b.y === cell.y))) {
      if (place(cell.x, cell.y, ui.hand)) ui.hand = null;
    }
    renderTray();
  });
  window.addEventListener("pointercancel", () => (pointer.down = false));

  window.addEventListener("keydown", (e) => {
    if (ui.screen !== "play") {
      if (e.key === "Escape") closeModals();
      return;
    }
    const k = e.key;
    const colors = S.COLOR_ORDER.filter((c) => (ui.level.supply[c] || 0) > 0);
    if (/^[1-5]$/.test(k)) {
      const c = colors[Number(k) - 1];
      if (c) {
        ui.hand = remaining(c) > 0 ? c : ui.hand;
        ui.selected = c;
        A.click(600);
        renderTray();
      }
      return;
    }
    const move = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[k];
    if (move) {
      e.preventDefault();
      ui.cursor = {
        x: Math.max(0, Math.min(ui.level.cols - 1, ui.cursor.x + move[0])),
        y: Math.max(0, Math.min(ui.level.rows - 1, ui.cursor.y + move[1])),
      };
      return;
    }
    if (k === "Enter") {
      const { x, y } = ui.cursor;
      const occupied = ui.bells.some((b) => b.x === x && b.y === y && !b.fixed);
      if (ui.hand) {
        if (place(x, y, ui.hand)) ui.hand = null;
      } else if (occupied) pickAt(x, y);
      else {
        const c = ui.selected && remaining(ui.selected) > 0 ? ui.selected : colors[0];
        if (c && place(x, y, c)) ui.hand = null;
      }
      renderTray();
    } else if (k === " " || k === "Spacebar") {
      e.preventDefault();
      playWave(false);
    } else if (k === "Backspace" || k === "Delete") {
      e.preventDefault();
      pickAt(ui.cursor.x, ui.cursor.y);
    } else if (k === "z" || k === "Z") undo();
    else if (k === "r" || k === "R") restart();
    else if (k === "h" || k === "H") hint();
    else if (k === "Escape") show("menu");
  });

  function restart() {
    ui.bells = ui.level.fixed.map((f) => ({ x: f.x, y: f.y, c: f.c, fixed: true }));
    ui.undo = [];
    ui.hand = null;
    ui.hintCell = null;
    ui.anim = null;
    ui.fx = { t: 0, playing: false };
    A.click(400);
    renderTray();
  }

  function hint() {
    const movable = ui.bells.filter((b) => !b.fixed);
    const h = S.hint(ui.level, movable);
    if (!h) {
      flash("لا يوجد تلميح… اللوحة صحيحة!", "good");
      return;
    }
    ui.hinted = true;
    ui.hintCell = { x: h.x, y: h.y, c: h.c };
    A.click(880);
    flash(`ضع الجرس ${S.COLORS[h.c].ar} على الخلية المضيئة.`, "good");
    setTimeout(() => (ui.hintCell = null), 4200);
  }

  /* ══════════ الأزرار ══════════ */
  function show(name) {
    ui.screen = name;
    ["menu", "play", "studio"].forEach((s) => $("screen-" + s).classList.toggle("hidden", s !== name));
    if (name === "play") {
      resize();
      canvas.focus({ preventScroll: true });
    }
    if (name === "studio") {
      resize();
      buildStudio();
    }
    if (name === "menu") renderMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeModals() {
    $("win-modal").classList.add("hidden");
    $("help-modal").classList.add("hidden");
  }

  function showWin(stars) {
    $("win-stars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
    const attempts = store.data.done[ui.level.id].attempts;
    $("win-sub").textContent =
      `عزفتَ اللحن في ${arabicNum(attempts)} ${attempts === 1 ? "محاولة" : "محاولات"}` +
      (ui.hinted ? " · مع تلميح" : " · بلا تلميح");
    $("btn-win-next").style.display = ui.idx === LEVELS.length - 1 ? "none" : "";
    $("win-modal").classList.remove("hidden");
  }

  function confetti() {
    const box = document.createElement("div");
    box.className = "confetti";
    const cols = ["#ff6b81", "#ffcf5c", "#4fd6a0", "#5aa9ff", "#b98cff", "#d9c48a"];
    for (let i = 0; i < 70; i++) {
      const i2 = document.createElement("i");
      i2.style.left = Math.random() * 100 + "vw";
      i2.style.top = -10 - Math.random() * 20 + "px";
      i2.style.background = cols[i % cols.length];
      i2.style.setProperty("--dx", (Math.random() * 160 - 80) + "px");
      i2.style.setProperty("--rot", Math.random() * 720 - 360 + "deg");
      i2.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
      i2.style.animationDelay = Math.random() * 0.35 + "s";
      box.appendChild(i2);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3600);
  }

  function resize() {
    if (ui.screen === "play" && ui.level) {
      const maxW = Math.min(window.innerWidth - 32, 688);
      const maxH = Math.max(220, Math.min(window.innerHeight * 0.5, 460));
      ui.view = layoutFor(ui.level, maxW, maxH);
      ctx2d = sizeCanvas(canvas, ui.view);
    } else if (ui.screen === "studio") {
      const maxW = Math.min(window.innerWidth - 32, 688);
      const maxH = Math.max(220, Math.min(window.innerHeight * 0.5, 460));
      st.view = layoutFor(studioLevel(), maxW, maxH);
      st.ctx = sizeCanvas($("studio-board"), st.view);
    }
  }
  window.addEventListener("resize", resize);

  /* ══════════ القائمة ══════════ */
  function renderMenu() {
    const host = $("chapters");
    host.innerHTML = "";
    for (const ch of S.CHAPTERS) {
      const box = document.createElement("div");
      box.className = "chapter";
      const list = LEVELS.map((l, i) => ({ l, i })).filter((o) => o.l.chapter === ch.id);
      const done = list.filter((o) => store.stars(o.l.id) > 0).length;
      const stars = list.reduce((a, o) => a + store.stars(o.l.id), 0);
      box.innerHTML = `<div class="chapter-head"><h3>${ch.name}</h3><span class="sub">${ch.sub}</span>
        <span class="num">${arabicNum(done)}/${arabicNum(list.length)} · ${arabicNum(stars)}★</span></div>`;
      const grid = document.createElement("div");
      grid.className = "levels";
      for (const { l, i } of list) {
        const locked = !store.unlocked(i);
        const s = store.stars(l.id);
        const b = document.createElement("button");
        b.className = "lv" + (s ? " done" : "") + (locked ? " locked" : "");
        b.innerHTML = `<div class="n">${arabicNum(l.id)}</div><div class="nm">${l.name}</div>
          <div class="st">${s ? "★".repeat(s) + "☆".repeat(3 - s) : locked ? "🔒" : ""}</div>`;
        if (!locked) b.addEventListener("click", () => { A.resume(); A.click(520); openLevel(i); });
        grid.appendChild(b);
      }
      box.appendChild(grid);
      host.appendChild(box);
    }
    const total = LEVELS.length * 3;
    $("progress-text").textContent = `${arabicNum(store.totalStars())} من ${arabicNum(total)} نجمة`;
  }

  function arabicNum(n) {
    return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  }

  /* ══════════ الاستوديو ══════════ */
  const st = { tool: "r", cols: 9, rows: 7, cells: {}, gatePending: null, view: null, ctx: null, fx: null, anim: null, v: 0 };

  let stCache = { v: -1, level: null };
  function studioLevel() {
    if (stCache.v === st.v && stCache.level) return stCache.level;
    const level = buildStudioLevel();
    stCache = { v: st.v, level };
    return level;
  }
  function buildStudioLevel() {
    const walls = [], sources = [], gates = [], lanterns = [];
    for (const k in st.cells) {
      const c = st.cells[k];
      const [x, y] = k.split(",").map(Number);
      if (c.t === "wall") walls.push([x, y]);
      else if (c.t === "src") sources.push([x, y]);
    }
    for (let i = 0; i + 1 < st.gatePairs.length; i += 2) {
      const a = st.gatePairs[i], b = st.gatePairs[i + 1];
      gates.push([a.x, a.y, b.x, b.y]);
    }
    if (!sources.length) sources.push([Math.floor(st.cols / 2), Math.floor(st.rows / 2)]);
    return S.parseLevel({ cols: st.cols, rows: st.rows, src: sources.map((s) => s.join(",")).join(" "), walls: walls.map((w) => w.join(",")).join(" ") });
  }
  st.gatePairs = [];

  function buildStudio() {
    const pal = $("palette");
    pal.innerHTML = "";
    const tools = [
      ...S.COLOR_ORDER.map((c) => ({ id: c, html: `<span class="note ${c}"></span>${S.COLORS[c].ar}` })),
      { id: "wall", html: `<span class="sw"></span>جدار` },
      { id: "gate", html: `<span class="sw gate"></span>بوّابة` },
      { id: "src", html: `<span class="sw src"></span>الحَجَر` },
      { id: "erase", html: `<span class="sw erase"></span>ممحاة` },
    ];
    for (const t of tools) {
      const b = document.createElement("button");
      b.className = "tool" + (st.tool === t.id ? " sel" : "");
      b.innerHTML = t.html;
      b.addEventListener("click", () => {
        st.tool = t.id;
        st.gatePending = null;
        A.click(560);
        buildStudio();
      });
      pal.appendChild(b);
    }
  }

  function drawStudio() {
    if (!st.ctx || !st.view) return;
    const level = studioLevel();
    const bells = [];
    for (const k in st.cells) {
      const c = st.cells[k];
      if (S.COLORS[c.t]) {
        const [x, y] = k.split(",").map(Number);
        bells.push({ x, y, c: c.t });
      }
    }
    // البوّابات تُرسم يدوياً فوق اللوحة
    const fx = Object.assign({}, st.fx, { extraGates: st.gatePairs });
    drawBoard(st.ctx, st.view, level, bells, fx);
    // رسم البوّابات من حالة الاستوديو
    const v = st.view;
    st.ctx.save();
    st.ctx.setLineDash([]);
    for (let i = 0; i + 1 < st.gatePairs.length; i += 2) {
      const a = st.gatePairs[i], b = st.gatePairs[i + 1];
      for (const p of [a, b]) {
        st.ctx.strokeStyle = "rgba(217,196,138,0.8)";
        st.ctx.lineWidth = 1.6;
        st.ctx.beginPath();
        st.ctx.arc(cx(v, p.x), cy(v, p.y), v.cell * 0.27, 0, Math.PI * 2);
        st.ctx.stroke();
      }
      st.ctx.setLineDash([3, 5]);
      st.ctx.strokeStyle = "rgba(217,196,138,0.25)";
      st.ctx.beginPath();
      st.ctx.moveTo(cx(v, a.x), cy(v, a.y));
      st.ctx.lineTo(cx(v, b.x), cy(v, b.y));
      st.ctx.stroke();
      st.ctx.setLineDash([]);
    }
    if (st.gatePending) {
      st.ctx.strokeStyle = "rgba(217,196,138,0.5)";
      st.ctx.setLineDash([3, 4]);
      st.ctx.beginPath();
      st.ctx.arc(cx(v, st.gatePending.x), cy(v, st.gatePending.y), v.cell * 0.27, 0, Math.PI * 2);
      st.ctx.stroke();
      st.ctx.setLineDash([]);
    }
    st.ctx.restore();
  }

  function studioCell(e) {
    const r = $("studio-board").getBoundingClientRect();
    const v = st.view;
    const x = Math.floor((e.clientX - r.left - v.pad) / v.cell);
    const y = Math.floor((e.clientY - r.top - v.pad) / v.cell);
    if (x < 0 || y < 0 || x >= st.cols || y >= st.rows) return null;
    return { x, y };
  }

  $("studio-board").addEventListener("pointerdown", (e) => {
    A.resume();
    const c = studioCell(e);
    if (!c) return;
    const k = c.x + "," + c.y;
    if (st.tool === "erase") {
      delete st.cells[k];
      st.gatePairs = st.gatePairs.filter((p) => !(p.x === c.x && p.y === c.y));
      st.v++;
      A.click(260);
      return;
    }
    if (st.tool === "gate") {
      st.gatePairs = st.gatePairs.filter((p) => !(p.x === c.x && p.y === c.y));
      delete st.cells[k];
      st.gatePairs.push({ x: c.x, y: c.y });
      st.v++;
      A.click(760);
      return;
    }
    st.gatePairs = st.gatePairs.filter((p) => !(p.x === c.x && p.y === c.y));
    if (st.tool === "src") {
      for (const kk in st.cells) if (st.cells[kk].t === "src") delete st.cells[kk];
    }
    st.cells[k] = { t: st.tool };
    st.v++;
    if (S.COLORS[st.tool]) A.bell(S.COLORS[st.tool].note, null, 0.3);
    else A.click(500);
  });

  function studioWave() {
    A.resume();
    const level = buildStudioLevel(); // نسخة طازجة كي لا تتراكم البوّابات
    // البوّابات تُضاف للّوحة
    for (let i = 0; i + 1 < st.gatePairs.length; i += 2) {
      level.gates.push([st.gatePairs[i].x, st.gatePairs[i].y, st.gatePairs[i + 1].x, st.gatePairs[i + 1].y]);
    }
    const bells = [];
    for (const k in st.cells) {
      const c = st.cells[k];
      if (S.COLORS[c.t]) {
        const [x, y] = k.split(",").map(Number);
        bells.push({ x, y, c: c.t });
      }
    }
    const w = S.waveFor(level, bells);
    A.whoosh(0.14);
    st.fx = { t: 0, playing: true, dist: w.dist, ringing: [], litNow: new Set() };
    const rang = new Set();
    const t0 = performance.now();
    const step = (now) => {
      if (ui.screen !== "studio") return;
      const t = ((now - t0) / 1000) * 4;
      st.fx.t = t;
      for (const bs of w.bellSteps) {
        if (bs.step < 0) continue;
        const key = bs.bell.x + "," + bs.bell.y;
        if (t >= bs.step && !rang.has(key)) {
          rang.add(key);
          A.bell(S.COLORS[bs.bell.c].note, null, 0.5);
          st.fx.ringing.push({ x: bs.bell.x, y: bs.bell.y, age: 0 });
        }
      }
      for (let i = 0; i < w.dist.length; i++) if (w.lit.has(i) && t >= w.dist[i]) st.fx.litNow.add(i);
      st.fx.ringing.forEach((r) => (r.age += 0.026));
      st.fx.ringing = st.fx.ringing.filter((r) => r.age < 1);
      if (t < w.maxStep + 1.6) requestAnimationFrame(step);
      else st.fx = { t: 0, playing: false };
    };
    requestAnimationFrame(step);
  }

  /* ══════════ ربط الأزرار ══════════ */
  $("btn-play").addEventListener("click", () => {
    A.resume();
    let i = LEVELS.findIndex((l) => !store.data.done[l.id]);
    if (i < 0) i = 0;
    openLevel(i);
  });
  $("btn-back").addEventListener("click", () => { A.click(340); show("menu"); });
  $("btn-help").addEventListener("click", () => $("help-modal").classList.remove("hidden"));
  $("btn-help2").addEventListener("click", () => $("help-modal").classList.remove("hidden"));
  $("btn-help-close").addEventListener("click", () => closeModals());
  $("help-modal").addEventListener("click", (e) => { if (e.target.id === "help-modal") closeModals(); });
  $("btn-reset").addEventListener("click", () => {
    if (confirm("تصفير كل التقدّم والنجوم؟")) { store.reset(); renderMenu(); }
  });
  $("btn-play-wave").addEventListener("click", () => playWave(false));
  $("btn-undo").addEventListener("click", undo);
  $("btn-restart").addEventListener("click", restart);
  $("btn-hint").addEventListener("click", hint);
  $("btn-prev").addEventListener("click", () => openLevel(ui.idx - 1));
  $("btn-next").addEventListener("click", () => openLevel(ui.idx + 1));
  $("btn-hear-target").addEventListener("click", () => {
    A.resume();
    let t = A.now() + 0.08;
    for (const beat of ui.level.target) {
      for (const c of beat) A.bell(S.COLORS[c].note, t, 0.42);
      t += 0.42;
    }
    [...document.querySelectorAll("#target-beats .beat")].forEach((el, k) => {
      setTimeout(() => {
        highlightBeat(k);
        setTimeout(() => highlightBeat(-1), 330);
      }, 80 + k * 420);
    });
  });
  function toggleSound() {
    const m = !A.isMuted();
    A.resume();
    A.setMuted(m);
    store.data.sound = !m;
    store.save();
    syncSound();
    if (!m) A.click(700);
  }
  function syncSound() {
    const on = !A.isMuted();
    $("btn-sound").classList.toggle("on", on);
    $("btn-sound").textContent = on ? "♪" : "✕";
    $("btn-sound2").classList.toggle("on", on);
    $("btn-sound2").textContent = on ? "♪" : "✕";
  }
  $("btn-sound").addEventListener("click", toggleSound);
  $("btn-sound2").addEventListener("click", toggleSound);
  $("btn-win-next").addEventListener("click", () => { closeModals(); openLevel(ui.idx + 1); });
  $("btn-win-again").addEventListener("click", () => { closeModals(); playWave(false); });
  $("btn-win-menu").addEventListener("click", () => { closeModals(); show("menu"); });
  $("win-modal").addEventListener("click", (e) => { if (e.target.id === "win-modal") closeModals(); });

  $("btn-studio-open").addEventListener("click", () => { A.resume(); show("studio"); });
  $("btn-studio-back").addEventListener("click", () => show("menu"));
  $("btn-studio-play").addEventListener("click", studioWave);
  $("btn-studio-clear").addEventListener("click", () => { st.cells = {}; st.gatePairs = []; A.click(300); });
  $("btn-studio-size").addEventListener("click", () => {
    const sizes = [[9, 7], [11, 8], [7, 7], [13, 9]];
    const cur = sizes.findIndex((s) => s[0] === st.cols && s[1] === st.rows);
    const next = sizes[(cur + 1) % sizes.length];
    st.cols = next[0];
    st.rows = next[1];
    st.cells = {};
    st.gatePairs = [];
    st.v++;
    resize();
    A.click(500);
  });

  /* ══════════ إقلاع ══════════ */
  syncSound();
  renderMenu();
  show("menu");
  requestAnimationFrame((t) => { last = t; frame(t); });
  // أي لمسة أولى تُوقظ الصوت
  window.addEventListener("pointerdown", () => A.resume(), { once: true });
})();
