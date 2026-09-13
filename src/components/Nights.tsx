import { useState } from "react";
import { LEVELS, MENU_PACKS, ORDERS } from "../game/levels";

type Props = {
  unlocked: number;
  stars: number[];
  onBack: () => void;
  onPlay: (id: number) => void;
};

export function Nights({ unlocked, stars, onBack, onPlay }: Props) {
  const current = Math.min(MENU_PACKS.length, Math.ceil(unlocked / ORDERS));
  const [open, setOpen] = useState(current);
  const pack = MENU_PACKS[open - 1];
  const lit = pack
    ? LEVELS.filter((l) => l.menu === pack.menu && (stars[l.id] ?? 0) > 0).length
    : 0;

  return (
    <div className="page nights-page">
      {pack && (
        <div
          className="sky"
          style={{
            backgroundImage: `url(${pack.art})`,
            opacity: 0.45,
          }}
        />
      )}
      <button className="chip" onClick={onBack}>
        ✕
      </button>
      <h1>القوائم</h1>
      <div className="cal">
        {MENU_PACKS.map((n) => {
          const lockDay = n.from > unlocked;
          const lamps = LEVELS.filter((l) => l.id >= n.from && l.id <= n.to).map(
            (l) => (stars[l.id] ?? 0) > 0
          );
          const all = lamps.every(Boolean);
          return (
            <button
              key={n.menu}
              className={`cal-day ${open === n.menu ? "is-open" : ""} ${all ? "is-lit" : ""}`}
              disabled={lockDay}
              onClick={() => setOpen(n.menu)}
            >
              <b>{n.menu}</b>
              <span className="mini-lamps">
                {lamps.map((on, i) => (
                  <i key={i} className={on ? "on" : ""} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      {pack && (
        <section className="night-block">
          <div className="grid-lv">
            {LEVELS.filter((l) => l.menu === open).map((l) => {
              const lock = l.id > unlocked;
              const st = stars[l.id] ?? 0;
              return (
                <button
                  key={l.id}
                  className={`lv ${st > 0 ? "is-done" : ""}`}
                  disabled={lock}
                  onClick={() => onPlay(l.id)}
                >
                  <b>{lock ? "—" : l.order}</b>
                  <span>{lock ? "" : l.name}</span>
                  <em>{"★".repeat(st)}</em>
                </button>
              );
            })}
          </div>
          {lit >= ORDERS && <div className="night-glow">★</div>}
        </section>
      )}
    </div>
  );
}
