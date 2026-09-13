import { COLOR_META } from "../game/engine";
import type { Cell } from "../game/types";
import { cn } from "../utils/cn";

export function FruitView({
  cell,
  selected,
  hint,
}: {
  cell: Cell;
  selected?: boolean;
  hint?: boolean;
}) {
  const meta = COLOR_META[cell.color];
  return (
    <div
      className={cn(
        "fruit",
        `c-${cell.color}`,
        selected && "is-selected",
        hint && "is-hint",
        cell.special !== "none" && "is-special",
        cell.special === "prism" && "is-prism",
        cell.special === "juice" && "is-juice"
      )}
      style={{
        ["--glow" as string]: meta.hex,
      }}
    >
      {cell.special === "prism" ? (
        <img className="fr-photo" src="art/prism.png" alt="" draggable={false} />
      ) : (
        <img className="fr-photo" src={meta.art} alt="" draggable={false} />
      )}
      {cell.special === "juice" && <span className="juice-drop" />}
    </div>
  );
}
