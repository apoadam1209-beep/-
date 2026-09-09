import { useEffect, useState } from "react";
import type { GameState, Gem, Pos } from "../game/types";
import { COLOR_HEX } from "../game/types";
import { canStrike, gemAt } from "../game/state";
import { previewHits } from "../game/simulate";
import Crystal from "./Crystal";

interface PulseVis {
  r: number;
  c: number;
  amp: boolean;
  key: number;
}

export default function Board({
  state,
  busy,
  hint,
  pulse,
  onStrike,
}: {
  state: GameState;
  busy: boolean;
  hint: Pos | null;
  pulse: PulseVis | null;
  onStrike: (r: number, c: number) => void;
}) {
  const [hover, setHover] = useState<Pos | null>(null);
  const { rows, cols } = state;
  const [cell, setCell] = useState(40);

  useEffect(() => {
    const calc = () => {
      const maxW = Math.min(520, window.innerWidth - 28);
      const maxH = Math.min(560, window.innerHeight - 230);
      setCell(Math.floor(Math.max(28, Math.min(maxW / cols, maxH / rows))));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [rows, cols]);

  const hits = hover && !busy && canStrike(state, hover.r, hover.c)
    ? previewHits(state, hover.r, hover.c)
    : [];
  const hitIds = new Set(hits.map((h) => h.gemId));

  const width = cols * cell;
  const height = rows * cell;

  return (
    <div className="board-wrap mx-auto" style={{ width, height }} dir="ltr">
      <div
        className="relative overflow-hidden rounded-2xl bg-[#071018]"
        style={{ width, height, boxShadow: "0 0 0 1px rgba(94,234,212,0.2), 0 18px 50px -18px rgba(0,0,0,0.7)" }}
      >
        {state.grid.map((row, r) =>
          row.map((kind, c) => {
            const isHint = hint?.r === r && hint?.c === c;
            const isPulse = pulse?.r === r && pulse?.c === c;
            const ped = state.pedestals.find((p) => p.r === r && p.c === c);
            const clickable = !busy && canStrike(state, r, c);
            const cls =
              kind === "wall"
                ? "cell-wall"
                : kind === "amp"
                  ? "cell-amp"
                  : kind === "void"
                    ? "cell-void"
                    : "cell-floor";
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                disabled={!clickable && kind !== "floor" && kind !== "amp"}
                onClick={() => onStrike(r, c)}
                onPointerEnter={() => setHover({ r, c })}
                onPointerLeave={() =>
                  setHover((h) => (h && h.r === r && h.c === c ? null : h))
                }
                className={`absolute border-0 p-0 appearance-none ${cls} ${isHint ? "cell-hint" : ""} ${clickable ? "cursor-pointer" : "cursor-default"}`}
                style={{
                  width: cell,
                  height: cell,
                  left: c * cell,
                  top: r * cell,
                  borderRadius: kind === "wall" ? 4 : 6,
                }}
                aria-label={clickable ? `ضربة عند ${r},${c}` : undefined}
              >
                {kind === "amp" && (
                  <span className="pointer-events-none absolute inset-[22%] rotate-45 rounded-sm border border-violet-300/70" />
                )}
                {ped && (
                  <span
                    className="pedestal-ring pointer-events-none absolute inset-[18%] rounded-full"
                    style={{
                      border: `2px solid ${COLOR_HEX[ped.color]}`,
                      color: COLOR_HEX[ped.color],
                      opacity: gemAt(state, r, c)?.locked ? 0.25 : 0.9,
                    }}
                  />
                )}
                {isPulse && (
                  <span className="pointer-events-none absolute inset-[30%] rounded-full bg-cyan-300/80 shadow-[0_0_18px_#5eead4]" />
                )}
              </button>
            );
          }),
        )}

        {state.gems.map((g) => (
          <GemSprite key={g.id} gem={g} cell={cell} highlighted={hitIds.has(g.id)} />
        ))}

        <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
          {pulse && <PulseRays origin={pulse} rows={rows} cols={cols} cell={cell} amp={pulse.amp} />}
          {hits.map((h) => {
            const gem = state.gems.find((g) => g.id === h.gemId);
            if (!gem || !hover) return null;
            const x1 = hover.c * cell + cell / 2;
            const y1 = hover.r * cell + cell / 2;
            const x2 = gem.c * cell + cell / 2;
            const y2 = gem.r * cell + cell / 2;
            return (
              <line
                key={h.gemId}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={COLOR_HEX[gem.color]}
                strokeWidth="2"
                strokeDasharray="5 6"
                opacity="0.55"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function GemSprite({ gem, cell, highlighted }: { gem: Gem; cell: number; highlighted: boolean }) {
  const size = Math.floor(cell * 0.78);
  return (
    <div
      className="pointer-events-none absolute z-10 flex items-center justify-center"
      style={{
        width: cell,
        height: cell,
        left: gem.c * cell,
        top: gem.r * cell,
        transition: "left 0.32s cubic-bezier(0.2,0.7,0.2,1), top 0.32s cubic-bezier(0.2,0.7,0.2,1), opacity 0.25s",
        filter: highlighted ? "brightness(1.35)" : undefined,
        zIndex: gem.locked ? 8 : 10,
      }}
    >
      <Crystal uid={`g${gem.id}`} color={gem.color} kind={gem.kind} locked={gem.locked} size={size} />
    </div>
  );
}

function PulseRays({
  origin,
  rows,
  cols,
  cell,
  amp,
}: {
  origin: Pos;
  rows: number;
  cols: number;
  cell: number;
  amp: boolean;
}) {
  const x = origin.c * cell + cell / 2;
  const y = origin.r * cell + cell / 2;
  const dirs = amp
    ? [
        [0, -1], [0, 1], [-1, 0], [1, 0],
        [-1, -1], [1, -1], [-1, 1], [1, 1],
      ]
    : [
        [0, -1], [0, 1], [-1, 0], [1, 0],
      ];
  return (
    <g>
      {dirs.map(([dc, dr], i) => {
        const x2 = dc === 0 ? x : dc < 0 ? 0 : cols * cell;
        const y2 = dr === 0 ? y : dr < 0 ? 0 : rows * cell;
        const dx = dc !== 0 && dr !== 0;
        const x2d = dx ? (dc < 0 ? 0 : cols * cell) : x2;
        const y2d = dx ? y + ((x2d - x) / (dc === 0 ? 1 : dc)) * dr : y2;
        return (
          <line
            key={i}
            x1={x}
            y1={y}
            x2={dx ? x2d : x2}
            y2={dx ? y2d : y2}
            stroke="#99f6e4"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.85"
            style={{
              filter: "drop-shadow(0 0 6px #5eead4)",
              animation: "ray-grow 0.45s ease-out both",
            }}
          />
        );
      })}
    </g>
  );
}
