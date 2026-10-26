import { RANKS, SUITS, type Card } from '@marriage/engine';

/**
 * How a player has arranged their concealed hand: groups of card ids, left to right.
 * Purely local to the device; the server only sees groups when showing or finishing.
 */
export type Arrangement = string[][];

/** Drops cards that left the hand and puts newly arrived cards in a group of their own. */
export function reconcile(arrangement: Arrangement, hand: readonly Card[]): Arrangement {
  const inHand = new Set(hand.map((c) => c.id));
  const kept = arrangement.map((g) => g.filter((id) => inHand.has(id))).filter((g) => g.length);
  const placed = new Set(kept.flat());
  const arrived = hand.filter((c) => !placed.has(c.id)).map((c) => c.id);
  return arrived.length ? [...kept, arrived] : kept;
}

const suitOrder = (c: Card) => (c.kind === 'standard' ? SUITS.indexOf(c.suit) : SUITS.length);
const rankOrder = (c: Card) => (c.kind === 'standard' ? RANKS.indexOf(c.rank) : RANKS.length);

/** One group per suit, each in rank order; printed jokers last. */
export function sortBySuit(hand: readonly Card[]): Arrangement {
  const sorted = hand.toSorted(
    (a, b) => suitOrder(a) - suitOrder(b) || rankOrder(a) - rankOrder(b),
  );
  return groupBy(sorted, suitOrder);
}

/** One group per rank, in rank order; printed jokers last. */
export function sortByRank(hand: readonly Card[]): Arrangement {
  const sorted = hand.toSorted(
    (a, b) => rankOrder(a) - rankOrder(b) || suitOrder(a) - suitOrder(b),
  );
  return groupBy(sorted, rankOrder);
}

function groupBy(cards: readonly Card[], key: (c: Card) => number): Arrangement {
  const groups: Arrangement = [];
  let last: number | null = null;
  for (const card of cards) {
    if (key(card) !== last) groups.push([]);
    groups.at(-1)!.push(card.id);
    last = key(card);
  }
  return groups;
}

/** Moves cards into group `target` (or a new group at the end when null). */
export function moveCards(
  arrangement: Arrangement,
  ids: readonly string[],
  target: number | null,
): Arrangement {
  const moving = new Set(ids);
  const groups = arrangement.map((g) => g.filter((id) => !moving.has(id)));
  if (target === null) groups.push([...ids]);
  else groups[target]?.push(...ids);
  return groups.filter((g) => g.length);
}
