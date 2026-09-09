import { useMemo } from "react";

function GeoRosette({ className }: { className?: string }) {
  const rings = [280, 236, 150, 96];
  const stars = [0, 45];
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden>
      {rings.map((r) => (
        <circle key={r} cx="300" cy="300" r={r} fill="none" stroke="#d4af37" strokeWidth="1" />
      ))}
      {stars.map((a) => (
        <g key={a} transform={`rotate(${a} 300 300)`}>
          <rect x={122} y={122} width={356} height={356} fill="none" stroke="#d4af37" strokeWidth="1" />
          <rect x={182} y={182} width={236} height={236} fill="none" stroke="#d4af37" strokeWidth="1" />
        </g>
      ))}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i * 15 * Math.PI) / 180;
        return (
          <circle key={i} cx={300 + 258 * Math.cos(a)} cy={300 + 258 * Math.sin(a)} r="2" fill="#d4af37" />
        );
      })}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * 45 * Math.PI) / 180;
        return (
          <path
            key={i}
            d={`M ${300 + 60 * Math.cos(a)} ${300 + 60 * Math.sin(a)} L ${300 + 210 * Math.cos(a)} ${300 + 210 * Math.sin(a)}`}
            stroke="#d4af37"
            strokeWidth="1"
          />
        );
      })}
    </svg>
  );
}

/** ambient ember sparks rising through the night */
function EmberField() {
  const embers = useMemo(
    () =>
      Array.from({ length: 16 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 12,
        dur: 7 + Math.random() * 9,
        size: 2 + Math.random() * 4,
        drift: (Math.random() - 0.5) * 90,
        op: 0.35 + Math.random() * 0.45,
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {embers.map((e, i) => (
        <span
          key={i}
          className="animate-ember absolute -bottom-[4vh] rounded-full"
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.dur}s`,
            ["--ember-x" as string]: `${e.drift}px`,
            ["--ember-op" as string]: e.op,
            background: "radial-gradient(circle, #f0d98c, rgba(212,175,55,0.4) 55%, transparent 75%)",
            boxShadow: "0 0 10px 1px rgba(240,217,140,0.55)",
          }}
        />
      ))}
    </div>
  );
}

export default function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {/* moon glow */}
      <div
        className="absolute -top-40 left-1/2 h-[26rem] w-[42rem] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(240,217,140,0.14), transparent 65%)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1000px 500px at 85% 110%, rgba(46,35,100,0.5), transparent 60%), radial-gradient(800px 420px at 10% 105%, rgba(58,44,120,0.35), transparent 60%)",
        }}
      />
      <GeoRosette className="animate-spin-slower absolute -right-52 -top-52 h-[34rem] w-[34rem] opacity-[0.055]" />
      <GeoRosette className="animate-spin-slower-rev absolute -bottom-60 -left-60 h-[38rem] w-[38rem] opacity-[0.05]" />
      <EmberField />
      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(6,4,16,0.75) 100%)" }}
      />
    </div>
  );
}
