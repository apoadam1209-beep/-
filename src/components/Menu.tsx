import { STAGES } from "../game/data";
import type { Progress } from "../App";

type Props = {
  progress: Progress;
  onPlay: (stageId: number) => void;
  onEndless: () => void;
  onHowTo: () => void;
  onStreets: () => void;
};

export function Menu({ progress, onPlay, onEndless, onHowTo, onStreets }: Props) {
  const continueId = Math.min(progress.unlocked, STAGES.length);
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-10">
      <Bouncers />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-3 text-5xl drop-shadow-md">🍦</div>
        <h1 className="font-display text-4xl font-bold leading-tight text-[#5b2a12] sm:text-5xl">
          الآيس كريم الهارب
        </h1>
        <p className="mt-3 text-lg font-semibold text-[#8a4b22]">
          لحسه قبل ما يذوب
        </p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6b4a32]/90">
          الكرة بتجري في الشارع. اسحب المخروط، اضغط مدّ لسانك، وحاسب من الكلب والشمس والبالوعة.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3">
          <button className="btn-lick" onClick={() => onPlay(continueId)}>
            {progress.unlocked > 1 ? "كمّل المطاردة" : "ابدأ المطاردة"}
          </button>
          <button className="btn-cone" onClick={onStreets}>
            الشوارع — {STAGES.length} مطاردة
          </button>
          <button className="btn-cone" onClick={onEndless}>
            الهارب اللانهائي
            {progress.endlessBest > 0 ? ` · أفضل ${progress.endlessBest}` : ""}
          </button>
          <button className="btn-ghost-ice" onClick={onHowTo}>
            إزاي تلعب؟
          </button>
        </div>
      </div>
    </div>
  );
}

function Bouncers() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {["#fff4c8", "#6b3a24", "#9fd46a", "#ffb03a", "#ff6b92"].map((c, i) => (
        <span
          key={c}
          className="absolute block rounded-full opacity-80"
          style={{
            width: 28 + i * 8,
            height: 28 + i * 8,
            background: c,
            left: `${8 + i * 18}%`,
            top: `${12 + (i % 3) * 22}%`,
            animation: `scoop-float ${3.2 + i * 0.4}s ease-in-out ${i * 0.3}s infinite`,
            boxShadow: "inset -6px -8px 0 rgba(0,0,0,0.12), 0 8px 0 rgba(0,0,0,0.08)",
          }}
        />
      ))}
    </div>
  );
}
