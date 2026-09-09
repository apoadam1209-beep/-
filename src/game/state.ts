import type { Cell, GameState, Gem, Pedestal } from "./types";

export function cloneState(s: GameState): GameState {
  return {
    rows: s.rows,
    cols: s.cols,
    grid: s.grid,
    pedestals: s.pedestals,
    gems: s.gems.map((g) => ({ ...g })),
  };
}

export function inBounds(s: GameState, r: number, c: number): boolean {
  return r >= 0 && c >= 0 && r < s.rows && c < s.cols;
}

export function isBlocked(s: GameState, r: number, c: number): boolean {
  if (!inBounds(s, r, c)) return true;
  const cell = s.grid[r][c];
  return cell === "wall" || cell === "void";
}

export function gemAt(s: GameState, r: number, c: number, ignoreId = -1): Gem | undefined {
  return s.gems.find((g) => g.id !== ignoreId && g.r === r && g.c === c);
}

export function pedestalAt(s: GameState, r: number, c: number): Pedestal | undefined {
  return s.pedestals.find((p) => p.r === r && p.c === c);
}

export function cellAt(s: GameState, r: number, c: number): Cell | "oob" {
  if (!inBounds(s, r, c)) return "oob";
  return s.grid[r][c];
}

export function canStrike(s: GameState, r: number, c: number): boolean {
  const cell = cellAt(s, r, c);
  if (cell !== "floor" && cell !== "amp") return false;
  return !gemAt(s, r, c);
}

export function isWon(s: GameState): boolean {
  return s.pedestals.every((p) =>
    s.gems.some((g) => g.locked && g.r === p.r && g.c === p.c && g.color === p.color)
  );
}

export function filledCount(s: GameState): number {
  return s.pedestals.filter((p) =>
    s.gems.some((g) => g.locked && g.r === p.r && g.c === p.c && g.color === p.color)
  ).length;
}

export function stateKey(s: GameState): string {
  return s.gems
    .map((g) => `${g.id}:${g.r}:${g.c}:${g.locked ? 1 : 0}:${g.kind === "echo" ? "e" : "n"}`)
    .sort()
    .join("|");
}
