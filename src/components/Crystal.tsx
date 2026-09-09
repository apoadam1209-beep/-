import type { Color, GemKind } from "../game/types";

const SRC: Record<Color, string> = {
  cyan: "art/crystal-cyan.png",
  violet: "art/crystal-violet.png",
  amber: "art/crystal-amber.png",
  rose: "art/crystal-rose.png",
  emerald: "art/crystal-emerald.png",
};

export default function Crystal({
  color,
  kind,
  locked,
  size = 44,
}: {
  color: Color;
  kind: GemKind;
  locked?: boolean;
  size?: number;
  uid?: string;
}) {
  const src = `${import.meta.env.BASE_URL}${SRC[color]}`;
  return (
    <span
      className={`crystal-photo-wrap ${locked ? "is-locked" : ""} ${kind === "echo" ? "is-echo" : ""}`}
      style={{ width: size, height: size }}
    >
      {kind === "echo" && <span className="echo-halo" />}
      <img src={src} alt="" draggable={false} className="crystal-photo" width={size} height={size} />
      {locked && <span className="lock-halo" />}
    </span>
  );
}
