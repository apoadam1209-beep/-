import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { FruitView } from "./Fruit";
import { COLOR_META, stepDir } from "../game/engine";
import type { Cell, Dir, DropFx, Game, Pos } from "../game/types";
import { cn } from "../utils/cn";

const GAP = 6;
const PAD = 8;

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
  const cols = game.cols;
  const rows = game.rows;
  const frameRef = useRef<HTMLDivElement>(null);
  const [cellW, setCellW] = useState(0);
  const [cellH, setCellH] = useState(0);
  const [live, setLive] = useState(false);
  const [pull, setPull] = useState<Pull | null>(null);
  const [tick, setTick] = useState(0);
  const entered = useRef(new Set<number>());
  const drag = useRef<{
    pos: Pos;
    x: number;
    y: number;
    done: boolean;
    strideX: number;
    strideY: number;
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
      const h = el.clientHeight;
      setCellW((w - PAD * 2 - GAP * (cols - 1)) / cols);
      setCellH((h - PAD * 2 - GAP * (rows - 1)) / rows);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cols, rows]);

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

  function commit(pos: Pos, dir: Dir, dx: number, dy: number, strideX: number, strideY: number) {
    if (!canSwipe(pos, dir)) {
      bounceHome(pos, dx, dy, dir);
      requestAnimationFrame(() => onReject());
      return;
    }
    const fullX = dir === "right" ? strideX : dir === "left" ? -strideX : 0;
    const fullY = dir === "down" ? strideY : dir === "up" ? -strideY : 0;
    const span = Math.hypot(fullX, fullY) || 1;
    const remain = Math.hypot(fullX - dx, fullY - dy) / span;
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
    drag.current = {
      pos,
      x: e.clientX,
      y: e.clientY,
      done: false,
      strideX: e.currentTarget.offsetWidth + GAP,
      strideY: e.currentTarget.offsetHeight + GAP,
    };
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
      dx = Math.max(-d.strideX, Math.min(d.strideX, dx));
    } else {
      dx = 0;
      dy = Math.max(-d.strideY, Math.min(d.strideY, dy));
    }
    setPull({ pos: d.pos, dx, dy, dir, settle: false });
    const need = axisOf(dir) === "h" ? d.strideX : d.strideY;
    if (Math.hypot(dx, dy) >= need * 0.5) {
      d.done = true;
      commit(d.pos, dir, dx, dy, d.strideX, d.strideY);
    }
  }

  function onUp(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.done) return;
    d.done = true;
    const rawX = e.clientX - d.x;
    const rawY = e.clientY - d.y;
    const dir = dirOf(rawX, rawY);
    const dx = axisOf(dir) === "h" ? Math.max(-d.strideX, Math.min(d.strideX, rawX)) : 0;
    const dy = axisOf(dir) === "v" ? Math.max(-d.strideY, Math.min(d.strideY, rawY)) : 0;
    const need = axisOf(dir) === "h" ? d.strideX : d.strideY;
    if (Math.hypot(dx, dy) >= need * 0.5) {
      commit(d.pos, dir, dx, dy, d.strideX, d.strideY);
    } else {
      bounceHome(d.pos, dx, dy, dir);
    }
  }

  const strideX = cellW + GAP;
  const strideY = cellH + GAP;
  void tick;

  return (
    <div className="board-shell">
      <div
        ref={frameRef}
        className="board-frame"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
        dir="ltr"
      >
        {game.grid.map((row, r) =>
          row.map((_cell, c) => {
            const pos = { r, c };
            const k = keyOf(pos);
            const ice = game.ice[r]![c]!;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                className={cn(
                  "cell",
                  ice > 0 ? "is-ice" : "is-free",
                  ice > 1 && "is-heavy",
                  burstSet.has(k) && "is-burst"
                )}
                onPointerDown={(e) => {
                  e.preventDefault();
                  onDown(e, pos);
                }}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
              >
                <span className="cell-pad" />
                {ice > 0 && <img className="ice-layer" data-n={ice} src="art/ice.png" alt="" draggable={false} />}
                {fireSet.has(k) && (
                  <span
                    className="fx-splash"
                    style={{ ["--glow" as string]: COLOR_META[game.grid[r]![c]?.color ?? "mango"].hex }}
                  />
                )}
              </button>
            );
          })
        )}
      </div>
      {cellW > 0 && cellH > 0 && (
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
            const x = PAD + c * strideX + extraX;
            const y = PAD + r * strideY + extraY + (lift ? -(r + 1) * strideY : 0);
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
                  height: cellH,
                  transform: `translate(${x}px, ${y}px)`,
                  transition: moving || pull?.settle ? undefined : "none",
                  zIndex: dragging ? 10 : sliding ? 9 : falling || lift ? 6 : 2,
                }}
              >
                <FruitView cell={cell} selected={dragging} hint={hintSet.has(k)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
