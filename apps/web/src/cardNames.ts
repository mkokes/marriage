import type { Card } from '@marriage/engine';

export const SUIT_GLYPH = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' } as const;
const RANK_LABEL: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
const RANK_NAME: Record<number, string> = { 1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King' };

export const rankLabel = (rank: number) => RANK_LABEL[rank] ?? String(rank);

/** "Queen of hearts", or "Joker" for a printed joker. */
export function cardName(card: Card): string {
  if (card.kind === 'printedJoker') return 'Joker';
  return `${RANK_NAME[card.rank] ?? card.rank} of ${card.suit}`;
}
