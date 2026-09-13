type Props = { onBack: () => void; onPlay: () => void };

export function HowTo({ onBack, onPlay }: Props) {
  const items = [
    { t: "←↑↓→", d: "اسحب" },
    { t: "🥤", d: "عصير" },
    { t: "🥗", d: "سلطة" },
    { t: "٤", d: "عصير" },
    { t: "٥", d: "طيف" },
    { t: "❄", d: "تلج" },
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
