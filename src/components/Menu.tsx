import { motion } from "framer-motion";
import {
  Activity,
  Apple,
  Briefcase,
  Car,
  Clock,
  CloudSun,
  Crown,
  Gem,
  GraduationCap,
  Hammer,
  Hand,
  Home,
  KeyRound,
  Lightbulb,
  Lock,
  Moon,
  Music,
  Palette,
  PawPrint,
  Play,
  Rocket,
  ScrollText,
  Sparkles,
  Star,
  TreeDeciduous,
  Trophy,
  UtensilsCrossed,
  Waves,
} from "lucide-react";
import { engine } from "../audio/engine";
import { arDigits, RIDDLES_PER_STAGE, STAGES, TOTAL_RIDDLES } from "../data/riddles";

const STAGE_ICONS = [
  Sparkles, PawPrint, UtensilsCrossed, TreeDeciduous, Home,
  GraduationCap, Activity, CloudSun, Briefcase, Car,
  Rocket, Waves, Moon, Hammer, Music,
  Palette, Apple, Clock, Gem, Crown,
];

interface Props {
  unlocked: number;
  stars: number[];
  best: number[];
  hints: number;
  onPlay: (index: number) => void;
}

function Ornament() {
  return (
    <div className="my-4 flex items-center justify-center gap-3" aria-hidden>
      <span className="h-px w-14 bg-gradient-to-l from-transparent to-[#d4af37]/80" />
      <span className="h-1.5 w-1.5 rotate-45 border border-[#d4af37]" />
      <span className="h-2.5 w-2.5 rotate-45 border border-[#f0d98c] bg-[#d4af37]/30" />
      <span className="h-1.5 w-1.5 rotate-45 border border-[#d4af37]" />
      <span className="h-px w-14 bg-gradient-to-r from-transparent to-[#d4af37]/80" />
    </div>
  );
}

