import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { arNum, LEVELS, MENUS, ORDERS } from "../game/levels";

type Props = {
  unlocked: number;
  stars: number[];
  onBack: () => void;
  onPlay: (id: number) => void;
};

const MAP_W = 768;
const MAP_H = 1376;

const SPOTS = [
  { x: 48.5, y: 91.2 },
  { x: 50.4, y: 81.2 },
  { x: 51.4, y: 71.5 },
  { x: 50.8, y: 61.8 },
  { x: 51.0, y: 53.2 },
  { x: 53.8, y: 45.0 },
  { x: 56.0, y: 37.2 },
  { x: 54.0, y: 29.4 },
  { x: 53.4, y: 22.6 },
  { x: 53.8, y: 16.4 },
];

function coverPoint(cw: number, ch: number, ix: number, iy: number) {
  const scale = Math.max(cw / MAP_W, ch / MAP_H);
  const w = MAP_W * scale;
  const h = MAP_H * scale;
  return {
    left: (cw - w) / 2 + (ix / 100) * w,
    top: (ch - h) / 2 + (iy / 100) * h,
  };
}

export function Nights({ unlocked, stars, onBack, onPlay }: Props) {
  const maxGarden = Math.max(1, Math.min(MENUS, Math.ceil(unlocked / ORDERS)));
  const [garden, setGarden] = useState(maxGarden);
  const drag = useRef<{ y: number; done: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    setGarden(maxGarden);
  }, [maxGarden]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      ref={rootRef}
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
      {box.w > 0 && (
        <div key={garden} className="garden-spots">
          {SPOTS.map((s, i) => {
            const id = startId + i;
            const lv = LEVELS[id - 1];
            if (!lv) return null;
            const st = stars[id] ?? 0;
            const lock = id > unlocked;
            const now = id === Math.min(unlocked, LEVELS.length);
            const pt = coverPoint(box.w, box.h, s.x, s.y);
            return (
              <button
                key={id}
                type="button"
                className={`spot ${st > 0 ? "is-lit" : ""} ${now ? "is-now" : ""} ${lock ? "is-lock" : ""}`}
                style={{ left: `${pt.left}px`, top: `${pt.top}px` }}
                disabled={lock}
                onClick={() => onPlay(id)}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <b>{arNum(id)}</b>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
