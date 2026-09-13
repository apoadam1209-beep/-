import type { Cell, ColorId, Difficulty, Dir, DropFx, Game, LevelDef, Pos, Special } from "./types";

export const ALL_COLORS: ColorId[] = ["berry", "kiwi", "mango", "blue", "grape"];

export const COLOR_META: Record<
  ColorId,
  { name: string; hex: string; deep: string; art: string }
> = {
  berry: { name: "فراولة", hex: "#ff2d4a", deep: "#a01028", art: "art/fruit-berry.png" },
  kiwi: { name: "كيوي", hex: "#7ad000", deep: "#3a7a00", art: "art/fruit-kiwi.png" },
  mango: { name: "مانجو", hex: "#ffb000", deep: "#c46a00", art: "art/fruit-mango.png" },
  blue: { name: "توت", hex: "#4a7cff", deep: "#1a3a9a", art: "art/fruit-blue.png" },
  grape: { name: "عنب", hex: "#c44bff", deep: "#6a0088", art: "art/fruit-grape.png" },
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
  return r >= 0 && c >= 0 && r < g.size && c < g.size;
}

function parseIce(level: LevelDef): number[][] {
  return level.ice.map((row) => [...row].map((ch) => (ch === "2" ? 2 : ch === "1" ? 1 : 0)));
}

function iceNeed(ice: number[][]) {
  return ice.reduce((a, row) => a + row.reduce((b, n) => b + (n > 0 ? 1 : 0), 0), 0);
}

function emptyCollected(): Record<ColorId, number> {
  return { berry: 0, kiwi: 0, mango: 0, blue: 0, grape: 0 };
}

function makeCell(color: ColorId, special: Special = "none"): Cell {
  return { id: uid(), color, special };
}

function pickColor(rng: () => number, colors: ColorId[], forbid: ColorId[]) {
  const pool = colors.filter((c) => !forbid.includes(c));
  const src = pool.length ? pool : colors;
  return src[Math.floor(rng() * src.length)]!;
}

function colorAt(grid: (Cell | null)[][], r: number, c: number, n: number): ColorId | null {
  if (r < 0 || c < 0 || r >= n || c >= n) return null;
  return grid[r]![c]?.color ?? null;
}

function fillWithoutMatch(n: number, colors: ColorId[], rng: () => number): (Cell | null)[][] {
  const grid: (Cell | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const forbid: ColorId[] = [];
      const left1 = colorAt(grid, r, c - 1, n);
      const left2 = colorAt(grid, r, c - 2, n);
      if (left1 && left1 === left2) forbid.push(left1);
      const up1 = colorAt(grid, r - 1, c, n);
      const up2 = colorAt(grid, r - 2, c, n);
      if (up1 && up1 === up2) forbid.push(up1);
      grid[r]![c] = makeCell(pickColor(rng, colors, forbid));
    }
  }
  return grid;
}

type Run = { cells: Pos[]; dir: "h" | "v"; color: ColorId };

