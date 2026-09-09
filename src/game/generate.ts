/**
 * Builds 200 solvable levels (keeps the 24 handcrafted rooms, then fills).
 * Run: npx tsx src/game/generate.ts
 */
import { writeFileSync } from "node:fs";
import { parseMap } from "./parse";
import { solve } from "./solver";

interface LevelDef {
  id: number;
  name: string;
  chapter: number;
  map: string[];
  par: number;
  intro?: string;
}

const HAND: Omit<LevelDef, "chapter">[] = [
  { id: 1, name: "الهمسة", par: 1, intro: "اضغط بلاطة فارغة. الموجة صليب يدفع أول بلورة على كل محور حتى الجدار.", map: ["#########","#.......#","#...C...#","#.......#","#.......#","#...c...#","#########"] },
  { id: 2, name: "الاتجاه", par: 1, intro: "جهة الضربة هي جهة الانطلاق. قف وراء البلورة.", map: ["#########","#.......#","#.......#","#c....C.#","#.......#","#########"] },
  { id: 3, name: "الركن", par: 2, intro: "البلورة تنزلق حتى الجدار ولا تعود. ضربتان لركنين.", map: ["#########","#.......#","#.C.....#","#.......#","#......c#","#########"] },
  { id: 4, name: "الترتيب", par: 2, intro: "الجدار الداخلي فخ. إن انزلقت في الاتجاه الخطأ لن ترجع.", map: ["#########","#.......#","#.C.....#","#.......#","#.....###","#......c#","#########"] },
  { id: 5, name: "كرة أولى", par: 1, intro: "اضرب خلف الأولى. هي تصطدم بالثانية فتتوقف، والثانية تطير.", map: ["###########","#.........#","#.C.C....c#","#.........#","###########"] },
  { id: 6, name: "مهد الجدار", par: 2, map: ["#########","#.......#","#.C.C...#","#.......#","#......c#","#########"] },
  { id: 7, name: "ثلاث كرات", par: 1, intro: "مهد نيوتن: الزخم يعبر المتلاصقات ويطير الأخيرة.", map: ["###########","#.........#","#.CCC....c#","#.........#","###########"] },
  { id: 8, name: "قفل مزدوج", par: 1, intro: "الأولى تركن فوق قاعدة، والثانية تطير إلى الأخرى.", map: ["###########","#.........#","#.C.cC...c#","#.........#","###########"] },
  { id: 9, name: "توأم", par: 2, intro: "لونان. قاعدتان. كل بلورة لقاعدتها.", map: ["#########","#.......#","#.C....c#","#.......#","#.V....v#","#.......#","#########"] },
  { id: 10, name: "لا تخلط", par: 3, intro: "القاعدة تقفل اللون الصحيح فقط.", map: ["#########","#.......#","#.C.V..v#","#.......#","#......c#","#########"] },
  { id: 11, name: "ثلاثي الألوان", par: 3, map: ["#########","#.C....c#","#.......#","#.V....v#","#.......#","#.A....a#","#########"] },
  { id: 12, name: "تقاطع", par: 2, map: ["#########","#.......#","#...V...#","#.......#","#.C....c#","#.......#","#...v...#","#########"] },
  { id: 13, name: "المطرقة", par: 1, intro: "بلورة الصدى (الهالة) إذا تحركت تُطلق موجة من موضع توقفها.", map: ["#########","#.......#","#.Y.....#","#.......#","#.......#","#...C..c#","#########"] },
  { id: 14, name: "صدى الركن", par: 2, map: ["#########","#.......#","#.Y.....#","#.......#","#.C.....#","#......c#","#########"] },
  { id: 15, name: "صدى مزدوج", par: 2, map: ["#########","#.......#","#.Y.....#","#.U.....#","#.......#","#.C....c#","#.V....v#","#########"] },
  { id: 16, name: "سلسلة", par: 1, intro: "صدى يحرّك صدى حتى تصل الجوهرة.", map: ["#########","#.Y.....#","#.......#","#.U.....#","#.......#","#...C..c#","#########"] },
  { id: 17, name: "الممر", par: 2, intro: "الطريق السفلي مفتوح. الطريق العلوي يبتلعك.", map: ["###########","#.........#","#.C....#..#","#......#..#","#......#..#","#........c#","###########"] },
  { id: 18, name: "حاجز", par: 2, map: ["#########","#.......#","#.C..#..#","#....#..#","#.......#","#......c#","#########"] },
  { id: 19, name: "الفجوة", par: 2, map: ["#########","#.......#","#..C.V..#","###...###","#.......#","#..c.v..#","#########"] },
  { id: 20, name: "قفصان", par: 4, map: ["###########","#.........#","#.C.#.....#","#...#.....#","#...#..V..#","#..c#....v#","###########"] },
  { id: 21, name: "المُضخّم", par: 1, intro: "البلاطة (+) تُطلق الموجة في ثماني جهات.", map: ["#########","#.+.....#","#.......#","#...C...#","#.......#","#.....c.#","#########"] },
  { id: 22, name: "قطري", par: 2, map: ["#########","#.+.....#","#.......#","#...C...#","#.......#","#.....c.#","#.V....v#","#########"] },
  { id: 23, name: "طيف الصدى", par: 2, map: ["#########","#.......#","#.Y.....#","#.C....c#","#.......#","#.V....v#","#########"] },
  { id: 24, name: "الخاتمة الأولى", par: 4, intro: "أربعة ألوان. لا ضربة زائدة.", map: ["###########","#.........#","#.C.V.A.R.#","#.........#","#.........#","#.c.v.a.r.#","###########"] },
];

