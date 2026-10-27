import { RANKS, STANDARD_RULES, type Card, type Rank, type Suit } from '@marriage/engine';
import { describe, expect, it } from 'vitest';
import { describeGroup, finishGroups, showGroups } from './moves';

let n = 0;
const card = (rank: Rank, suit: Suit): Card => ({ id: `${n++}`, kind: 'standard', suit, rank });
/** Three consecutive cards of one suit, starting at `from`. */
const run = (suit: Suit, from: Rank) => RANKS.slice(from - 1, from + 2).map((r) => card(r, suit));
const noWilds = () => false;
const sevensWild = (c: Card) => c.kind === 'standard' && c.rank === 7;

describe('describeGroup', () => {
  it('names sets and dublees', () => {
    expect(describeGroup(run('hearts', 2), noWilds)).toBe('pureSequence');
    expect(describeGroup([card(5, 'clubs'), card(5, 'clubs')], noWilds)).toBe('dublee');
    expect(describeGroup([card(2, 'clubs'), card(9, 'clubs')], noWilds)).toBeNull();
  });
});

describe('showGroups', () => {
  it('needs three primary sets', () => {
    const groups = [run('hearts', 2), run('clubs', 5), [card(9, 'spades')]];
    expect(showGroups(groups, STANDARD_RULES)).toBeNull();
    const three = [...groups, run('spades', 10)];
    expect(showGroups(three, STANDARD_RULES)).toHaveLength(3);
  });
});

describe('finishGroups', () => {
  it('needs every group to be a set, wilds allowed', () => {
    const groups = [run('hearts', 2), [card(9, 'clubs'), card(7, 'spades'), card(11, 'clubs')]];
    expect(finishGroups(groups, 'seen', noWilds)).toBeNull();
    expect(finishGroups(groups, 'seen', sevensWild)).toHaveLength(2);
    expect(finishGroups(groups, 'unseen', sevensWild)).toBeNull();
  });
});
