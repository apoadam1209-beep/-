import { CARDINALS, DIAGONALS, type Dir, type GameState, type Timeline, type Wave } from "./types";
import { canStrike, cellAt, cloneState, gemAt, isWon } from "./state";

const MAX_ECHO = 8;

function firstGemOnRay(s: GameState, r: number, c: number, dr: number, dc: number) {
  let rr = r + dr;
  let cc = c + dc;
  while (true) {
    const cell = cellAt(s, rr, cc);
    if (cell === "oob" || cell === "wall" || cell === "void") return null;
    const g = gemAt(s, rr, cc);
    if (g) return g.locked ? null : g;
    rr += dr;
    cc += dc;
  }
}

function launchGem(s: GameState, gemId: number, dr: number, dc: number) {
  const chain: Wave["launches"][number]["chain"] = [];
  let id: number | null = gemId;
  const seen = new Set<number>();

  while (id !== null && !seen.has(id)) {
    seen.add(id);
    const g = s.gems.find((x) => x.id === id);
    if (!g || g.locked) break;

    let r = g.r;
    let c = g.c;
    let destR = r;
    let destC = c;
    let hitId: number | null = null;
    let fell = false;

    while (true) {
      const nr = r + dr;
      const nc = c + dc;
      const cell = cellAt(s, nr, nc);
      if (cell === "oob" || cell === "wall") break;
      if (cell === "void") {
        destR = nr;
        destC = nc;
        fell = true;
        break;
      }
      const other = gemAt(s, nr, nc, g.id);
      if (other) {
        hitId = other.id;
        break;
      }
      destR = nr;
      destC = nc;
      r = nr;
      c = nc;
    }

    if (destR !== g.r || destC !== g.c) {
      chain.push({
        gemId: g.id,
        from: { r: g.r, c: g.c },
        to: { r: destR, c: destC },
        dr,
        dc,
        fell,
      });
      g.r = destR;
      g.c = destC;
    }

    if (fell) {
      s.gems = s.gems.filter((x) => x.id !== g.id);
      break;
    }

    if (hitId !== null) {
      const hit = s.gems.find((x) => x.id === hitId);
      if (hit && !hit.locked) {
        id = hitId;
        continue;
      }
    }
    break;
  }

  return chain;
}

function tryLock(s: GameState): number[] {
  const ids: number[] = [];
  for (const g of s.gems) {
    if (g.locked) continue;
    const match = s.pedestals.some((p) => p.r === g.r && p.c === g.c && p.color === g.color);
    if (match) {
      g.locked = true;
      ids.push(g.id);
    }
  }
  return ids;
}

function pulseAt(s: GameState, origin: { r: number; c: number }, isEcho: boolean): Wave {
  const amp = !isEcho && cellAt(s, origin.r, origin.c) === "amp";
  const dirs: Dir[] = amp ? [...CARDINALS, ...DIAGONALS] : [...CARDINALS];
  const launches: Wave["launches"] = [];

  for (const dir of dirs) {
    const target = firstGemOnRay(s, origin.r, origin.c, dir.dr, dir.dc);
    if (!target) continue;
    const chain = launchGem(s, target.id, dir.dr, dir.dc);
    launches.push({ dir, chain });
  }

  const fallen = launches.flatMap((l) => l.chain.filter((st) => st.fell).map((st) => st.gemId));
  const locks = tryLock(s);
  return { origin, isEcho, launches, locks, fallen };
}

export function applyPulse(state: GameState, r: number, c: number): Timeline {
  const origin = { r, c };
  if (!canStrike(state, r, c)) {
    return { origin, waves: [], final: state, won: isWon(state), changed: false };
  }

  const s = cloneState(state);
  const waves: Wave[] = [];
  const first = pulseAt(s, origin, false);
  waves.push(first);

  const echoQueue: { r: number; c: number }[] = [];
  const movedIds = new Set<number>();
  for (const launch of first.launches) {
    for (const step of launch.chain) {
      if (step.from.r !== step.to.r || step.from.c !== step.to.c) movedIds.add(step.gemId);
    }
  }
  for (const g of s.gems) {
    if (g.kind === "echo" && !g.locked && movedIds.has(g.id)) {
      echoQueue.push({ r: g.r, c: g.c });
    }
  }

  let guard = 0;
  while (echoQueue.length && guard++ < MAX_ECHO) {
    const pos = echoQueue.shift()!;
    const wave = pulseAt(s, pos, true);
    waves.push(wave);
    const moved = new Set<number>();
    for (const launch of wave.launches) {
      for (const step of launch.chain) {
        if (step.from.r !== step.to.r || step.from.c !== step.to.c) moved.add(step.gemId);
      }
    }
    for (const g of s.gems) {
      if (g.kind === "echo" && !g.locked && moved.has(g.id)) {
        echoQueue.push({ r: g.r, c: g.c });
      }
    }
  }

  const changed = waves.some(
    (w) => w.locks.length > 0 || w.fallen.length > 0 || w.launches.some((l) => l.chain.length > 0)
  );

  return { origin, waves, final: s, won: isWon(s), changed };
}

export function strikeCells(s: GameState): { r: number; c: number }[] {
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      if (canStrike(s, r, c)) cells.push({ r, c });
    }
  }
  return cells;
}

/** Candidate strikes that share a row/col (or diagonal if amp) with an unlocked gem. */
export function previewHits(s: GameState, r: number, c: number) {
  if (!canStrike(s, r, c)) return [] as { gemId: number; dir: Dir }[];
  const amp = cellAt(s, r, c) === "amp";
  const dirs: Dir[] = amp ? [...CARDINALS, ...DIAGONALS] : [...CARDINALS];
  const hits: { gemId: number; dir: Dir }[] = [];
  for (const dir of dirs) {
    const g = firstGemOnRay(s, r, c, dir.dr, dir.dc);
    if (g) hits.push({ gemId: g.id, dir });
  }
  return hits;
}

export function usefulStrikes(s: GameState): { r: number; c: number }[] {
  const unlocked = s.gems.filter((g) => !g.locked);
  if (!unlocked.length) return [];
  const out: { r: number; c: number }[] = [];
  for (const cell of strikeCells(s)) {
    const amp = s.grid[cell.r][cell.c] === "amp";
    const useful = unlocked.some((g) => {
      if (g.r === cell.r || g.c === cell.c) return true;
      if (amp && Math.abs(g.r - cell.r) === Math.abs(g.c - cell.c)) return true;
      return false;
    });
    if (useful) out.push(cell);
  }
  return out;
}
