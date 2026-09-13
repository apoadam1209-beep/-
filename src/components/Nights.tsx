import { useEffect, useRef, useState, type PointerEvent } from "react";
import { arNum, LEVELS, MENUS, ORDERS } from "../game/levels";

type Props = {
  unlocked: number;
  stars: number[];
  onBack: () => void;
  onPlay: (id: number) => void;
};

const SPOTS = [
  { x: 49, y: 88 },
  { x: 41, y: 78 },
  { x: 57, y: 68 },
  { x: 44, y: 58 },
  { x: 55, y: 48 },
  { x: 42, y: 39 },
  { x: 56, y: 30 },
  { x: 45, y: 21 },
  { x: 53, y: 13 },
  { x: 49, y: 6 },
];

function pathD() {
  const p = SPOTS;
  let d = `M ${p[0]!.x} ${p[0]!.y}`;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1]!;
    const b = p[i]!;
    d += ` Q ${a.x} ${(a.y + b.y) / 2} ${b.x} ${b.y}`;
  }
  return d;
}

export function Nights({ unlocked, stars, onBack, onPlay }: Props) {
  const maxGarden = Math.max(1, Math.min(MENUS, Math.ceil(unlocked / ORDERS)));
  const [garden, setGarden] = useState(maxGarden);
  const drag = useRef<{ y: number; done: boolean } | null>(null);

  useEffect(() => {
    setGarden(maxGarden);
  }, [maxGarden]);

  const startId = (garden - 1) * ORDERS + 1;

  function goGarden(n: number) {
    if (n < 1 || n > maxGarden) return;
    setGarden(n);
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    drag.current = { y: e.clientY, done: false };
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.done) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) < 56) return;
    d.done = true;
    if (dy < 0) goGarden(garden + 1);
    else goGarden(garden - 1);
  }

  function onUp() {
    drag.current = null;
  }

  return (
    <div
      className="garden-root"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="sky" style={{ backgroundImage: "url(art/garden-path.jpg)" }} />
      <div className="garden-shade" />
      <button className="chip icon garden-back" onClick={onBack} aria-label="خروج">
        ✕
      </button>
      <svg className="garden-way" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d={pathD()} />
      </svg>
      <div key={garden} className="garden-spots">
        {SPOTS.map((s, i) => {
          const id = startId + i;
          const lv = LEVELS[id - 1];
          if (!lv) return null;
          const st = stars[id] ?? 0;
          const lock = id > unlocked;
          const now = id === Math.min(unlocked, LEVELS.length);
          return (
            <button
              key={id}
              type="button"
              className={`spot ${st > 0 ? "is-lit" : ""} ${now ? "is-now" : ""} ${lock ? "is-lock" : ""}`}
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
              disabled={lock}
              onClick={() => onPlay(id)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <b>{arNum(id)}</b>
            </button>
          );
        })}
      </div>
    </div>
  );
}
