/** Points per maal card held. A value of 0 means that card is not maal at this table. */
export interface MaalValues {
  tiplu: number;
  jhiplu: number;
  poplu: number;
  alter: number;
  /** Printed joker; only present when `printedJokers` is on. */
  man: number;
  /** Jhiplu + tiplu + poplu held together; replaces the three cards' individual points. */
  marriage: number;
  /** Per tunnela shown as one of a player's three primary sets. */
  tunnela: number;
}

export interface RulesConfig {
  decks: 3 | 4;
  printedJokers: boolean;
  /** Which sets may be shown to become seen (besides 7 dublees, when enabled). */
  seeRequirement: 'pureSequenceOrTunnela' | 'pureSequenceOnly';
  /** Allow seeing with 7 dublees and finishing with an 8th. */
  dublees: boolean;
  /** `completeSet`: the top discard may only be taken if it completes a set with cards in hand. */
  discardPickup: 'completeSet' | 'free' | 'never';
  /** Whether jhiplu and poplu are wild (cards of the tiplu's rank and printed jokers always are). */
  jhipluPopluWild: boolean;
  maal: MaalValues;
  /** Paid to the winner by each player who had not seen. */
  unseenPenalty: number;
  /** Paid to the winner by each player who had seen. */
  seenPenalty: number;
  /** Extra paid to the winner by every other player when they finish with dublees. */
  dubleeFinishBonus: number;
  /** Unseen players' maal is taken by the winner. */
  kidnap: boolean;
  /** Unseen players' maal counts as zero. */
  murder: boolean;
  /** 0 disables the timer. Enforced by the server, not the engine. */
  turnTimerSeconds: number;
  /** When the stock runs out: void the hand, or reshuffle the discard pile into a new stock. */
  stockExhausted: 'void' | 'reshuffle';
}

export const STANDARD_RULES: RulesConfig = {
  decks: 3,
  printedJokers: false,
  seeRequirement: 'pureSequenceOrTunnela',
  dublees: true,
  discardPickup: 'completeSet',
  jhipluPopluWild: true,
  maal: { tiplu: 3, jhiplu: 2, poplu: 2, alter: 5, man: 5, marriage: 10, tunnela: 5 },
  unseenPenalty: 10,
  seenPenalty: 3,
  dubleeFinishBonus: 5,
  kidnap: false,
  murder: false,
  turnTimerSeconds: 60,
  stockExhausted: 'void',
};

export const PRESETS = { standard: STANDARD_RULES } as const satisfies Record<string, RulesConfig>;
export type PresetName = keyof typeof PRESETS;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 5;

/** Returns human-readable problems with a config; empty when valid. */
export function validateRules(rules: RulesConfig): string[] {
  const errors: string[] = [];
  const amounts: Record<string, number> = {
    ...rules.maal,
    unseenPenalty: rules.unseenPenalty,
    seenPenalty: rules.seenPenalty,
    dubleeFinishBonus: rules.dubleeFinishBonus,
    turnTimerSeconds: rules.turnTimerSeconds,
  };
  for (const [name, value] of Object.entries(amounts)) {
    if (!Number.isInteger(value) || value < 0) errors.push(`${name} must be a whole number ≥ 0`);
  }
  if (rules.kidnap && rules.murder) errors.push('kidnap and murder cannot both be on');
  return errors;
}
