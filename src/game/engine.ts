import type { Cell, ColorId, Dir, DropFx, Game, LevelDef, Pos, Special } from "./types";

export const ALL_COLORS: ColorId[] = [
  "berry",
  "kiwi",
  "mango",
  "blue",
  "grape",
  "orange",
  "melon",
  "banana",
  "peach",
  "pine",
];

export const COLOR_META: Record<
  ColorId,
  { name: string; hex: string; deep: string; art: string }
> = {
  berry: { name: "فراولة", hex: "#ff2d4a", deep: "#a01028", art: "art/fruit-berry.png" },
  kiwi: { name: "كيوي", hex: "#7ad000", deep: "#3a7a00", art: "art/fruit-kiwi.png" },
  mango: { name: "مانجو", hex: "#ffb000", deep: "#c46a00", art: "art/fruit-mango.png" },
  blue: { name: "توت", hex: "#4a7cff", deep: "#1a3a9a", art: "art/fruit-blue.png" },
  grape: { name: "عنب", hex: "#c44bff", deep: "#6a0088", art: "art/fruit-grape.png" },
  orange: { name: "برتقال", hex: "#ff7a18", deep: "#b34500", art: "art/fruit-orange.png" },
  melon: { name: "بطيخ", hex: "#ff4a6a", deep: "#9a1028", art: "art/fruit-melon.png" },
  banana: { name: "موز", hex: "#ffe14a", deep: "#c4a000", art: "art/fruit-banana.png" },
  peach: { name: "خوخ", hex: "#ff8a6a", deep: "#c44a38", art: "art/fruit-peach.png" },
  pine: { name: "أناناس", hex: "#e6c84a", deep: "#8a7a10", art: "art/fruit-pine.png" },
};

let nid = 1;
function uid() {
  nid += 1;
  return nid;
}

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inb(g: Game, r: number, c: number) {
  return r >= 0 && c >= 0 && r < g.rows && c < g.cols;
}

function parseIce(level: LevelDef): number[][] {
  return Array.from({ length: level.rows }, (_, r) =>
    Array.from({ length: level.cols }, (_, c) => {
      const ch = level.ice[r]?.[c] ?? ".";
      return ch === "2" ? 2 : ch === "1" ? 1 : 0;
    })
  );
}

function iceNeed(ice: number[][]) {
  return ice.reduce((a, row) => a + row.reduce((b, n) => b + (n > 0 ? 1 : 0), 0), 0);
}

function emptyCollected(): Record<ColorId, number> {
  const o = {} as Record<ColorId, number>;
  for (const c of ALL_COLORS) o[c] = 0;
  return o;
}

function makeCell(color: ColorId, special: Special = "none"): Cell {
  return { id: uid(), color, special };
}

function pickColor(rng: () => number, colors: ColorId[], forbid: ColorId[]) {
  const pool = colors.filter((c) => !forbid.includes(c));
  const src = pool.length ? pool : colors;
  return src[Math.floor(rng() * src.length)]!;
}

function colorAt(grid: (Cell | null)[][], r: number, c: number, rows: number, cols: number): ColorId | null {
  if (r < 0 || c < 0 || r >= rows || c >= cols) return null;
  return grid[r]![c]?.color ?? null;
}

function fillWithoutMatch(rows: number, cols: number, colors: ColorId[], rng: () => number): (Cell | null)[][] {
  const grid: (Cell | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const forbid: ColorId[] = [];
      const left1 = colorAt(grid, r, c - 1, rows, cols);
      const left2 = colorAt(grid, r, c - 2, rows, cols);
      if (left1 && left1 === left2) forbid.push(left1);
      const up1 = colorAt(grid, r - 1, c, rows, cols);
      const up2 = colorAt(grid, r - 2, c, rows, cols);
      if (up1 && up1 === up2) forbid.push(up1);
      grid[r]![c] = makeCell(pickColor(rng, colors, forbid));
    }
  }
  return grid;
}

type Run = { cells: Pos[]; dir: "h" | "v"; color: ColorId };

function runsOf(g: Game): Run[] {
  const rows = g.rows;
  const cols = g.cols;
  const out: Run[] = [];
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const cell = g.grid[r]![c];
      if (!cell) {
        c++;
        continue;
      }
      const start = c;
      while (c < cols && g.grid[r]![c]?.color === cell.color) c++;
      if (c - start >= 3) {
        const cells: Pos[] = [];
        for (let k = start; k < c; k++) cells.push({ r, c: k });
        out.push({ cells, dir: "h", color: cell.color });
      }
    }
  }
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const cell = g.grid[r]![c];
      if (!cell) {
        r++;
        continue;
      }
      const start = r;
      while (r < rows && g.grid[r]![c]?.color === cell.color) r++;
      if (r - start >= 3) {
        const cells: Pos[] = [];
        for (let k = start; k < r; k++) cells.push({ r: k, c });
        out.push({ cells, dir: "v", color: cell.color });
      }
    }
  }
  return out;
}

