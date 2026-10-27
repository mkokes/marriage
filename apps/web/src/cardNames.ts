import type { Card } from '@marriage/engine';
import type { Messages } from './i18n';

export const SUIT_GLYPH = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' } as const;
const RANK_LABEL: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

/** The rank as printed on the card face; the same in every language. */
export const rankLabel = (rank: number) => RANK_LABEL[rank] ?? String(rank);

/** "Queen of hearts" / "पानको बेगम", or "Joker" for a printed joker. */
export function cardName(card: Card, t: Messages): string {
  if (card.kind === 'printedJoker') return t.cards.joker;
  const rank = t.cards.rank[card.rank] ?? t.format.number(card.rank);
  return t.cards.name(rank, t.cards.suit[card.suit]);
}
