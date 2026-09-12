type Props = { onBack: () => void; onPlay: () => void };

export function HowTo({ onBack, onPlay }: Props) {
  const items = [
    {
      t: "اسحب الفانوس",
      d: "اضغط على فانوس واسحبه فوق / تحت / يمين / شمال. بيتبدل مع جاره فورًا — من غير ضغطتين.",
    },
    {
      t: "الإطار الذهبي هو المطلوب",
      d: "المربعات الغامقة اللي ليها إطار ذهبي لازم تتنوّر. طابق ثلاثة نفس اللون جنبها.",
    },
    {
      t: "اللون الصريح",
      d: "أحمر، أخضر، ذهبي، أزرق، بنفسج. ثلاثة ورا بعض يشتعلوا ويأكلوا العتمة حواليهم.",
    },
    {
      t: "٣٠ ليلة × ١٠ حارات",
      d: "كل يوم رمضان عشر حارات. خلّص الحارة عشان اللي بعدها. الأربعة تعمل خط نور، والخمسة قمر.",
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
