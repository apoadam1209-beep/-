type Props = { onBack: () => void; onPlay: () => void };

export function HowTo({ onBack, onPlay }: Props) {
  const items = [
    { t: "←↑↓→", d: "اسحب" },
    { t: "▣", d: "الإطار الذهبي" },
    { t: "٤", d: "ديناميت" },
    { t: "٥", d: "مدفع" },
    { t: "◌", d: "الظل" },
  ];
  return (
    <div className="page">
      <button className="chip" onClick={onBack}>
        ✕
      </button>
      <div className="cards how-mini">
        {items.map((x) => (
          <article key={x.t} className="ice-card">
            <h3>{x.t}</h3>
            <p>{x.d}</p>
          </article>
        ))}
      </div>
      <button className="btn-main" onClick={onPlay}>
        ▶
      </button>
    </div>
  );
}
