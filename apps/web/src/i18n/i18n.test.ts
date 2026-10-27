import { describe, expect, it } from 'vitest';
import { en } from './en';
import { detectLang } from './index';
import { ne } from './ne';

describe('detectLang', () => {
  it('prefers the saved choice, then a Nepali browser, then English', () => {
    expect(detectLang('ne', ['en-US'])).toBe('ne');
    expect(detectLang('en', ['ne-NP'])).toBe('en');
    expect(detectLang(null, ['en-US', 'ne'])).toBe('ne');
    expect(detectLang(null, ['en-GB'])).toBe('en');
    expect(detectLang('fr', [])).toBe('en');
  });
});

describe('Nepali numbers', () => {
  it('uses Devanagari digits', () => {
    expect(ne.format.number(1234)).toBe('१,२३४');
    expect(ne.format.signed(12)).toBe('+१२');
    expect(ne.format.signed(-26)).toBe('-२६');
    expect(ne.game.cards(21)).toBe('२१ पत्ती');
  });
});

describe('dictionaries', () => {
  it('translate every error code', () => {
    expect(Object.keys(ne.errors).toSorted()).toEqual(Object.keys(en.errors).toSorted());
    expect(Object.values(ne.errors).every((text) => text.length > 0)).toBe(true);
  });
});
