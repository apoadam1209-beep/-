export type ColorId = "berry" | "kiwi" | "mango" | "blue" | "grape";
export type Special = "none" | "blend" | "press" | "burst";
export type ThemeId = "juice" | "market" | "kitchen";
export type GoalKind = "juice" | "duo" | "salad";
export type Status = "play" | "won" | "lost";
export type Dir = "up" | "down" | "left" | "right";
export type Difficulty = "easy" | "mid" | "hard";
export type Pos = { r: number; c: number };

export type DropFx = { id: number; dist: number };

export type Cell = {
  id: number;
  color: ColorId;
  special: Special;
};

export type Goal = { color: ColorId; need: number };

export type MenuPack = {
  id: ThemeId;
  menu: number;
  name: string;
  from: number;
  to: number;
  art: string;
};

export type LevelDef = {
  id: number;
  menu: number;
  order: number;
  name: string;
  theme: ThemeId;
  kind: GoalKind;
  size: number;
  colorCount: number;
  moves: number;
  goals: Goal[];
  ice: string[];
};

export type Game = {
  level: LevelDef;
  size: number;
  colors: ColorId[];
  grid: (Cell | null)[][];
  ice: number[][];
  collected: Record<ColorId, number>;
  difficulty: Difficulty;
  moves: number;
  maxMoves: number;
  score: number;
  combo: number;
  selected: Pos | null;
  hint: [Pos, Pos] | null;
  status: Status;
  stars: number;
  needIce: number;
};
