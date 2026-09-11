type Props = { onBack: () => void; onPlay: () => void };

export function HowTo({ onBack, onPlay }: Props) {
  const items = [
    {
      t: "بدّل فانوسين",
      d: "اختار فانوس، وبعدين اللي جنبه. لو بقوا ثلاثة نفس اللون في صف أو عمود: يشتعلوا.",
    },
    {
      t: "النور يأكل العتمة",
      d: "التطابق بيضيّع الدخان حوالين الفوانيس. طابق جنب العتمة، مش في الفاضي.",
    },
    {
      t: "قبل الفجر",
      d: "كل ليلة بعدد حركات. الأربعة تعمل صفاً من نور، والخمسة قمراً يمسح لوناً كاملاً.",
    },
    {
      t: "القطة",
      d: "من نص اللعب قطة تقعد على فانوس وما ينفعش تبدّله. بتتنقل بعد كل حركة.",
    },
  ];
  return (
    <div className="page">
      <button className="chip" onClick={onBack}>
        رجوع
      </button>
      <h1>إزاي تلعب</h1>
      <div className="cards">
        {items.map((x) => (
          <article key={x.t} className="ice-card">
            <h3>{x.t}</h3>
            <p>{x.d}</p>
          </article>
        ))}
      </div>
      <button className="btn-main" onClick={onPlay}>
        يلا ننوّر
      </button>
    </div>
  );
}
