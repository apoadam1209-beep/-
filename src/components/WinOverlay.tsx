import { motion } from "framer-motion";
import { Home, RotateCcw, Star } from "lucide-react";
import { CHAPTERS } from "../data/levels";

export interface StageResult {
  stars: 1 | 2 | 3;
  pulses: number;
  par: number;
}

export default function WinOverlay({
  name,
  chapter,
  result,
  hasNext,
  onNext,
  onReplay,
  onExit,
}: {
  name: string;
  chapter: number;
  result: StageResult;
  hasNext: boolean;
  onNext: () => void;
  onReplay: () => void;
  onExit: () => void;
}) {
  const ch = CHAPTERS[chapter];
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      dir="rtl"
    >
      <motion.div
        className="crystal-card w-full max-w-md rounded-3xl p-6 text-center sm:p-8"
        initial={{ scale: 0.86, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <p className="text-xs tracking-widest text-cyan-300/70">{ch?.name}</p>
        <h2 className="font-display mt-1 text-3xl text-shimmer">{name}</h2>
        <p className="mt-2 text-sm text-ivory/70">
          {result.pulses} ضربة · المعيار {result.par}
        </p>
        <div className="my-5 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15 + i * 0.12, type: "spring" }}
            >
              <Star
                className={`h-9 w-9 ${
                  i < result.stars ? "fill-amber-300 text-amber-300" : "text-white/20"
                }`}
              />
            </motion.span>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {hasNext && (
            <button type="button" onClick={onNext} className="btn-crystal rounded-2xl py-3 text-base font-bold">
              الغرفة التالية
            </button>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onReplay} className="btn-ghost flex flex-1 items-center justify-center gap-2 rounded-2xl py-3">
              <RotateCcw className="h-4 w-4" /> إعادة
            </button>
            <button type="button" onClick={onExit} className="btn-ghost flex flex-1 items-center justify-center gap-2 rounded-2xl py-3">
              <Home className="h-4 w-4" /> الكهف
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