export default function Menu({ unlocked, stars, best, hints, onPlay }: Props) {
  const total = best.reduce((a, b) => a + b, 0);
  const cleared = stars.filter((s) => s > 0).length;
  const firstOpen = stars.findIndex((s, i) => s === 0 && i <= unlocked);
  const continueIndex = firstOpen >= 0 ? firstOpen : Math.min(unlocked, STAGES.length - 1);
  const allDone = cleared === STAGES.length;

  return (
    <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-16">
      {/* hero */}
      <div className="pt-14 text-center md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#d4af37]/35 bg-[#171136]/70 px-4 py-1.5"
        >
          <Moon className="h-3.5 w-3.5 text-[#f0d98c]" />
          <span className="font-tajawal text-xs font-bold tracking-wider text-[#d4af37]">
            ديوانُ الألغازِ العربيّة · {arDigits(STAGES.length)} مرحلة · {arDigits(TOTAL_RIDDLES)} لغزاً
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.9, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-ruqaa mt-5 text-6xl font-bold leading-tight text-shimmer-gold md:text-8xl"
        >
          صندوقُ الأسرار
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.7 }}
        >
          <Ornament />
          <p className="font-amiri mx-auto max-w-xl text-xl leading-relaxed text-[#d9cfae] md:text-2xl">
            في خزانةِ بيتِ الحكمةِ صندوقٌ عتيقٌ له عشرون ختماً…
            أدِرْ حلقاتِه حتى تصطفَّ الحروفُ على شعاعِ القمر، واكشِفْ جوابَ كلِّ لغز.
          </p>
        </motion.div>

        {/* stats */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2.5"
        >
          <span className="ornate-card flex items-center gap-2 rounded-full px-4 py-2 font-tajawal text-sm">
            <ScrollText className="h-4 w-4 text-[#d4af37]" />
            رصيد الحكمة: <b className="text-[#f0d98c]">{arDigits(total)}</b>
          </span>
          <span className="ornate-card flex items-center gap-2 rounded-full px-4 py-2 font-tajawal text-sm">
            <Trophy className="h-4 w-4 text-[#d4af37]" />
            مراحل مكتملة: <b className="text-[#f0d98c]">{arDigits(cleared)} / {arDigits(STAGES.length)}</b>
          </span>
          <span className="ornate-card flex items-center gap-2 rounded-full px-4 py-2 font-tajawal text-sm">
            <Lightbulb className="h-4 w-4 text-[#d4af37]" />
            تلميحات: <b className="text-[#f0d98c]">{arDigits(hints)}</b>
          </span>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.6 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            engine.uiTap();
            onPlay(continueIndex);
          }}
          className="btn-gold mx-auto mt-7 flex items-center gap-3 rounded-2xl px-8 py-4 font-tajawal text-xl font-extrabold"
        >
          <Play className="h-6 w-6" fill="currentColor" />
          {cleared === 0
            ? "ابدأ الرحلة"
            : allDone
              ? "عُد إلى المراحل"
              : `واصل — المرحلة ${arDigits(continueIndex + 1)}`}
        </motion.button>
      </div>

      {/* stage medallions */}
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.7 }}
        className="mt-14"
      >
        <div className="mb-5 flex items-center justify-center gap-3">
          <Sparkles className="h-4 w-4 text-[#d4af37]" />
          <h2 className="font-ruqaa text-2xl font-bold text-[#f0d98c]">خُتومُ الصندوقِ العشرون</h2>
          <Sparkles className="h-4 w-4 text-[#d4af37]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
          {STAGES.map((st, i) => {
            const isLocked = i > unlocked;
            const nStars = stars[i] ?? 0;
            const Icon = STAGE_ICONS[i % STAGE_ICONS.length];
            return (
              <motion.button
                key={st.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.85 + Math.min(i, 14) * 0.05, type: "spring", stiffness: 200, damping: 18 }}
                whileHover={isLocked ? undefined : { y: -4 }}
                whileTap={isLocked ? undefined : { scale: 0.95 }}
                disabled={isLocked}
                onClick={() => {
                  engine.uiTap();
                  onPlay(i);
                }}
                className="group relative flex flex-col items-center gap-2 rounded-3xl p-2 text-center disabled:cursor-not-allowed"
              >
                <span
                  className={`relative flex aspect-square w-full max-w-[118px] items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isLocked
                      ? "border-[#3a3164] bg-[#120d2c] opacity-60"
                      : nStars > 0
                        ? "border-[#f0d98c]/70 bg-[radial-gradient(circle_at_35%_28%,#3d2f6e,#171136)] shadow-[0_0_28px_-6px_rgba(212,175,55,0.5)]"
                        : "border-[#d4af37]/45 bg-[radial-gradient(circle_at_35%_28%,#2e2364,#120d2c)] group-hover:border-[#f0d98c]/90 group-hover:shadow-[0_0_34px_-6px_rgba(212,175,55,0.6)]"
                  }`}
                >
                  <span
                    className="pointer-events-none absolute inset-1.5 rounded-full border border-dashed"
                    style={{ borderColor: "rgba(212,175,55,0.25)" }}
                  />
                  {isLocked ? (
                    <Lock className="h-7 w-7 text-[#5c538f]" strokeWidth={1.8} />
                  ) : (
                    <span className="flex flex-col items-center gap-1">
                      <Icon className="h-5 w-5 text-[#d4af37]" strokeWidth={1.8} />
                      <span className="font-ruqaa text-3xl font-bold leading-none text-[#f0d98c] transition-transform duration-300 group-hover:scale-110">
                        {arDigits(i + 1)}
                      </span>
                    </span>
                  )}
                </span>
                <span
                  className={`font-tajawal text-xs font-bold leading-tight ${
                    isLocked ? "text-[#5c538f]" : "text-[#d9cfae]"
                  }`}
                >
                  {st.name}
                </span>
                <span className="flex items-center gap-0.5">
                  {[0, 1, 2].map((s) => (
                    <Star
                      key={s}
                      className={`h-3 w-3 ${s < nStars ? "text-[#f0d98c]" : "text-[#3a3164]"}`}
                      fill={s < nStars ? "currentColor" : "none"}
                    />
                  ))}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* how to play */}
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.15, duration: 0.7 }}
        className="mt-14"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Hand,
              t: "أدِرِ الحلقات",
              d: "اسحب الحلقات البرونزية بإصبعك — تدور بحرّية وتستقرّ على أقرب حرف.",
            },
            {
              icon: Moon,
              t: "اصطفَّ على الشعاع",
              d: "شعاع القمر يسقط على حرفٍ واحدٍ من كلِّ حلقة، فيُنقش في اللوح الذهبي.",
            },
            {
              icon: KeyRound,
              t: "افتحِ القفل",
              d: "رتّب الحروف لتُكوّن جواب اللغز، وأكمل ألغاز المرحلة العشرة لتكسب النجوم.",
            },
          ].map((c, i) => (
            <motion.div
              key={c.t}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.25 + i * 0.12 }}
              className="ornate-card rounded-2xl p-4 text-center"
            >
              <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-[#d4af37]/40 bg-[#171136]">
                <c.icon className="h-5 w-5 text-[#f0d98c]" strokeWidth={1.8} />
              </span>
              <h3 className="font-ruqaa text-lg font-bold text-[#f0d98c]">{c.t}</h3>
              <p className="mt-1 font-tajawal text-xs leading-relaxed text-[#a99ad6]">{c.d}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="mt-10 text-center font-tajawal text-[11px] leading-relaxed text-[#6f64a8]"
      >
        {arDigits(STAGES.length)} مرحلة · {arDigits(TOTAL_RIDDLES)} لغزاً · كل مرحلة {arDigits(RIDDLES_PER_STAGE)} ألغاز — موسيقى العود تُصنَع لحظيّاً داخل متصفحك على مقام الحجاز، يُنصح برفع الصوت.
      </motion.p>
    </div>
  );
}
