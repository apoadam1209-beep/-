import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Music, Volume2, VolumeX } from "lucide-react";
import Backdrop from "./components/Backdrop";
import Menu from "./components/Menu";
import GameScreen, { type StageResult } from "./components/GameScreen";
import HowTo from "./components/HowTo";
import { LEVELS } from "./data/levels";
import { engine } from "./audio/engine";

const STORAGE_KEY = "crystal-resonance-v1";

interface Progress {
  unlocked: number;
  stars: number[];
  hints: number;
  musicOn: boolean;
  sfxOn: boolean;
}

const DEFAULT_PROGRESS: Progress = {
  unlocked: 0,
  stars: Array(LEVELS.length).fill(0),
  hints: 5,
  musicOn: true,
  sfxOn: true,
};

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      ...DEFAULT_PROGRESS,
      ...p,
      stars: Array.from({ length: LEVELS.length }, (_, i) => p.stars?.[i] ?? 0),
      unlocked: Math.min(p.unlocked ?? 0, LEVELS.length - 1),
      hints: typeof p.hints === "number" ? p.hints : 5,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

type Screen = { name: "menu" } | { name: "game"; index: number };

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [screen, setScreen] = useState<Screen>({ name: "menu" });
  const [howTo, setHowTo] = useState(false);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      /* ignore */
    }
  }, [progress]);

  useEffect(() => {
    const init = () => {
      engine.ensure();
      engine.setMusic(progressRef.current.musicOn);
      engine.setSfx(progressRef.current.sfxOn);
      if (progressRef.current.musicOn) engine.startAmbient();
    };
    window.addEventListener("pointerdown", init, { once: true });
    window.addEventListener("keydown", init, { once: true });
    return () => {
      window.removeEventListener("pointerdown", init);
      window.removeEventListener("keydown", init);
    };
  }, []);

  const toggleMusic = useCallback(() => {
    setProgress((p) => {
      const musicOn = !p.musicOn;
      engine.ensure();
      engine.setMusic(musicOn);
      return { ...p, musicOn };
    });
  }, []);

  const toggleSfx = useCallback(() => {
    setProgress((p) => {
      const sfxOn = !p.sfxOn;
      engine.ensure();
      engine.setSfx(sfxOn);
      if (sfxOn) engine.uiTap();
      return { ...p, sfxOn };
    });
  }, []);

  const handleWin = useCallback((index: number, r: StageResult) => {
    setProgress((p) => {
      const stars = [...p.stars];
      const firstClear = (stars[index] ?? 0) === 0;
      stars[index] = Math.max(stars[index] ?? 0, r.stars);
      return {
        ...p,
        stars,
        unlocked: Math.min(LEVELS.length - 1, Math.max(p.unlocked, index + 1)),
        hints: Math.min(9, p.hints + (firstClear ? 1 : 0)),
      };
    });
  }, []);

  const spendHint = useCallback(() => {
    setProgress((p) => ({ ...p, hints: Math.max(0, p.hints - 1) }));
  }, []);

  return (
    <div className="relative min-h-svh">
      <Backdrop />

      <div className="fixed left-3 top-3 z-50 flex gap-2">
        <button
          type="button"
          onClick={toggleMusic}
          title={progress.musicOn ? "كتم الموسيقى" : "تشغيل الموسيقى"}
          className="btn-ghost relative flex h-10 w-10 items-center justify-center rounded-xl"
        >
          <Music className={`h-4 w-4 ${progress.musicOn ? "" : "opacity-40"}`} />
          {!progress.musicOn && <span className="absolute h-px w-6 rotate-45 bg-cyan-300" />}
        </button>
        <button
          type="button"
          onClick={toggleSfx}
          title={progress.sfxOn ? "كتم المؤثرات" : "تشغيل المؤثرات"}
          className="btn-ghost flex h-10 w-10 items-center justify-center rounded-xl"
        >
          {progress.sfxOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 opacity-40" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {screen.name === "menu" ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
          >
            <Menu
              unlocked={progress.unlocked}
              stars={progress.stars}
              hints={progress.hints}
              onPlay={(index) => {
                engine.ensure();
                setScreen({ name: "game", index });
              }}
              onHowTo={() => setHowTo(true)}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`game-${screen.index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
          >
            <GameScreen
              stage={LEVELS[screen.index]}
              stageIndex={screen.index}
              totalStages={LEVELS.length}
              hintsLeft={progress.hints}
              onSpendHint={spendHint}
              onStageWin={(r) => handleWin(screen.index, r)}
              onExit={() => setScreen({ name: "menu" })}
              onNext={() =>
                setScreen(
                  screen.index < LEVELS.length - 1
                    ? { name: "game", index: screen.index + 1 }
                    : { name: "menu" },
                )
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
      {howTo && <HowTo onClose={() => setHowTo(false)} />}
    </div>
  );
}
