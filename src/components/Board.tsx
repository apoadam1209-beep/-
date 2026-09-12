import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { LanternView } from "./Lantern";
import { stepDir } from "../game/engine";
import type { Dir, DropFx, Game, Pos, SwapFx } from "../game/types";
import { cn } from "../utils/cn";

type Props = {
  game: Game;
  burst: Pos[];
  holding: Pos | null;
  swap: SwapFx | null;
  drops: DropFx[];
  spawns: number[];
  onSwipe: (from: Pos, dir: Dir) => boolean;
};

function keyOf(p: Pos) {
  return `${p.r}-${p.c}`;
}

function same(a: Pos, b: Pos) {
  return a.r === b.r && a.c === b.c;
}

function axisOf(dir: Dir): { sx: number; sy: number; rot: number } {
  if (dir === "right") return { sx: 1, sy: 0, rot: 10 };
  if (dir === "left") return { sx: -1, sy: 0, rot: -10 };
  if (dir === "down") return { sx: 0, sy: 1, rot: 8 };
  return { sx: 0, sy: -1, rot: -8 };
}

function opp(dir: Dir): Dir {
  if (dir === "up") return "down";
  if (dir === "down") return "up";
  if (dir === "left") return "right";
  return "left";
}

const THRESH = 22;

export function Board({ game, burst, holding, swap, drops, spawns, onSwipe }: Props) {
  const n = game.size;
  const burstSet = new Set(burst.map(keyOf));
  const hintSet = new Set(game.hint ? [keyOf(game.hint[0]), keyOf(game.hint[1])] : []);
  const dropMap = new Map(drops.map((d) => [d.id, d.dist]));
  const spawnSet = new Set(spawns);
  const drag = useRef<{
    pos: Pos;
    x: number;
    y: number;
    done: boolean;
    w: number;
  } | null>(null);
  const [pull, setPull] = useState<{ pos: Pos; dx: number; dy: number; axis: "h" | "v" | null } | null>(
    null
  );

  useEffect(() => {
    if (swap) setPull(null);
  }, [swap]);

  function dirOf(dx: number, dy: number): Dir {
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
    return dy > 0 ? "down" : "up";
  }

  function onDown(e: PointerEvent<HTMLButtonElement>, pos: Pos) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const w = e.currentTarget.offsetWidth;
    drag.current = { pos, x: e.clientX, y: e.clientY, done: false, w };
    setPull({ pos, dx: 0, dy: 0, axis: null });
  }

  function onMove(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.done) return;
    const rawX = e.clientX - d.x;
    const rawY = e.clientY - d.y;
    const axis: "h" | "v" | null =
      Math.hypot(rawX, rawY) < 8 ? null : Math.abs(rawX) > Math.abs(rawY) ? "h" : "v";
    let dx = rawX;
    let dy = rawY;
    if (axis === "h") {
      dy = 0;
      dx = Math.max(-d.w, Math.min(d.w, dx));
    } else if (axis === "v") {
      dx = 0;
      dy = Math.max(-d.w, Math.min(d.w, dy));
    }
    setPull({ pos: d.pos, dx, dy, axis });
    if (Math.hypot(rawX, rawY) < THRESH) return;
    const started = onSwipe(d.pos, dirOf(rawX, rawY));
    if (!started) {
      setPull(null);
      drag.current = null;
      return;
    }
    d.done = true;
  }

  function onUp() {
    const d = drag.current;
    drag.current = null;
    if (!d?.done) setPull(null);
  }

  function pieceStyle(r: number, c: number, id: number | undefined): CSSProperties {
    const style: Record<string, string | number> = {};
    if (swap) {
      const onA = same({ r, c }, swap.a);
      const onB = same({ r, c }, swap.b);
      if (onA || onB) {
        const ax = axisOf(onA ? swap.dir : opp(swap.dir));
        style["--sx"] = String(ax.sx);
        style["--sy"] = String(ax.sy);
        style["--rot"] = String(ax.rot);
        style.zIndex = onA ? 9 : 8;
      }
    }
    if (pull && same({ r, c }, pull.pos) && !swap) {
      style.transform = `translate(${pull.dx}px, ${pull.dy}px) scale(1.16)`;
      style.zIndex = 9;
      style.transition = "none";
    } else if (pull?.axis && !swap) {
      const nb = stepDir(pull.pos, pull.axis === "h" ? (pull.dx >= 0 ? "right" : "left") : pull.dy >= 0 ? "down" : "up");
      if (same({ r, c }, nb) && (pull.dx !== 0 || pull.dy !== 0)) {
        style.transform = `translate(${-pull.dx}px, ${-pull.dy}px)`;
        style.zIndex = 8;
        style.transition = "none";
      }
    }
    const dist = id != null ? dropMap.get(id) : undefined;
    if (dist) {
      style["--drop"] = String(dist);
      style.zIndex = 6;
    }
    return style as CSSProperties;
  }

  return (
    <div
      className="board-frame"
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
      dir="ltr"
    >
      {game.grid.map((row, r) =>
        row.map((cell, c) => {
          const pos = { r, c };
          const k = keyOf(pos);
          const dark = game.dark[r]![c]!;
          const isCat = game.cat?.r === r && game.cat?.c === c;
          const held = holding?.r === r && holding?.c === c;
          const dragging = !!(pull && same(pos, pull.pos) && !swap);
          const swapping = !!(swap && (same(pos, swap.a) || same(pos, swap.b)));
          const lead = dragging || !!(swap && same(pos, swap.a));
          const popping = burstSet.has(k);
          const dropping = !!(cell && dropMap.has(cell.id));
          const spawning = !!(cell && spawnSet.has(cell.id));
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              className={cn(
                "cell",
                dark > 0 && "is-dark",
                dark > 1 && "is-heavy",
                popping && "is-burst",
                isCat && "is-cat",
                (held || dragging || swapping || dropping) && "is-hold",
                lead && "is-lead"
              )}
              onPointerDown={(e) => {
                e.preventDefault();
                onDown(e, pos);
              }}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              {dark > 0 && <span className="smoke" data-n={dark} />}
              {dark > 0 && <span className="target-ring" />}
              {cell && (
                <div
                  className={cn(
                    "piece",
                    dragging && "is-drag",
                    swapping && swap?.mode === "swap" && "is-swap",
                    swapping && swap?.mode === "bounce" && "is-bounce",
                    popping && "is-pop",
                    dropping && "is-drop",
                    spawning && "is-spawn"
                  )}
                  style={pieceStyle(r, c, cell.id)}
                >
                  <LanternView
                    cell={cell}
                    selected={held || dragging}
                    hint={hintSet.has(k)}
                  />
                </div>
              )}
              {isCat && <span className="cat">🐱</span>}
            </button>
          );
        })
      )}
    </div>
  );
}
