import { useEffect } from "react";
import { motion } from "framer-motion";
import { Star, ArrowLeft, RotateCcw, LayoutGrid, Crown, ScrollText } from "lucide-react";
import { engine } from "../audio/engine";
import { arDigits, RIDDLES_PER_STAGE, type StageDef } from "../data/riddles";

interface Props {
  stage: StageDef;
  stageIndex: number;
  totalStages: number;
  score: number;
  stars: number;
  isLast: boolean;
  onNext: () => void;
  onReplay: () => void;
  onMenu: () => void;
}

export default function WinOverlay({
  stage, stageIndex, totalStages, score, stars, isLast, onNext, onReplay, onMenu,
}: Props) {
  useEffect(() => {
    const timers = [0, 1, 2].map((i) =>
      window.setTimeout(() => {
        if (i < stars) engine.star(i);
      }, 500 + i * 260)
    );
    return () => timers.forEach(clearTimeout);
  }, [stars]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#080614]/80 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="ornate-card relative w-full max-w-md rounded-3xl px-6 pb-7 pt-10 text-center"
        initial={{ scale: 0.7, y: 60, opacity: 0, rotate: -2 }}
        animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
      >
        {/* medallion */}
        <motion.div
          className="mx-auto -mt-20 mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#8a6d1f] bg-[radial-gradient(circle_at_35%_30%,#4a3a86,#171136)] shadow-[0_0_60px_-8px_rgba(212,175,55,0.7)]"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 14 }}
        >
          <Crown className="h-10 w-10 text-[#f0d98c]" strokeWidth={1.6} />
        </motion.div>

        <p className="font-tajawal text-sm font-medium tracking-wide text-[#b9a86f]">
          اكتملَ خَتمُ المرحلة {arDigits(stageIndex + 1)} من {arDigits(totalStages)}
        </p>

        <h2 className="font-ruqaa mt-1 text-3xl font-bold text-shimmer-gold">{stage.name}</h2>
        <p className="font-tajawal mt-0.5 text-xs text-[#8f81c9]">{stage.tag}</p>

        {/* stars */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5 + i * 0.26, type: "spring", stiffness: 320, damping: 15 }}
            >
              <Star
                className={
                  i < stars
                    ? "h-9 w-9 text-[#f0d98c] drop-shadow-[0_0_10px_rgba(240,217,140,0.75)]"
                    : "h-9 w-9 text-[#3a3164]"
                }
                fill={i < stars ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
            </motion.span>
          ))}
        </div>

        {/* stats */}
        <motion.div
          className="mt-4 rounded-2xl border border-[#d4af37]/25 bg-[#0e0a24]/70 px-4 py-3"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center justify-center gap-6">
            <div>
              <p className="font-tajawal text-xs text-[#8f81c9]">ألغاز محلولة</p>
              <p className="font-amiri mt-0.5 text-2xl font-bold text-[#fff3c9]">
                {arDigits(RIDDLES_PER_STAGE)} / {arDigits(RIDDLES_PER_STAGE)}
              </p>
            </div>
            <span className="h-9 w-px bg-[#d4af37]/25" />
            <div>
              <p className="font-tajawal text-xs text-[#8f81c9]">رصيد المرحلة</p>
              <p className="font-amiri mt-0.5 text-2xl font-bold text-[#f0d98c]">
                {arDigits(score)}
              </p>
            </div>
          </div>
          <div className="mx-auto my-2.5 h-px w-32 bg-gradient-to-l from-transparent via-[#d4af37]/50 to-transparent" />
          <p className="flex items-center justify-center gap-1.5 font-tajawal text-[11px] text-[#a99ad6]">
            <ScrollText className="h-3.5 w-3.5 text-[#d4af37]" />
            فُتحت كل أقفال الصندوق في هذه المرحلة
          </p>
        </motion.div>

        <motion.div
          className="mt-5 flex items-center justify-center gap-3"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <button
            onClick={onMenu}
            className="btn-ghost flex h-12 w-12 items-center justify-center rounded-xl"
            aria-label="القائمة"
          >
            <LayoutGrid className="h-5 w-5" />
          </button>
          <button
            onClick={onReplay}
            className="btn-ghost flex h-12 w-12 items-center justify-center rounded-xl"
            aria-label="إعادة"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          {!isLast ? (
            <button
              onClick={onNext}
              className="btn-gold flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-tajawal text-lg font-extrabold"
            >
              المرحلة التالية
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={onMenu}
              className="btn-gold flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-tajawal text-lg font-extrabold"
            >
              تاجُ الحكمةِ لك!
              <Crown className="h-5 w-5" />
            </button>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
