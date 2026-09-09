import { useCallback, useEffect, useRef, useState } from "react";
import { HelpCircle, Home, Lightbulb, RotateCcw, Undo2 } from "lucide-react";
import Board from "./Board";
import WinOverlay, { type StageResult } from "./WinOverlay";
import Confetti from "./Confetti";
import HowTo from "./HowTo";
import { CHAPTERS, LEVELS, levelState, starsFor, type LevelDef } from "../data/levels";
import { applyPulse } from "../game/simulate";
import { canStrike, cloneState, filledCount } from "../game/state";
import { hintCell } from "../game/solver";
import type { GameState, Pos, Timeline } from "../game/types";
import { COLORS } from "../game/types";
import { engine } from "../audio/engine";

export type { StageResult };

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function colorIndex(s: GameState, id: number) {
  const g = s.gems.find((x) => x.id === id);
  return g ? COLORS.indexOf(g.color) : 0;
}

export default function GameScreen({
  stage,
  stageIndex,
  totalStages,
  hintsLeft,
  onSpendHint,
  onStageWin,
  onExit,
  onNext,
}: {
  stage: LevelDef;
  stageIndex: number;
  totalStages: number;
  hintsLeft: number;
  onSpendHint: () => void;
  onStageWin: (r: StageResult) => void;
  onExit: () => void;
  onNext: () => void;
}) {
  const initial = levelState(stage);
  const [state, setState] = useState<GameState>(() => cloneState(initial));
  const [history, setHistory] = useState<GameState[]>([]);
  const [pulses, setPulses] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<Pos | null>(null);
  const [pulse, setPulse] = useState<{ r: number; c: number; amp: boolean; key: number } | null>(null);
  const [won, setWon] = useState<StageResult | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [showIntro, setShowIntro] = useState(Boolean(stage.intro));
  const [shaking, setShaking] = useState(false);
  const [callout, setCallout] = useState<string | null>(null);
  const pulseKey = useRef(0);
  const cancel = useRef(false);
  const gen = useRef(0);

  useEffect(() => {
    cancel.current = false;
    return () => {
      cancel.current = true;
    };
  }, [stage.id]);

  const reset = useCallback(() => {
    gen.current += 1;
    setState(cloneState(levelState(stage)));
    setHistory([]);
    setPulses(0);
    setHint(null);
    setPulse(null);
    setWon(null);
    setBusy(false);
    setCallout(null);
    setShowIntro(Boolean(stage.intro));
  }, [stage]);

  useEffect(() => {
    reset();
  }, [reset]);

  const flash = (text: string) => {
    setCallout(text);
    window.setTimeout(() => setCallout((c) => (c === text ? null : c)), 900);
  };

  const playTimeline = useCallback(
    async (from: GameState, tl: Timeline, pulseCount: number) => {
      const my = gen.current;
      const stale = () => cancel.current || my !== gen.current;
      setBusy(true);
      setShaking(true);
      window.setTimeout(() => setShaking(false), 280);
      pulseKey.current += 1;
      const amp = from.grid[tl.origin.r][tl.origin.c] === "amp";
      setPulse({ r: tl.origin.r, c: tl.origin.c, amp, key: pulseKey.current });
      engine.pulse();
      if (amp) flash("مضاعف");
      if (tl.waves.some((w) => w.launches.some((l) => l.chain.length > 1))) {
        engine.collide(0);
        flash("مهد نيوتن");
      }
      await wait(280);
      if (stale()) return;

      for (const wave of tl.waves) {
        if (wave.isEcho) {
          pulseKey.current += 1;
          setPulse({ r: wave.origin.r, c: wave.origin.c, amp: false, key: pulseKey.current });
          engine.pulse();
          flash("صدى");
          await wait(220);
          if (stale()) return;
        }
        await Promise.all(
          wave.launches.map(async (launch) => {
            for (const step of launch.chain) {
              if (stale()) return;
              engine.slide(colorIndex(from, step.gemId));
              setState((s) => ({
                ...s,
                gems: s.gems
                  .map((g) => (g.id === step.gemId ? { ...g, r: step.to.r, c: step.to.c } : g))
                  .filter((g) => !(step.fell && g.id === step.gemId)),
              }));
              const dist = Math.abs(step.to.r - step.from.r) + Math.abs(step.to.c - step.from.c);
              await wait(Math.max(180, dist * 70));
            }
          }),
        );
        if (stale()) return;
        if (wave.locks.length) {
          setState((s) => ({
            ...s,
            gems: s.gems.map((g) => (wave.locks.includes(g.id) ? { ...g, locked: true } : g)),
          }));
          for (const id of wave.locks) engine.lock(colorIndex(tl.final, id));
          flash("قُفِل");
          await wait(200);
        }
      }

      if (stale()) return;
      setState(cloneState(tl.final));
      setPulse(null);
      setBusy(false);

      if (tl.won) {
        const stars = starsFor(pulseCount, stage.par);
        const result: StageResult = { stars, pulses: pulseCount, par: stage.par };
        setWon(result);
        engine.win();
        onStageWin(result);
      }
    },
    [onStageWin, stage.par],
  );

  const strike = (r: number, c: number) => {
    if (busy || won) return;
    if (!canStrike(state, r, c)) {
      engine.deny();
      return;
    }
    const tl = applyPulse(state, r, c);
    if (!tl.changed) {
      engine.deny();
      return;
    }
    setHint(null);
    setShowIntro(false);
    setHistory((h) => [...h, cloneState(state)]);
    const next = pulses + 1;
    setPulses(next);
    void playTimeline(state, tl, next);
  };

  const undo = () => {
    if (busy || !history.length || won) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setState(cloneState(prev));
    setPulses((n) => Math.max(0, n - 1));
    setHint(null);
    engine.uiTap();
  };

  const onHint = () => {
    if (busy || won) return;
    if (hintsLeft <= 0) {
      engine.deny();
      return;
    }
    const cell = hintCell(state);
    if (!cell) {
      engine.deny();
      return;
    }
    onSpendHint();
    setHint(cell);
    engine.hint();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "u" || e.key === "U" || e.key === "ArrowLeft") undo();
      if (e.key === "r" || e.key === "R") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const filled = filledCount(state);
  const ch = CHAPTERS[stage.chapter];

  return (
    <div className="relative mx-auto min-h-svh max-w-3xl px-3 pb-8 pt-14" dir="rtl">
      <header className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={onExit} className="btn-ghost rounded-xl p-2" aria-label="خروج">
          <Home className="h-4 w-4" />
        </button>
        <div className="min-w-0 text-center">
          <p className="text-[10px] tracking-widest text-cyan-200/60">{ch?.name}</p>
          <p className="truncate font-display text-lg text-cyan-100">{stage.name}</p>
          <p className="text-[11px] text-ivory/50">
            {stageIndex + 1} / {totalStages} · ضربات {pulses} · المعيار {stage.par}
          </p>
        </div>
        <button type="button" onClick={() => setShowHow(true)} className="btn-ghost rounded-xl p-2" aria-label="مساعدة">
          <HelpCircle className="h-4 w-4" />
        </button>
      </header>

      {showIntro && stage.intro && (
        <p className="mb-3 rounded-2xl border border-cyan-400/20 bg-black/30 px-3 py-2 text-center text-sm leading-7 text-ivory/85">
          {stage.intro}
        </p>
      )}

      <div className="relative">
        <Board
          state={state}
          busy={busy || Boolean(won)}
          hint={hint}
          pulse={pulse}
          shaking={shaking}
          onStrike={strike}
        />
        {callout && (
          <div className="callout absolute inset-x-0 top-1/2 z-20 -translate-y-1/2 text-center text-2xl text-cyan-100">
            {callout}
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-xs text-ivory/55">
        القواعد {filled}/{state.pedestals.length}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <button type="button" onClick={undo} disabled={busy || history.length === 0} className="btn-ghost rounded-xl px-3 py-2">
          <Undo2 className="h-4 w-4" />
        </button>
        <button type="button" onClick={reset} className="btn-ghost rounded-xl px-3 py-2">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onHint}
          disabled={busy || hintsLeft <= 0}
          className="btn-ghost rounded-xl px-3 py-2"
          title="تلميح"
        >
          <Lightbulb className="ml-1 inline h-4 w-4" />
          <span className="text-xs">{hintsLeft}</span>
        </button>
      </div>

      <Confetti active={Boolean(won)} />
      {won && (
        <WinOverlay
          name={stage.name}
          chapter={stage.chapter}
          result={won}
          hasNext={stageIndex < LEVELS.length - 1}
          onNext={onNext}
          onReplay={reset}
          onExit={onExit}
        />
      )}
      {showHow && <HowTo onClose={() => setShowHow(false)} />}
    </div>
  );
}
