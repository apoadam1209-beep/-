export type Color = "cyan" | "violet" | "amber" | "rose" | "emerald";
export type GemKind = "normal" | "echo";
export type Cell = "floor" | "wall" | "amp" | "void";

export interface Pos {
  r: number;
  c: number;
}

export interface Dir {
  dr: number;
  dc: number;
}

export interface Gem {
  id: number;
  r: number;
  c: number;
  color: Color;
  kind: GemKind;
  locked: boolean;
}

export interface Pedestal {
  r: number;
  c: number;
  color: Color;
}

export interface GameState {
  rows: number;
  cols: number;
  grid: Cell[][];
  gems: Gem[];
  pedestals: Pedestal[];
}

export interface ChainStep {
  gemId: number;
  from: Pos;
  to: Pos;
  dr: number;
  dc: number;
  fell?: boolean;
}

export interface Launch {
  dir: Dir;
  chain: ChainStep[];
}

export interface Wave {
  origin: Pos;
  isEcho: boolean;
  launches: Launch[];
  locks: number[];
  fallen: number[];
}

export interface Timeline {
  origin: Pos;
  waves: Wave[];
  final: GameState;
  won: boolean;
  changed: boolean;
}

export const CARDINALS: Dir[] = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

export const DIAGONALS: Dir[] = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
];

export const COLORS: Color[] = ["cyan", "violet", "amber", "rose", "emerald"];

export const COLOR_HEX: Record<Color, string> = {
  cyan: "#5eead4",
  violet: "#c4b5fd",
  amber: "#fbbf24",
  rose: "#fb7185",
  emerald: "#6ee7b7",
};

export const COLOR_DEEP: Record<Color, string> = {
  cyan: "#0f766e",
  violet: "#6d28d9",
  amber: "#b45309",
  rose: "#be123c",
  emerald: "#047857",
};

export const COLOR_AR: Record<Color, string> = {
  cyan: "فيروزي",
  violet: "بنفسجي",
  amber: "كهرماني",
  rose: "وردي",
  emerald: "زمردي",
};
