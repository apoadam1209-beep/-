import type { Cell, Color, GameState, Gem, GemKind, Pedestal } from "./types";

const GEM_CHARS: Record<string, { color: Color; kind: GemKind }> = {
  C: { color: "cyan", kind: "normal" },
  V: { color: "violet", kind: "normal" },
  A: { color: "amber", kind: "normal" },
  R: { color: "rose", kind: "normal" },
  G: { color: "emerald", kind: "normal" },
  Y: { color: "cyan", kind: "echo" },
  U: { color: "violet", kind: "echo" },
  I: { color: "amber", kind: "echo" },
  O: { color: "rose", kind: "echo" },
  P: { color: "emerald", kind: "echo" },
};

const PED_CHARS: Record<string, Color> = {
  c: "cyan",
  v: "violet",
  a: "amber",
  r: "rose",
  g: "emerald",
};

export function parseMap(map: string[]): GameState {
  const rows = map.length;
  const cols = map[0]?.length ?? 0;
  const grid: Cell[][] = [];
  const gems: Gem[] = [];
  const pedestals: Pedestal[] = [];
  let nextId = 1;

  for (let r = 0; r < rows; r++) {
    const line = map[r];
    if (line.length !== cols) {
      throw new Error(`Row ${r} length ${line.length} != ${cols}`);
    }
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      const ch = line[c];
      if (ch === "#") {
        row.push("wall");
      } else if (ch === "+") {
        row.push("amp");
      } else if (ch === "~") {
        row.push("void");
      } else {
        row.push("floor");
      }

      const gem = GEM_CHARS[ch];
      if (gem) {
        gems.push({ id: nextId++, r, c, color: gem.color, kind: gem.kind, locked: false });
      }
      const ped = PED_CHARS[ch];
      if (ped) {
        pedestals.push({ r, c, color: ped });
      }
    }
    grid.push(row);
  }

  return { rows, cols, grid, gems, pedestals };
}
