import { LEVELS, NIGHTS } from "../game/levels";

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
        <p className="kicker">ليلة في الحارة</p>
        <h1>ضوء رمضان</h1>
        <p className="lead">
          طابق الفوانيس عشان النور يأكل العتمة. الشارع لازم يبقى صاحي قبل الفجر.
        </p>
        <div className="star-total">★ {totalStars} / {LEVELS.length * 3}</div>
        <div className="col-btns">
          <button className="btn-main" onClick={() => onPlay(continueId)}>
            {unlocked > 1 ? "كمّل الليلة" : "أول فتيل"}
          </button>
          <button className="btn-alt" onClick={onNights}>
            الليالي — {NIGHTS.length} حارات
          </button>
          <button className="btn-ghost" onClick={onHowTo}>
            إزاي تلعب؟
          </button>
        </div>
      </div>
    </div>
  );
}
