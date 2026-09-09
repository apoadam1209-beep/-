import { HelpCircle, Lock, Star } from "lucide-react";
import { CHAPTERS, LEVELS } from "../data/levels";
import Crystal from "./Crystal";

export default function Menu({
  unlocked,
  stars,
  hints,
  lastPlayed,
  onPlay,
  onHowTo,
}: {
  unlocked: number;
  stars: number[];
  hints: number;
  lastPlayed: number;
  onPlay: (index: number) => void;
  onHowTo: () => void;
}) {
  const totalStars = stars.reduce((a, b) => a + b, 0);
  const continueIdx = Math.min(Math.max(lastPlayed, 0), unlocked, LEVELS.length - 1);
  const perfects = stars.filter((s) => s === 3).length;

  return (
    <div className="relative mx-auto min-h-svh max-w-3xl px-4 pb-16 pt-16" dir="rtl">
      <header className="mb-7 text-center">
        <div className="mx-auto mb-2 w-fit animate-[float-y_7s_ease-in-out_infinite]">
          <Crystal uid="hero" color="cyan" kind="echo" size={108} />
        </div>
        <h1 className="font-display text-4xl text-shimmer sm:text-5xl">رنين البلّور</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ivory/75">
          مئتا غرفة في قلب الكهف. اضرب الحجر، لا الجوهرة. الموجة تدفع البلورات كالبلياردو حتى القاعدة.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => onPlay(continueIdx)} className="btn-crystal rounded-2xl px-8 py-3 text-lg font-bold">
            {unlocked === 0 ? "أول همسة" : "تابع النزول"}
          </button>
          <button type="button" onClick={onHowTo} className="btn-ghost rounded-2xl px-4 py-3">
            <HelpCircle className="inline h-4 w-4" /> كيف تلعب
          </button>
        </div>
        <p className="mt-3 text-xs text-cyan-100/70">
          {totalStars} / {LEVELS.length * 3} نجمة · {perfects} قفلٍ كامل · تلميحات {hints}
        </p>
      </header>

      <div className="space-y-5">
        {CHAPTERS.map((ch) => {
          const levels = LEVELS.filter((l) => l.chapter === ch.id);
          const startIdx = LEVELS.findIndex((l) => l.id === levels[0]?.id);
          const chStars = levels.reduce((a, _, i) => a + (stars[startIdx + i] ?? 0), 0);
          return (
            <section key={ch.id} className="crystal-card rounded-3xl p-4 sm:p-5">
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl text-cyan-100">{ch.name}</h2>
                <span className="text-[11px] text-ivory/45">
                  {chStars}/{levels.length * 3}
                </span>
              </div>
              <p className="mb-3 text-xs leading-6 text-ivory/55">{ch.story}</p>
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                {levels.map((lv, i) => {
                  const idx = startIdx + i;
                  const locked = idx > unlocked;
                  const st = stars[idx] ?? 0;
                  return (
                    <button
                      key={lv.id}
                      type="button"
                      disabled={locked}
                      title={lv.name}
                      onClick={() => onPlay(idx)}
                      className={`relative flex flex-col items-center rounded-xl border px-1 py-1.5 text-[11px] transition ${
                        locked
                          ? "border-white/5 bg-black/25 opacity-40"
                          : idx === continueIdx
                            ? "border-cyan-300/60 bg-cyan-400/15"
                            : "border-white/10 bg-black/20 hover:border-cyan-300/40"
                      }`}
                    >
                      {locked ? (
                        <Lock className="h-3.5 w-3.5 text-ivory/40" />
                      ) : (
                        <span className="font-bold text-ivory/90">{lv.id}</span>
                      )}
                      <span className="mt-0.5 flex gap-px">
                        {[0, 1, 2].map((s) => (
                          <Star
                            key={s}
                            className={`h-2 w-2 ${s < st ? "fill-amber-300 text-amber-300" : "text-white/15"}`}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
