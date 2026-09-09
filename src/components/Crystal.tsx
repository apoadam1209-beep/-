import type { Color, GemKind } from "../game/types";
import { COLOR_DEEP, COLOR_HEX } from "../game/types";

export default function Crystal({
  color,
  kind,
  locked,
  size = 44,
  uid = "x",
}: {
  color: Color;
  kind: GemKind;
  locked?: boolean;
  size?: number;
  uid?: string;
}) {
  const hex = COLOR_HEX[color];
  const deep = COLOR_DEEP[color];
  const id = `${uid}-${color}-${kind}`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`crystal-svg ${locked ? "is-locked" : ""} ${kind === "echo" ? "is-echo" : ""}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={`g-${id}`} x1="18%" y1="0%" x2="86%" y2="100%">
          <stop offset="0%" stopColor="#f8ffff" stopOpacity="0.95" />
          <stop offset="38%" stopColor={hex} />
          <stop offset="100%" stopColor={deep} />
        </linearGradient>
        <linearGradient id={`e-${id}`} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor={hex} stopOpacity="0.05" />
        </linearGradient>
        <filter id={`glow-${id}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {kind === "echo" && (
        <circle
          cx="32"
          cy="30"
          r="26"
          fill="none"
          stroke={hex}
          strokeOpacity="0.45"
          strokeWidth="1.4"
          strokeDasharray="4 5"
        />
      )}
      <g filter={`url(#glow-${id})`}>
        <polygon points="32,4 58,24 32,60 6,24" fill={`url(#g-${id})`} />
        <polygon points="32,4 58,24 32,28" fill={`url(#e-${id})`} opacity="0.75" />
        <polygon points="32,4 6,24 32,28" fill={hex} opacity="0.28" />
        <polygon points="6,24 32,60 32,28" fill={deep} opacity="0.35" />
        <polygon points="58,24 32,60 32,28" fill="#001018" opacity="0.18" />
        <polyline
          points="32,4 32,60"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.22"
          strokeWidth="1"
        />
      </g>
      {locked && (
        <circle
          cx="32"
          cy="30"
          r="22"
          fill="none"
          stroke={hex}
          strokeWidth="1.6"
          opacity="0.85"
        />
      )}
    </svg>
  );
}
