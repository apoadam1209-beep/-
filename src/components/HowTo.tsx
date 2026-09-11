type Props = { onBack: () => void; onPlay: () => void };

export function HowTo({ onBack, onPlay }: Props) {
  const cards = [
    {
      t: "اسحب المخروط",
      d: "إصبعك = رجليك. المخروط بيجري على الإسفلت ورا الآيس كريم.",
      e: "🏃",
    },
    {
      t: "اضغط مدّ لسانك",
      d: "اضغط مع السحب. اللسان بيتطوّل ناحية الكرة. لحسة في الوقت الصح تثبّتها.",
      e: "😛",
    },
    {
      t: "قبل ما تذوب",
      d: "الشمس بتأكلها. الظل والتكييف ينقذوا. الكلب والولد والبالوعة والميكروباص… كلها جعانة.",
      e: "☀️",
    },
  ];
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 py-8">
      <button className="btn-ghost-ice self-start" onClick={onBack}>
        رجوع
      </button>
      <h2 className="font-display mt-6 text-3xl font-bold text-[#5b2a12]">إزاي تلعب</h2>
      <div className="mt-6 flex flex-col gap-4">
        {cards.map((c) => (
          <div key={c.t} className="ice-card flex gap-4 p-4 text-right">
            <div className="text-3xl">{c.e}</div>
            <div>
              <h3 className="font-display text-xl font-bold text-[#5b2a12]">{c.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#6b4a32]">{c.d}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-lick mt-8" onClick={onPlay}>
        يلا نلحس
      </button>
    </div>
  );
}
