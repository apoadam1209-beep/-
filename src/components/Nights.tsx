import { LEVELS, NIGHTS } from "../game/levels";

type Props = {
  unlocked: number;
  stars: number[];
  onBack: () => void;
  onPlay: (id: number) => void;
};

export function Nights({ unlocked, stars, onBack, onPlay }: Props) {
  return (
    <div className="page">
      <button className="chip" onClick={onBack}>
        رجوع
      </button>
      <h1>الليالي</h1>
      {NIGHTS.map((n) => (
        <section key={n.id} className="night-block">
          <h2>{n.name}</h2>
          <div className="grid-lv">
            {LEVELS.filter((l) => l.id >= n.from && l.id <= n.to).map((l) => {
              const lock = l.id > unlocked;
              const st = stars[l.id] ?? 0;
              return (
                <button
                  key={l.id}
                  className="lv"
                  disabled={lock}
                  onClick={() => onPlay(l.id)}
                >
                  <b>{lock ? "—" : l.id}</b>
                  <span>{lock ? "قفّالة" : l.name}</span>
                  <em>{"★".repeat(st)}{"☆".repeat(3 - st)}</em>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
