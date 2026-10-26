import {
  classifySet,
  isDublee,
  PRIMARY_KINDS,
  type Card,
  type IsWild,
  type RulesConfig,
  type SeenStatus,
  type SetKind,
} from '@marriage/engine';

export const SET_NAMES: Record<SetKind, string> = {
  pureSequence: 'Pure sequence',
  tunnela: 'Tunnela',
  trial: 'Trial',
  sequence: 'Sequence',
  dirtyTrial: 'Trial with joker',
};

/** A short name for a group, or null if it isn't a set (or a dublee). */
export function describeGroup(cards: readonly Card[], isWild: IsWild): string | null {
  if (cards.length === 2 && isDublee(cards[0]!, cards[1]!)) return 'Dublee';
  const kind = classifySet(cards, isWild);
  return kind ? SET_NAMES[kind] : null;
}

const ids = (groups: readonly (readonly Card[])[]) => groups.map((g) => g.map((c) => c.id));

/**
 * The groups to show when seeing, if the arrangement (with the discard already
 * removed) holds three primary sets, or seven dublees where allowed.
 */
export function showGroups(groups: readonly Card[][], rules: RulesConfig): string[][] | null {
  const allowed: readonly SetKind[] = PRIMARY_KINDS[rules.seeRequirement];
  const primaries = groups.filter((g) => {
    const kind = classifySet(g);
    return kind !== null && allowed.includes(kind);
  });
  if (primaries.length >= 3) return ids(primaries.slice(0, 3));
  if (!rules.dublees) return null;
  const dublees = groups.filter((g) => g.length === 2 && isDublee(g[0]!, g[1]!));
  return dublees.length >= 7 ? ids(dublees.slice(0, 7)) : null;
}

/** The groups to finish with, if the arrangement (discard removed) is a winning hand. */
export function finishGroups(
  groups: readonly Card[][],
  seen: SeenStatus,
  isWild: IsWild,
): string[][] | null {
  if (seen === 'unseen') return null;
  if (seen === 'seenDublees') {
    const pair = groups.find((g) => g.length === 2 && isDublee(g[0]!, g[1]!));
    return pair ? ids([pair]) : null;
  }
  return groups.length > 0 && groups.every((g) => classifySet(g, isWild)) ? ids(groups) : null;
}
