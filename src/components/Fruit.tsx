import { COLOR_META } from "../game/engine";
import type { Cell } from "../game/types";
import { cn } from "../utils/cn";

const SP_ART: Record<string, string> = {
  blend: "art/blend.png",
  press: "art/press.png",
  burst: "art/blend.png",
};

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
        cell.special !== "none" && "is-special"
      )}
      style={{
        ["--glow" as string]: meta.hex,
      }}
    >
      <img className="fr-photo" src={meta.art} alt="" draggable={false} />
      {cell.special !== "none" && SP_ART[cell.special] && (
        <img className="sp-art" src={SP_ART[cell.special]} alt="" draggable={false} />
      )}
    </div>
  );
}
