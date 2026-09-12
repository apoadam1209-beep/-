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

  return (
    <div className="page">
      <button className="chip" onClick={onBack}>
        رجوع
      </button>
      <h1>رزنامة رمضان</h1>
      <p className="lead" style={{ marginTop: 0 }}>
        ٣٠ ليلة × ١٠ حارات. اختَر الليلة، وبعدين الحارة.
      </p>
      <div className="cal">
        {NIGHTS.map((n) => {
          const lockDay = n.from > unlocked;
          const got = LEVELS.filter((l) => l.id >= n.from && l.id <= n.to).reduce(
            (a, l) => a + (stars[l.id] ?? 0),
            0
          );
          return (
            <button
              key={n.day}
              className={`cal-day ${open === n.day ? "is-open" : ""}`}
              disabled={lockDay}
              onClick={() => setOpen(n.day)}
            >
              <b>{n.day}</b>
              <em>{"★".repeat(Math.min(3, Math.round(got / 10)))}</em>
            </button>
          );
        })}
      </div>
      {open >= 1 && (
        <section className="night-block">
          <h2>{NIGHTS[open - 1]!.name} — عشر حارات</h2>
          <div className="grid-lv">
            {LEVELS.filter((l) => l.day === open).map((l) => {
              const lock = l.id > unlocked;
              const st = stars[l.id] ?? 0;
              return (
                <button
                  key={l.id}
                  className="lv"
                  disabled={lock}
                  onClick={() => onPlay(l.id)}
                >
                  <b>{lock ? "—" : `حارة ${l.hara}`}</b>
                  <span>{lock ? "قفّالة" : l.name.split("·")[1]}</span>
                  <em>
                    {"★".repeat(st)}
                    {"☆".repeat(3 - st)}
                  </em>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
