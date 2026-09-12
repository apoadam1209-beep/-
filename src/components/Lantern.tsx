import { COLOR_META } from "../game/engine";
import type { Cell } from "../game/types";
import { cn } from "../utils/cn";

const BADGE: Record<string, string> = {
  lineH: "ـ",
  lineV: "|",
  burst: "✦",
  moon: "☾",
};

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
  const delay = `${(cell.id % 7) * 0.37}s`;
  return (
    <div
      className={cn(
        "lantern",
        selected && "is-selected",
        hint && "is-hint",
        dim && "is-dim",
        cell.special !== "none" && "is-special"
      )}
      style={{
        ["--glow" as string]: meta.hex,
        ["--swing-delay" as string]: delay,
      }}
    >
      <span className="lantern-aura" />
      <span className="lantern-well" />
      <img className="lantern-photo" src={meta.art} alt="" draggable={false} />
      <span className="lantern-glass" />
      <span className="lantern-flame" />
      {cell.special !== "none" && (
        <span className="badge">{BADGE[cell.special]}</span>
      )}
    </div>
  );
}
