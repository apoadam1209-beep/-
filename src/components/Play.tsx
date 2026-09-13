import { useEffect, useRef, useState } from "react";
import { audio } from "../audio/engine";
import {
  afterTurn,
  applyClear,
  applyFill,
  applyGravity,
  explodeCells,
  canSwap,
  COLOR_META,
  COMBO_NAME,
  createGame,
  doSwap,
  ensureMoves,
  findHint,
  finishCheck,
  iceLeft,
  matchCells,
  swipeGoal,
  tryActivateSpecial,
} from "../game/engine";
import { LEVELS, menuOf } from "../game/levels";
import type { Difficulty, Dir, DropFx, Game, Pos } from "../game/types";
import { Board } from "./Board";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const afterPaint = () =>
  new Promise<void>((r) => {
    requestAnimationFrame(() => requestAnimationFrame(() => r()));
  });
const POP_MS = 240;
const DROP_MS = 300;
const SEE_MS = 50;

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
  const packMenu = menuOf(levelId);

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
    void audio.ensure().then(() => audio.startShop());
    return () => audio.stopShop();
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
      ice: g.ice.map((row) => row.slice()),
      collected: { ...g.collected },
      selected: g.selected ? { ...g.selected } : null,
      hint: g.hint ? [{ ...g.hint[0] }, { ...g.hint[1] }] : null,
    });
  }

  function bang(specials: string[], cells: Pos[]) {
    if (specials.includes("juice") || specials.includes("prism")) setFire(cells);
  }

  async function boomSound(specials: string[], cracked: boolean) {
    await afterPaint();
    if (specials.includes("prism")) audio.prism();
    else if (specials.includes("juice")) audio.juice();
    if (cracked) audio.ice();
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
      const four = runs.find((r) => r.cells.length === 4);
      const five = runs.find((r) => r.cells.length >= 5);
      if (five) setToast("طيف");
      else if (four) setToast("عصير");
      else if (g.combo >= 2) setToast(COMBO_NAME[Math.min(g.combo, COMBO_NAME.length - 1)] ?? "يا سلام");
      snap();
      await afterPaint();
      await wait(SEE_MS);
      audio.ignite(cells.length);
      if (g.combo >= 2) audio.daff();
      await wait(POP_MS - SEE_MS);
      const ev = applyClear(g, cells, origin, runs);
      origin = null;
      bang(ev.specials, ev.painted.length ? ev.painted : ev.cells);
      if (ev.painted.length) setBurst([]);
      snap();
      await boomSound(ev.specials, ev.cracked);
      if (ev.painted.length) {
        await wait(280);
        explodeCells(g, ev.painted);
        setBurst(ev.painted);
        snap();
        await afterPaint();
        audio.light();
        await wait(POP_MS);
      } else {
        audio.light();
      }
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
    snap();
    await afterPaint();
    audio.swap();
    const sa = g.grid[a.r]![a.c]?.special ?? "none";
    const sb = g.grid[b.r]![b.c]?.special ?? "none";
    let usedSpecial = false;
    if (sa !== "none" || sb !== "none") {
      setBurst([a, b]);
      snap();
      await afterPaint();
      await wait(SEE_MS);
      audio.ignite(2);
      await wait(POP_MS - SEE_MS);
      const boom = tryActivateSpecial(g, a, b);
      if (boom) {
        usedSpecial = true;
        bang([boom.special], boom.painted.length ? boom.painted : boom.cells);
        if (boom.painted.length) setBurst([]);
        snap();
        await boomSound([boom.special], boom.cracked);
        if (boom.painted.length) {
          await wait(280);
          explodeCells(g, boom.painted);
          setBurst(boom.painted);
          snap();
          await afterPaint();
          audio.light();
          await wait(POP_MS);
        } else {
          audio.light();
        }
      }
      await fallAndFill();
    }
    await resolveBoard(usedSpecial ? null : a);
    afterTurn(g);
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

  const over = game.status !== "play";
  const iceN = iceLeft(game);

  return (
    <div className="play-root">
      <div className="sky" style={{ backgroundImage: `url(${packMenu.art})` }} />
      <div className="vignette" />

      <header className="hud hud-slim">
        <button className="chip icon" onClick={onMenu} aria-label="خروج">
          ✕
        </button>
        <div className="hud-mid">
          <div className="title-sm">{game.level.name}</div>
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

      <div className={`order-row ${game.level.kind}`}>
        {game.level.goals.map((gl) => {
          const got = game.collected[gl.color] ?? 0;
          const left = Math.max(0, gl.need - got);
          const pct = Math.min(100, (got / Math.max(1, gl.need)) * 100);
          const meta = COLOR_META[gl.color];
          return (
            <div
              key={gl.color}
              className={game.level.kind === "salad" ? "goal bowl" : "goal glass"}
              style={{ ["--juice" as string]: meta.hex }}
            >
              <span className="goal-fill" style={{ height: `${pct}%` }} />
              <img src={meta.art} alt="" />
              <b>{left}</b>
            </div>
          );
        })}
        {game.needIce > 0 && (
          <div className="goal ice-goal">
            <img src="art/ice.png" alt="" />
            <b>{iceN}</b>
          </div>
        )}
        <strong className="moves">{game.moves}</strong>
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
          onReject={() => {
            void afterPaint().then(() => audio.grab());
          }}
        />
      </div>

      {over && (
        <div className="overlay">
          <div className="panel">
            {game.status === "won" ? (
              <>
                <div className={`serve-scene ${game.level.kind}`}>
                  {game.level.goals.map((gl) => (
                    <div
                      key={gl.color}
                      className={game.level.kind === "salad" ? "serve-bowl" : "serve-glass"}
                      style={{ ["--juice" as string]: COLOR_META[gl.color].hex }}
                    >
                      <span className="serve-fill" />
                      <img src={COLOR_META[gl.color].art} alt="" />
                    </div>
                  ))}
                </div>
                <div className="stars">
                  {"★".repeat(game.stars)}
                  {"☆".repeat(3 - game.stars)}
                </div>
              </>
            ) : (
              <div className="emoji">🥤</div>
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
                القوائم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
