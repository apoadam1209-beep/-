import { useEffect, useRef, useState } from "react";
import { audio } from "../audio/engine";
import { FAIL_LINES, STAGES, WIN_LINES } from "../game/data";
import { draw } from "../game/draw";
import type { Input, Run } from "../game/types";
import { createRun, makeEndlessStage, step } from "../game/world";
import type { Progress } from "../App";

type SetProgress = (p: Progress | ((prev: Progress) => Progress)) => void;

type Props = {
  stageId: number;
  endless: boolean;
  progress: Progress;
  setProgress: SetProgress;
  onMenu: () => void;
  onNext: (id: number) => void;
};

export function Play({
  stageId,
  endless,
  progress,
  setProgress,
  onMenu,
  onNext,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runRef = useRef<Run | null>(null);
  const inputRef = useRef<Input>({ pointerX: null, licking: false, paused: false });
  const keysRef = useRef({ l: false, r: false });
  const [hud, setHud] = useState({
    melt: 1,
    phase: "intro",
    name: "",
    flavor: "",
    wave: 1,
    catches: 0,
    stars: 0,
    fail: null as Run["fail"],
    paused: false,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const stage = endless ? makeEndlessStage(1) : STAGES[stageId - 1]!;
    const size = () => {
      const parent = canvas.parentElement!;
      const w = Math.max(320, parent.clientWidth);
      const h = Math.max(280, parent.clientHeight);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };
    const { w, h } = size();
    runRef.current = createRun({ stage, endless, viewW: w, viewH: h });
    inputRef.current = { pointerX: null, licking: false, paused: false };
    audio.startAmbient();

    let last = performance.now();
    let raf = 0;
    let prevPhase = runRef.current.phase;
    let hudAcc = 0;

    const loop = (now: number) => {
      const run = runRef.current;
      if (!run) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { w: vw, h: vh } = {
        w: canvas.clientWidth,
        h: canvas.clientHeight,
      };
      run.viewW = vw;
      run.viewH = vh;

      const keys = keysRef.current;
      const input = inputRef.current;
      const pointerX =
        keys.l || keys.r
          ? run.cone.x + (keys.r ? 220 : 0) - (keys.l ? 220 : 0)
          : input.pointerX;
      step(run, dt, { ...input, pointerX });
      draw(ctx, run);

      if (run.phase !== prevPhase) {
        if (run.phase === "catch") {
          audio.catch();
          navigator.vibrate?.(18);
        }
        if (run.phase === "fail") {
          audio.fail();
          if (run.fail === "dog" || run.fail === "cat") audio.bark();
          if (run.fail === "bus") audio.horn();
          navigator.vibrate?.([30, 40, 30]);
        }
        if (run.phase === "won" || (run.phase === "fail" && run.endless)) {
          persist(run);
        }
        prevPhase = run.phase;
        setTick((n) => n + 1);
      }

      hudAcc += dt;
      if (hudAcc > 0.12) {
        hudAcc = 0;
        const melt = run.scoops.reduce((m, s) => Math.min(m, s.melt), 1);
        setHud({
          melt,
          phase: run.phase,
          name: run.stage.name,
          flavor: run.flavor.name,
          wave: run.wave,
          catches: run.catches,
          stars: run.stars,
          fail: run.fail,
          paused: input.paused,
        });
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => size();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      audio.stopAmbient();
    };
  }, [stageId, endless]);

  function persist(run: Run) {
    setProgress((prev) => {
      if (run.endless) {
        if (run.catches > prev.endlessBest) {
          return { ...prev, endlessBest: run.catches };
        }
        return prev;
      }
      if (run.phase !== "won") return prev;
      const stars = [...prev.stars];
      stars[stageId] = Math.max(stars[stageId] ?? 0, run.stars);
      const unlocked = Math.max(prev.unlocked, Math.min(STAGES.length, stageId + 1));
      return { ...prev, stars, unlocked };
    });
  }

  function worldX(clientX: number) {
    const canvas = canvasRef.current;
    const run = runRef.current;
    if (!canvas || !run) return 0;
    const r = canvas.getBoundingClientRect();
    return run.camX + ((clientX - r.left) / r.width) * run.viewW;
  }

  function onDown(e: React.PointerEvent) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    void audio.ensure();
    audio.lick();
    inputRef.current.licking = true;
    inputRef.current.pointerX = worldX(e.clientX);
  }
  function onMove(e: React.PointerEvent) {
    if (!inputRef.current.licking && e.buttons === 0) return;
    inputRef.current.pointerX = worldX(e.clientX);
  }
  function onUp() {
    inputRef.current.licking = false;
    inputRef.current.pointerX = null;
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keysRef.current.l = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") keysRef.current.r = true;
      if (e.code === "Space") {
        e.preventDefault();
        inputRef.current.licking = true;
        audio.lick();
      }
      if (e.code === "Escape") inputRef.current.paused = !inputRef.current.paused;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keysRef.current.l = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") keysRef.current.r = false;
      if (e.code === "Space") inputRef.current.licking = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const over = hud.phase === "won" || hud.phase === "fail";
  const failLine =
    hud.fail && FAIL_LINES[hud.fail]
      ? FAIL_LINES[hud.fail][Math.floor(tick % FAIL_LINES[hud.fail].length)]!
      : "";
  const winLine = WIN_LINES[tick % WIN_LINES.length]!;

  return (
    <div className="relative flex h-dvh flex-col bg-[#7ec8ff]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3">
        <div className="ice-card pointer-events-auto flex items-center gap-2 px-3 py-2">
          <button className="text-sm font-bold text-[#5b2a12]" onClick={onMenu}>
            خروج
          </button>
          <span className="text-[#5b2a12]/30">|</span>
          <button
            className="text-sm font-bold text-[#5b2a12]"
            onClick={() => {
              inputRef.current.paused = !inputRef.current.paused;
              setHud((h) => ({ ...h, paused: inputRef.current.paused }));
            }}
          >
            {hud.paused ? "كمّل" : "وقّف"}
          </button>
        </div>
        <div className="ice-card px-3 py-2 text-center">
          <div className="font-display text-base font-bold text-[#5b2a12]">
            {endless ? `موجة ${hud.wave}` : hud.name}
          </div>
          <div className="text-[11px] font-bold text-[#8a4b22]">{hud.flavor}</div>
        </div>
        <button
          className="ice-card pointer-events-auto px-3 py-2 text-sm font-bold text-[#5b2a12]"
          onClick={() => {
            progress.muted ? audio.setMuted(false) : audio.setMuted(true);
            setProgress({ ...progress, muted: !progress.muted });
          }}
        >
          {progress.muted ? "صوت" : "كتم"}
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center px-6">
        <div className="h-3 w-full max-w-md overflow-hidden rounded-full bg-white/40 shadow-inner">
          <div
            className="h-full rounded-full transition-[width] duration-150"
            style={{
              width: `${Math.max(0, hud.melt) * 100}%`,
              background: "linear-gradient(90deg,#fff4c8,#ff8aa8)",
            }}
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 text-center text-sm font-bold text-white drop-shadow">
        اسحب للجري · اضغط للسان
        {endless ? ` · لحسات ${hud.catches}` : ""}
      </div>

      {hud.paused && hud.phase === "play" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 p-6">
          <div className="ice-card w-full max-w-sm p-6 text-center">
            <h3 className="font-display text-2xl font-bold text-[#5b2a12]">وقفة سريعة</h3>
            <p className="mt-2 text-sm text-[#6b4a32]">الكرة لسه بتتعرق.</p>
            <button
              className="btn-lick mt-5"
              onClick={() => {
                inputRef.current.paused = false;
                setHud((h) => ({ ...h, paused: false }));
              }}
            >
              كمّل
            </button>
          </div>
        </div>
      )}

      {over && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 p-6">
          <div className="ice-card w-full max-w-sm p-6 text-center">
            {hud.phase === "won" ? (
              <>
                <div className="text-4xl">🍦</div>
                <h3 className="font-display mt-2 text-3xl font-bold text-[#5b2a12]">{winLine}</h3>
                <div className="mt-2 text-2xl text-amber-500">
                  {"★".repeat(hud.stars)}
                  {"☆".repeat(3 - hud.stars)}
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl">{hud.fail === "melt" ? "🫠" : "😱"}</div>
                <h3 className="font-display mt-2 text-3xl font-bold text-[#5b2a12]">{failLine}</h3>
                {endless && (
                  <p className="mt-2 text-sm font-bold text-[#8a4b22]">
                    لحسات: {hud.catches}
                  </p>
                )}
              </>
            )}
            <div className="mt-6 flex flex-col gap-2">
              <button
                className="btn-lick"
                onClick={() => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const stage = endless
                    ? makeEndlessStage(1)
                    : STAGES[stageId - 1]!;
                  runRef.current = createRun({
                    stage,
                    endless,
                    viewW: canvas.clientWidth,
                    viewH: canvas.clientHeight,
                  });
                  inputRef.current.paused = false;
                  setHud((h) => ({ ...h, phase: "intro", fail: null, paused: false }));
                }}
              >
                تاني
              </button>
              {hud.phase === "won" && !endless && stageId < STAGES.length && (
                <button className="btn-cone" onClick={() => onNext(stageId + 1)}>
                  الشارع اللي بعده
                </button>
              )}
              <button className="btn-ghost-ice" onClick={onMenu}>
                القائمة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
