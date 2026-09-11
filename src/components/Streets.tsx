import { FLAVORS, STAGES } from "../game/data";
import type { Progress } from "../App";

type Props = {
  progress: Progress;
  onBack: () => void;
  onPlay: (id: number) => void;
};

export function Streets({ progress, onBack, onPlay }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-8">
      <button className="btn-ghost-ice self-start" onClick={onBack}>
        رجوع
      </button>
      <h2 className="font-display mt-5 text-3xl font-bold text-[#5b2a12]">الشوارع</h2>
      <p className="mt-1 text-sm text-[#6b4a32]">كل شارع نكهة ومصايب مختلفة.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {STAGES.map((s) => {
          const locked = s.id > progress.unlocked;
          const stars = progress.stars[s.id] ?? 0;
          const fl = FLAVORS[s.flavor];
          return (
            <button
              key={s.id}
              disabled={locked}
              onClick={() => onPlay(s.id)}
              className="ice-card p-3 text-right disabled:cursor-not-allowed disabled:opacity-45"
            >
              <div className="text-[11px] font-bold text-[#8a4b22]/80">
                {s.id} · {fl.name}
              </div>
              <div className="font-display mt-1 text-lg font-bold leading-snug text-[#5b2a12]">
                {locked ? "قفّالة" : s.name}
              </div>
              <div className="mt-2 text-amber-500" aria-label={`${stars} نجوم`}>
                {"★".repeat(stars)}
                {"☆".repeat(3 - stars)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