const A = ["ومض", "صدع", "ندى", "سديم", "جلمود", "هالة", "شرر", "قعر", "عرق", "شق", "قطرة", "صمت", "رنين", "ظل", "شهاب", "قبو", "ممر", "فجوة", "صخور", "بلور", "نَفَس", "حجر", "لمع", "كسر", "صقيل"];
const B = ["الكهف", "القعر", "الندى", "البرد", "العمق", "البعيد", "الخفي", "المكسور", "المضيء", "الباهت", "القديم", "الرطب", "الصامت", "المتصدع", "الأول", "الأخير", "الأيسر", "الأيمن", "العالي", "الواطي"];

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grid(h: number, w: number): string[][] {
  return Array.from({ length: h }, (_, r) =>
    Array.from({ length: w }, (_, c) => (r === 0 || c === 0 || r === h - 1 || c === w - 1 ? "#" : ".")),
  );
}
function dump(g: string[][]): string[] {
  return g.map((r) => r.join(""));
}
function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

type Kind =
  | "south"
  | "west"
  | "corner"
  | "order"
  | "cradle"
  | "newton"
  | "twins"
  | "triple"
  | "interfere"
  | "cross"
  | "echo"
  | "echo2"
  | "gap"
  | "amp"
  | "amp2"
  | "four"
  | "cage";

