export type FlavorId =
  | "vanilla"
  | "chocolate"
  | "pistachio"
  | "mango"
  | "strawberry";

export type Theme =
  | "market"
  | "noon"
  | "grill"
  | "bus"
  | "mall"
  | "beach"
  | "wedding"
  | "sewer"
  | "rooftop"
  | "night"
  | "boss";

export type FailReason =
  | "melt"
  | "dog"
  | "kid"
  | "drain"
  | "bus"
  | "seagull"
  | "cat";

export type Phase = "intro" | "play" | "catch" | "won" | "fail";

export type Flavor = {
  id: FlavorId;
  name: string;
  flee: number;
  bounce: number;
  melt: number;
  sticky: number;
  jump: number;
  color: string;
  dark: string;
  split: boolean;
};

export type Stage = {
  id: number;
  name: string;
  blurb: string;
  flavor: FlavorId;
  theme: Theme;
  length: number;
  melt: number;
  sun: number;
  wind: number;
  dogs: number;
  kids: number;
  buses: number;
  drains: number;
  fans: number;
  awnings: number;
  acs: number;
  seagulls: number;
  cats: number;
  tutorial?: boolean;
  boss?: boolean;
};

export type Scoop = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  melt: number;
  squish: number;
  blink: number;
  legs: number;
};

export type Cone = {
  x: number;
  y: number;
  vx: number;
  legs: number;
};

export type Hazard = {
  kind:
    | "dog"
    | "kid"
    | "bus"
    | "drain"
    | "fan"
    | "awning"
    | "ac"
    | "seagull"
    | "cat";
  x: number;
  y: number;
  vx: number;
  minX: number;
  maxX: number;
  phase: number;
  w: number;
  h: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: "drip" | "spark" | "puff" | "sprinkle" | "sweat";
  color: string;
  s: number;
};

export type Callout = {
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
};

export type Input = {
  pointerX: number | null;
  licking: boolean;
  paused: boolean;
};

export type Run = {
  stage: Stage;
  flavor: Flavor;
  endless: boolean;
  wave: number;
  score: number;
  catches: number;
  viewW: number;
  viewH: number;
  ground: number;
  worldW: number;
  camX: number;
  shake: number;
  time: number;
  intro: number;
  phase: Phase;
  phaseT: number;
  fail: FailReason | null;
  tongue: number;
  tongueMax: number;
  didTongueCatch: boolean;
  missArmed: boolean;
  cone: Cone;
  hooked: Scoop | null;
  scoops: Scoop[];
  hazards: Hazard[];
  particles: Particle[];
  callouts: Callout[];
  rng: () => number;
  stars: number;
};