function runsOf(g: Game): Run[] {
  const n = g.size;
  const out: Run[] = [];
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      const cell = g.grid[r]![c];
      if (!cell) {
        c++;
        continue;
      }
      const start = c;
      while (c < n && g.grid[r]![c]?.color === cell.color) c++;
      if (c - start >= 3) {
        const cells: Pos[] = [];
        for (let k = start; k < c; k++) cells.push({ r, c: k });
        out.push({ cells, dir: "h", color: cell.color });
      }
    }
  }
  for (let c = 0; c < n; c++) {
    let r = 0;
    while (r < n) {
      const cell = g.grid[r]![c];
      if (!cell) {
        r++;
        continue;
      }
      const start = r;
      while (r < n && g.grid[r]![c]?.color === cell.color) r++;
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
  const n = g.size;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
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

function blastArea(g: Game, p: Pos, add: (q: Pos) => void, special: Special) {
  if (special === "press") {
    for (let c = 0; c < g.size; c++) add({ r: p.r, c });
    for (let r = 0; r < g.size; r++) add({ r, c: p.c });
    return;
  }
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) add({ r: p.r + dr, c: p.c + dc });
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
  for (const p of cells) {
    const cell = g.grid[p.r]![p.c];
    if (!cell || cell.special === "none") continue;
    blastArea(g, p, add, cell.special);
  }
  return extra;
}

function spawnSpecial(g: Game, runs: Run[], origin: Pos | null) {
  if (!origin) return;
  const five = runs.find((r) => r.cells.length >= 5);
  const cross = (() => {
    const map = new Map<string, number>();
    for (const run of runs)
      for (const p of run.cells) {
        const k = `${p.r},${p.c}`;
        map.set(k, (map.get(k) ?? 0) + 1);
      }
    for (const [k, n] of map)
      if (n >= 2) {
        const [r, c] = k.split(",").map(Number);
        return { r: r!, c: c! };
      }
    return null;
  })();
  const four = runs.find((r) => r.cells.length === 4);
  let special: Special = "none";
  if (five) special = "press";
  else if (cross) special = "burst";
  else if (four) special = "blend";
  if (special === "none") return;
  const place = inb(g, origin.r, origin.c) ? origin : runs[0]!.cells[0]!;
  const color = g.grid[place.r]![place.c]?.color ?? five?.color ?? four?.color ?? "mango";
  g.grid[place.r]![place.c] = makeCell(color, special);
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
): { kind: "clear"; cells: Pos[]; specials: Special[]; cracked: boolean } {
  const specials: Special[] = [];
  for (const p of cells) {
    const sp = g.grid[p.r]![p.c]?.special;
    if (sp && sp !== "none") specials.push(sp);
  }
  const blown = triggerSpecials(g, cells);
  const iceBefore = iceNeed(g.ice);
  const power = specials.some((s) => s === "blend" || s === "press") ? 2 : 1;
  tally(g, blown);
  crackIce(g, blown, power);
  const keep = new Set<string>();
  if (origin) {
    const five = runs.find((r) => r.cells.length >= 5);
    const four = runs.find((r) => r.cells.length === 4);
    const map = new Map<string, number>();
    for (const run of runs)
      for (const p of run.cells) map.set(`${p.r},${p.c}`, (map.get(`${p.r},${p.c}`) ?? 0) + 1);
    const crossed = [...map.values()].some((n) => n >= 2);
    if (five || four || crossed) keep.add(`${origin.r},${origin.c}`);
  }
  for (const p of blown) {
    if (keep.has(`${p.r},${p.c}`)) continue;
    g.grid[p.r]![p.c] = null;
  }
  spawnSpecial(g, runs, origin && keep.has(`${origin.r},${origin.c}`) ? origin : null);
  g.score += blown.length * 40 * Math.max(1, g.combo);
  g.combo += 1;
  return { kind: "clear", cells: blown, specials, cracked: iceNeed(g.ice) < iceBefore };
}

export function applyGravity(g: Game): DropFx[] {
  const n = g.size;
  const drops: DropFx[] = [];
  for (let c = 0; c < n; c++) {
    let write = n - 1;
    for (let r = n - 1; r >= 0; r--) {
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
  const n = g.size;
  const born: number[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
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
): { special: Special; cells: Pos[]; cracked: boolean } | null {
  const spots: { p: Pos; special: Special }[] = [];
  for (const p of [a, b]) {
    const sp = g.grid[p.r]![p.c]?.special ?? "none";
    if (sp !== "none") spots.push({ p, special: sp });
  }
  if (!spots.length) return null;
  const cells: Pos[] = [];
  const seen = new Set<string>();
  const add = (q: Pos) => {
    const k = `${q.r},${q.c}`;
    if (seen.has(k) || !inb(g, q.r, q.c)) return;
    seen.add(k);
    cells.push(q);
  };
  let main: Special = spots[0]!.special;
  for (const s of spots) {
    main = s.special;
    blastArea(g, s.p, add, s.special);
  }
  const iceBefore = iceNeed(g.ice);
  const power = main === "burst" ? 1 : 2;
  tally(g, cells);
  crackIce(g, cells, power);
  for (const p of cells) g.grid[p.r]![p.c] = null;
  g.score += cells.length * 60;
  g.combo += 1;
  return { special: main, cells, cracked: iceNeed(g.ice) < iceBefore };
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
  for (let r = 0; r < g.size; r++)
    for (let c = 0; c < g.size; c++) g.grid[r]![c] = cells[k++] ?? makeCell(g.colors[0]!);
}

export function ensureMoves(g: Game, rng: () => number) {
  let guard = 0;
  while (!findHint(g) && guard < 12) {
    shuffle(g, rng);
    guard++;
  }
  g.hint = null;
}

export function createGame(
  level: LevelDef,
  difficulty: Difficulty = "mid"
): { game: Game; rng: () => number } {
  const rng = mulberry(level.id * 9176 + 13 + (difficulty === "hard" ? 91 : difficulty === "easy" ? 17 : 0));
  let colorCount = level.colorCount;
  let moves = level.moves;
  let ice = parseIce(level);
  const goals = level.goals.map((gl) => ({ ...gl }));

  if (difficulty === "easy") {
    colorCount = Math.min(4, colorCount);
    moves = Math.min(40, Math.floor(moves * 1.45) + 6);
    ice = ice.map((row) => row.map((v) => (v > 0 ? 1 : 0)));
    for (const gl of goals) gl.need = Math.max(4, Math.floor(gl.need * 0.7));
  } else if (difficulty === "hard") {
    colorCount = 5;
    moves = Math.max(10, Math.floor(moves * 0.7));
    ice = ice.map((row) =>
      row.map((v) => (v > 0 && rng() < 0.4 ? 2 : v === 0 && rng() < 0.06 ? 1 : v))
    );
    for (const gl of goals) gl.need = Math.floor(gl.need * 1.15) + 1;
  }

  const colors = ALL_COLORS.slice(0, colorCount);
  const grid = fillWithoutMatch(level.size, colors, rng);
  const game: Game = {
    level: { ...level, goals, moves },
    size: level.size,
    colors,
    grid,
    ice,
    collected: emptyCollected(),
    difficulty,
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

export const COMBO_NAME = ["", "", "يا سلام", "تسبيكة", "كوكتيل", "عصّارة"];
