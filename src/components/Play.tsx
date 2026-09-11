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
  remainingDark,
  tryActivateMoon,
  undoSwap,
} from "../game/engine";
import { LEVELS, nightOf } from "../game/levels";
import type { Game, Pos } from "../game/types";
import { Board } from "./Board";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const night = nightOf(levelId);

  useEffect(() => {
    const p = createGame(LEVELS[levelId - 1]!);
    pack.current = p;
    setGame({ ...p.game, grid: p.game.grid.map((row) => row.slice()) });
    setBurst([]);
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
      hint: g.hint
        ? [
            { ...g.hint[0] },
            { ...g.hint[1] },
          ]
        : null,
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
      const ev = applyClear(g, cells, origin, runs);
      origin = null;
      setBurst(ev.cells);
      audio.ignite(ev.cells.length);
      if (ev.specials.includes("lineH") || ev.specials.includes("lineV")) audio.windLine();
      if (ev.specials.includes("burst")) audio.burst();
      if (ev.specials.includes("moon")) audio.moon();
      audio.light();
      snap();
      await wait(320);
      applyGravity(g);
      snap();
      await wait(200);
      applyFill(g, rng);
      snap();
      await wait(140);
      setBurst([]);
    }
    ensureMoves(g, rng);
    finishCheck(g);
    snap();
  }

  async function performSwap(a: Pos, b: Pos) {
    if (busyRef.current) return;
    const g = pack.current.game;
    if (!canSwap(g, a, b)) {
      audio.grab();
      g.selected = null;
      snap();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    g.selected = null;
    g.hint = null;
    doSwap(g, a, b);
    audio.swap();
    snap();
    await wait(140);
    const moon = tryActivateMoon(g, a, b);
    if (moon) {
      setBurst(moon.cells);
      audio.moon();
      audio.light();
      snap();
      await wait(360);
      applyGravity(g);
      applyFill(g, pack.current.rng);
      setBurst([]);
      snap();
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

  function onCell(pos: Pos) {
    if (busyRef.current) return;
    void audio.ensure();
    const g = pack.current.game;
    if (g.status !== "play") return;
    if (!g.selected) {
      g.selected = pos;
      audio.grab();
      snap();
      return;
    }
    if (g.selected.r === pos.r && g.selected.c === pos.c) {
      g.selected = null;
      snap();
      return;
    }
    const a = g.selected;
    if (Math.abs(a.r - pos.r) + Math.abs(a.c - pos.c) !== 1) {
      g.selected = pos;
      audio.grab();
      snap();
      return;
    }
    if (!canSwap(g, a, pos)) {
      doSwap(g, a, pos);
      snap();
      window.setTimeout(() => {
        undoSwap(g, a, pos);
        g.selected = null;
        snap();
      }, 180);
      audio.grab();
      return;
    }
    void performSwap(a, pos);
  }

  const dawn = 1 - game.moves / Math.max(1, game.maxMoves);
  const over = game.status !== "play";

  return (
    <div className="play-root">
      <div
        className="sky"
        style={{ backgroundImage: `url(${night.art})` }}
      />
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
          <div className="title-sm">{game.level.name}</div>
          <div className="sub">
            {night.name} · {game.level.blurb}
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
        <Board game={game} burst={burst} onCell={onCell} />
      </div>

      <p className="hint-line">اختر فانوسين متجاورين ليتبدّلوا · طابق ثلاثة جنب العتمة</p>

      {over && (
        <div className="overlay">
          <div className="panel">
            {game.status === "won" ? (
              <>
                <div className="emoji">🌕</div>
                <h2>الشارع اتْنوَّر</h2>
                <div className="stars">
                  {"★".repeat(game.stars)}
                  {"☆".repeat(3 - game.stars)}
                </div>
                <p>اتفضّل الفجر… الحي شايف طريقه.</p>
              </>
            ) : (
              <>
                <div className="emoji">🌑</div>
                <h2>الأذان سبقك</h2>
                <p>العتمة لسه ماسكة الزقاق. جرّب حركة أقرب للنور.</p>
              </>
            )}
            <div className="col-btns">
              <button
                className="btn-main"
                onClick={() => {
                  const p = createGame(LEVELS[levelId - 1]!);
                  pack.current = p;
                  setGame({ ...p.game, grid: p.game.grid.map((r) => r.slice()) });
                  setBurst([]);
                }}
              >
                تاني
              </button>
              {game.status === "won" && levelId < LEVELS.length && (
                <button className="btn-alt" onClick={() => onNext(levelId + 1)}>
                  الليلة اللي بعدها
                </button>
              )}
              <button className="btn-ghost" onClick={onMenu}>
                الليالي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
