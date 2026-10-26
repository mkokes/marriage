import { describe, expect, it } from 'vitest';
import type { RulesConfig } from './config';
import type { HandState } from './game';
import { settle } from './scoring';
import { card, cards, newHand } from './test/helpers';

/**
 * Tiplu 7H. p0 (winner, seen) holds a tiplu (3); p1 (seen) an alter (5);
 * p2 (unseen) a jhiplu (2).
 */
function finishedHand(rules: Partial<RulesConfig> = {}): HandState {
  const state = newHand(rules);
  state.tiplu = card('7H');
  const [p0, p1, p2] = state.players;
  p0!.hand = cards('7H#1 2C');
  p0!.seen = 'seen';
  p1!.hand = cards('7D 2S');
  p1!.seen = 'seen';
  p2!.hand = cards('6H 2D');
  return state;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('settle', () => {
  it('settles maal between all players, then collects penalties for the winner', () => {
    const { maal, net } = settle(finishedHand(), 0, 'sets');
    expect(maal).toEqual([3, 5, 2]);
    // maal × 3 − 10 → [−1, 5, −4]; p1 pays 3 (seen), p2 pays 10 (unseen)
    expect(net).toEqual([12, 2, -14]);
    expect(sum(net)).toBe(0);
  });

  it('kidnap: the winner takes unseen players’ maal', () => {
    const { maal, net } = settle(finishedHand({ kidnap: true }), 0, 'sets');
    expect(maal).toEqual([5, 5, 0]);
    expect(net).toEqual([18, 2, -20]);
  });

  it('murder: unseen players’ maal counts as zero', () => {
    const { maal, net } = settle(finishedHand({ murder: true }), 0, 'sets');
    expect(maal).toEqual([3, 5, 0]);
    expect(net).toEqual([14, 4, -18]);
  });

  it('adds the dublee bonus from every player when finishing with dublees', () => {
    const { net } = settle(finishedHand(), 0, 'dublees');
    expect(net).toEqual([22, -3, -19]);
  });
});
