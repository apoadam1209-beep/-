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

  if (installed) return null;

  async function go() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    setSheet((v) => !v);
  }

  return (
    <div className="install-wrap">
      {sheet && <button type="button" className="install-scrim" aria-label="إغلاق" onClick={() => setSheet(false)} />}
      {sheet && (
        <div className="install-pop" role="dialog" aria-label="تثبيت يلا فاكهة">
          {ios ? (
            <ol className="install-steps">
              <li>افتح الصفحة في سفاري.</li>
              <li>اضغط المشاركة ثم «إضافة إلى الشاشة الرئيسية».</li>
            </ol>
          ) : (
            <ol className="install-steps">
              <li>افتح الرابط في كروم.</li>
              <li>من القائمة ⋮ اختَر «تثبيت التطبيق».</li>
            </ol>
          )}
        </div>
      )}
      <button className="btn-dl" type="button" onClick={() => void go()} aria-label="تثبيت">
        <svg viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 3v12m0 0-4.2-4.2M12 15l4.2-4.2M5 21h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
