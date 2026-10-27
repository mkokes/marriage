import { MESSAGES, useI18n, type Lang } from './index';

const LANGS: Lang[] = ['en', 'ne'];

/** English / नेपाली toggle, pinned to the top corner of every screen. */
export function LanguageSwitch() {
  const { lang, t, setLang } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t.language.switchLabel}>
      {LANGS.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
          {l === 'en' ? 'EN' : MESSAGES[l].language.name}
        </button>
      ))}
    </div>
  );
}
