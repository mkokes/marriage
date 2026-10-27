import { describe, expect, it } from 'vitest';
import { parseThemePref, resolveTheme } from './theme';

describe('parseThemePref', () => {
  it('keeps a saved light or dark choice and falls back to system', () => {
    expect(parseThemePref('light')).toBe('light');
    expect(parseThemePref('dark')).toBe('dark');
    expect(parseThemePref('system')).toBe('system');
    expect(parseThemePref(null)).toBe('system');
    expect(parseThemePref('sepia')).toBe('system');
  });
});

describe('resolveTheme', () => {
  it('follows the device only when the choice is system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});
