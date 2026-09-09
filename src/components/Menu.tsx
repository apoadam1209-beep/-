import { HelpCircle, Lock, Star } from "lucide-react";
import { CHAPTERS, LEVELS } from "../data/levels";
import Crystal from "./Crystal";
import type { Color } from "../game/types";

const CH_COLOR: Color[] = ["cyan", "violet", "amber", "rose", "emerald", "cyan"];

export default function Menu({
  unlocked,
  stars,
  hints,
  onPlay,
  onHowTo,
}: {
  unlocked: number;
  stars: number[];
  hints: number;
  onPlay: (index: number) => void;
  onHowTo: () => void;
}) {
  const totalStars = stars.reduce((a, b) => a + b, 0);
  const firstOpen = Math.min(unlocked, LEVELS.length - 1);

  return (
    <div className="relative mx-auto min-h-svh max-w-3xl px-4 pb-16 pt-16" dir="rtl">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-3 w-fit animate-[float-y_7s_ease-in-out_infinite]">
          <Crystal uid="hero" color="cyan" kind="echo" size={92} />
        </div>
        <h1 className="font-display text-4xl text-shimmer sm:text-5xl">رنين البلّور</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ivory/70">
          موجة صليب. بلورات تنزلق كالبلياردو. أوصل كل جوهرة إلى قاعدتها بأقل ضربات.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onPlay(firstOpen)}
            className="btn-crystal rounded-2xl px-8 py-3 text-lg font-bold"
          >
            {unlocked === 0 ? "أول همسة" : "تابع الرنين"}
          </button>
          <button type="button" onClick={onHowTo} className="btn-ghost rounded-2xl px-4 py-3">
            <HelpCircle className="inline h-4 w-4" /> كيف تلعب
          </button>
        </div>
        <p className="mt-3 text-xs text-cyan-300/70">
          {totalStars} / {LEVELS.length * 3} نجمة · تلميحات {hints}
        </p>
      </header>

      <div className="space-y-6">
        {CHAPTERS.map((ch) => {
          const levels = LEVELS.filter((l) => l.chapter === ch.id);
          const startIdx = LEVELS.findIndex((l) => l.id === levels[0]?.id);
          return (
            <section key={ch.id} className="crystal-card rounded-3xl p-4 sm:p-5">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl text-cyan-200">{ch.name}</h2>
                <p className="text-xs text-ivory/50">{ch.blurb}</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {levels.map((lv, i) => {
                  const idx = startIdx + i;
                  const locked = idx > unlocked;
                  const st = stars[idx] ?? 0;
                  return (
                    <button
                      key={lv.id}
                      type="button"
                      disabled={locked}
                      onClick={() => onPlay(idx)}
                      className={`relative flex flex-col items-center rounded-2xl border p-2 py-3 transition ${
                        locked
                          ? "border-white/5 bg-black/20 opacity-45"
                          : "border-cyan-400/20 bg-cyan-400/5 hover:border-cyan-300/50 hover:bg-cyan-400/10"
                      }`}
                    >
                      {locked ? (
                        <Lock className="mb-1 h-6 w-6 text-ivory/40" />
                      ) : (
                        <Crystal
                          uid={`lv${lv.id}`}
                          color={CH_COLOR[ch.id]}
                          kind={lv.chapter === 3 ? "echo" : "normal"}
                          size={34}
                        />
                      )}
                      <span className="mt-1 text-[11px] text-ivory/80">{lv.name}</span>
                      <span className="mt-0.5 flex gap-0.5">
                        {[0, 1, 2].map((s) => (
                          <Star
                            key={s}
                            className={`h-2.5 w-2.5 ${
                              s < st ? "fill-amber-300 text-amber-300" : "text-white/15"
                            }`}
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
