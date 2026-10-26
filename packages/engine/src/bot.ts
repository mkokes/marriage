import { sameFace, type Card } from './cards';
import { PRIMARY_KINDS, type Action } from './game';
import { wildsFor } from './maal';
import { classifySet, isDublee, NO_WILDS, type IsWild, type SetKind } from './sets';
import type { HandView } from './view';

/**
 * A simple bot. It decides only from its own redacted view, so it knows exactly
 * what a human in its seat would know. Strategy: take the discard when it completes a
 * set, show as soon as it can, finish when its hand splits into sets, and otherwise
 * discard the card least connected to the rest of its hand.
 */
export function chooseBotAction(view: HandView): Action {
  const you = view.you;
  if (!you || view.turn !== you.seat || view.phase === 'over') {
    throw new Error('chooseBotAction called when it is not the bot’s turn');
  }
  const playerId = you.id;
  const isWild = you.seen !== 'unseen' && view.tiplu ? wildsFor(view.tiplu, view.rules) : NO_WILDS;

  if (view.phase === 'draw') {
    const withCards = discardPartners(view, isWild);
    return withCards
      ? { type: 'drawDiscard', playerId, withCards }
      : { type: 'drawStock', playerId };
  }

  // Any card may be discarded except the one just taken from the discard pile.
  const discardable = (cards: readonly Card[]) =>
    cards.filter((c) => c.id !== view.pickedFromDiscard);
  const worst = (cards: readonly Card[]) => byUselessness(discardable(cards), you.hand, isWild)[0];
  const outside = (groups: Card[][]) => you.hand.filter((c) => !groups.some((g) => g.includes(c)));

  if (you.seen === 'unseen') {
    const allowed = PRIMARY_KINDS[view.rules.seeRequirement];
    const primaries = greedySets(you.hand, NO_WILDS, (kind) => allowed.includes(kind)).slice(0, 3);
    const discard = worst(outside(primaries));
    if (primaries.length === 3 && discard) return discardAndShow(playerId, discard, primaries);
    if (view.rules.dublees) {
      const pairs = dublees(you.hand).slice(0, 7);
      const spare = worst(outside(pairs));
      if (pairs.length === 7 && spare) return discardAndShow(playerId, spare, pairs);
    }
  }

  if (you.seen === 'seenDublees') {
    const pair = dublees(you.hand)[0];
    const discard = pair && worst(outside([pair]));
    if (pair && discard) {
      return { type: 'finish', playerId, cardId: discard.id, groups: [ids(pair)] };
    }
  }

  if (you.seen === 'seen') {
    for (const discard of discardable(you.hand)) {
      const rest = you.hand.filter((c) => c !== discard);
      const groups = partition(rest, isWild);
      if (groups) {
        return { type: 'finish', playerId, cardId: discard.id, groups: groups.map(ids) };
      }
    }
  }

  const discard = worst(you.hand) ?? you.hand[0]!;
  return { type: 'discard', playerId, cardId: discard.id };
}

const ids = (cards: readonly Card[]) => cards.map((c) => c.id);

function discardAndShow(playerId: string, discard: Card, groups: Card[][]): Action {
  return { type: 'discard', playerId, cardId: discard.id, show: { groups: groups.map(ids) } };
}

/** The hand cards the top discard would complete a set (or dublee) with, if any. */
function discardPartners(view: HandView, isWild: IsWild): string[] | null {
  const top = view.discardPile.at(-1);
  const hand = view.you!.hand;
  if (!top || view.rules.discardPickup === 'never') return null;
  if (isWild(top)) return null; // Leave jokers alone: the pickup rules for them vary.

  if (view.you!.seen === 'seenDublees') {
    const twin = hand.find((c) => isDublee(c, top));
    return twin ? [twin.id] : null;
  }
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      const pair = [hand[i]!, hand[j]!];
      if (pair.some(isWild)) continue;
      if (classifySet([top, ...pair], NO_WILDS)) return ids(pair);
    }
  }
  return null;
}

/**
 * Picks disjoint 3-card sets greedily: first natural ones, then (if `isWild` allows)
 * ones completed with jokers.
 */
function greedySets(
  cards: readonly Card[],
  isWild: IsWild,
  accept: (kind: SetKind) => boolean = () => true,
): Card[][] {
  const left = [...cards];
  const found: Card[][] = [];
  for (const wilds of isWild === NO_WILDS ? [NO_WILDS] : [NO_WILDS, isWild]) {
    let triple = findTriple(left, wilds, accept);
    while (triple) {
      found.push(triple);
      for (const card of triple) left.splice(left.indexOf(card), 1);
      triple = findTriple(left, wilds, accept);
    }
  }
  return found;
}

function findTriple(
  cards: readonly Card[],
  isWild: IsWild,
  accept: (kind: SetKind) => boolean,
): Card[] | null {
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      for (let k = j + 1; k < cards.length; k++) {
        const group = [cards[i]!, cards[j]!, cards[k]!];
        const kind = classifySet(group, isWild);
        if (kind && accept(kind)) return group;
      }
    }
  }
  return null;
}

/** Splits every card into 3-card sets, or returns null if the greedy search can't. */
function partition(cards: readonly Card[], isWild: IsWild): Card[][] | null {
  if (cards.length % 3 !== 0) return null;
  const groups = greedySets(cards, isWild);
  return groups.length * 3 === cards.length ? groups : null;
}

function dublees(cards: readonly Card[]): Card[][] {
  const left = [...cards];
  const pairs: Card[][] = [];
  while (left.length > 1) {
    const card = left.shift()!;
    const twin = left.findIndex((c) => isDublee(card, c));
    if (twin !== -1) pairs.push([card, ...left.splice(twin, 1)]);
  }
  return pairs;
}

/**
 * Candidates for discarding, most useless first. A card is useful when it's wild, or
 * when other cards in the hand share its rank or sit near it in its suit.
 */
function byUselessness(candidates: readonly Card[], hand: readonly Card[], isWild: IsWild): Card[] {
  const score = (card: Card): number => {
    if (isWild(card) || card.kind === 'printedJoker') return 100;
    let s = 0;
    for (const other of hand) {
      if (other === card || other.kind !== 'standard') continue;
      if (sameFace(other, card)) s += 3;
      else if (other.rank === card.rank) s += 2;
      else if (other.suit === card.suit && Math.abs(other.rank - card.rank) <= 2) s += 2;
    }
    return s;
  };
  return candidates.toSorted((a, b) => score(a) - score(b));
}
