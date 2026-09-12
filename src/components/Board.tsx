import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { LanternView } from "./Lantern";
import { COLOR_META, stepDir } from "../game/engine";
import type { Dir, DropFx, Game, Pos } from "../game/types";
import { cn } from "../utils/cn";

type Props = {
  game: Game;
  burst: Pos[];
  fire: Pos[];
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

const THRESH = 8;

export function Board({ game, burst, fire, drops, spawns, onSwipe }: Props) {
  const n = game.size;
  const burstSet = new Set(burst.map(keyOf));
  const fireSet = new Set(fire.map(keyOf));
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
  const [pull, setPull] = useState<{ pos: Pos; dx: number; dy: number } | null>(null);

  function dirOf(dx: number, dy: number): Dir {
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
    return dy > 0 ? "down" : "up";
  }

  function onDown(e: PointerEvent<HTMLButtonElement>, pos: Pos) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { pos, x: e.clientX, y: e.clientY, done: false, w: e.currentTarget.offsetWidth };
    setPull({ pos, dx: 0, dy: 0 });
  }

  function onMove(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.done) return;
    const rawX = e.clientX - d.x;
    const rawY = e.clientY - d.y;
    const axis = Math.abs(rawX) > Math.abs(rawY) ? "h" : "v";
    let dx = rawX;
    let dy = rawY;
    if (axis === "h") {
      dy = 0;
      dx = Math.max(-d.w, Math.min(d.w, dx));
    } else {
      dx = 0;
      dy = Math.max(-d.w, Math.min(d.w, dy));
    }
    setPull({ pos: d.pos, dx, dy });
    if (Math.hypot(rawX, rawY) < THRESH) return;
    const started = onSwipe(d.pos, dirOf(rawX, rawY));
    setPull(null);
    drag.current = started ? { ...d, done: true } : null;
  }

  function onUp() {
    drag.current = null;
    setPull(null);
  }

  function pieceStyle(r: number, c: number, id: number | undefined): CSSProperties {
    const style: Record<string, string | number> = {};
    if (pull && same({ r, c }, pull.pos)) {
      style.transform = `translate(${pull.dx}px, ${pull.dy}px)`;
      style.zIndex = 9;
      style.transition = "none";
    } else if (pull && (pull.dx !== 0 || pull.dy !== 0)) {
      const nb = stepDir(
        pull.pos,
        Math.abs(pull.dx) >= Math.abs(pull.dy)
          ? pull.dx >= 0
            ? "right"
            : "left"
          : pull.dy >= 0
            ? "down"
            : "up"
      );
      if (same({ r, c }, nb)) {
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
    <div className="board-frame" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }} dir="ltr">
      {game.grid.map((row, r) =>
        row.map((cell, c) => {
          const pos = { r, c };
          const k = keyOf(pos);
          const dark = game.dark[r]![c]!;
          const ghost = game.ghost[r]![c];
          const isCat = game.cat?.r === r && game.cat?.c === c;
          const dragging = !!(pull && same(pos, pull.pos));
          const popping = burstSet.has(k);
          const dropping = !!(cell && dropMap.has(cell.id));
          const spawning = !!(cell && spawnSet.has(cell.id));
          const ghostHex = ghost ? COLOR_META[ghost].hex : undefined;
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              className={cn(
                "cell",
                dark > 0 ? "is-dark" : "is-lit",
                dark > 1 && "is-heavy",
                popping && "is-burst",
                isCat && "is-cat",
                ghost && "is-ghost",
                (dragging || dropping) && "is-hold",
                dragging && "is-lead"
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
              {cell && (
                <div
                  className={cn(
                    "piece",
                    dragging && "is-drag",
                    popping && "is-pop",
                    dropping && "is-drop",
                    spawning && "is-spawn"
                  )}
                  style={pieceStyle(r, c, cell.id)}
                >
                  <LanternView cell={cell} selected={dragging} hint={hintSet.has(k)} />
                </div>
              )}
              {fireSet.has(k) && (
                <img className="fx-fire" src="art/fireburst.png" alt="" draggable={false} />
              )}
              {isCat && <span className="cat">🐱</span>}
            </button>
          );
        })
      )}
    </div>
  );
}
