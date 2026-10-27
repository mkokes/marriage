import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { local } from './storage';

/** What the player picked: follow the device, or force one theme. */
export type ThemePref = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_PREFS: readonly ThemePref[] = ['system', 'light', 'dark'];
/** Also read by the inline script in index.html, which sets the theme before first paint. */
const THEME_KEY = 'marriage.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
/** Browser chrome colour per theme; matches `--bg` in styles.css. */
const THEME_COLOR: Record<Theme, string> = { dark: '#141e46', light: '#f5ecd7' };

/** The saved choice, or `system` for anything unknown. */
export function parseThemePref(saved: string | null): ThemePref {
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  if (pref !== 'system') return pref;
  return systemDark ? 'dark' : 'light';
}

interface ThemeState {
  pref: ThemePref;
  theme: Theme;
  setPref: (pref: ThemePref) => void;
}

const ThemeContext = createContext<ThemeState>({
  pref: 'system',
  theme: 'dark',
  setPref: () => {},
});

const systemPrefersDark = () => window.matchMedia(DARK_QUERY).matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState(() => parseThemePref(local.get(THEME_KEY)));
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const theme = resolveTheme(pref, systemDark);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  }, [theme]);

  const value = useMemo<ThemeState>(
    () => ({
      pref,
      theme,
      setPref: (next) => {
        local.set(THEME_KEY, next);
        setPrefState(next);
      },
    }),
    [pref, theme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The player's theme choice, the theme in effect, and a way to change the choice. */
export const useTheme = (): ThemeState => useContext(ThemeContext);
