import { useEffect, useRef, useState } from "react";
import { audio } from "../audio/engine";
import {
  afterTurn,
  applyClear,
  applyFill,
  applyGravity,
  canSwap,
  COMBO_NAME,
  createGame,
  doSwap,
  ensureMoves,
  findHint,
  finishCheck,
  matchCells,
  remainingCells,
  swipeGoal,
  tryActivateSpecial,
} from "../game/engine";
import { HARAS, LEVELS, nightOf } from "../game/levels";
import type { Difficulty, Dir, DropFx, Game, Pos } from "../game/types";
import { Board } from "./Board";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const POP_MS = 240;
const DROP_MS = 300;

type Props = {
  levelId: number;
  muted: boolean;
  stars: number[];
  difficulty: Difficulty;
  onMuted: (v: boolean) => void;
  onWin: (id: number, stars: number) => void;
  onMenu: () => void;
  onNext: (id: number) => void;
  onNights: () => void;
};

export function Play({
  levelId,
  muted,
  stars,
  difficulty,
  onMuted,
  onWin,
  onMenu,
  onNext,
  onNights,
}: Props) {
  const pack = useRef(createGame(LEVELS[levelId - 1]!, difficulty));
  const [game, setGame] = useState<Game>(pack.current.game);
  const [burst, setBurst] = useState<Pos[]>([]);
  const [fire, setFire] = useState<Pos[]>([]);
  const [drops, setDrops] = useState<DropFx[]>([]);
  const [spawns, setSpawns] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const night = nightOf(levelId);
  const leftCells = remainingCells(game);
  const litHaras = LEVELS.filter((l) => l.day === night.day && (stars[l.id] ?? 0) > 0).length;

  function boot() {
    const p = createGame(LEVELS[levelId - 1]!, difficulty);
    pack.current = p;
    setGame({ ...p.game, grid: p.game.grid.map((row) => row.slice()) });
    setBurst([]);
    setFire([]);
    setDrops([]);
    setSpawns([]);
    setToast(null);
    setBusy(false);
    busyRef.current = false;
  }

  useEffect(() => {
    boot();
    void audio.ensure().then(() => audio.startNight());
    return () => audio.stopNight();
  }, [levelId, difficulty]);

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
      ghost: g.ghost.map((row) => row.slice()),
      ghostAge: g.ghostAge.map((row) => row.slice()),
      selected: g.selected ? { ...g.selected } : null,
      hint: g.hint ? [{ ...g.hint[0] }, { ...g.hint[1] }] : null,
      cat: g.cat ? { ...g.cat } : null,
    });
  }

  function bang(specials: string[], cells: Pos[]) {
    const boom = specials.includes("dynamite") || specials.includes("cannon") || specials.includes("burst");
    if (specials.includes("cannon")) audio.cannon();
    else if (specials.includes("dynamite") || specials.includes("burst")) audio.dynamite();
    if (boom) setFire(cells);
  }

  async function fallAndFill() {
    const g = pack.current.game;
    const fallen = applyGravity(g);
    const born = applyFill(g, pack.current.rng);
    setDrops(fallen);
    setSpawns(born);
    setBurst([]);
    snap();
    await wait(fallen.length || born.length ? DROP_MS : 40);
    setDrops([]);
    setSpawns([]);
    setFire([]);
  }

  async function resolveBoard(origin: Pos | null) {
    const g = pack.current.game;
    let loops = 0;
    while (loops < 12) {
      loops++;
      const { runs, cells } = matchCells(g);
      if (!cells.length) break;
      setBurst(cells);
      audio.ignite(cells.length);
      if (g.combo >= 2) {
        setToast(COMBO_NAME[Math.min(g.combo, COMBO_NAME.length - 1)] ?? "يا سلام");
        audio.daff();
      }
      const four = runs.find((r) => r.cells.length === 4);
      const five = runs.find((r) => r.cells.length >= 5);
      if (five) setToast("مدفع");
      else if (four) setToast("ديناميت");
      snap();
      await wait(POP_MS);
      const ev = applyClear(g, cells, origin, runs);
      origin = null;
      bang(ev.specials, ev.cells);
      audio.light();
      snap();
      await fallAndFill();
    }
    setToast(null);
    ensureMoves(g, pack.current.rng);
    finishCheck(g);
    snap();
  }

  function canSwipe(from: Pos, dir: Dir) {
    if (busyRef.current) return false;
    const g = pack.current.game;
    if (g.status !== "play") return false;
    const to = swipeGoal(g, from, dir);
    if (!to) return false;
    if (
      g.cat &&
      ((g.cat.r === from.r && g.cat.c === from.c) || (g.cat.r === to.r && g.cat.c === to.c))
    )
      return false;
    return canSwap(g, from, to);
  }

  async function performSwap(a: Pos, b: Pos) {
    if (busyRef.current) return;
    const g = pack.current.game;
    busyRef.current = true;
    setBusy(true);
    g.selected = null;
    g.hint = null;
    doSwap(g, a, b);
    audio.swap();
    snap();
    const sa = g.grid[a.r]![a.c]?.special ?? "none";
    const sb = g.grid[b.r]![b.c]?.special ?? "none";
    if (sa !== "none" || sb !== "none") {
      setBurst([a, b]);
      snap();
      await wait(POP_MS);
      const boom = tryActivateSpecial(g, a, b);
      if (boom) {
        bang([boom.special], boom.cells);
        audio.light();
        snap();
      }
      await fallAndFill();
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

  function onSwap(from: Pos, dir: Dir) {
    const g = pack.current.game;
    const to = swipeGoal(g, from, dir);
    if (!to) return;
    void performSwap(from, to);
  }

  const dawn = 1 - game.moves / Math.max(1, game.maxMoves);
  const over = game.status !== "play";
  const street = 0.15 + (litHaras / HARAS) * 0.55;

  return (
    <div className="play-root">
      <div
        className="sky"
        style={{
          backgroundImage: `url(${night.art})`,
          filter: `brightness(${0.7 + street * 0.5})`,
        }}
      />
      <div
        className="dawn"
        style={{
          opacity: game.level.night === "dawn" ? 0.35 + dawn * 0.4 : dawn * 0.18 + street * 0.2,
          backgroundImage: "url(art/dawn-sky.jpg)",
        }}
      />
      <div className="vignette" />
      <div className="street-row" aria-hidden>
        {Array.from({ length: HARAS }, (_, i) => (
          <img
            key={i}
            src="art/fanoos-gold.png"
            className={i < litHaras ? "hang is-on" : "hang"}
            alt=""
          />
        ))}
      </div>

      <header className="hud hud-slim">
        <button className="chip icon" onClick={onMenu} aria-label="خروج">
          ✕
        </button>
        <div className="hud-mid">
          <div className="title-sm">
            {night.day} · {game.level.hara}
          </div>
        </div>
        <button
          className="chip icon"
          onClick={() => {
            audio.setMuted(!muted);
            onMuted(!muted);
          }}
          aria-label="صوت"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </header>

      <div className="mission slim">
        <span className="gold-dot" />
        <b>{leftCells}</b>
        <div className="bar grow">
          <i style={{ width: `${game.need ? (game.lit / game.need) * 100 : 100}%` }} />
        </div>
        <strong>{game.moves}</strong>
      </div>

      <div className="board-wrap">
        {toast && <div className="combo-toast">{toast}</div>}
        <Board
          game={game}
          burst={burst}
          fire={fire}
          drops={drops}
          spawns={spawns}
          busy={busy}
          canSwipe={canSwipe}
          onSwap={onSwap}
          onReject={() => audio.grab()}
        />
      </div>

      {over && (
        <div className="overlay">
          <div className="panel">
            {game.status === "won" ? (
              <div className="stars">
                {"★".repeat(game.stars)}
                {"☆".repeat(3 - game.stars)}
              </div>
            ) : (
              <div className="emoji">🌑</div>
            )}
            <div className="col-btns">
              <button className="btn-main" onClick={boot}>
                تاني
              </button>
              {game.status === "won" && levelId < LEVELS.length && (
                <button className="btn-alt" onClick={() => onNext(levelId + 1)}>
                  →
                </button>
              )}
              <button className="btn-ghost" onClick={onNights}>
                الليالي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
