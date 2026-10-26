import { applyAction, chooseBotAction, dealHand, STANDARD_RULES, viewFor } from '@marriage/engine';
import type { ReplayRecord } from '@marriage/protocol';
import { describe, expect, it } from 'vitest';
import { buildReplay } from './replaySteps';

/** Plays a bot hand and records it the way the server does. */
function recordedHand(): { record: ReplayRecord; final: ReturnType<typeof dealHand> } {
  const key = 'ab'.repeat(32);
  const playerIds = ['a', 'b', 'c'];
  let state = dealHand({ playerIds, rules: STANDARD_RULES, seed: key, firstPlayer: 1 });
  const actions: unknown[] = [];
  while (state.phase !== 'over') {
    const action = chooseBotAction(viewFor(state, state.players[state.turn]!.id));
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(result.error);
    actions.push(action);
    state = result.state;
  }
  return {
    record: { handNumber: 1, key, playerIds, rules: STANDARD_RULES, firstPlayer: 1, actions },
    final: state,
  };
}

describe('buildReplay', () => {
  it('rebuilds every step and ends on the real final state', () => {
    const { record, final } = recordedHand();
    const steps = buildReplay(record, { a: 'Asha', b: 'Bikash', c: 'Chandra' });
    expect(steps).toHaveLength(record.actions.length + 1);
    expect(steps.at(-1)!.state).toEqual(final);
    expect(steps[0]!.caption).toBe('Cards dealt. Bikash goes first.');
    expect(steps[1]!.caption).toMatch(
      /^Bikash (drew from the stock|took the .+ from the discard pile)\.$/,
    );
    expect(steps.at(-1)!.caption).toMatch(/finished\.$/);
  });
});
