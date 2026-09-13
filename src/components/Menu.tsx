import { LEVELS, menuOf, ORDERS } from "../game/levels";
import type { Difficulty } from "../game/types";
import { Install } from "./Install";

type Props = {
  unlocked: number;
  stars: number[];
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onPlay: (id: number) => void;
  onNights: () => void;
  onHowTo: () => void;
};

const DIFFS: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "سهل" },
  { id: "mid", label: "وسط" },
  { id: "hard", label: "صعب" },
];

export function Menu({
  unlocked,
  stars,
  difficulty,
  onDifficulty,
  onPlay,
  onNights,
  onHowTo,
}: Props) {
  const continueId = Math.min(Math.max(1, unlocked), LEVELS.length);
  const totalStars = stars.reduce((a, b) => a + b, 0);
  const pack = menuOf(continueId);
  const done = LEVELS.filter((l) => l.menu === pack.menu && (stars[l.id] ?? 0) > 0).length;
  return (
    <div className="menu-root">
      <div className="sky" style={{ backgroundImage: `url(${pack.art})` }} />
      <div className="vignette" />
      <div className="menu-card">
        <p className="kicker">
          {done}/{ORDERS}
        </p>
        <h1>يلا فاكهة</h1>
        <div className="star-total">★ {totalStars}</div>
        <div className="diff">
          {DIFFS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={difficulty === d.id ? "diff-btn is-on" : "diff-btn"}
              onClick={() => onDifficulty(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="col-btns">
          <button className="btn-main" onClick={() => onPlay(continueId)}>
            {unlocked > 1 ? "كمّل" : "ابدأ"}
          </button>
          <button className="btn-alt" onClick={onNights}>
            القوائم
          </button>
          <button className="btn-ghost" onClick={onHowTo}>
            ؟
          </button>
          <Install />
        </div>
      </div>
    </div>
  );
}
