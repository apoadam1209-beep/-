import { X } from "lucide-react";
import Crystal from "./Crystal";

export default function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" dir="rtl">
      <div className="crystal-card max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-3xl p-5 sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl text-cyan-300">كيف ترنّ الكهف؟</h2>
          <button type="button" onClick={onClose} className="btn-ghost rounded-xl p-2" aria-label="إغلاق">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ol className="space-y-4 text-sm leading-7 text-ivory/90">
          <li className="crystal-card rounded-2xl p-4">
            <div className="mb-1 font-bold text-cyan-300">١. اضرب الأرض لا البلورة</div>
            اضغط بلاطة فارغة. موجة على شكل صليب تخرج في أربع جهات. أول بلورة على كل شعاع تنطلق بعيداً عن الضربة وتنزلق حتى جدار أو بلورة أخرى.
          </li>
          <li className="crystal-card rounded-2xl p-4">
            <div className="mb-1 font-bold text-violet-300">٢. بلياردو نيوتن</div>
            إذا اصطدمت بلورة متحركة بأخرى: الأولى تتوقف والثانية تأخذ الزخم. المتلاصقات تعمل كمهد كرات — الأخيرة هي التي تطير.
          </li>
          <li className="crystal-card rounded-2xl p-4">
            <div className="mb-1 font-bold text-amber-300">٣. القاعدة تُقفل اللون</div>
            أوصل كل بلورة إلى حلقتها بنفس اللون. عند التطابق تُقفل وتصبح جداراً. الجدار فخ: ما انزلق إليه لا يرجع.
          </li>
          <li className="crystal-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2 font-bold text-rose-300">
              ٤. الصدى والمُضخّم
              <Crystal uid="how-e" color="cyan" kind="echo" size={28} />
            </div>
            بلورة الهالة إذا تحركت تُطلق موجة جديدة من موضعها. البلاطة البنفسجية (+) تضرب في ثماني جهات.
          </li>
          <li className="crystal-card rounded-2xl p-4">
            <div className="mb-1 font-bold text-emerald-300">٥. مئتا غرفة</div>
            عشرة كهوف × عشرين غرفة. النجمة الثالثة = ضربات ≤ المعيار. الجدار فخ: ما انزلق إليه لا يرجع.
          </li>
        </ol>
        <button type="button" onClick={onClose} className="btn-crystal mt-5 w-full rounded-2xl py-3 text-base font-bold">
          فهمت — إلى الكهف
        </button>
      </div>
    </div>
  );
}
