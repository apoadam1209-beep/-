export type ColorId = "ruby" | "emerald" | "gold" | "aqua" | "violet";
export type Special = "none" | "lineH" | "lineV" | "burst" | "moon";
export type NightId = "alley" | "square" | "roof" | "dawn";
export type Status = "play" | "won" | "lost";
export type Dir = "up" | "down" | "left" | "right";
export type Pos = { r: number; c: number };

export type SwapFx = {
  a: Pos;
  b: Pos;
  dir: Dir;
  mode: "swap" | "bounce";
};

export type DropFx = { id: number; dist: number };

export type Cell = {
  id: number;
  color: ColorId;
  special: Special;
};

export type Night = {
  id: NightId;
  day: number;
  name: string;
  from: number;
  to: number;
  art: string;
};

export type LevelDef = {
  id: number;
  day: number;
  hara: number;
  name: string;
  night: NightId;
  blurb: string;
  size: number;
  colorCount: number;
  moves: number;
  dark: string[];
};

export type Game = {
  level: LevelDef;
  size: number;
  colors: ColorId[];
  grid: (Cell | null)[][];
  dark: number[][];
  moves: number;
  maxMoves: number;
  score: number;
  combo: number;
  selected: Pos | null;
  hint: [Pos, Pos] | null;
  status: Status;
  stars: number;
  lit: number;
  need: number;
  cat: Pos | null;
};
