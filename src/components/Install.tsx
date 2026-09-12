import { useEffect, useState } from "react";

type BIP = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function Install() {
  const [deferred, setDeferred] = useState<BIP | null>(null);
  const [installed, setInstalled] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || !!nav.standalone;
    if (standalone) setInstalled(true);
    setIos(/iPhone|iPad|iPod/i.test(nav.userAgent) && !("MSStream" in window));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIP);
    };
    const onInstalled = () => {
      setInstalled(true);
      setSheet(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return <p className="install-ok">مثبّتة على جهازك — افتحها من الأيقونة</p>;
  }

  async function go() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    setSheet(true);
  }

  return (
    <>
      <button className="btn-alt" type="button" onClick={() => void go()}>
        ثبّت على الموبايل
      </button>
      {sheet && (
        <div className="overlay" onClick={() => setSheet(false)}>
          <div className="panel" onClick={(e) => e.stopPropagation()}>
            <h2>تثبيت ضوء رمضان</h2>
            {ios ? (
              <ol className="install-steps">
                <li>افتح الصفحة في سفاري (مش من داخل واتساب أو إنستجرام).</li>
                <li>اضغط زر المشاركة في الأسفل.</li>
                <li>اختَر «إضافة إلى الشاشة الرئيسية».</li>
                <li>اضغط إضافة — الأيقونة تظهر زي أي تطبيق.</li>
              </ol>
            ) : (
              <ol className="install-steps">
                <li>افتح الرابط في كروم (مش من داخل فيسبوك أو تيليجرام).</li>
                <li>اضغط القائمة ⋮ ثم «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق».</li>
                <li>أو انتظر بانر التثبيت أعلى الصفحة.</li>
              </ol>
            )}
            <button className="btn-main" type="button" onClick={() => setSheet(false)}>
              تمام
            </button>
          </div>
        </div>
      )}
    </>
  );
}
