import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Lightbulb,
  Lock,
  Quote,
  ScrollText,
} from "lucide-react";
import PuzzleBox, { type PuzzleBoxHandle } from "./PuzzleBox";
import WinOverlay from "./WinOverlay";
import Confetti from "./Confetti";
import { engine } from "../audio/engine";
import { arDigits, buildPools, RIDDLES_PER_STAGE, type StageDef } from "../data/riddles";

export interface StageResult {
  score: number;
  stars: number;
}

interface Props {
  stage: StageDef;
  stageIndex: number;
  totalStages: number;
  hintsLeft: number;
  onSpendHint: () => void;
  onStageWin: (r: StageResult) => void;
  onExit: () => void;
  onNext: () => void;
}

export default function GameScreen({
  stage, stageIndex, totalStages, hintsLeft, onSpendHint, onStageWin, onExit, onNext,
}: Props) {
  const [riddleIdx, setRiddleIdx] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const riddle = stage.riddles[riddleIdx];
  const pools = useMemo(
    () => buildPools(riddle, stage.id * 131 + riddleIdx * 17, attempt),
    [riddle, stage.id, riddleIdx, attempt]
  );

  const [combo, setCombo] = useState<string[]>(() => riddle.answer.map(() => "؟"));
  const [locked, setLocked] = useState<number[]>([]);
  const [steps, setSteps] = useState(0);
  const [wrongs, setWrongs] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [lastGain, setLastGain] = useState(0);
  const [phase, setPhase] = useState<"play" | "interlude">("play");
  const [celebrating, setCelebrating] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [result, setResult] = useState<StageResult | null>(null);
  const [showWin, setShowWin] = useState(false);

  const boxRef = useRef<PuzzleBoxHandle | null>(null);
  const advanceTimer = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      if (advanceTimer.current !== null) clearTimeout(advanceTimer.current);
    },
    []
  );

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const solved = combo.join("") === riddle.answer.join("");
  const isLastRiddle = riddleIdx === stage.riddles.length - 1;

  const advance = useCallback(
    (nextIdx: number) => {
      if (advanceTimer.current !== null) {
        clearTimeout(advanceTimer.current);
        advanceTimer.current = null;
      }
      setRiddleIdx(nextIdx);
      setLocked([]);
      setSteps(0);
      setWrongs(0);
      setHintsUsed(0);
      setCombo(stage.riddles[nextIdx].answer.map(() => "؟"));
      setPhase("play");
      setCelebrating(false);
    },
    [stage.riddles]
  );

  const tryUnlock = useCallback(() => {
    if (phase !== "play") return;
    if (!solved) {
      engine.wrong();
      setWrongs((w) => w + 1);
      setShaking(true);
      later(() => setShaking(false), 540);
      return;
    }
    const extraSteps = Math.max(0, steps - riddle.answer.length);
    const gain = Math.max(20, 100 - 8 * extraSteps - 40 * wrongs - 50 * hintsUsed);
    const newTotal = totalScore + gain;
    setTotalScore(newTotal);
    setLastGain(gain);
    setPhase("interlude");
    setCelebrating(true);

    if (isLastRiddle) {
      const stars = newTotal >= 850 ? 3 : newTotal >= 600 ? 2 : 1;
      const r = { score: newTotal, stars };
      setResult(r);
      engine.win();
      onStageWin(r);
      later(() => setShowWin(true), 2400);
    } else {
      engine.smallWin();
    }
  }, [phase, solved, steps, wrongs, hintsUsed, totalScore, riddle.answer.length, isLastRiddle, onStageWin]);

  // auto-advance during interlude (unless last riddle)
  useEffect(() => {
    if (phase === "interlude" && !isLastRiddle) {
      advanceTimer.current = window.setTimeout(() => advance(riddleIdx + 1), 3400);
    }
  }, [phase, isLastRiddle, riddleIdx, advance]);

  const useHint = useCallback(() => {
    if (phase !== "play" || hintsLeft <= 0) {
      engine.deny();
      return;
    }
    const candidates = riddle.answer
      .map((_, i) => i)
      .filter((i) => !locked.includes(i) && combo[i] !== riddle.answer[i]);
    if (candidates.length === 0) {
      engine.deny();
      return;
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    setLocked((l) => [...l, pick]);
    setHintsUsed((h) => h + 1);
    onSpendHint();
    engine.hint();
    void boxRef.current?.lockToAnswer(pick);
  }, [phase, hintsLeft, locked, combo, riddle.answer, onSpendHint]);

  const replayStage = useCallback(() => {
    setAttempt((a) => a + 1);
    setRiddleIdx(0);
    setLocked([]);
    setSteps(0);
    setWrongs(0);
    setHintsUsed(0);
    setTotalScore(0);
    setLastGain(0);
    setPhase("play");
    setCelebrating(false);
    setShowWin(false);
    setResult(null);
    setCombo(stage.riddles[0].answer.map(() => "؟"));
    engine.uiTap();
  }, [stage.riddles]);

  // keyboard support
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (showWin) return;
      if (e.key === "ArrowLeft") boxRef.current?.rotateFocused(1);
      else if (e.key === "ArrowRight") boxRef.current?.rotateFocused(-1);
      else if (e.key === "Enter") tryUnlock();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [tryUnlock, showWin]);

  const goMenu = () => {
    engine.uiTap();
    onExit();
  };

  return (
    <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-2xl flex-col items-center px-4 pb-6">
      {/* header */}
      <header className="flex w-full items-center justify-between gap-3 py-4">
        <button
          onClick={goMenu}
          className="btn-ghost flex h-10 items-center gap-2 rounded-xl px-3 font-tajawal text-sm font-bold"
        >
          <ArrowRight className="h-4 w-4" />
          القائمة
        </button>
        <div className="text-center">
          <p className="font-ruqaa text-lg font-bold leading-none text-[#f0d98c]">
            المرحلة {arDigits(stageIndex + 1)} · {stage.name}
          </p>
          <p className="mt-1 flex items-center justify-center gap-1.5 font-tajawal text-[11px] font-medium text-[#8f81c9]">
            <ScrollText className="h-3 w-3" />
            رصيد المرحلة: {arDigits(totalScore)} نقطة
          </p>
        </div>
        <button
          onClick={useHint}
          disabled={hintsLeft <= 0}
          className="btn-ghost relative flex h-10 items-center gap-2 rounded-xl px-3 font-tajawal text-sm font-bold disabled:opacity-40"
        >
          <Lightbulb className="h-4 w-4 text-[#f0d98c]" />
          تلميح
          <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#d4af37] font-tajawal text-[10px] font-extrabold text-[#2a1e05]">
            {arDigits(hintsLeft)}
          </span>
        </button>
      </header>

      {/* stage progress dots */}
      <div className="mb-2 flex items-center gap-1.5" dir="ltr">
        {stage.riddles.map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all duration-500 ${
              i < riddleIdx
                ? "w-2 bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.8)]"
                : i === riddleIdx
                  ? "w-6 bg-[#fff3c9] shadow-[0_0_10px_rgba(255,243,201,0.9)]"
                  : "w-2 bg-[#3a3164]"
            }`}
          />
        ))}
      </div>

      {/* riddle banner */}
      <motion.div
        key={`riddle-${stage.id}-${riddleIdx}`}
        className="ornate-card w-full rounded-2xl px-5 py-4 text-center"
        initial={{ opacity: 0, y: -18, rotateX: 25 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center gap-2">
          <Quote className="h-3.5 w-3.5 text-[#d4af37]" />
          <h2 className="font-ruqaa text-xl font-bold text-shimmer-gold">
            {riddle.title}
            <span className="mr-2 font-tajawal text-xs font-medium text-[#8f81c9]">
              (اللغز {arDigits(riddleIdx + 1)} من {arDigits(RIDDLES_PER_STAGE)})
            </span>
          </h2>
          <Quote className="h-3.5 w-3.5 -scale-x-100 text-[#d4af37]" />
        </div>
        <p className="font-amiri mt-1.5 text-lg leading-relaxed text-[#efe6cf]/95 md:text-xl">
          {riddle.riddle}
        </p>
      </motion.div>

      {/* puzzle box */}
      <div className="relative mt-3" style={{ width: "min(94vw, 58svh, 540px)" }}>
        <div className={shaking ? "anim-shake" : ""}>
          <PuzzleBox
            key={`${stage.id}-${riddleIdx}-${attempt}`}
            ref={boxRef}
            pools={pools}
            answer={riddle.answer}
            locked={locked}
            celebrating={celebrating}
            onCombo={setCombo}
            onStep={() => setSteps((s) => s + 1)}
          />
        </div>

        {/* interlude card */}
        <AnimatePresence>
          {phase === "interlude" && (
            <motion.div
              className="absolute inset-0 z-20 flex items-center justify-center bg-[#080614]/45 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="ornate-card max-w-xs rounded-2xl px-6 py-4 text-center"
                initial={{ scale: 0.6, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <p className="font-tajawal text-xs font-bold text-[#b9a86f]">
                  نُقش الجواب على القفل!
                </p>
                <p dir="rtl" className="font-amiri mt-0.5 text-4xl font-bold leading-tight text-[#fff3c9]">
                  {riddle.answer.join("")}
                </p>
                <p className="font-amiri mt-1 text-sm italic leading-relaxed text-[#cbb9ff]/90">
                  «{riddle.wisdom}»
                </p>
                <p className="mt-1.5 font-tajawal text-base font-extrabold text-[#f0d98c]">
                  +{arDigits(lastGain)} نقطة
                </p>
                {!isLastRiddle ? (
                  <button
                    onClick={() => advance(riddleIdx + 1)}
                    className="btn-gold mt-2 w-full rounded-xl px-4 py-2 font-tajawal text-sm font-extrabold"
                  >
                    اللغز التالي
                  </button>
                ) : (
                  <p className="mt-2 font-tajawal text-xs text-[#8f81c9]">
                    جارٍ ختم سجلّ المرحلة…
                  </p>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* combo plaque */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <p className="font-tajawal text-[11px] font-medium tracking-wide text-[#8f81c9]">
          النقش الظاهر على مجرى الشعاع
        </p>
        <div dir="rtl" className="flex items-center gap-1.5">
          {combo.map((c, i) => (
            <motion.span
              key={`${riddleIdx}-${attempt}-${i}-${c}`}
              initial={{ rotateX: 85, y: -8, opacity: 0 }}
              animate={{ rotateX: 0, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className={`relative flex h-12 w-10 items-center justify-center rounded-lg border font-amiri text-2xl font-bold ${
                shaking
                  ? "border-red-400/70 bg-red-950/60 text-red-200"
                  : locked.includes(i)
                    ? "border-[#f0d98c]/90 bg-[#3a2e0e]/80 text-[#fff3c9] shadow-[0_0_14px_-2px_rgba(240,217,140,0.5)]"
                    : "border-[#d4af37]/40 bg-[#171136]/85 text-[#f0d98c]"
              }`}
              style={{ perspective: 400 }}
            >
              {c}
              {locked.includes(i) && (
                <Lock className="absolute -left-1.5 -top-1.5 h-3.5 w-3.5 rounded-full bg-[#d4af37] p-0.5 text-[#2a1e05]" />
              )}
            </motion.span>
          ))}
        </div>
      </div>

      {/* controls */}
      <div className="mt-4 flex w-full max-w-md items-center justify-center gap-3">
        <button
          onClick={() => boxRef.current?.rotateFocused(-1)}
          className="btn-ghost flex h-14 w-14 items-center justify-center rounded-2xl"
          aria-label="تدوير لليمين"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
        <button
          onClick={tryUnlock}
          disabled={phase !== "play"}
          className={`btn-gold flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl font-tajawal text-xl font-extrabold ${
            solved ? "animate-pulse-soft ring-4 ring-[#f0d98c]/60" : ""
          }`}
        >
          <KeyRound className="h-6 w-6" />
          {solved ? "النقشُ اكتمل — افتح!" : "افتحِ القِفل"}
        </button>
        <button
          onClick={() => boxRef.current?.rotateFocused(1)}
          className="btn-ghost flex h-14 w-14 items-center justify-center rounded-2xl"
          aria-label="تدوير لليسار"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      </div>

      <p className="mt-3 max-w-sm text-center font-tajawal text-[11px] leading-relaxed text-[#6f64a8]">
        اسحب أيّ حلقةٍ بإصبعك لتدويرها، أو انقرها ثم استخدم السهمين. الحرف الواقع على
        شعاع القمر يُنقش في اللوح — رتّب الحروف لتُكوّن جواب اللغز.
      </p>

      <Confetti active={celebrating} />

      <AnimatePresence>
        {showWin && result && (
          <WinOverlay
            stage={stage}
            stageIndex={stageIndex}
            totalStages={totalStages}
            score={result.score}
            stars={result.stars}
            isLast={stageIndex === totalStages - 1}
            onNext={() => {
              setShowWin(false);
              onNext();
            }}
            onReplay={() => {
              setShowWin(false);
              replayStage();
            }}
            onMenu={() => {
              setShowWin(false);
              onExit();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
