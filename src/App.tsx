import { useEffect, useState } from "react";
import { HowTo } from "./components/HowTo";
import { Menu } from "./components/Menu";
import { Play } from "./components/Play";
import { Streets } from "./components/Streets";
import { audio } from "./audio/engine";
import { STAGES } from "./game/data";

const KEY = "runaway-ice-v1";

export type Progress = {
  unlocked: number;
  stars: number[];
  endlessBest: number;
  muted: boolean;
};

const DEFAULT: Progress = {
  unlocked: 1,
  stars: Array(STAGES.length + 1).fill(0),
  endlessBest: 0,
  muted: false,
};

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT, stars: [...DEFAULT.stars] };
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      unlocked: Math.max(1, Number(p.unlocked) || 1),
      stars: Array(STAGES.length + 1)
        .fill(0)
        .map((_, i) => p.stars?.[i] ?? 0),
      endlessBest: Number(p.endlessBest) || 0,
      muted: !!p.muted,
    };
  } catch {
    return { ...DEFAULT, stars: [...DEFAULT.stars] };
  }
}

type Screen = "menu" | "howto" | "streets" | "play";

export default function App() {
  const [progress, setProgressState] = useState<Progress>(load);
  const [screen, setScreen] = useState<Screen>("menu");
  const [play, setPlay] = useState({ stageId: 1, endless: false });

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

  function start(stageId: number, endless = false) {
    void audio.ensure();
    setPlay({ stageId, endless });
    setScreen("play");
  }

  if (screen === "play") {
    return (
      <Play
        key={`${play.endless ? "e" : "s"}-${play.stageId}`}
        stageId={play.stageId}
        endless={play.endless}
        progress={progress}
        setProgress={setProgress}
        onMenu={() => setScreen("menu")}
        onNext={(id) => start(id)}
      />
    );
  }
  if (screen === "howto") {
    return <HowTo onBack={() => setScreen("menu")} onPlay={() => start(1)} />;
  }
  if (screen === "streets") {
    return (
      <Streets
        progress={progress}
        onBack={() => setScreen("menu")}
        onPlay={(id) => start(id)}
      />
    );
  }
  return (
    <Menu
      progress={progress}
      onPlay={(id) => start(id)}
      onEndless={() => start(1, true)}
      onHowTo={() => setScreen("howto")}
      onStreets={() => setScreen("streets")}
    />
  );
}
