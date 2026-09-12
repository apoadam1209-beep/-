import type { LevelDef, Night, NightId } from "./types";

export const DAYS = 30;
export const HARAS = 10;

const AR = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
export function arNum(n: number) {
  return String(n).replace(/\d/g, (d) => AR[Number(d)]!);
}

const HARA_NAMES = [
  "الزقاق",
  "البيت",
  "السوق",
  "المسجد",
  "السطح",
  "الحارة",
  "الفسحة",
  "الباب",
  "المشربية",
  "السحور",
];

const ART: Record<NightId, string> = {
  alley: "art/night-alley.jpg",
  square: "art/night-square.jpg",
  roof: "art/night-roof.jpg",
  dawn: "art/dawn-sky.jpg",
};

function themeOf(day: number): NightId {
  if (day <= 8) return "alley";
  if (day <= 16) return "square";
  if (day <= 24) return "roof";
  return "dawn";
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

function inb(n: number, r: number, c: number) {
  return r >= 0 && c >= 0 && r < n && c < n;
}

function paint(n: number, kind: number, day: number, hara: number, rng: () => number) {
  const g = Array.from({ length: n }, () => Array<number>(n).fill(0));
  const set = (r: number, c: number, v: number) => {
    if (inb(n, r, c)) g[r]![c] = Math.max(g[r]![c]!, v);
  };
  const heavy = day > 14 && hara > 5 ? 2 : 1;
  const m = (n / 2) | 0;

  switch (kind % 8) {
    case 0: {
      for (let i = 1; i < n - 1; i++) {
        set(m, i, 1);
        set(i, m, 1);
      }
      set(m, m, heavy);
      break;
    }
    case 1: {
      for (let i = 0; i < n; i++) {
        set(0, i, 1);
        set(n - 1, i, 1);
        set(i, 0, 1);
        set(i, n - 1, 1);
      }
      set(0, 0, heavy);
      set(0, n - 1, heavy);
      set(n - 1, 0, heavy);
      set(n - 1, n - 1, heavy);
      break;
    }
    case 2: {
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          if ((r + c) % 2 === 0 && rng() < 0.55 + day * 0.01) set(r, c, 1);
      break;
    }
    case 3: {
      for (let i = 0; i < n; i++) {
        set(i, i, heavy);
        set(i, n - 1 - i, 1);
      }
      break;
    }
    case 4: {
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) {
          set(r, c, 1);
          set(n - 1 - r, n - 1 - c, 1);
        }
      if (hara > 4)
        for (let r = 0; r < 3; r++)
          for (let c = 0; c < 3; c++) {
            set(r, n - 1 - c, 1);
            set(n - 1 - r, c, 1);
          }
      break;
    }
    case 5: {
      const rows = hara % 2 === 0 ? [1, 3, n - 2] : [2, m, n - 3];
      for (const r of rows) for (let c = 1; c < n - 1; c++) set(r, c, r === m ? heavy : 1);
      break;
    }
    case 6: {
      const cols = [1, m, n - 2];
      for (const c of cols) for (let r = 1; r < n - 1; r++) set(r, c, 1);
      break;
    }
    default: {
      const rad = 1 + ((hara + day) % 3);
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          const d = Math.abs(r - m) + Math.abs(c - m);
          if (d <= rad) set(r, c, d === 0 ? heavy : 1);
        }
      break;
    }
  }

  const extra = 2 + ((day + hara) % 5);
  for (let i = 0; i < extra; i++) {
    set((rng() * n) | 0, (rng() * n) | 0, rng() < 0.3 && day > 10 ? 2 : 1);
  }

  if (day === 1 && hara === 1) {
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[r]![c] = 0;
    set(m, m, 1);
    set(m - 1, m, 1);
    set(m + 1, m, 1);
    set(m, m - 1, 1);
    set(m, m + 1, 1);
  }

  return g.map((row) => row.map((v) => (v === 0 ? "." : String(v))).join(""));
}

function buildLevels(): LevelDef[] {
  const out: LevelDef[] = [];
  for (let day = 1; day <= DAYS; day++) {
    const theme = themeOf(day);
    for (let hara = 1; hara <= HARAS; hara++) {
      const id = (day - 1) * HARAS + hara;
      const rng = mulberry(day * 1009 + hara * 17 + 3);
      const size = day < 5 && hara < 5 ? 7 : 8;
      const colorCount = day < 4 ? 4 : 5;
      const dark = paint(size, day + hara, day, hara, rng);
      const need = dark.join("").replace(/\./g, "").length;
      const moves = Math.max(14, Math.min(32, 12 + need + Math.floor((11 - hara) / 2) - Math.floor(day / 6)));
      out.push({
        id,
        day,
        hara,
        name: `${arNum(day)} رمضان · ${HARA_NAMES[hara - 1]}`,
        night: theme,
        blurb: "اسحب",
        size,
        colorCount,
        moves,
        dark,
      });
    }
  }
  return out;
}

export const LEVELS: LevelDef[] = buildLevels();

export const NIGHTS: Night[] = Array.from({ length: DAYS }, (_, i) => {
  const day = i + 1;
  const id = themeOf(day);
  return {
    id,
    day,
    name: `${arNum(day)} رمضان`,
    from: i * HARAS + 1,
    to: (i + 1) * HARAS,
    art: ART[id],
  };
});

export function nightOf(levelId: number): Night {
  return NIGHTS[Math.max(0, Math.min(DAYS - 1, Math.floor((levelId - 1) / HARAS)))]!;
}

export const HARA_LABELS = HARA_NAMES;
