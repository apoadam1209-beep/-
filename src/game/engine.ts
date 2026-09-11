import type { Cell, ColorId, Game, LevelDef, Pos, Special } from "./types";

export const ALL_COLORS: ColorId[] = ["ruby", "emerald", "gold", "aqua", "violet"];

export const COLOR_META: Record<
  ColorId,
  { name: string; hex: string; art: string }
> = {
  ruby: { name: "ياقوت", hex: "#ff4b4b", art: "art/glass-ruby.png" },
  emerald: { name: "زمرد", hex: "#3dcc7a", art: "art/glass-emerald.png" },
  gold: { name: "ذهب", hex: "#f5c542", art: "art/glass-gold.png" },
  aqua: { name: "فيروز", hex: "#3ec6d8", art: "art/glass-aqua.png" },
  violet: { name: "بنفسج", hex: "#b56bff", art: "art/glass-violet.png" },
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

function parseDark(level: LevelDef): number[][] {
  return level.dark.map((row) =>
    [...row].map((ch) => (ch === "2" ? 2 : ch === "1" ? 1 : 0))
  );
}

function needOf(dark: number[][]) {
  return dark.reduce((a, row) => a + row.reduce((b, n) => b + n, 0), 0);
}

function litOf(dark: number[][], start: number) {
  const now = needOf(dark);
  return Math.max(0, start - now);
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

function fillWithoutMatch(
  n: number,
  colors: ColorId[],
  rng: () => number
): (Cell | null)[][] {
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

function clonePos(p: Pos): Pos {
  return { r: p.r, c: p.c };
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
        if (isCat(g, a) || isCat(g, b)) continue;
        swapCells(g, a, b);
        const ok = runsOf(g).length > 0 || specialSwap(g, a, b);
        swapCells(g, a, b);
        if (ok) return [a, b];
      }
    }
  }
  return null;
}

function specialSwap(g: Game, a: Pos, b: Pos) {
  const ca = g.grid[a.r]![a.c];
  const cb = g.grid[b.r]![b.c];
  if (!ca || !cb) return false;
  return ca.special === "moon" || cb.special === "moon";
}

function isCat(g: Game, p: Pos) {
  return !!g.cat && g.cat.r === p.r && g.cat.c === p.c;
}

function lightCells(g: Game, cells: Pos[], power = 1) {
  for (const p of cells) {
    if (!inb(g, p.r, p.c)) continue;
    g.dark[p.r]![p.c] = Math.max(0, g.dark[p.r]![p.c]! - power);
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const rr = p.r + dr;
      const cc = p.c + dc;
      if (inb(g, rr, cc)) g.dark[rr]![cc] = Math.max(0, g.dark[rr]![cc]! - 1);
    }
  }
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
    if (!cell) continue;
    if (cell.special === "lineH") {
      for (let c = 0; c < g.size; c++) add({ r: p.r, c });
    } else if (cell.special === "lineV") {
      for (let r = 0; r < g.size; r++) add({ r, c: p.c });
    } else if (cell.special === "burst") {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) add({ r: p.r + dr, c: p.c + dc });
    }
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
    for (const [k, n] of map) if (n >= 2) {
      const [r, c] = k.split(",").map(Number);
      return { r: r!, c: c! };
    }
    return null;
  })();
  const four = runs.find((r) => r.cells.length === 4);

  let special: Special = "none";
  if (five) special = "moon";
  else if (cross) special = "burst";
  else if (four) special = four.dir === "h" ? "lineH" : "lineV";
  if (special === "none") return;

  const place = inb(g, origin.r, origin.c) ? origin : runs[0]!.cells[0]!;
  const color = g.grid[place.r]![place.c]?.color ?? five?.color ?? four?.color ?? "gold";
  g.grid[place.r]![place.c] = makeCell(color, special);
}

export type StepEvent =
  | { kind: "clear"; cells: Pos[]; specials: Special[] }
  | { kind: "light" }
  | { kind: "drop" }
  | { kind: "fill" }
  | { kind: "moon"; color: ColorId; cells: Pos[] };

export function applyClear(
  g: Game,
  cells: Pos[],
  origin: Pos | null,
  runs: Run[]
): { kind: "clear"; cells: Pos[]; specials: Special[] } {
  const specials: Special[] = [];
  for (const p of cells) {
    const sp = g.grid[p.r]![p.c]?.special;
    if (sp && sp !== "none") specials.push(sp);
  }
  const blown = triggerSpecials(g, cells);
  lightCells(g, blown, 1);
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
  g.lit = litOf(g.dark, g.need);
  return { kind: "clear", cells: blown, specials };
}

