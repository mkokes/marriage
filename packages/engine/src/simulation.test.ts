import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from './config';
import { applyAction, dealHand, type HandState } from './game';
import { createRng, randomInt, type RngState } from './random';
import { testKey } from './test/helpers';

/** Plays random legal stock-draw/discard turns and checks invariants after every action. */
function playRandomly(state: HandState, seed: number, maxTurns: number): HandState {
  let s = state;
  let r: RngState = createRng(testKey(seed + 1000));
  const total = cardCount(s);
  for (let turn = 0; turn < maxTurns && s.phase !== 'over'; turn++) {
    const playerId = s.players[s.turn]!.id;
    let result = applyAction(s, { type: 'drawStock', playerId });
    if (!result.ok) throw new Error(result.error);
    s = result.state;

    const hand = s.players[s.turn]!.hand;
    const pick = randomInt(hand.length, r);
    r = pick.rng;
    result = applyAction(s, { type: 'discard', playerId, cardId: hand[pick.value]!.id });
    if (!result.ok) throw new Error(result.error);
    s = result.state;

    expect(cardCount(s)).toBe(total);
  }
  return s;
}

function cardCount(s: HandState): number {
  const all = [
    ...s.stock,
    ...s.discardPile,
    ...s.players.flatMap((p) => [...p.hand, ...p.shown.flat()]),
  ];
  expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
  return all.length;
}

describe('random play', () => {
  it.each([2, 3, 4, 5])('%i players: hands run until the stock is exhausted', (players) => {
    for (let seed = 1; seed <= 25; seed++) {
      const state = dealHand({
        playerIds: Array.from({ length: players }, (_, i) => `p${i}`),
        rules: STANDARD_RULES,
        seed: testKey(seed),
      });
      const end = playRandomly(state, seed, 1000);
      expect(end.result).toEqual({ kind: 'void' });
    }
  });

  it('keeps going after reshuffles when configured', () => {
    const state = dealHand({
      playerIds: ['a', 'b', 'c'],
      rules: { ...STANDARD_RULES, stockExhausted: 'reshuffle' },
      seed: testKey(5),
    });
    const end = playRandomly(state, 5, 500);
    expect(end.phase).toBe('draw');
  });
});
