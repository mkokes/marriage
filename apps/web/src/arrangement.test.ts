import type { Card } from '@marriage/engine';
import { describe, expect, it } from 'vitest';
import { moveCards, reconcile, sortByRank, sortBySuit } from './arrangement';

const c = (id: string, suit: 'clubs' | 'hearts' | 'spades', rank: 1 | 2 | 7 | 13): Card => ({
  id,
  kind: 'standard',
  suit,
  rank,
});
const hand = [
  c('7h', 'hearts', 7),
  c('2c', 'clubs', 2),
  c('7s', 'spades', 7),
  c('ah', 'hearts', 1),
];

describe('arrangement', () => {
  it('sorts by suit into one group per suit', () => {
    expect(sortBySuit(hand)).toEqual([['2c'], ['ah', '7h'], ['7s']]);
  });

  it('sorts by rank into one group per rank', () => {
    expect(sortByRank(hand)).toEqual([['ah'], ['2c'], ['7h', '7s']]);
  });

  it('reconciles with the hand: drops departed cards, adds arrivals as a new group', () => {
    const arranged = [['7h', '7s', 'gone'], ['2c']];
    expect(reconcile(arranged, hand)).toEqual([['7h', '7s'], ['2c'], ['ah']]);
    expect(reconcile([['gone']], [])).toEqual([]);
  });

  it('moves cards between groups and drops emptied groups', () => {
    const arranged = [['7h', '7s'], ['2c'], ['ah']];
    expect(moveCards(arranged, ['2c'], 0)).toEqual([['7h', '7s', '2c'], ['ah']]);
    expect(moveCards(arranged, ['7s', 'ah'], null)).toEqual([['7h'], ['2c'], ['7s', 'ah']]);
  });
});
