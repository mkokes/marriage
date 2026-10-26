import { applyAction, dealHand, isAction, type Action, type HandState } from '@marriage/engine';
import type { ReplayRecord } from '@marriage/protocol';
import { cardName } from './cardNames';

export interface ReplayStep {
  state: HandState;
  caption: string;
}

/**
 * Rebuilds every step of a finished hand by replaying its actions through the engine
 * from the hand's RNG key. `names` maps player ids to display names.
 */
export function buildReplay(record: ReplayRecord, names: Record<string, string>): ReplayStep[] {
  const name = (id: string) => names[id] ?? 'A former player';
  let state = dealHand({
    playerIds: record.playerIds,
    rules: record.rules,
    seed: record.key,
    firstPlayer: record.firstPlayer,
  });
  const steps: ReplayStep[] = [
    { state, caption: `Cards dealt. ${name(state.players[state.turn]!.id)} goes first.` },
  ];
  for (const action of record.actions) {
    const result = applyAction(state, action);
    if (!result.ok || !isAction(action)) break;
    steps.push({ state: result.state, caption: describe(state, result.state, action, name) });
    state = result.state;
  }
  return steps;
}

function describe(
  before: HandState,
  after: HandState,
  action: Action,
  name: (id: string) => string,
): string {
  const who = name(action.playerId);
  const card = (id: string) => {
    const found = [...before.players.flatMap((p) => p.hand), ...before.discardPile].find(
      (c) => c.id === id,
    );
    return found ? `the ${cardName(found).toLowerCase()}` : 'a card';
  };
  switch (action.type) {
    case 'drawStock':
      return `${who} drew from the stock.`;
    case 'drawDiscard':
      return `${who} took ${card(before.discardPile.at(-1)!.id)} from the discard pile.`;
    case 'discard': {
      if (!action.show) return `${who} discarded ${card(action.cardId)}.`;
      const seen = after.players.find((p) => p.id === action.playerId)!.seen;
      return `${who} discarded ${card(action.cardId)} and showed ${seen === 'seenDublees' ? 'seven dublees' : 'three sets'}.`;
    }
    case 'finish':
      return `${who} discarded ${card(action.cardId)} and finished.`;
    default:
      return `${who} played.`;
  }
}
