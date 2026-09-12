import { DAYS, HARAS, LEVELS } from "../game/levels";
import { Install } from "./Install";

type Props = {
  unlocked: number;
  stars: number[];
  onPlay: (id: number) => void;
  onNights: () => void;
  onHowTo: () => void;
};

export function Menu({ unlocked, stars, onPlay, onNights, onHowTo }: Props) {
  const continueId = Math.min(Math.max(1, unlocked), LEVELS.length);
  const totalStars = stars.reduce((a, b) => a + b, 0);
  return (
    <div className="menu-root">
      <div className="sky" style={{ backgroundImage: "url(art/night-alley.jpg)" }} />
      <div className="vignette" />
      <div className="menu-card">
        <p className="kicker">٣٠ ليلة · ١٠ حارات</p>
        <h1>ضوء رمضان</h1>
        <p className="lead">
          اسحب الفانوس، طابق ثلاثة نفس اللون جنب الإطار الذهبي. العتمة تروح والنور يفضل.
        </p>
        <div className="star-total">
          ★ {totalStars} / {DAYS * HARAS * 3}
        </div>
        <div className="col-btns">
          <button className="btn-main" onClick={() => onPlay(continueId)}>
            {unlocked > 1 ? "كمّل الليلة" : "أول فتيل"}
          </button>
          <button className="btn-alt" onClick={onNights}>
            رزنامة رمضان
          </button>
          <button className="btn-ghost" onClick={onHowTo}>
            إزاي تلعب؟
          </button>
          <Install />
        </div>
      </div>
    </div>
  );
}