function build(kind: Kind, seed: number): string[] | null {
  const rand = mulberry(seed);
  const w = pick(rand, [9, 9, 11]);
  const h = pick(rand, [7, 7, 8, 9]);
  const g = grid(h, w);
  const lastR = h - 2;
  const lastC = w - 2;
  const set = (r: number, c: number, ch: string) => {
    if (r <= 0 || c <= 0 || r >= h - 1 || c >= w - 1) return false;
    g[r][c] = ch;
    return true;
  };

  if (kind === "south") {
    const c = 2 + Math.floor(rand() * (w - 4));
    set(2, c, "C");
    set(lastR, c, "c");
  } else if (kind === "west") {
    const r = 2 + Math.floor(rand() * (h - 4));
    set(r, lastC - (rand() < 0.5 ? 0 : 1), "C");
    set(r, 1, "c");
  } else if (kind === "corner") {
    set(2, 2, "C");
    set(lastR, lastC, "c");
  } else if (kind === "order") {
    set(2, 2, "C");
    set(lastR, lastC, "c");
    for (let c = lastC - 2; c <= lastC; c++) set(lastR - 1, c, "#");
  } else if (kind === "cradle") {
    set(2, 2, "C");
    set(2, 4, "C");
    set(2, lastC, "c");
  } else if (kind === "newton") {
    set(2, 2, "C");
    set(2, 3, "C");
    set(2, 4, "C");
    set(2, lastC, "c");
  } else if (kind === "twins") {
    set(2, 2, "C");
    set(2, lastC, "c");
    set(lastR - 1, 2, "V");
    set(lastR - 1, lastC, "v");
  } else if (kind === "triple") {
    set(1, 2, "C");
    set(1, lastC, "c");
    set(3, 2, "V");
    set(3, lastC, "v");
    set(lastR, 2, "A");
    set(lastR, lastC, "a");
  } else if (kind === "interfere") {
    set(2, 2, "C");
    set(2, 4, "V");
    set(2, lastC, "v");
    set(lastR, lastC, "c");
  } else if (kind === "cross") {
    const mid = Math.floor(w / 2);
    set(2, mid, "V");
    set(lastR, mid, "v");
    set(Math.floor(h / 2), 2, "C");
    set(Math.floor(h / 2), lastC, "c");
  } else if (kind === "echo") {
    set(2, 2, "Y");
    set(lastR, 4, "C");
    set(lastR, lastC, "c");
  } else if (kind === "echo2") {
    set(2, 2, "Y");
    set(3, 2, "U");
    set(lastR - 1, 2, "C");
    set(lastR - 1, lastC, "c");
    set(lastR, 2, "V");
    set(lastR, lastC, "v");
  } else if (kind === "gap") {
    set(2, 3, "C");
    set(2, 5, "V");
    const gr = Math.floor(h / 2);
    for (let c = 1; c < w - 1; c++) if (c < 3 || c > 5) set(gr, c, "#");
    set(lastR, 3, "c");
    set(lastR, 5, "v");
  } else if (kind === "amp") {
    set(1, 2, "+");
    set(3, 4, "C");
    set(lastR, lastC - 1, "c");
  } else if (kind === "amp2") {
    set(1, 2, "+");
    set(3, 4, "C");
    set(lastR - 1, lastC - 1, "c");
    set(lastR, 2, "V");
    set(lastR, lastC, "v");
  } else if (kind === "four") {
    set(2, 2, "C");
    set(2, 4, "V");
    set(2, 6, "A");
    if (w > 10) set(2, 8, "R");
    set(lastR, 2, "c");
    set(lastR, 4, "v");
    set(lastR, 6, "a");
    if (w > 10) set(lastR, 8, "r");
  } else if (kind === "cage") {
    set(2, 2, "C");
    set(lastR, 3, "c");
    for (let r = 2; r <= lastR; r++) set(r, 4, "#");
    set(lastR - 1, lastC - 2, "V");
    set(lastR, lastC, "v");
  } else return null;

  return dump(g);
}

function nameFor(i: number): string {
  const a = A[i % A.length];
  const b = B[Math.floor(i / A.length) % B.length];
  return `${a} ${b}`;
}

const COLOR_SWAP = [
  ["C", "V", "c", "v"],
  ["C", "A", "c", "a"],
  ["C", "R", "c", "r"],
  ["C", "G", "c", "g"],
  ["V", "A", "v", "a"],
  ["Y", "U", "C", "V", "c", "v"],
];

function swapColors(map: string[], i: number): string[] {
  const pair = COLOR_SWAP[i % COLOR_SWAP.length]!;
  const [a, b, pa, pb] = pair;
  return map.map((row) =>
    row
      .split("")
      .map((ch) => {
        if (ch === a) return b;
        if (ch === b) return a;
        if (ch === pa) return pb;
        if (ch === pb) return pa;
        return ch;
      })
      .join(""),
  );
}

function mirrorH(map: string[]): string[] {
  return map.map((r) => r.split("").reverse().join(""));
}

function mirrorV(map: string[]): string[] {
  if (map.length < 3) return map;
  return [map[0]!, ...map.slice(1, -1).reverse(), map[map.length - 1]!];
}

function trySolve(map: string[], depth: number): number {
  try {
    const parsed = parseMap(map);
    if (!parsed.gems.length || !parsed.pedestals.length) return 0;
    const r = solve(parsed, depth);
    return r.solvable ? r.path.length : 0;
  } catch {
    return 0;
  }
}

