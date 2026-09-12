import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { LanternView } from "./Lantern";
import { COLOR_META, stepDir } from "../game/engine";
import type { Cell, Dir, DropFx, Game, Pos } from "../game/types";
import { cn } from "../utils/cn";

const GAP = 6;
const PAD = 12;

type Props = {
  game: Game;
  burst: Pos[];
  fire: Pos[];
  drops: DropFx[];
  spawns: number[];
  busy: boolean;
  canSwipe: (from: Pos, dir: Dir) => boolean;
  onSwap: (from: Pos, dir: Dir) => void;
  onReject: () => void;
};

function keyOf(p: Pos) {
  return `${p.r}-${p.c}`;
}

function same(a: Pos, b: Pos) {
  return a.r === b.r && a.c === b.c;
}

function dirOf(dx: number, dy: number): Dir {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

function axisOf(dir: Dir) {
  return dir === "left" || dir === "right" ? "h" : "v";
}

type Pull = {
  pos: Pos;
  dx: number;
  dy: number;
  dir: Dir;
  settle: boolean;
};

export function Board({
  game,
  burst,
  fire,
  drops,
  spawns,
  busy,
  canSwipe,
  onSwap,
  onReject,
}: Props) {
  const n = game.size;
  const frameRef = useRef<HTMLDivElement>(null);
  const [cellW, setCellW] = useState(0);
  const [live, setLive] = useState(false);
  const [pull, setPull] = useState<Pull | null>(null);
  const [tick, setTick] = useState(0);
  const entered = useRef(new Set<number>());
  const drag = useRef<{
    pos: Pos;
    x: number;
    y: number;
    done: boolean;
    stride: number;
  } | null>(null);
  const settleTimer = useRef(0);

  const burstSet = new Set(burst.map(keyOf));
  const fireSet = new Set(fire.map(keyOf));
  const hintSet = new Set(game.hint ? [keyOf(game.hint[0]), keyOf(game.hint[1])] : []);
  const dropSet = new Set(drops.map((d) => d.id));
  const spawnSet = new Set(spawns);

  const pieces: { cell: Cell; r: number; c: number }[] = [];
  game.grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) pieces.push({ cell, r, c });
    });
  });

  useLayoutEffect(() => {
    setLive(true);
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setCellW((w - PAD * 2 - GAP * (n - 1)) / n);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [n]);

  useLayoutEffect(() => {
    if (!spawns.length) return;
    const ids = [...spawns];
    const raf = requestAnimationFrame(() => {
      ids.forEach((id) => entered.current.add(id));
      setTick((t) => t + 1);
    });
    return () => cancelAnimationFrame(raf);
  }, [spawns]);

  function clearTimer() {
    if (settleTimer.current) {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = 0;
    }
  }

  function bounceHome(pos: Pos, dx: number, dy: number, dir: Dir) {
    setPull({ pos, dx, dy, dir, settle: true });
    requestAnimationFrame(() => setPull({ pos, dx: 0, dy: 0, dir, settle: true }));
    clearTimer();
    settleTimer.current = window.setTimeout(() => {
      setPull(null);
      drag.current = null;
    }, 200);
  }

  function commit(pos: Pos, dir: Dir, dx: number, dy: number, stride: number) {
    if (!canSwipe(pos, dir)) {
      bounceHome(pos, dx, dy, dir);
      requestAnimationFrame(() => onReject());
      return;
    }
    const fullX = dir === "right" ? stride : dir === "left" ? -stride : 0;
    const fullY = dir === "down" ? stride : dir === "up" ? -stride : 0;
    const remain = Math.hypot(fullX - dx, fullY - dy) / stride;
    const ms = remain < 0.04 ? 32 : 160;
    setPull({ pos, dx: fullX, dy: fullY, dir, settle: true });
    clearTimer();
    settleTimer.current = window.setTimeout(() => {
      onSwap(pos, dir);
      setPull(null);
      drag.current = null;
    }, ms);
  }

  function onDown(e: PointerEvent<HTMLButtonElement>, pos: Pos) {
    if (busy || game.status !== "play") return;
    clearTimer();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const stride = e.currentTarget.offsetWidth + GAP;
    drag.current = { pos, x: e.clientX, y: e.clientY, done: false, stride };
    setPull({ pos, dx: 0, dy: 0, dir: "right", settle: false });
  }

  function onMove(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.done || busy) return;
    const rawX = e.clientX - d.x;
    const rawY = e.clientY - d.y;
    const dir = dirOf(rawX, rawY);
    let dx = rawX;
    let dy = rawY;
    if (axisOf(dir) === "h") {
      dy = 0;
      dx = Math.max(-d.stride, Math.min(d.stride, dx));
    } else {
      dx = 0;
      dy = Math.max(-d.stride, Math.min(d.stride, dy));
    }
    setPull({ pos: d.pos, dx, dy, dir, settle: false });
    if (Math.hypot(dx, dy) >= d.stride * 0.5) {
      d.done = true;
      commit(d.pos, dir, dx, dy, d.stride);
    }
  }

  function onUp(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.done) return;
    d.done = true;
    const rawX = e.clientX - d.x;
    const rawY = e.clientY - d.y;
    const dir = dirOf(rawX, rawY);
    const dx = axisOf(dir) === "h" ? Math.max(-d.stride, Math.min(d.stride, rawX)) : 0;
    const dy = axisOf(dir) === "v" ? Math.max(-d.stride, Math.min(d.stride, rawY)) : 0;
    if (Math.hypot(dx, dy) >= d.stride * 0.5) {
      commit(d.pos, dir, dx, dy, d.stride);
    } else {
      bounceHome(d.pos, dx, dy, dir);
    }
  }

  const stride = cellW + GAP;
  void tick;

  return (
    <div className="board-shell">
      <div ref={frameRef} className="board-frame" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }} dir="ltr">
        {game.grid.map((row, r) =>
          row.map((cell, c) => {
            const pos = { r, c };
            const k = keyOf(pos);
            const dark = game.dark[r]![c]!;
            const ghost = game.ghost[r]![c];
            const isCat = game.cat?.r === r && game.cat?.c === c;
            const ghostHex = ghost ? COLOR_META[ghost].hex : undefined;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                className={cn(
                  "cell",
                  dark > 0 ? "is-dark" : "is-lit",
                  dark > 1 && "is-heavy",
                  burstSet.has(k) && "is-burst",
                  isCat && "is-cat",
                  ghost && "is-ghost"
                )}
                style={ghostHex ? ({ ["--ghost" as string]: ghostHex } as CSSProperties) : undefined}
                onPointerDown={(e) => {
                  e.preventDefault();
                  onDown(e, pos);
                }}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
              >
                <span className="cell-pad" />
                {dark > 0 && <span className="target-ring" />}
                {ghost && <span className="ghost-glow" />}
                {fireSet.has(k) && (
                  <img className="fx-fire" src="art/fireburst.png" alt="" draggable={false} />
                )}
                {isCat && <span className="cat">🐱</span>}
                {!cell && null}
              </button>
            );
          })
        )}
      </div>
      {cellW > 0 && (
        <div className="piece-layer" aria-hidden>
          {pieces.map(({ cell, r, c }) => {
            const pos = { r, c };
            const k = keyOf(pos);
            const dragging = !!(pull && same(pos, pull.pos));
            const nb = pull ? stepDir(pull.pos, pull.dir) : null;
            const sliding = !!(pull && nb && same(pos, nb));
            let extraX = 0;
            let extraY = 0;
            if (dragging) {
              extraX = pull!.dx;
              extraY = pull!.dy;
            } else if (sliding) {
              extraX = -pull!.dx;
              extraY = -pull!.dy;
            }
            const lift = spawnSet.has(cell.id) && !entered.current.has(cell.id);
            const x = PAD + c * stride + extraX;
            const y = PAD + r * stride + extraY + (lift ? -(r + 1) * stride : 0);
            const popping = burstSet.has(k);
            const falling = dropSet.has(cell.id);
            const moving = live && !dragging && !sliding && !lift && !popping;
            return (
              <div
                key={cell.id}
                className={cn(
                  "piece",
                  dragging && "is-drag",
                  sliding && "is-drag",
                  pull?.settle && (dragging || sliding) && "is-settle",
                  popping && "is-pop",
                  falling && "is-drop",
                  lift && "is-spawn"
                )}
                style={{
                  width: cellW,
                  height: cellW,
                  transform: `translate(${x}px, ${y}px)`,
                  transition: moving || pull?.settle ? undefined : "none",
                  zIndex: dragging ? 10 : sliding ? 9 : falling || lift ? 6 : 2,
                }}
              >
                <LanternView
                  cell={cell}
                  selected={dragging}
                  hint={hintSet.has(k)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
