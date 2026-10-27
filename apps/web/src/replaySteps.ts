import { applyAction, dealHand, isAction, type Action, type HandState } from '@marriage/engine';
import type { ReplayRecord } from '@marriage/protocol';
import { cardName } from './cardNames';
import type { Messages } from './i18n';

export interface ReplayStep {
  state: HandState;
  caption: string;
}

/**
 * Rebuilds every step of a finished hand by replaying its actions through the engine
 * from the hand's RNG key. `names` maps player ids to display names.
 */
export function buildReplay(
  record: ReplayRecord,
  names: Record<string, string>,
  t: Messages,
): ReplayStep[] {
  const name = (id: string) => names[id] ?? t.common.formerPlayer;
  let state = dealHand({
    playerIds: record.playerIds,
    rules: record.rules,
    seed: record.key,
    firstPlayer: record.firstPlayer,
  });
  const steps: ReplayStep[] = [
    { state, caption: t.replay.dealt(name(state.players[state.turn]!.id)) },
  ];
  for (const action of record.actions) {
    const result = applyAction(state, action);
    if (!result.ok || !isAction(action)) break;
    steps.push({ state: result.state, caption: describe(state, result.state, action, name, t) });
    state = result.state;
  }
  return steps;
}

function describe(
  before: HandState,
  after: HandState,
  action: Action,
  name: (id: string) => string,
  t: Messages,
): string {
  const r = t.replay;
  const who = name(action.playerId);
  const card = (id: string) => {
    const found = [...before.players.flatMap((p) => p.hand), ...before.discardPile].find(
      (c) => c.id === id,
    );
    return found ? r.theCard(cardName(found, t)) : r.aCard;
  };
  switch (action.type) {
    case 'drawStock':
      return r.drewStock(who);
    case 'drawDiscard':
      return r.tookDiscard(who, card(before.discardPile.at(-1)!.id));
    case 'discard': {
      if (!action.show) return r.discarded(who, card(action.cardId));
      const seen = after.players.find((p) => p.id === action.playerId)!.seen;
      return seen === 'seenDublees'
        ? r.discardedShowedDublees(who, card(action.cardId))
        : r.discardedShowedSets(who, card(action.cardId));
    }
    case 'finish':
      return r.finished(who, card(action.cardId));
    default:
      return r.played(who);
  }
}
