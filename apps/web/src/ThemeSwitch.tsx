import { useI18n } from './i18n';
import { THEME_PREFS, useTheme, type ThemePref } from './theme';

const ICON: Record<ThemePref, string> = { system: '◐', light: '☀', dark: '☾' };

/**
 * System / light / dark toggle, beside the language switch on every screen. On narrow
 * screens it folds into one button that steps through the three choices.
 */
export function ThemeSwitch() {
  const { t } = useI18n();
  const { pref, setPref } = useTheme();
  const next = THEME_PREFS[(THEME_PREFS.indexOf(pref) + 1) % THEME_PREFS.length] ?? 'system';
  return (
    <>
      <div className="pill-switch theme-switch" role="group" aria-label={t.theme.switchLabel}>
        {THEME_PREFS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={pref === p}
            aria-label={t.theme[p]}
            title={t.theme[p]}
            onClick={() => setPref(p)}
          >
            <span aria-hidden="true">{ICON[p]}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="theme-cycle"
        aria-label={`${t.theme.switchLabel}: ${t.theme[pref]}`}
        title={t.theme[pref]}
        onClick={() => setPref(next)}
      >
        <span aria-hidden="true">{ICON[pref]}</span>
      </button>
    </>
  );
}
