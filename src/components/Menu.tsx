import { LEVELS } from "../game/levels";
import { Install } from "./Install";

type Props = {
  unlocked: number;
  stars: number[];
  onPlay: (id: number) => void;
  onNights: () => void;
};

export function Menu({ unlocked, stars, onPlay, onNights }: Props) {
  const continueId = Math.min(Math.max(1, unlocked), LEVELS.length);
  const totalStars = stars.reduce((a, b) => a + b, 0);
  return (
    <div className="menu-root is-fill">
      <div className="sky" style={{ backgroundImage: "url(art/menu-orchard.jpg)" }} />
      <div className="menu-shade" />
      <div className="menu-brand">
        <h1>يلا فاكهة</h1>
        <div className="star-total">★ {totalStars}</div>
      </div>
      <div className="menu-dock">
        <button className="btn-play" onClick={() => onPlay(continueId)}>
          {unlocked > 1 ? "كمّل" : "ابدأ"}
        </button>
        <button className="btn-map" onClick={onNights} aria-label="الحديقة">
          <span className="map-dot" />
        </button>
      </div>
      <div className="menu-install">
        <Install />
      </div>
    </div>
  );
}