function uniquePos(runs: Run[]): Pos[] {
  const seen = new Set<string>();
  const out: Pos[] = [];
  for (const run of runs) {
    for (const p of run.cells) {
      const k = `${p.r},${p.c}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(p);
      }
    }
  }
  return out;
}

function swapCells(g: Game, a: Pos, b: Pos) {
  const t = g.grid[a.r]![a.c]!;
  g.grid[a.r]![a.c] = g.grid[b.r]![b.c]!;
  g.grid[b.r]![b.c] = t;
}

function adjacent(a: Pos, b: Pos) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export function stepDir(from: Pos, dir: Dir, n = 1): Pos {
  if (dir === "up") return { r: from.r - n, c: from.c };
  if (dir === "down") return { r: from.r + n, c: from.c };
  if (dir === "left") return { r: from.r, c: from.c - n };
  return { r: from.r, c: from.c + n };
}

export function swipeGoal(g: Game, from: Pos, dir: Dir): Pos | null {
  const to = stepDir(from, dir, 1);
  if (!inb(g, to.r, to.c)) return null;
  return to;
}

export function findHint(g: Game): [Pos, Pos] | null {
  const rows = g.rows;
  const cols = g.cols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = { r, c };
      for (const b of [
        { r, c: c + 1 },
        { r: r + 1, c },
      ]) {
        if (!inb(g, b.r, b.c)) continue;
        if (canSwap(g, a, b)) return [a, b];
      }
    }
  }
  return null;
}

function specialOf(g: Game, p: Pos): Special {
  return g.grid[p.r]![p.c]?.special ?? "none";
}

function specialSwap(g: Game, a: Pos, b: Pos) {
  const sa = specialOf(g, a);
  const sb = specialOf(g, b);
  return sa !== "none" || sb !== "none";
}

function crackIce(g: Game, cells: Pos[], power = 1) {
  for (const p of cells) {
    if (!inb(g, p.r, p.c)) continue;
    g.ice[p.r]![p.c] = Math.max(0, g.ice[p.r]![p.c]! - power);
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const rr = p.r + dr;
      const cc = p.c + dc;
      if (inb(g, rr, cc)) g.ice[rr]![cc] = Math.max(0, g.ice[rr]![cc]! - 1);
    }
  }
}

export function paintCross(g: Game, origin: Pos, color: ColorId): Pos[] {
  const out: Pos[] = [];
  const seen = new Set<string>();
  const paint = (p: Pos) => {
    const k = `${p.r},${p.c}`;
    if (seen.has(k) || !inb(g, p.r, p.c)) return;
    const cell = g.grid[p.r]![p.c];
    if (!cell || cell.special === "prism") return;
    seen.add(k);
    cell.color = color;
    cell.special = "none";
    out.push(p);
  };
  for (let c = 0; c < g.cols; c++) paint({ r: origin.r, c });
  for (let r = 0; r < g.rows; r++) paint({ r, c: origin.c });
  crackIce(g, out, 1);
  return out;
}

export function wipeColor(g: Game, color: ColorId): Pos[] {
  const cells: Pos[] = [];
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      if (g.grid[r]![c]?.color === color) cells.push({ r, c });
    }
  }
  tally(g, cells);
  crackIce(g, cells, 1);
  for (const p of cells) g.grid[p.r]![p.c] = null;
  return cells;
}

function triggerSpecials(g: Game, cells: Pos[]): Pos[] {
  const extra: Pos[] = [];
  const seen = new Set<string>();
  const add = (p: Pos) => {
    const k = `${p.r},${p.c}`;
    if (seen.has(k) || !inb(g, p.r, p.c)) return;
    seen.add(k);
    extra.push(p);
  };
  for (const p of cells) add(p);
  return extra;
}

function spawnSpecial(g: Game, runs: Run[], origin: Pos | null): Special {
  if (!origin) return "none";
  const five = runs.find((r) => r.cells.length >= 5);
  const four = runs.find((r) => r.cells.length === 4);
  const cross = (() => {
    const map = new Map<string, number>();
    for (const run of runs)
      for (const p of run.cells) {
        const k = `${p.r},${p.c}`;
        map.set(k, (map.get(k) ?? 0) + 1);
      }
    return [...map.values()].some((n) => n >= 2);
  })();
  if (five) {
    const place = inb(g, origin.r, origin.c) ? origin : five.cells[0]!;
    const color = g.grid[place.r]![place.c]?.color ?? five.color;
    g.grid[place.r]![place.c] = makeCell(color, "prism");
    return "prism";
  }
  if (four || cross) return "juice";
  return "none";
}

function tally(g: Game, cells: Pos[]) {
  for (const p of cells) {
    const col = g.grid[p.r]![p.c]?.color;
    if (col) g.collected[col] += 1;
  }
}

export function applyClear(
  g: Game,
  cells: Pos[],
  origin: Pos | null,
  runs: Run[]
): { kind: "clear"; cells: Pos[]; specials: Special[]; cracked: boolean; painted: Pos[] } {
  const specials: Special[] = [];
  for (const p of cells) {
    const sp = g.grid[p.r]![p.c]?.special;
    if (sp && sp !== "none") specials.push(sp);
  }
  const blown = triggerSpecials(g, cells);
  const iceBefore = iceNeed(g.ice);
  const at = !origin
    ? null
    : blown.some((p) => p.r === origin.r && p.c === origin.c)
      ? origin
      : (blown[Math.floor(blown.length / 2)] ?? origin);
  const born = spawnSpecial(g, runs, at);
  if (born !== "none") specials.push(born);

  let painted: Pos[] = [];
  if (born === "juice" && at) {
    const color = g.grid[at.r]![at.c]?.color ?? "mango";
    painted = paintCross(g, at, color);
    g.combo += 1;
    return { kind: "clear", cells: blown, specials, cracked: iceNeed(g.ice) < iceBefore, painted };
  }

  const keep = new Set<string>();
  if (born === "prism" && at) keep.add(`${at.r},${at.c}`);
  tally(
    g,
    blown.filter((p) => !keep.has(`${p.r},${p.c}`))
  );
  crackIce(g, blown, 1);
  for (const p of blown) {
    if (keep.has(`${p.r},${p.c}`)) continue;
    g.grid[p.r]![p.c] = null;
  }
  g.score += blown.length * 40 * Math.max(1, g.combo);
  g.combo += 1;
  return { kind: "clear", cells: blown, specials, cracked: iceNeed(g.ice) < iceBefore, painted };
}

export function explodeCells(g: Game, cells: Pos[]): { cracked: boolean } {
  const iceBefore = iceNeed(g.ice);
  tally(g, cells);
  crackIce(g, cells, 1);
  for (const p of cells) {
    if (inb(g, p.r, p.c)) g.grid[p.r]![p.c] = null;
  }
  g.score += cells.length * 40 * Math.max(1, g.combo);
  return { cracked: iceNeed(g.ice) < iceBefore };
}

export function applyGravity(g: Game): DropFx[] {
  const rows = g.rows;
  const cols = g.cols;
  const drops: DropFx[] = [];
  for (let c = 0; c < cols; c++) {
    let write = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      const cell = g.grid[r]![c];
      if (cell) {
        if (write !== r) {
          drops.push({ id: cell.id, dist: write - r });
          g.grid[write]![c] = cell;
          g.grid[r]![c] = null;
        }
        write--;
      }
    }
  }
  return drops;
}

export function applyFill(g: Game, rng: () => number): number[] {
  const rows = g.rows;
  const cols = g.cols;
  const born: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!g.grid[r]![c]) {
        const cell = makeCell(pickColor(rng, g.colors, []));
        g.grid[r]![c] = cell;
        born.push(cell.id);
      }
    }
  }
  return born;
}

export function matchCells(g: Game): { runs: Run[]; cells: Pos[] } {
  const runs = runsOf(g);
  return { runs, cells: uniquePos(runs) };
}

export function tryActivateSpecial(
  g: Game,
  a: Pos,
  b: Pos
): { special: Special; cells: Pos[]; cracked: boolean; painted: Pos[] } | null {
  const sa = g.grid[a.r]![a.c]?.special ?? "none";
  const sb = g.grid[b.r]![b.c]?.special ?? "none";
  if (sa === "none" && sb === "none") return null;
  const iceBefore = iceNeed(g.ice);

  if (sa === "prism" || sb === "prism") {
    const other = sa === "prism" ? b : a;
    const prism = sa === "prism" ? a : b;
    const otherSp = g.grid[other.r]![other.c]?.special ?? "none";
    let cells: Pos[] = [];
    if (otherSp === "prism") {
      for (let r = 0; r < g.rows; r++)
        for (let c = 0; c < g.cols; c++) if (g.grid[r]![c]) cells.push({ r, c });
      tally(g, cells);
      crackIce(g, cells, 1);
      for (const p of cells) g.grid[p.r]![p.c] = null;
    } else {
      const col = g.grid[other.r]![other.c]?.color;
      if (g.grid[prism.r]![prism.c]) g.grid[prism.r]![prism.c] = null;
      if (col) cells = wipeColor(g, col);
    }
    g.score += cells.length * 60;
    g.combo += 1;
    return { special: "prism", cells, cracked: iceNeed(g.ice) < iceBefore, painted: [] };
  }

  const juiceAt = sa === "juice" ? a : sb === "juice" ? b : null;
  if (juiceAt) {
    const color = g.grid[juiceAt.r]![juiceAt.c]?.color ?? "mango";
    const painted = paintCross(g, juiceAt, color);
    g.score += painted.length * 20;
    g.combo += 1;
    return { special: "juice", cells: painted, cracked: iceNeed(g.ice) < iceBefore, painted };
  }
  return null;
}

export function wouldMatch(g: Game, a: Pos, b: Pos) {
  swapCells(g, a, b);
  const ok = runsOf(g).length > 0;
  swapCells(g, a, b);
  return ok;
}

export function canSwap(g: Game, a: Pos, b: Pos) {
  if (g.status !== "play") return false;
  if (!adjacent(a, b)) return false;
  if (!inb(g, a.r, a.c) || !inb(g, b.r, b.c)) return false;
  if (!g.grid[a.r]![a.c] || !g.grid[b.r]![b.c]) return false;
  return wouldMatch(g, a, b) || specialSwap(g, a, b);
}

export function doSwap(g: Game, a: Pos, b: Pos) {
  swapCells(g, a, b);
}

export function afterTurn(g: Game) {
  g.combo = 1;
  g.selected = null;
  g.hint = null;
  if (g.status !== "play") return;
  g.moves -= 1;
  finishCheck(g);
}

export function goalsLeft(g: Game) {
  return g.level.goals.reduce((n, gl) => n + Math.max(0, gl.need - (g.collected[gl.color] ?? 0)), 0);
}

export function iceLeft(g: Game) {
  return iceNeed(g.ice);
}

export function finishCheck(g: Game) {
  if (goalsLeft(g) <= 0 && iceLeft(g) <= 0) {
    g.status = "won";
    const left = g.moves;
    g.stars = left >= Math.max(6, Math.floor(g.maxMoves * 0.35)) ? 3 : left >= 3 ? 2 : 1;
  } else if (g.moves <= 0) {
    g.status = "lost";
    g.stars = 0;
  }
}

function shuffle(g: Game, rng: () => number) {
  const cells: Cell[] = [];
  for (const row of g.grid) for (const c of row) if (c) cells.push(c);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = cells[i]!;
    cells[i] = cells[j]!;
    cells[j] = t;
  }
  let k = 0;
  for (let r = 0; r < g.rows; r++)
    for (let c = 0; c < g.cols; c++) g.grid[r]![c] = cells[k++] ?? makeCell(g.colors[0]!);
}

export function ensureMoves(g: Game, rng: () => number) {
  let guard = 0;
  while (!findHint(g) && guard < 12) {
    shuffle(g, rng);
    guard++;
  }
  g.hint = null;
}

export function createGame(level: LevelDef): { game: Game; rng: () => number } {
  const rng = mulberry(level.id * 9176 + 13);
  const colorCount = level.colorCount;
  const moves = level.moves;
  const ice = parseIce(level);
  const goals = level.goals.map((gl) => ({ ...gl }));

  const needed = [...new Set(goals.map((gl) => gl.color))];
  const extras = ALL_COLORS.filter((c) => !needed.includes(c));
  const nColors = Math.max(colorCount, needed.length);
  const colors = [...needed, ...extras].slice(0, nColors);
  const grid = fillWithoutMatch(level.rows, level.cols, colors, rng);
  const game: Game = {
    level: { ...level, goals, moves },
    rows: level.rows,
    cols: level.cols,
    colors,
    grid,
    ice,
    collected: emptyCollected(),
    difficulty: "mid",
    moves,
    maxMoves: moves,
    score: 0,
    combo: 1,
    selected: null,
    hint: null,
    status: "play",
    stars: 0,
    needIce: iceNeed(ice),
  };
  ensureMoves(game, rng);
  return { game, rng };
}

export const COMBO_NAME = ["", "", "يا سلام", "تسبيكة", "كوكتيل", "طيف"];
