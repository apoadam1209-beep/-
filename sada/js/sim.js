/* صَدَى — محرّك اللغز (منطق الموجة + الحلّال)
 * يعمل في المتصفح وفي Node (لأغراض التحقّق الآلي من المراحل).
 */
(function (root) {
  "use strict";
  const SADA = (root.SADA = root.SADA || {});

  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  /* سلّم خماسي (pentatonic) — أي اجتماع للأجراس يبقى مستساغاً */
  const COLORS = {
    r: { ar: "أحمر", hex: "#ff6b81", note: 261.63 }, // دو
    y: { ar: "أصفر", hex: "#ffcf5c", note: 293.66 }, // ري
    g: { ar: "أخضر", hex: "#4fd6a0", note: 329.63 }, // مي
    b: { ar: "أزرق", hex: "#5aa9ff", note: 392.0 }, // صول
    v: { ar: "بنفسجي", hex: "#b98cff", note: 440.0 }, // لا
  };
  const COLOR_ORDER = ["r", "y", "g", "b", "v"];
  SADA.COLORS = COLORS;
  SADA.COLOR_ORDER = COLOR_ORDER;

  /* ---------- أدوات ---------- */
  const idxOf = (level, x, y) => y * level.cols + x;
  const xyOf = (level, i) => [i % level.cols, Math.floor(i / level.cols)];
  SADA.idxOf = idxOf;
  SADA.xyOf = xyOf;

  function pts(str) {
    return (str || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((s) => {
        const [x, y] = s.split(",").map(Number);
        return [x, y];
      });
  }

  /** يحوّل تعريف المرحلة المختصر إلى كائن كامل */
  function parseLevel(raw) {
    const level = {
      raw,
      id: raw.id,
      name: raw.name || "",
      chapter: raw.chapter || 1,
      tip: raw.tip || "",
      cols: raw.cols,
      rows: raw.rows,
      sources: pts(raw.src),
      walls: pts(raw.walls),
      lanterns: pts(raw.lanterns),
      gates: (raw.gates || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((s) => {
          const [a, b] = s.split(">");
          const [ax, ay] = a.split(",").map(Number);
          const [bx, by] = b.split(",").map(Number);
          return [ax, ay, bx, by];
        }),
      fixed: (raw.fixed || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((s) => {
          const [p, c] = s.split(":");
          const [x, y] = p.split(",").map(Number);
          return { x, y, c };
        }),
      supply: {},
      bellCount: 0,
      target: (raw.target || "")
        .split("|")
        .map((g) => g.trim().split(/\s+/).filter(Boolean))
        .filter((g) => g.length),
    };
    (raw.bells || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .forEach((c) => {
        level.supply[c] = (level.supply[c] || 0) + 1;
        level.bellCount++;
      });
    // تسهيل التأليف: إذا عُيّنت الخلايا المفتوحة فكلّ ما عداها جدار
    if (raw.open) {
      const open = new Set(pts(raw.open).map(([x, y]) => y * level.cols + x));
      const walls = [];
      for (let y = 0; y < level.rows; y++)
        for (let x = 0; x < level.cols; x++) if (!open.has(y * level.cols + x)) walls.push([x, y]);
      level.walls = walls;
    }
    return level;
  }
  SADA.parseLevel = parseLevel;

  /** خلايا لا يجوز وضع جرسٍ عليها */
  function blockedSet(level) {
    const s = new Set();
    const add = (x, y) => s.add(idxOf(level, x, y));
    level.walls.forEach(([x, y]) => add(x, y));
    level.sources.forEach(([x, y]) => add(x, y));
    level.lanterns.forEach(([x, y]) => add(x, y));
    level.gates.forEach(([ax, ay, bx, by]) => {
      add(ax, ay);
      add(bx, by);
    });
    return s;
  }
  SADA.blockedSet = blockedSet;

  /**
   * خريطة المسافات: عدد الخطوات حتى تصل الموجة لكل خلية (-1 = في الظل).
   * الأجراس لا تعيق الموجة، لذلك الخريطة ثابتة مهما تغيّر ترتيب الأجراس.
   */
  function computeDist(level) {
    const { cols, rows } = level;
    const n = cols * rows;
    const dist = new Int32Array(n).fill(-1);
    const wall = new Set(level.walls.map(([x, y]) => idxOf(level, x, y)));
    const gatePartner = new Map();
    for (const [ax, ay, bx, by] of level.gates) {
      gatePartner.set(idxOf(level, ax, ay), idxOf(level, bx, by));
      gatePartner.set(idxOf(level, bx, by), idxOf(level, ax, ay));
    }
    const buckets = [[]];
    for (const [x, y] of level.sources) {
      const k = idxOf(level, x, y);
      if (dist[k] === -1) {
        dist[k] = 0;
        buckets[0].push(k);
      }
    }
    const push = (k, step) => {
      if (dist[k] !== -1) return;
      dist[k] = step;
      (buckets[step] || (buckets[step] = [])).push(k);
    };
    for (let s = 0; s < buckets.length; s++) {
      const cur = buckets[s];
      if (!cur) continue;
      for (const k of cur) {
        const x = k % cols;
        const y = (k - x) / cols;
        for (const [dx, dy] of DIRS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const nk = idxOf(level, nx, ny);
          if (wall.has(nk)) continue;
          push(nk, s + 1);
        }
        if (gatePartner.has(k)) {
          const nk = gatePartner.get(k);
          if (!wall.has(nk)) push(nk, s + 1);
        }
      }
    }
    return dist;
  }
  SADA.computeDist = computeDist;

  const sameMultiset = (a, b) => {
    if (a.length !== b.length) return false;
    const A = a.slice().sort().join("");
    const B = b.slice().sort().join("");
    return A === B;
  };

  /**
   * يعزف اللوحة: يعيد زمن رنين كل جرس وترتيب النغمات (النبضات).
   * bells: [{x,y,c}] (تشمل الأجراس المثبّتة)
   */
  function waveFor(level, bells) {
    const dist = computeDist(level);
    const steps = [];
    let maxStep = 0;
    for (let i = 0; i < dist.length; i++) if (dist[i] > maxStep) maxStep = dist[i];
    const bellSteps = bells.map((b) => {
      const d = dist[idxOf(level, b.x, b.y)];
      return { bell: b, step: d };
    });
    const byStep = new Map();
    for (const bs of bellSteps) {
      if (bs.step < 0) continue;
      if (!byStep.has(bs.step)) byStep.set(bs.step, []);
      byStep.get(bs.step).push(bs.bell.c);
    }
    const beats = [...byStep.keys()]
      .sort((a, b) => a - b)
      .map((step) => ({ step, colors: byStep.get(step) }));
    const lit = new Set();
    for (const [x, y] of level.lanterns) {
      const d = dist[idxOf(level, x, y)];
      if (d >= 0) lit.add(idxOf(level, x, y));
    }
    return { dist, bellSteps, beats, maxStep, lit };
  }
  SADA.waveFor = waveFor;

  /** يفحص الحلّ ويعيد سبب الفشل إن وُجد
   *  ملاحظة: المشاعل (lanterns) زينة تُضاء مع الموجة وليست شرط فوز،
   *  لأن وصول الموجة إليها ثابت لا يتأثّر بمواضع الأجراس. */
  function check(level, bells) {
    const need = level.supply;
    const have = {};
    for (const b of bells) have[b.c] = (have[b.c] || 0) + 1;
    for (const c of COLOR_ORDER) {
      if ((have[c] || 0) < (need[c] || 0)) {
        return { ok: false, reason: "incomplete", message: "لم تضع كل الأجراس بعد." };
      }
    }
    const w = waveFor(level, bells);
    const dark = w.bellSteps.filter((b) => b.step < 0);
    if (dark.length) {
      return {
        ok: false,
        reason: "shadow",
        message:
          dark.length === 1
            ? "جرسٌ واحد في الظلّ… الموجة لا تصل إليه أبداً."
            : `${dark.length} أجراس في الظلّ… الموجة لا تصل إليها.`,
        beats: w.beats,
      };
    }
    const t = level.target;
    const g = w.beats;
    if (g.length !== t.length) {
      return {
        ok: false,
        reason: "order",
        message: g.length < t.length ? "اللحن أقصر من المطلوب… بعض النغمات تتصادم." : "اللحن أطول من المطلوب… فرِّق الأجراس.",
        beats: w.beats,
      };
    }
    for (let i = 0; i < t.length; i++) {
      if (!sameMultiset(t[i], g[i].colors)) {
        return { ok: false, reason: "order", message: `النبضة ${i + 1} لا تطابق المطلوب.`, beats: w.beats, beat: i };
      }
    }
    return { ok: true, beats: w.beats, message: "اللحن اكتمل ✦" };
  }
  SADA.check = check;

  /* ---------- الحلّال: يعدّ كل الحلول الممكنة ويعيد أحدها ---------- */
  function fact(n) {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  function solve(level) {
    const dist = computeDist(level);
    for (const [x, y] of level.lanterns) {
      if (dist[idxOf(level, x, y)] < 0) return { ok: false, reason: "lantern-unreachable", count: 0, sample: null };
    }
    const blocked = blockedSet(level);
    const fixedIdx = new Map(level.fixed.map((f) => [idxOf(level, f.x, f.y), f]));
    // خلايا حرة قابلة للاستعمال، مجمّعة حسب مسافتها
    const cellsAt = new Map(); // d -> [idx]
    for (let i = 0; i < dist.length; i++) {
      if (blocked.has(i) || fixedIdx.has(i)) continue;
      const d = dist[i];
      if (d < 1) continue;
      if (!cellsAt.has(d)) cellsAt.set(d, []);
      cellsAt.get(d).push(i);
    }
    const candSet = new Set(cellsAt.keys());
    for (const f of level.fixed) {
      const d = dist[idxOf(level, f.x, f.y)];
      if (d < 1) return { ok: false, reason: "fixed-in-shadow", count: 0, sample: null };
      candSet.add(d);
    }
    const cand = [...candSet].sort((a, b) => a - b);
    const m = level.target.length;
    if (m > cand.length) return { ok: false, reason: "no-distance-values", count: 0, sample: null };

    const counts = level.target.map((beat) => {
      const o = {};
      for (const c of beat) o[c] = (o[c] || 0) + 1;
      return o;
    });
    const fixedSteps = level.fixed.map((f) => ({ f, d: dist[idxOf(level, f.x, f.y)] }));

    let total = 0;
    let sample = null;

    const evaluate = (chosen) => {
      // chosen: [d1<d2<...<dm]
      const posOfD = new Map(chosen.map((d, i) => [d, i]));
      const freeCounts = counts.map((o) => ({ ...o }));
      for (const { f, d } of fixedSteps) {
        const i = posOfD.get(d);
        if (i === undefined) return; // جرس مثبّت لا تنتمي مسافته لأي نبضة
        if (!freeCounts[i][f.c]) return; // لونه غير مطلوب في هذه النبضة
        freeCounts[i][f.c]--;
      }
      let ways = 1;
      for (let i = 0; i < m; i++) {
        let k = 0;
        for (const c of COLOR_ORDER) k += freeCounts[i][c] || 0;
        const avail = (cellsAt.get(chosen[i]) || []).length;
        if (avail < k) return;
        // P(avail,k) / ∏ (عدد كل لون)!
        let p = 1;
        for (let j = 0; j < k; j++) p *= avail - j;
        let denom = 1;
        for (const c of COLOR_ORDER) denom *= fact(freeCounts[i][c] || 0);
        ways *= p / denom;
      }
      total += ways;
      if (!sample) {
        // نبني حلاًّ عينياً
        const used = new Set(level.fixed.map((f) => idxOf(level, f.x, f.y)));
        const out = level.fixed.map((f) => ({ x: f.x, y: f.y, c: f.c }));
        for (let i = 0; i < m; i++) {
          const pool = (cellsAt.get(chosen[i]) || []).filter((ci) => !used.has(ci));
          const need = [];
          for (const c of COLOR_ORDER) for (let j = 0; j < (freeCounts[i][c] || 0); j++) need.push(c);
          for (let j = 0; j < need.length; j++) {
            const [x, y] = xyOf(level, pool[j]);
            out.push({ x, y, c: need[j] });
            used.add(pool[j]);
          }
        }
        sample = out;
      }
    };

    const pick = (start, acc) => {
      if (acc.length === m) return evaluate(acc.slice());
      for (let i = start; i < cand.length; i++) {
        acc.push(cand[i]);
        pick(i + 1, acc);
        acc.pop();
      }
    };
    pick(0, []);
    return { ok: total > 0, count: total, sample };
  }
  SADA.solve = solve;

  /** تلميح: يعيد موضع جرسٍ من حلٍّ صحيح لم يُوضع بعد بشكل صحيح */
  function hint(level, bells) {
    const s = solve(level);
    if (!s.ok || !s.sample) return null;
    const placed = new Set(bells.map((b) => idxOf(level, b.x, b.y)));
    for (const h of s.sample) {
      const i = idxOf(level, h.x, h.y);
      const existing = bells.find((b) => idxOf(level, b.x, b.y) === i);
      if (!existing || existing.c !== h.c) return h;
    }
    return null;
  }
  SADA.hint = hint;

  /** خريطة نصّية للمرحلة (للتحقّق والتصحيح) */
  function ascii(level, dist) {
    const d = dist || computeDist(level);
    const wall = new Set(level.walls.map(([x, y]) => idxOf(level, x, y)));
    const src = new Set(level.sources.map(([x, y]) => idxOf(level, x, y)));
    const lan = new Set(level.lanterns.map(([x, y]) => idxOf(level, x, y)));
    const gate = new Map();
    level.gates.forEach(([ax, ay, bx, by], i) => {
      const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i] || "?";
      gate.set(idxOf(level, ax, ay), L);
      gate.set(idxOf(level, bx, by), L);
    });
    const fixed = new Map(level.fixed.map((f) => [idxOf(level, f.x, f.y), f.c.toUpperCase()]));
    const lines = [];
    for (let y = 0; y < level.rows; y++) {
      let row = "";
      for (let x = 0; x < level.cols; x++) {
        const i = idxOf(level, x, y);
        let ch;
        if (wall.has(i)) ch = " #";
        else if (src.has(i)) ch = " S";
        else if (gate.has(i)) ch = " " + gate.get(i);
        else if (lan.has(i)) ch = " L";
        else if (fixed.has(i)) ch = " " + fixed.get(i);
        else if (d[i] < 0) ch = " ·";
        else ch = String(d[i]).padStart(2, " ");
        row += ch;
      }
      lines.push(row);
    }
    return lines.join("\n");
  }
  SADA.ascii = ascii;
})(typeof window !== "undefined" ? window : globalThis);
