import { applyPulse, usefulStrikes } from "./simulate";
import { cloneState, isWon, stateKey } from "./state";
import type { GameState, Pos } from "./types";

export interface SolveResult {
  solvable: boolean;
  path: Pos[];
  visited: number;
}

const STATE_CAP = 120_000;

export function solve(start: GameState, maxDepth = 12): SolveResult {
  if (isWon(start)) return { solvable: true, path: [], visited: 0 };

  const q: { s: GameState; path: Pos[] }[] = [{ s: cloneState(start), path: [] }];
  const seen = new Set<string>([stateKey(start)]);
  let visited = 0;

  while (q.length) {
    const cur = q.shift()!;
    if (cur.path.length >= maxDepth) continue;
    const strikes = usefulStrikes(cur.s);
    for (const cell of strikes) {
      const tl = applyPulse(cur.s, cell.r, cell.c);
      if (!tl.changed) continue;
      const key = stateKey(tl.final);
      if (seen.has(key)) continue;
      seen.add(key);
      visited++;
      const path = [...cur.path, cell];
      if (tl.won) return { solvable: true, path, visited };
      if (visited >= STATE_CAP) return { solvable: false, path: [], visited };
      q.push({ s: tl.final, path });
    }
  }

  return { solvable: false, path: [], visited };
}

export function hintCell(state: GameState): Pos | null {
  const r = solve(state, 10);
  return r.solvable && r.path.length ? r.path[0] : null;
}
