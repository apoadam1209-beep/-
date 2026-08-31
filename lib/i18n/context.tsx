'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { translations, type Lang } from './translations';

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx>(null!);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem('creativo_lang') as Lang) || 'ar';
    setLangState(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang, ready]);

  const setLang = (l: Lang) => {
    localStorage.setItem('creativo_lang', l);
    setLangState(l);
  };

  const t = (key: string, vars?: Record<string, string | number>) => {
    let s: string =
      (translations[lang] as Record<string, string>)[key] ??
      (translations.en as Record<string, string>)[key] ??
      key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    }
    return s;
  };

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
