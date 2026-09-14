import { useEffect, useRef, useState, type PointerEvent } from "react";
import { arNum, LEVELS, MENUS, ORDERS } from "../game/levels";

type Props = {
  unlocked: number;
  stars: number[];
  onBack: () => void;
  onPlay: (id: number) => void;
};

const MAP = { w: 432, h: 768 };

const SPOTS = [
  { x: 50, y: 90 },
  { x: 57, y: 80 },
  { x: 64, y: 70 },
  { x: 67, y: 61 },
  { x: 57, y: 51 },
  { x: 50, y: 42 },
  { x: 56, y: 34 },
  { x: 58, y: 26 },
  { x: 56, y: 19 },
  { x: 55, y: 15 },
];

export function Nights({ unlocked, stars, onBack, onPlay }: Props) {
  const maxGarden = Math.max(1, Math.min(MENUS, Math.ceil(unlocked / ORDERS)));
  const [garden, setGarden] = useState(maxGarden);
  const drag = useRef<{ y: number; done: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ left: 0, top: 0, dw: 0, dh: 0 });

  useEffect(() => {
    setGarden(maxGarden);
  }, [maxGarden]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const scale = Math.max(cw / MAP.w, ch / MAP.h);
      const dw = MAP.w * scale;
      const dh = MAP.h * scale;
      setBox({ left: (cw - dw) / 2, top: (ch - dh) / 2, dw, dh });
    };
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
      <img className="garden-photo" src="art/garden-map.jpg" alt="" draggable={false} />
      <div className="garden-shade" />
      <button className="chip icon garden-back" onClick={onBack} aria-label="خروج">
        ✕
      </button>
      {box.dw > 0 && (
      <div key={garden} className="garden-spots">
        {SPOTS.map((s, i) => {
          const id = startId + i;
          const lv = LEVELS[id - 1];
          if (!lv) return null;
          const st = stars[id] ?? 0;
          const lock = id > unlocked;
          const now = id === Math.min(unlocked, LEVELS.length);
          const scale = 1 - i * 0.045;
          return (
            <button
              key={id}
              type="button"
              className={`spot ${st > 0 ? "is-lit" : ""} ${now ? "is-now" : ""} ${lock ? "is-lock" : ""}`}
              style={{
                left: box.left + (s.x / 100) * box.dw,
                top: box.top + (s.y / 100) * box.dh,
                width: `${2.7 * scale}rem`,
                height: `${2.7 * scale}rem`,
                fontSize: `${0.92 * scale}rem`,
              }}
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
