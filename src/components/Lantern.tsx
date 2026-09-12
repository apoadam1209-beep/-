import { COLOR_META } from "../game/engine";
import type { Cell } from "../game/types";
import { cn } from "../utils/cn";

const SP_ART: Record<string, string> = {
  dynamite: "art/dynamite.png",
  cannon: "art/cannon.png",
  burst: "art/dynamite.png",
};

export function LanternView({
  cell,
  selected,
  hint,
  wind,
}: {
  cell: Cell;
  selected?: boolean;
  hint?: boolean;
  wind?: string | null;
}) {
  const meta = COLOR_META[cell.color];
  const delay = `${(cell.id % 7) * 0.31}s`;
  return (
    <div
      className={cn(
        "lantern",
        `c-${cell.color}`,
        selected && "is-selected",
        hint && "is-hint",
        cell.special !== "none" && "is-special",
        wind && `lean-${wind}`
      )}
      style={{
        ["--glow" as string]: meta.hex,
        ["--deep" as string]: meta.deep,
        ["--swing-delay" as string]: delay,
      }}
    >
      <span className="fn-aura" />
      <img className="fn-photo" src={meta.art} alt="" draggable={false} />
      {cell.special !== "none" && SP_ART[cell.special] && (
        <img className="sp-art" src={SP_ART[cell.special]} alt="" draggable={false} />
      )}
    </div>
  );
}
