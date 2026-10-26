import { describe, expect, it } from 'vitest';
import { STANDARD_RULES, validateRules } from './config';

describe('validateRules', () => {
  it('accepts the Standard preset', () => {
    expect(validateRules(STANDARD_RULES)).toEqual([]);
  });

  it.each([
    ['decks', { decks: 7 }, /decks/],
    ['enum', { discardPickup: 'sometimes' }, /discardPickup/],
    ['boolean', { kidnap: 'yes' }, /kidnap/],
    ['negative amount', { seenPenalty: -1 }, /seenPenalty/],
    ['huge amount', { unseenPenalty: 1e9 }, /unseenPenalty/],
    ['maal value', { maal: { ...STANDARD_RULES.maal, tiplu: 2.5 } }, /maal\.tiplu/],
    ['missing maal', { maal: null }, /maal must be an object/],
    ['kidnap with murder', { kidnap: true, murder: true }, /kidnap and murder/],
  ])('rejects a bad %s', (_, override, message) => {
    expect(validateRules({ ...STANDARD_RULES, ...override }).join('; ')).toMatch(message);
  });

  it('rejects non-objects', () => {
    expect(validateRules(null)).toEqual(['rules must be an object']);
  });
});
