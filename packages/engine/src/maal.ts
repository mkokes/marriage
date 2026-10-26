import { isRed, RANKS, type Card, type Rank } from './cards';
import type { RulesConfig } from './config';
import { classifySet, type IsWild } from './sets';

/**
 * A card's role relative to the tiplu:
 * - tiplu: same rank and suit
 * - jhiplu / poplu: one rank below / above, same suit (wrapping, so a tiplu A has a K jhiplu)
 * - alter: same rank, same colour, other suit
 * - ordinaryJoker: same rank, other colour (wild, worth nothing)
 * - man: printed joker
 */
export type MaalRole = 'tiplu' | 'jhiplu' | 'poplu' | 'alter' | 'ordinaryJoker' | 'man';

// RANKS[i] is i + 1, so these step one rank down/up with wraparound (A ↔ K).
const below = (rank: Rank): Rank => RANKS[(rank + 11) % 13]!;
const above = (rank: Rank): Rank => RANKS[rank % 13]!;

export function maalRole(card: Card, tiplu: Card): MaalRole | null {
  if (card.kind === 'printedJoker') return 'man';
  if (tiplu.kind !== 'standard') return null;
  if (card.suit === tiplu.suit) {
    if (card.rank === tiplu.rank) return 'tiplu';
    if (card.rank === below(tiplu.rank)) return 'jhiplu';
    if (card.rank === above(tiplu.rank)) return 'poplu';
    return null;
  }
  if (card.rank !== tiplu.rank) return null;
  return isRed(card.suit) === isRed(tiplu.suit) ? 'alter' : 'ordinaryJoker';
}

export function wildsFor(tiplu: Card, rules: RulesConfig): IsWild {
  return (card) => {
    const role = maalRole(card, tiplu);
    if (role === 'jhiplu' || role === 'poplu') return rules.jhipluPopluWild;
    return role !== null;
  };
}

/**
 * Maal points for one player's cards (hand plus shown sets). Each disjoint
 * jhiplu + tiplu + poplu trio scores `marriage` instead of its three cards' points.
 * Shown tunnelas add `tunnela` each.
 */
export function maalPoints(
  cards: readonly Card[],
  shown: readonly (readonly Card[])[],
  tiplu: Card,
  rules: RulesConfig,
): number {
  const counts: Record<MaalRole, number> = {
    tiplu: 0,
    jhiplu: 0,
    poplu: 0,
    alter: 0,
    ordinaryJoker: 0,
    man: 0,
  };
  for (const card of cards) {
    const role = maalRole(card, tiplu);
    if (role) counts[role]++;
  }

  const { maal } = rules;
  const marriages = maal.marriage > 0 ? Math.min(counts.tiplu, counts.jhiplu, counts.poplu) : 0;
  const tunnelas = shown.filter((group) => classifySet(group) === 'tunnela').length;

  return (
    marriages * maal.marriage +
    (counts.tiplu - marriages) * maal.tiplu +
    (counts.jhiplu - marriages) * maal.jhiplu +
    (counts.poplu - marriages) * maal.poplu +
    counts.alter * maal.alter +
    counts.man * maal.man +
    tunnelas * maal.tunnela
  );
}
