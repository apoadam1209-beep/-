import { useEffect, useState } from "react";
import { audio } from "./audio/engine";
import { HowTo } from "./components/HowTo";
import { Menu } from "./components/Menu";
import { Nights } from "./components/Nights";
import { Play } from "./components/Play";
import { LEVELS } from "./game/levels";
import type { Difficulty } from "./game/types";

const KEY = "ramadan-nur-v3";

export type Progress = {
  unlocked: number;
  stars: number[];
  muted: boolean;
  difficulty: Difficulty;
};

const empty = (): Progress => ({
  unlocked: 1,
  stars: Array(LEVELS.length + 1).fill(0),
  muted: false,
  difficulty: "mid",
});

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Partial<Progress>;
    const base = empty();
    return {
      unlocked: Math.max(1, Number(p.unlocked) || 1),
      stars: base.stars.map((_, i) => p.stars?.[i] ?? 0),
      muted: !!p.muted,
      difficulty: p.difficulty === "easy" || p.difficulty === "hard" ? p.difficulty : "mid",
    };
  } catch {
    return empty();
  }
}

type Screen = "menu" | "howto" | "nights" | "play";

export default function App() {
  const [progress, setProgressState] = useState<Progress>(load);
  const [screen, setScreen] = useState<Screen>("menu");
  const [levelId, setLevelId] = useState(1);

  useEffect(() => {
    audio.setMuted(progress.muted);
  }, [progress.muted]);

  function setProgress(p: Progress | ((prev: Progress) => Progress)) {
    setProgressState((prev) => {
      const next = typeof p === "function" ? p(prev) : p;
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function start(id: number) {
    void audio.ensure().then(() => audio.startNight());
    setLevelId(id);
    setScreen("play");
  }

  if (screen === "play") {
    return (
      <Play
        key={`${levelId}-${progress.difficulty}`}
        levelId={levelId}
        muted={progress.muted}
        stars={progress.stars}
        difficulty={progress.difficulty}
        onMuted={(v) => setProgress((p) => ({ ...p, muted: v }))}
        onWin={(id, stars) =>
          setProgress((p) => {
            const next = [...p.stars];
            next[id] = Math.max(next[id] ?? 0, stars);
            return {
              ...p,
              stars: next,
              unlocked: Math.max(p.unlocked, Math.min(LEVELS.length, id + 1)),
            };
          })
        }
        onMenu={() => setScreen("menu")}
        onNights={() => setScreen("nights")}
        onNext={(id) => start(id)}
      />
    );
  }
  if (screen === "howto") {
    return <HowTo onBack={() => setScreen("menu")} onPlay={() => start(1)} />;
  }
  if (screen === "nights") {
    return (
      <Nights
        unlocked={progress.unlocked}
        stars={progress.stars}
        onBack={() => setScreen("menu")}
        onPlay={start}
      />
    );
  }
  return (
    <Menu
      unlocked={progress.unlocked}
      stars={progress.stars}
      difficulty={progress.difficulty}
      onDifficulty={(d) => setProgress((p) => ({ ...p, difficulty: d }))}
      onPlay={start}
      onNights={() => setScreen("nights")}
      onHowTo={() => setScreen("howto")}
    />
  );
}
