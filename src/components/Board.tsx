import { LanternView } from "./Lantern";
import type { Game, Pos } from "../game/types";
import { cn } from "../utils/cn";

type Props = {
  game: Game;
  burst: Pos[];
  onCell: (pos: Pos) => void;
};

function keyOf(p: Pos) {
  return `${p.r}-${p.c}`;
}

export function Board({ game, burst, onCell }: Props) {
  const n = game.size;
  const burstSet = new Set(burst.map(keyOf));
  const hintSet = new Set(
    game.hint ? [keyOf(game.hint[0]), keyOf(game.hint[1])] : []
  );

  return (
    <div
      className="board-frame"
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
    >
      {game.grid.map((row, r) =>
        row.map((cell, c) => {
          const pos = { r, c };
          const k = keyOf(pos);
          const dark = game.dark[r]![c]!;
          const isCat = game.cat?.r === r && game.cat?.c === c;
          const selected = game.selected?.r === r && game.selected?.c === c;
          return (
            <button
              key={`${r}-${c}-${cell?.id ?? "e"}`}
              type="button"
              className={cn(
                "cell",
                dark > 0 && "is-dark",
                dark > 1 && "is-heavy",
                burstSet.has(k) && "is-burst",
                isCat && "is-cat"
              )}
              onPointerDown={(e) => {
                e.preventDefault();
                onCell(pos);
              }}
            >
              {dark > 0 && <span className="smoke" data-n={dark} />}
              {cell && (
                <LanternView
                  cell={cell}
                  selected={selected}
                  hint={hintSet.has(k)}
                  dim={dark > 1}
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
