export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

/** 1 = Ace, 11 = Jack, 12 = Queen, 13 = King. */
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
export type Rank = (typeof RANKS)[number];

export type Card =
  { id: string; kind: 'standard'; suit: Suit; rank: Rank } | { id: string; kind: 'printedJoker' };

/**
 * Builds the unshuffled shoe: `decks` standard 52-card decks, plus two printed
 * jokers per deck when enabled. Card ids are unique across the shoe so that
 * identical cards (e.g. the three 7♥ in a tunnela) can be told apart.
 */
export function buildShoe(decks: number, printedJokers: boolean): Card[] {
  const shoe: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ id: `${d}-${suit}-${rank}`, kind: 'standard', suit, rank });
      }
    }
    if (printedJokers) {
      shoe.push({ id: `${d}-joker-0`, kind: 'printedJoker' });
      shoe.push({ id: `${d}-joker-1`, kind: 'printedJoker' });
    }
  }
  return shoe;
}
