import { useRef, type PointerEvent } from "react";
import { LanternView } from "./Lantern";
import type { Dir, Game, Pos } from "../game/types";
import { cn } from "../utils/cn";

type Props = {
  game: Game;
  burst: Pos[];
  holding: Pos | null;
  onSwipe: (from: Pos, dir: Dir) => void;
};

function keyOf(p: Pos) {
  return `${p.r}-${p.c}`;
}

const THRESH = 22;

export function Board({ game, burst, holding, onSwipe }: Props) {
  const n = game.size;
  const burstSet = new Set(burst.map(keyOf));
  const hintSet = new Set(game.hint ? [keyOf(game.hint[0]), keyOf(game.hint[1])] : []);
  const drag = useRef<{ pos: Pos; x: number; y: number; done: boolean } | null>(null);

  function dirOf(dx: number, dy: number): Dir {
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
    return dy > 0 ? "down" : "up";
  }

  function onDown(e: PointerEvent<HTMLButtonElement>, pos: Pos) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { pos, x: e.clientX, y: e.clientY, done: false };
  }

  function onMove(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.done) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.hypot(dx, dy) < THRESH) return;
    d.done = true;
    onSwipe(d.pos, dirOf(dx, dy));
  }

  function onUp() {
    drag.current = null;
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
          return (
            <button
              key={`${r}-${c}-${cell?.id ?? "e"}`}
              type="button"
              className={cn(
                "cell",
                dark > 0 && "is-dark",
                dark > 1 && "is-heavy",
                burstSet.has(k) && "is-burst",
                isCat && "is-cat",
                held && "is-hold"
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
                <LanternView
                  cell={cell}
                  selected={held}
                  hint={hintSet.has(k)}
                  dim={false}
                />
              )}
              {isCat && <span className="cat">🐱</span>}
            </button>
          );
        })
      )}
    </div>
  );
}
