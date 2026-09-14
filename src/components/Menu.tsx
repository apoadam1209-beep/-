import { LEVELS } from "../game/levels";
import { Install } from "./Install";

type Props = {
  unlocked: number;
  stars: number[];
  onPlay: (id: number) => void;
  onNights: () => void;
};

const GARLAND = [
  "art/fruit-berry.png",
  "art/fruit-mango.png",
  "art/fruit-orange.png",
  "art/fruit-grape.png",
  "art/fruit-melon.png",
];

export function Menu({ unlocked, stars, onPlay, onNights }: Props) {
  const continueId = Math.min(Math.max(1, unlocked), LEVELS.length);
  const totalStars = stars.reduce((a, b) => a + b, 0);
  return (
    <div className="menu-root is-fill">
      <div className="sky" style={{ backgroundImage: "url(art/menu-orchard.jpg)" }} />
      <div className="menu-shade" />
      <div className="menu-brand">
        <div className="menu-garland" aria-hidden>
          {GARLAND.map((src) => (
            <img key={src} src={src} alt="" />
          ))}
        </div>
        <h1>يلا فاكهة</h1>
        <div className="star-total">★ {totalStars}</div>
      </div>
      <div className="menu-dock">
        <button className="btn-play" onClick={() => onPlay(continueId)}>
          {unlocked > 1 ? "كمّل" : "ابدأ"}
        </button>
        <button className="btn-map" onClick={onNights} aria-label="الحديقة">
          <svg className="map-ico" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M7 20c1.6-3.4.6-5.2 3.2-7.2 2.6-2 2.4-3.4 3.4-6.2C14.8 4.4 17 3 18.5 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="7" cy="20" r="2.1" />
            <circle cx="18.5" cy="3.2" r="2.1" />
          </svg>
        </button>
      </div>
      <div className="menu-install">
        <Install />
      </div>
    </div>
  );
}
