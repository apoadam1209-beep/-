import { useEffect, useRef, useState } from "react";
import { audio } from "../audio/engine";
import {
  afterTurn,
  applyClear,
  applyFill,
  applyGravity,
  canSwap,
  createGame,
  doSwap,
  ensureMoves,
  findHint,
  finishCheck,
  matchCells,
  remainingCells,
  remainingDark,
  stepDir,
  tryActivateMoon,
} from "../game/engine";
import { HARAS, LEVELS, nightOf } from "../game/levels";
import type { Dir, DropFx, Game, Pos, SwapFx } from "../game/types";
import { Board } from "./Board";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const SWAP_MS = 340;
const BOUNCE_MS = 420;
const POP_MS = 220;
const DROP_MS = 320;
const SPAWN_MS = 240;

type Props = {
  levelId: number;
  muted: boolean;
  onMuted: (v: boolean) => void;
  onWin: (id: number, stars: number) => void;
  onMenu: () => void;
  onNext: (id: number) => void;
};

export function Play({
  levelId,
  muted,
  onMuted,
  onWin,
  onMenu,
  onNext,
}: Props) {
  const pack = useRef(createGame(LEVELS[levelId - 1]!));
  const [game, setGame] = useState<Game>(pack.current.game);
  const [burst, setBurst] = useState<Pos[]>([]);
  const [holding, setHolding] = useState<Pos | null>(null);
  const [swap, setSwap] = useState<SwapFx | null>(null);
  const [drops, setDrops] = useState<DropFx[]>([]);
  const [spawns, setSpawns] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const night = nightOf(levelId);
  const leftCells = remainingCells(game);

  useEffect(() => {
    const p = createGame(LEVELS[levelId - 1]!);
    pack.current = p;
    setGame({ ...p.game, grid: p.game.grid.map((row) => row.slice()) });
    setBurst([]);
    setHolding(null);
    setSwap(null);
    setDrops([]);
    setSpawns([]);
    setBusy(false);
    busyRef.current = false;
    void audio.ensure().then(() => audio.startNight());
    return () => audio.stopNight();
  }, [levelId]);

  useEffect(() => {
    if (busy || game.status !== "play") return;
    const id = window.setTimeout(() => {
      const hint = findHint(pack.current.game);
      if (hint) {
        pack.current.game.hint = hint;
        snap();
      }
    }, 9000);
    return () => window.clearTimeout(id);
  }, [game.moves, game.status, busy]);

  function snap() {
    const g = pack.current.game;
    setGame({
      ...g,
      grid: g.grid.map((row) => row.slice()),
      dark: g.dark.map((row) => row.slice()),
      selected: g.selected ? { ...g.selected } : null,
      hint: g.hint ? [{ ...g.hint[0] }, { ...g.hint[1] }] : null,
      cat: g.cat ? { ...g.cat } : null,
    });
  }

  async function resolveBoard(origin: Pos | null) {
    const g = pack.current.game;
    const rng = pack.current.rng;
    let loops = 0;
    while (loops < 12) {
      loops++;
      const { runs, cells } = matchCells(g);
      if (!cells.length) break;
      setBurst(cells);
      audio.ignite(cells.length);
      snap();
      await wait(POP_MS);
      const ev = applyClear(g, cells, origin, runs);
      origin = null;
      if (ev.specials.includes("lineH") || ev.specials.includes("lineV")) audio.windLine();
      if (ev.specials.includes("burst")) audio.burst();
      if (ev.specials.includes("moon")) audio.moon();
      audio.light();
      setBurst(ev.cells);
      snap();
      await wait(80);
      const fallen = applyGravity(g);
      setDrops(fallen);
      setBurst([]);
      snap();
      await wait(fallen.length ? DROP_MS : 40);
      setDrops([]);
      const born = applyFill(g, rng);
      setSpawns(born);
      snap();
      await wait(born.length ? SPAWN_MS : 40);
      setSpawns([]);
    }
    ensureMoves(g, rng);
    finishCheck(g);
    snap();
  }

  async function performSwap(a: Pos, b: Pos, dir: Dir) {
    if (busyRef.current) return;
    const g = pack.current.game;
    const ok = canSwap(g, a, b);
    busyRef.current = true;
    setBusy(true);
    g.selected = null;
    g.hint = null;
    setHolding(null);

    if (!ok) {
      setSwap({ a, b, dir, mode: "bounce" });
      audio.grab();
      await wait(BOUNCE_MS);
      setSwap(null);
      busyRef.current = false;
      setBusy(false);
      return;
    }

    setSwap({ a, b, dir, mode: "swap" });
    audio.swap();
    await wait(SWAP_MS);
    doSwap(g, a, b);
    setSwap(null);
    snap();
    const moon = tryActivateMoon(g, a, b);
    if (moon) {
      setBurst(moon.cells);
      audio.moon();
      audio.light();
      snap();
      await wait(280);
      const fallen = applyGravity(g);
      setDrops(fallen);
      setBurst([]);
      snap();
      await wait(fallen.length ? DROP_MS : 40);
      setDrops([]);
      const born = applyFill(g, pack.current.rng);
      setSpawns(born);
      snap();
      await wait(born.length ? SPAWN_MS : 40);
      setSpawns([]);
    }
    await resolveBoard(a);
    afterTurn(g, pack.current.rng);
    snap();
    if (g.status === "won") {
      audio.win();
      onWin(levelId, g.stars);
    } else if (g.status === "lost") audio.fail();
    busyRef.current = false;
    setBusy(false);
  }

  function onSwipe(from: Pos, dir: Dir) {
    if (busyRef.current) return false;
    void audio.ensure();
    const g = pack.current.game;
    if (g.status !== "play") return false;
    const to = stepDir(from, dir);
    if (to.r < 0 || to.c < 0 || to.r >= g.size || to.c >= g.size) return false;
    if (
      g.cat &&
      ((g.cat.r === from.r && g.cat.c === from.c) || (g.cat.r === to.r && g.cat.c === to.c))
    )
      return false;
    setHolding(from);
    void performSwap(from, to, dir);
    return true;
  }

  const dawn = 1 - game.moves / Math.max(1, game.maxMoves);
  const over = game.status !== "play";
  const lastInNight = game.level.hara === HARAS;

  return (
    <div className="play-root">
      <div className="sky" style={{ backgroundImage: `url(${night.art})` }} />
      <div
        className="dawn"
        style={{
          opacity: game.level.night === "dawn" ? 0.35 + dawn * 0.4 : dawn * 0.22,
          backgroundImage: "url(art/dawn-sky.jpg)",
        }}
      />
      <div className="vignette" />

      <header className="hud">
        <button className="chip" onClick={onMenu}>
          خروج
        </button>
        <div className="hud-mid">
          <div className="title-sm">{night.name}</div>
          <div className="sub">
            الحارة {game.level.hara}/{HARAS} · {game.level.name.split("·")[1]}
          </div>
        </div>
        <button
          className="chip"
          onClick={() => {
            audio.setMuted(!muted);
            onMuted(!muted);
          }}
        >
          {muted ? "صوت" : "كتم"}
        </button>
      </header>

      <div className="mission">
        <strong>نوّر العتمة</strong>
        <span>
          اسحب فانوسًا جنب المربعات اللي ليها إطار ذهبي · فاضل{" "}
          <b>{leftCells}</b> مربع
        </span>
      </div>

      <div className="meters">
        <div className="meter">
          <span>حركات</span>
          <strong>{game.moves}</strong>
        </div>
        <div className="meter grow">
          <span>النور</span>
          <div className="bar">
            <i style={{ width: `${game.need ? (game.lit / game.need) * 100 : 100}%` }} />
          </div>
        </div>
        <div className="meter">
          <span>عتمة</span>
          <strong>{remainingDark(game)}</strong>
        </div>
      </div>

      <div className="board-wrap">
        <Board
          game={game}
          burst={burst}
          holding={holding}
          swap={swap}
          drops={drops}
          spawns={spawns}
          onSwipe={onSwipe}
        />
      </div>

      <p className="hint-line">اسحب الفانوس لأي اتجاه · طابق ثلاثة جنب الإطار الذهبي</p>

      {over && (
        <div className="overlay">
          <div className="panel">
            {game.status === "won" ? (
              <>
                <div className="emoji">🌕</div>
                <h2>{lastInNight ? "الليلة اكتملت" : "الحارة اتْنوَّرت"}</h2>
                <div className="stars">
                  {"★".repeat(game.stars)}
                  {"☆".repeat(3 - game.stars)}
                </div>
                <p>
                  {lastInNight
                    ? "عشر حارات في النور. يلا على الليلة الجاية."
                    : `الحارة ${game.level.hara} من ${HARAS} خلصت.`}
                </p>
              </>
            ) : (
              <>
                <div className="emoji">🌑</div>
                <h2>الحركات خلصت</h2>
                <p>لسه فيه مربعات غامقة. اسحب جنب الإطار الذهبي.</p>
              </>
            )}
            <div className="col-btns">
              <button
                className="btn-main"
                onClick={() => {
                  const p = createGame(LEVELS[levelId - 1]!);
                  pack.current = p;
                  setGame({ ...p.game, grid: p.game.grid.map((row) => row.slice()) });
                  setBurst([]);
                  setHolding(null);
                  setSwap(null);
                  setDrops([]);
                  setSpawns([]);
                  busyRef.current = false;
                  setBusy(false);
                }}
              >
                تاني
              </button>
              {game.status === "won" && levelId < LEVELS.length && (
                <button className="btn-alt" onClick={() => onNext(levelId + 1)}>
                  {lastInNight ? "الليلة اللي بعدها" : "الحارة اللي بعدها"}
                </button>
              )}
              <button className="btn-ghost" onClick={onMenu}>
                الرزنامة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
