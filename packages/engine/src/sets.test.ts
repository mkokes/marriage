import { describe, expect, it } from 'vitest';
import type { Card } from './cards';
import { classifySet, isDublee } from './sets';
import { card, cards } from './test/helpers';

/** Treats every 2 (any suit) as wild, as if the tiplu were a 2. */
const twosWild = (c: Card) => c.kind === 'standard' && c.rank === 2;

describe('classifySet', () => {
  it.each([
    ['5H 6H 7H', 'pureSequence'],
    ['7H 5H 6H', 'pureSequence'],
    ['AS 2S 3S', 'pureSequence'],
    ['QS KS AS', 'pureSequence'],
    ['9C 10C JC QC', 'pureSequence'],
    ['7H 7H#1 7H#2', 'tunnela'],
    ['7H 7S 7C', 'trial'],
    ['7H 7S 7C 7D', 'trial'],
  ])('%s is a %s', (codes, kind) => {
    expect(classifySet(cards(codes))).toBe(kind);
  });

  it.each([
    ['KS AS 2S', 'ace does not wrap'],
    ['5H 6H 8H', 'gap'],
    ['5H 6H 7S', 'mixed suits'],
    ['7H 7H#1 7S', 'trial needs distinct suits'],
    ['7H 7S', 'too short'],
    ['7H 7S 7C 7D 7H#1', 'trial of five'],
  ])('%s is not a set (%s)', (codes) => {
    expect(classifySet(cards(codes))).toBeNull();
  });

  it('uses wilds to fill sequences and trials', () => {
    expect(classifySet(cards('5H 2C 7H'), twosWild)).toBe('sequence');
    expect(classifySet(cards('QH KH 2D'), twosWild)).toBe('sequence');
    expect(classifySet(cards('9S 9H 2D'), twosWild)).toBe('dirtyTrial');
    expect(classifySet(cards('2C 2C#1 2D'), twosWild)).toBe('sequence');
    expect(classifySet(cards('5H 2C 9H'), twosWild)).toBeNull();
  });

  it('reports a natural set by its natural kind even when it holds wilds', () => {
    expect(classifySet(cards('AS 2S 3S'), twosWild)).toBe('pureSequence');
  });

  it('rejects printed jokers unless they are wild', () => {
    const withJoker = [card('5H'), card('6H'), card('JK')];
    expect(classifySet(withJoker)).toBeNull();
    expect(classifySet(withJoker, (c) => c.kind === 'printedJoker')).toBe('sequence');
  });
});

describe('isDublee', () => {
  it('pairs identical cards from different decks', () => {
    expect(isDublee(card('7H'), card('7H#1'))).toBe(true);
    expect(isDublee(card('7H'), card('7S'))).toBe(false);
    expect(isDublee(card('7H'), card('7H'))).toBe(false);
    expect(isDublee(card('JK'), card('JK#1'))).toBe(true);
  });
});