function main() {
  const seen = new Set<string>();
  const pool: { map: string[]; par: number }[] = [];

  const add = (map: string[], par: number) => {
    const key = map.join("|");
    if (seen.has(key)) return;
    seen.add(key);
    pool.push({ map, par });
  };

  for (const h of HAND) add(h.map, h.par);

  let seed = 1000;
  let guard = 0;
  while (pool.length < 80 && guard++ < 6000) {
    seed++;
    const kind = (["south", "west", "corner", "order", "cradle", "newton", "twins", "triple", "interfere", "cross", "echo", "echo2", "gap", "amp", "amp2", "four", "cage"] as Kind[])[
      seed % 17
    ]!;
    const map = build(kind, seed * 17 + 91);
    if (!map) continue;
    const par = trySolve(map, 8);
    if (par < 1) continue;
    add(map, par);
  }

  const variants: { map: string[]; par: number }[] = [];
  for (const p of pool) {
    variants.push(p);
    variants.push({ map: mirrorH(p.map), par: p.par });
    variants.push({ map: mirrorV(p.map), par: p.par });
    for (let i = 0; i < 4; i++) variants.push({ map: swapColors(p.map, i), par: p.par });
  }

  const out: LevelDef[] = [];
  for (const h of HAND) {
    out.push({
      ...h,
      chapter: Math.min(9, Math.floor((h.id - 1) / 20)),
    });
  }
  for (const v of variants) {
    if (out.length >= 200) break;
    const key = v.map.join("|");
    if (out.some((x) => x.map.join("|") === key)) continue;
    const par = v.par > 0 ? v.par : trySolve(v.map, 8);
    if (par < 1) continue;
    const id = out.length + 1;
    out.push({
      id,
      name: nameFor(id - 1),
      chapter: Math.min(9, Math.floor((id - 1) / 20)),
      par,
      map: v.map,
    });
  }

  if (out.length < 200) {
    console.error(`only ${out.length} levels (pool ${pool.length})`);
    process.exit(1);
  }

  const body = `import { parseMap } from "../game/parse";
import type { GameState } from "../game/types";

export interface LevelDef {
  id: number;
  name: string;
  chapter: number;
  map: string[];
  par: number;
  intro?: string;
}

export const CHAPTERS = [
  { id: 0, name: "النداء", blurb: "أول همسة من الحجر. موجة صليب، انزلاق حتى الجدار.", story: "نزلتَ إلى فم الكهف. الهواء رطب، والبلورات تنتظر ضربة." },
  { id: 1, name: "المهد", blurb: "بلورتان على خط واحد: الزخم ينتقل كالبلياردو.", story: "تصادم زجاج في القاع. الأولى تتوقف والثانية تطير." },
  { id: 2, name: "الطيف", blurb: "كل قاعدة تقبل لونها فقط.", story: "ألوان الكهف لا تختلط. الفيروزي للفيروزي." },
  { id: 3, name: "الصدى", blurb: "بلورة الهالة تُطلق موجة من موضع توقفها.", story: "الصوت يعود من الجدار حاملاً ضربة ثانية." },
  { id: 4, name: "المتاهة", blurb: "جدران داخلية = مصدّات لا رجعة منها.", story: "الممر يضيق. خطوة في الاتجاه الخطأ فخ أبدي." },
  { id: 5, name: "المُضخّم", blurb: "البلاطة المشعّة تضرب في ثماني جهات.", story: "حجر بنفسجي تحت القدم يضاعف الرنين." },
  { id: 6, name: "التوافق", blurb: "ألوان تتداخل. فكّك العقدة.", story: "أكثر من لون على نفس الخط. لا تخلط القفل." },
  { id: 7, name: "الأعماق", blurb: "صدى داخل المتاهة.", story: "القاع يردّ كل ضربة مرتين." },
  { id: 8, name: "العاصفة", blurb: "مضاعفات وأصداء معاً.", story: "الكهف كله يرن. اضبط الإيقاع." },
  { id: 9, name: "قلب الكهف", blurb: "آخر مئتين همسة. لا ضربة زائدة.", story: "الجوهرة الأم في الصخر. اختم الرنين." },
] as const;

export const LEVELS: LevelDef[] = ${JSON.stringify(out, null, 2)};

const cache = new Map<number, GameState>();

export function levelState(def: LevelDef): GameState {
  let s = cache.get(def.id);
  if (!s) {
    s = parseMap(def.map);
    cache.set(def.id, s);
  }
  return s;
}

export function starsFor(pulses: number, par: number): 1 | 2 | 3 {
  if (pulses <= par) return 3;
  if (pulses <= par + 2) return 2;
  return 1;
}
`;
  writeFileSync(new URL("../data/levels.ts", import.meta.url), body);
  console.error(`wrote ${out.length} levels`);
}

main();
