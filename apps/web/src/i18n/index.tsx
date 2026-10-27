import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { local } from '../storage';
import { en, type Messages } from './en';
import { ne } from './ne';

export type Lang = 'en' | 'ne';
export type { Messages };

export const MESSAGES: Record<Lang, Messages> = { en, ne };
const LANG_KEY = 'marriage.lang';

/** The saved choice, else Nepali if the browser prefers it, else English. */
export function detectLang(saved: string | null, browserLanguages: readonly string[]): Lang {
  if (saved === 'en' || saved === 'ne') return saved;
  return browserLanguages.some((l) => l.toLowerCase().startsWith('ne')) ? 'ne' : 'en';
}

interface I18n {
  lang: Lang;
  t: Messages;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18n>({ lang: 'en', t: en, setLang: () => {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() =>
    detectLang(local.get(LANG_KEY), navigator.languages ?? [navigator.language]),
  );

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = MESSAGES[lang].home.title;
  }, [lang]);

  const value = useMemo<I18n>(
    () => ({
      lang,
      t: MESSAGES[lang],
      setLang: (next) => {
        local.set(LANG_KEY, next);
        setLangState(next);
      },
    }),
    [lang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** The current language's messages (`t`), plus the language and a way to change it. */
export const useI18n = (): I18n => useContext(I18nContext);
