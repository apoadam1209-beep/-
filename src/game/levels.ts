import type { ColorId, Goal, GoalKind, LevelDef, MenuPack, ThemeId } from "./types";

export const MENUS = 50;
export const ORDERS = 10;

const AR = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
export function arNum(n: number) {
  return String(n).replace(/\d/g, (d) => AR[Number(d)]!);
}

const FRUIT: ColorId[] = [
  "berry",
  "kiwi",
  "mango",
  "blue",
  "grape",
  "orange",
  "melon",
  "banana",
  "peach",
  "pine",
];
const FRUIT_AR: Record<ColorId, string> = {
  berry: "فراولة",
  kiwi: "كيوي",
  mango: "مانجو",
  blue: "توت",
  grape: "عنب",
  orange: "برتقال",
  melon: "بطيخ",
  banana: "موز",
  peach: "خوخ",
  pine: "أناناس",
};

const ART: Record<ThemeId, string> = {
  juice: "art/shop-juice.jpg",
  market: "art/shop-market.jpg",
  kitchen: "art/shop-juice.jpg",
};

function themeOf(menu: number): ThemeId {
  if (menu % 3 === 1) return "juice";
  if (menu % 3 === 2) return "market";
  return "kitchen";
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

function inb(rows: number, cols: number, r: number, c: number) {
  return r >= 0 && c >= 0 && r < rows && c < cols;
}

function paintIce(rows: number, cols: number, menu: number, order: number, rng: () => number): string[] {
  const g = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  const set = (r: number, c: number, v: number) => {
    if (inb(rows, cols, r, c)) g[r]![c] = Math.max(g[r]![c]!, v);
  };
  const wantIce = menu >= 3 && (order === 4 || order === 8 || (menu >= 8 && order % 3 === 0) || (menu >= 16 && order % 2 === 0));
  if (!wantIce) return g.map((row) => row.map(() => ".").join(""));

  const mr = (rows / 2) | 0;
  const mc = (cols / 2) | 0;
  const kind = (menu + order) % 6;
  if (kind === 0) {
    for (let i = 1; i < cols - 1; i++) set(mr, i, 1);
    for (let i = 1; i < rows - 1; i++) set(i, mc, 1);
    set(mr, mc, menu > 12 ? 2 : 1);
  } else if (kind === 1) {
    for (let i = 0; i < cols; i++) {
      set(0, i, 1);
      set(rows - 1, i, 1);
    }
  } else if (kind === 2) {
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) if ((r + c) % 2 === 0 && rng() < 0.45) set(r, c, 1);
  } else if (kind === 3) {
    const n = Math.min(rows, cols);
    for (let i = 0; i < n; i++) set(i, i, 1);
  } else {
    for (let i = 0; i < 6 + (menu % 4); i++) set((rng() * rows) | 0, (rng() * cols) | 0, rng() < 0.25 && menu > 14 ? 2 : 1);
  }
  return g.map((row) => row.map((v) => (v === 0 ? "." : String(v))).join(""));
}

function goalsOf(kind: GoalKind, menu: number, order: number, rng: () => number, pool: ColorId[]): Goal[] {
  const pick = () => pool[Math.floor(rng() * pool.length)]!;
  const a = pick();
  let b = pick();
  while (b === a && pool.length > 1) b = pick();
  let c = pick();
  while ((c === a || c === b) && pool.length > 2) c = pick();
  if (kind === "juice") {
    return [{ color: a, need: 10 + Math.floor(menu * 0.7) + order }];
  }
  if (kind === "duo") {
    const n = 7 + Math.floor(menu / 3) + Math.floor(order / 2);
    return [
      { color: a, need: n },
      { color: b, need: Math.max(6, n - 2) },
    ];
  }
  return [
    { color: a, need: 5 + Math.floor(menu / 4) + Math.floor(order / 3) },
    { color: b, need: 5 + Math.floor(menu / 5) },
    { color: c, need: 4 + Math.floor(order / 4) },
  ];
}

function titleOf(kind: GoalKind, goals: Goal[]) {
  if (kind === "juice") return `عصير ${FRUIT_AR[goals[0]!.color]}`;
  if (kind === "duo") return `${FRUIT_AR[goals[0]!.color]} و ${FRUIT_AR[goals[1]!.color]}`;
  return "سلطة فواكه";
}

function buildLevels(): LevelDef[] {
  const out: LevelDef[] = [];
  for (let menu = 1; menu <= MENUS; menu++) {
    const theme = themeOf(menu);
    for (let order = 1; order <= ORDERS; order++) {
      const id = (menu - 1) * ORDERS + order;
      const rng = mulberry(menu * 1009 + order * 17 + 3);
      const cols = 7;
      const rows = 9;
      const colorCount = menu < 5 ? 5 : menu < 12 ? 6 : menu < 22 ? 7 : menu < 32 ? 8 : menu < 42 ? 9 : 10;
      const pool = FRUIT.slice(0, colorCount);
      const kind: GoalKind = (menu + order) % 3 === 1 ? "juice" : (menu + order) % 3 === 2 ? "duo" : "salad";
      const goals = goalsOf(kind, menu, order, rng, pool);
      const ice = paintIce(rows, cols, menu, order, rng);
      const iceN = ice.join("").replace(/\./g, "").length;
      const need = goals.reduce((a, g) => a + g.need, 0);
      const moves = Math.max(14, Math.min(34, 12 + Math.floor(need / 2) + Math.floor(iceN / 3) + Math.floor((11 - order) / 2)));
      out.push({
        id,
        menu,
        order,
        name: titleOf(kind, goals),
        theme,
        kind,
        cols,
        rows,
        colorCount,
        moves,
        goals,
        ice,
      });
    }
  }
  return out;
}

export const LEVELS: LevelDef[] = buildLevels();

export const MENU_PACKS: MenuPack[] = Array.from({ length: MENUS }, (_, i) => {
  const menu = i + 1;
  const id = themeOf(menu);
  return {
    id,
    menu,
    name: `قائمة ${arNum(menu)}`,
    from: i * ORDERS + 1,
    to: (i + 1) * ORDERS,
    art: ART[id],
  };
});

export function menuOf(levelId: number): MenuPack {
  return MENU_PACKS[Math.max(0, Math.min(MENUS - 1, Math.floor((levelId - 1) / ORDERS)))]!;
}

export const FRUIT_NAME = FRUIT_AR;
