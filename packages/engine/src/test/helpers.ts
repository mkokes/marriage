import { RANKS, type Card, type Rank, type Suit } from '../cards';
import { STANDARD_RULES, type RulesConfig } from '../config';
import { dealHand, type HandState } from '../game';

const SUIT_CODES: Record<string, Suit> = { C: 'clubs', D: 'diamonds', H: 'hearts', S: 'spades' };
const RANK_CODES: Record<string, Rank> = { A: 1, J: 11, Q: 12, K: 13 };

/**
 * Builds a card from a short code: `7H`, `10S`, `AD`, `JK` (printed joker). A `#n`
 * suffix picks the deck copy, e.g. `7H#1`, so ids match those from `buildShoe`.
 */
export function card(code: string): Card {
  const [face, deck = '0'] = code.split('#');
  if (face === 'JK') return { id: `${deck}-joker-0`, kind: 'printedJoker' };
  const suit = SUIT_CODES[face!.slice(-1)];
  const rankCode = face!.slice(0, -1);
  const rank = RANK_CODES[rankCode] ?? RANKS.find((r) => r === Number(rankCode));
  if (!suit || !rank) throw new Error(`Bad card code ${code}`);
  return { id: `${deck}-${suit}-${rank}`, kind: 'standard', suit, rank };
}

export const cards = (codes: string): Card[] => codes.split(/\s+/).filter(Boolean).map(card);
export const ids = (codes: string): string[] => cards(codes).map((c) => c.id);

/** A deterministic RNG key for tests. Real keys come from a CSPRNG. */
export const testKey = (n: number): string => n.toString(16).padStart(64, '0');

export function newHand(rules: Partial<RulesConfig> = {}, players = 3, seed = 1): HandState {
  return dealHand({
    playerIds: Array.from({ length: players }, (_, i) => `p${i}`),
    rules: { ...STANDARD_RULES, ...rules },
    seed: testKey(seed),
  });
}

/** Overwrites a seat's concealed hand. Card conservation is not kept; fine for rule tests. */
export function rig(state: HandState, seat: number, codes: string): HandState {
  state.players[seat]!.hand = cards(codes);
  return state;
}
