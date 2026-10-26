import { sameFace, type Card, type Suit } from './cards';

/**
 * - pureSequence: 3+ consecutive cards of one suit, no wilds. Ace is low (A-2-3) or
 *   high (Q-K-A) but never wraps (K-A-2).
 * - tunnela: three identical cards (same rank and suit).
 * - trial: 3–4 cards of one rank, all different suits.
 * - sequence / dirtyTrial: the same shapes completed with wild cards.
 */
export type SetKind = 'pureSequence' | 'tunnela' | 'trial' | 'sequence' | 'dirtyTrial';

export type IsWild = (card: Card) => boolean;
export const NO_WILDS: IsWild = () => false;

type StandardCard = Extract<Card, { kind: 'standard' }>;

const isStandard = (card: Card): card is StandardCard => card.kind === 'standard';

/**
 * Whether `cards` (all one suit, ranks distinct) fit in a run of `size` consecutive
 * ranks, with the gaps filled by wilds. Tries ace-low and ace-high in turn.
 */
function fitsRun(cards: readonly StandardCard[], size: number): boolean {
  if (size > 13) return false;
  if (cards.length === 0) return true;
  const suit: Suit = cards[0]!.suit;
  if (cards.some((c) => c.suit !== suit)) return false;
  return [false, true].some((aceHigh) => {
    const ranks = cards.map((c) => (aceHigh && c.rank === 1 ? 14 : c.rank));
    if (new Set(ranks).size !== ranks.length) return false;
    return Math.max(...ranks) - Math.min(...ranks) + 1 <= size;
  });
}

function fitsTrial(cards: readonly StandardCard[], size: number): boolean {
  if (size < 3 || size > 4) return false;
  if (cards.length === 0) return true;
  const rank = cards[0]!.rank;
  if (cards.some((c) => c.rank !== rank)) return false;
  return new Set(cards.map((c) => c.suit)).size === cards.length;
}

function classifyNatural(cards: readonly Card[]): SetKind | null {
  if (!cards.every(isStandard)) return null;
  if (cards.length === 3 && cards.every((c) => sameFace(c, cards[0]!))) return 'tunnela';
  if (fitsRun(cards, cards.length)) return 'pureSequence';
  if (fitsTrial(cards, cards.length)) return 'trial';
  return null;
}

/**
 * Classifies a group of cards as a set, or null if it isn't one. Wild cards may stand
 * in for any card; a wild that fits naturally is treated as itself, so a set made only
 * of real cards is always reported by its natural kind.
 */
export function classifySet(cards: readonly Card[], isWild: IsWild = NO_WILDS): SetKind | null {
  if (cards.length < 3) return null;
  const natural = classifyNatural(cards);
  if (natural) return natural;

  const fixed = cards.filter((c) => !isWild(c));
  if (fixed.length === cards.length || !fixed.every(isStandard)) return null;
  if (fitsRun(fixed, cards.length)) return 'sequence';
  if (fitsTrial(fixed, cards.length)) return 'dirtyTrial';
  return null;
}

/** Two identical cards. Wilds never stand in, but two printed jokers do pair up. */
export const isDublee = (a: Card, b: Card): boolean => a.id !== b.id && sameFace(a, b);
