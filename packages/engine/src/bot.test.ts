import { describe, expect, it } from 'vitest';
import { chooseBotAction } from './bot';
import { STANDARD_RULES, type RulesConfig } from './config';
import { applyAction, dealHand, type HandState } from './game';
import { testKey } from './test/helpers';
import { viewFor } from './view';

/** Plays a hand with bots in every seat; throws if a bot ever picks an illegal move. */
function botHand(players: number, seed: number, rules: RulesConfig = STANDARD_RULES): HandState {
  let state = dealHand({
    playerIds: Array.from({ length: players }, (_, i) => `bot${i}`),
    rules,
    seed: testKey(seed),
  });
  for (let step = 0; step < 2000 && state.phase !== 'over'; step++) {
    const view = viewFor(state, state.players[state.turn]!.id);
    const action = chooseBotAction(view);
    const result = applyAction(state, action);
    if (!result.ok) {
      throw new Error(`seed ${seed}: bot chose ${JSON.stringify(action)}: ${result.error}`);
    }
    state = result.state;
  }
  return state;
}

describe('chooseBotAction', () => {
  it('only ever makes legal moves, and bots see and win hands', () => {
    let seen = 0;
    let won = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const end = botHand(2 + (seed % 4), seed);
      expect(end.phase).toBe('over');
      seen += end.players.filter((p) => p.seen !== 'unseen').length;
      if (end.result?.kind === 'won') won++;
    }
    expect(seen).toBeGreaterThan(0);
    expect(won).toBeGreaterThan(0);
  });

  it('copes with other rule sets', () => {
    const variants: Partial<RulesConfig>[] = [
      { discardPickup: 'free' },
      { discardPickup: 'never', dublees: false },
      { seeRequirement: 'pureSequenceOnly', printedJokers: true },
      { jhipluPopluWild: false, stockExhausted: 'reshuffle' },
    ];
    variants.forEach((variant, i) => {
      for (let seed = 1; seed <= 5; seed++) {
        // botHand throws on any illegal move.
        expect(() => botHand(3, 100 * i + seed, { ...STANDARD_RULES, ...variant })).not.toThrow();
      }
    });
  });
});