export function applyGravity(g: Game) {
  const n = g.size;
  for (let c = 0; c < n; c++) {
    let write = n - 1;
    for (let r = n - 1; r >= 0; r--) {
      const cell = g.grid[r]![c];
      if (cell) {
        if (write !== r) {
          g.grid[write]![c] = cell;
          g.grid[r]![c] = null;
        }
        write--;
      }
    }
  }
}

export function applyFill(g: Game, rng: () => number) {
  const n = g.size;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!g.grid[r]![c]) g.grid[r]![c] = makeCell(pickColor(rng, g.colors, []));
    }
  }
}

export function currentRuns(g: Game) {
  return runsOf(g);
}

export function matchCells(g: Game): { runs: Run[]; cells: Pos[] } {
  const runs = runsOf(g);
  return { runs, cells: uniquePos(runs) };
}

function detonateMoon(g: Game, color: ColorId): Pos[] {
  const cells: Pos[] = [];
  for (let r = 0; r < g.size; r++)
    for (let c = 0; c < g.size; c++)
      if (g.grid[r]![c]?.color === color || g.grid[r]![c]?.special === "moon")
        cells.push({ r, c });
  return cells;
}

export function tryActivateMoon(
  g: Game,
  a: Pos,
  b: Pos
): { kind: "moon"; color: ColorId; cells: Pos[] } | null {
  const ca = g.grid[a.r]![a.c];
  const cb = g.grid[b.r]![b.c];
  if (!ca || !cb) return null;
  let color: ColorId | null = null;
  if (ca.special === "moon") color = cb.color;
  else if (cb.special === "moon") color = ca.color;
  if (!color) return null;
  const cells = detonateMoon(g, color);
  lightCells(g, cells, 2);
  for (const p of cells) g.grid[p.r]![p.c] = null;
  g.score += cells.length * 60;
  g.combo += 1;
  g.lit = litOf(g.dark, g.need);
  return { kind: "moon", color, cells };
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
  if (isCat(g, a) || isCat(g, b)) return false;
  return wouldMatch(g, a, b) || specialSwap(g, a, b);
}

export function doSwap(g: Game, a: Pos, b: Pos) {
  swapCells(g, a, b);
}

export function undoSwap(g: Game, a: Pos, b: Pos) {
  swapCells(g, a, b);
}

function moveCat(g: Game, rng: () => number) {
  if (!g.cat) return;
  const dirs = [
    { r: 1, c: 0 },
    { r: -1, c: 0 },
    { r: 0, c: 1 },
    { r: 0, c: -1 },
  ];
  const opts = dirs
    .map((d) => ({ r: g.cat!.r + d.r, c: g.cat!.c + d.c }))
    .filter((p) => inb(g, p.r, p.c));
  if (!opts.length) return;
  g.cat = opts[Math.floor(rng() * opts.length)]!;
}

export function afterTurn(g: Game, rng: () => number) {
  g.combo = 1;
  g.selected = null;
  g.hint = null;
  if (g.status !== "play") return;
  g.moves -= 1;
  moveCat(g, rng);
  finishCheck(g);
}

export function finishCheck(g: Game) {
  g.lit = litOf(g.dark, g.need);
  if (needOf(g.dark) <= 0) {
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

export function createGame(level: LevelDef): { game: Game; rng: () => number } {
  const rng = mulberry(level.id * 9176 + 13);
  const colors = ALL_COLORS.slice(0, level.colorCount);
  const dark = parseDark(level);
  const grid = fillWithoutMatch(level.size, colors, rng);
  const game: Game = {
    level,
    size: level.size,
    colors,
    grid,
    dark,
    moves: level.moves,
    maxMoves: level.moves,
    score: 0,
    combo: 1,
    selected: null,
    hint: null,
    status: "play",
    stars: 0,
    need: needOf(dark),
    lit: 0,
    cat: level.id >= 12 ? { r: 0, c: Math.floor(level.size / 2) } : null,
  };
  ensureMoves(game, rng);
  return { game, rng };
}

export function selectOrSwap(
  g: Game,
  pos: Pos
): { swap: [Pos, Pos] } | { invalid: true } | { select: Pos } | { deselect: true } {
  if (g.status !== "play") return { invalid: true };
  if (isCat(g, pos)) return { invalid: true };
  if (!g.selected) return { select: clonePos(pos) };
  if (g.selected.r === pos.r && g.selected.c === pos.c) return { deselect: true };
  if (!adjacent(g.selected, pos)) return { select: clonePos(pos) };
  if (!canSwap(g, g.selected, pos)) return { invalid: true };
  return { swap: [clonePos(g.selected), clonePos(pos)] };
}

export function remainingDark(g: Game) {
  return needOf(g.dark);
}
