import { useState } from "react";
import { HARAS, LEVELS, NIGHTS } from "../game/levels";

type Props = {
  unlocked: number;
  stars: number[];
  onBack: () => void;
  onPlay: (id: number) => void;
};

export function Nights({ unlocked, stars, onBack, onPlay }: Props) {
  const currentDay = Math.min(NIGHTS.length, Math.ceil(unlocked / HARAS));
  const [open, setOpen] = useState(currentDay);
  const night = NIGHTS[open - 1];
  const lit = night
    ? LEVELS.filter((l) => l.day === night.day && (stars[l.id] ?? 0) > 0).length
    : 0;
  const full = lit >= HARAS;

  return (
    <div className="page nights-page">
      {night && (
        <div
          className="sky"
          style={{
            backgroundImage: `url(${night.art})`,
            filter: `brightness(${0.55 + (lit / HARAS) * 0.7})`,
            opacity: 0.55,
          }}
        />
      )}
      <button className="chip" onClick={onBack}>
        ✕
      </button>
      <h1>الليالي</h1>
      <div className="cal">
        {NIGHTS.map((n) => {
          const lockDay = n.from > unlocked;
          const lamps = LEVELS.filter((l) => l.id >= n.from && l.id <= n.to).map(
            (l) => (stars[l.id] ?? 0) > 0
          );
          const all = lamps.every(Boolean);
          return (
            <button
              key={n.day}
              className={`cal-day ${open === n.day ? "is-open" : ""} ${all ? "is-lit" : ""}`}
              disabled={lockDay}
              onClick={() => setOpen(n.day)}
            >
              <b>{n.day}</b>
              <span className="mini-lamps">
                {lamps.map((on, i) => (
                  <i key={i} className={on ? "on" : ""} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      {night && (
        <section className="night-block">
          <div className="street-row in-page">
            {Array.from({ length: HARAS }, (_, i) => (
              <img
                key={i}
                src="art/fanoos-gold.png"
                className={i < lit ? "hang is-on" : "hang"}
                alt=""
              />
            ))}
          </div>
          <div className="grid-lv">
            {LEVELS.filter((l) => l.day === open).map((l) => {
              const lock = l.id > unlocked;
              const st = stars[l.id] ?? 0;
              return (
                <button
                  key={l.id}
                  className={`lv ${st > 0 ? "is-done" : ""}`}
                  disabled={lock}
                  onClick={() => onPlay(l.id)}
                >
                  <img src="art/fanoos-gold.png" className={st > 0 ? "hang is-on" : "hang"} alt="" />
                  <b>{lock ? "—" : l.hara}</b>
                  <em>{"★".repeat(st)}</em>
                </button>
              );
            })}
          </div>
          {full && <div className="night-glow">★</div>}
        </section>
      )}
    </div>
  );
}
