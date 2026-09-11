import { COLOR_META } from "../game/engine";
import type { Cell } from "../game/types";
import { cn } from "../utils/cn";

export function LanternView({
  cell,
  selected,
  hint,
  dim,
}: {
  cell: Cell;
  selected?: boolean;
  hint?: boolean;
  dim?: boolean;
}) {
  const meta = COLOR_META[cell.color];
  return (
    <div
      className={cn(
        "lantern",
        selected && "is-selected",
        hint && "is-hint",
        dim && "is-dim"
      )}
      style={{ ["--glow" as string]: meta.hex }}
    >
      <img src={meta.art} alt="" draggable={false} />
      {cell.special === "lineH" && <span className="badge">ـ</span>}
      {cell.special === "lineV" && <span className="badge">|</span>}
      {cell.special === "burst" && <span className="badge">✦</span>}
      {cell.special === "moon" && <span className="badge">☾</span>}
    </div>
  );
}
