import type { Card } from './cards';
import type { RulesConfig } from './config';
import type { HandResult, HandState, PlayerHand, SeenStatus } from './game';

export interface SeatView {
  id: string;
  handCount: number;
  /** Shown sets are face up, so everyone sees them. */
  shown: Card[][];
  seen: SeenStatus;
  /** Only revealed once the hand is over. */
  hand: Card[] | null;
}

/** What one viewer may know about a hand. Never includes the stock order or the seed. */
export interface HandView {
  rules: RulesConfig;
  seats: SeatView[];
  /** The viewer's own seat, or null for spectators. */
  you: (PlayerHand & { seat: number }) | null;
  stockCount: number;
  discardPile: Card[];
  /** Visible to players who have seen, and to everyone once the hand is over. */
  tiplu: Card | null;
  turn: number;
  phase: HandState['phase'];
  pickedFromDiscard: string | null;
  result: HandResult | null;
}

export function viewFor(state: HandState, viewerId: string | null): HandView {
  const over = state.phase === 'over';
  const seat = state.players.findIndex((p) => p.id === viewerId);
  const you = seat === -1 ? null : { ...structuredClone(state.players[seat]!), seat };

  return {
    rules: state.rules,
    seats: state.players.map((p) => ({
      id: p.id,
      handCount: p.hand.length,
      shown: structuredClone(p.shown),
      seen: p.seen,
      hand: over ? structuredClone(p.hand) : null,
    })),
    you,
    stockCount: state.stock.length,
    discardPile: structuredClone(state.discardPile),
    tiplu: over || (you && you.seen !== 'unseen') ? state.tiplu : null,
    turn: state.turn,
    phase: state.phase,
    pickedFromDiscard: state.pickedFromDiscard,
    result: state.result,
  };
}
