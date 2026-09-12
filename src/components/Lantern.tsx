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
  const delay = `${(cell.id % 7) * 0.31}s`;
  return (
    <div
      className={cn(
        "lantern",
        `c-${cell.color}`,
        selected && "is-selected",
        hint && "is-hint",
        dim && "is-dim",
        cell.special !== "none" && "is-special"
      )}
      style={{
        ["--glow" as string]: meta.hex,
        ["--deep" as string]: meta.deep,
        ["--swing-delay" as string]: delay,
      }}
    >
      <span className="fn-hook" />
      <span className="fn-cap" />
      <span className="fn-body">
        <span className="fn-gem" />
        <span className="fn-flame" />
        <span className="fn-shine" />
      </span>
      <span className="fn-base" />
      {cell.special !== "none" && <span className="badge">{BADGE[cell.special]}</span>}
    </div>
  );
}
