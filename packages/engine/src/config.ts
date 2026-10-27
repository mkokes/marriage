import { isRecord } from './guards';

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

/** Upper bounds keep host-supplied values sane; real tables sit far below them. */
const MAX_POINTS = 1000;
const MAX_TIMER_SECONDS = 600;

const ENUMS = {
  seeRequirement: ['pureSequenceOrTunnela', 'pureSequenceOnly'],
  discardPickup: ['completeSet', 'free', 'never'],
  stockExhausted: ['void', 'reshuffle'],
} as const;

const BOOLEANS = ['printedJokers', 'dublees', 'jhipluPopluWild', 'kidnap', 'murder'] as const;

/** One problem with a rules config, structured so apps can translate it. */
export type RuleProblem =
  | { kind: 'notObject' }
  | { kind: 'decks' }
  | { kind: 'boolean'; field: string }
  | { kind: 'choice'; field: string; choices: readonly string[] }
  | { kind: 'amount'; field: string; max: number }
  | { kind: 'kidnapAndMurder' };

/**
 * Every problem with a config; empty when valid. Checks every field at runtime,
 * since rules arrive from the table host over the network.
 */
export function ruleProblems(rules: unknown): RuleProblem[] {
  if (!isRecord(rules)) return [{ kind: 'notObject' }];
  const r = rules;
  const problems: RuleProblem[] = [];

  const amount = (field: string, value: unknown, max: number) => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > max) {
      problems.push({ kind: 'amount', field, max });
    }
  };

  if (r.decks !== 3 && r.decks !== 4) problems.push({ kind: 'decks' });
  for (const field of BOOLEANS) {
    if (typeof r[field] !== 'boolean') problems.push({ kind: 'boolean', field });
  }
  for (const [field, choices] of Object.entries(ENUMS)) {
    if (!(choices as readonly unknown[]).includes(r[field])) {
      problems.push({ kind: 'choice', field, choices });
    }
  }

  const maal = r.maal;
  if (!isRecord(maal)) {
    problems.push({ kind: 'amount', field: 'maal', max: MAX_POINTS });
  } else {
    const keys: (keyof MaalValues)[] = [
      'tiplu',
      'jhiplu',
      'poplu',
      'alter',
      'man',
      'marriage',
      'tunnela',
    ];
    for (const key of keys) amount(`maal.${key}`, maal[key], MAX_POINTS);
  }
  amount('unseenPenalty', r.unseenPenalty, MAX_POINTS);
  amount('seenPenalty', r.seenPenalty, MAX_POINTS);
  amount('dubleeFinishBonus', r.dubleeFinishBonus, MAX_POINTS);
  amount('turnTimerSeconds', r.turnTimerSeconds, MAX_TIMER_SECONDS);

  if (r.kidnap === true && r.murder === true) problems.push({ kind: 'kidnapAndMurder' });
  return problems;
}

/** A rule problem in English. */
export function describeRuleProblem(problem: RuleProblem): string {
  switch (problem.kind) {
    case 'notObject':
      return 'rules must be an object';
    case 'decks':
      return 'decks must be 3 or 4';
    case 'boolean':
      return `${problem.field} must be true or false`;
    case 'choice':
      return `${problem.field} must be one of ${problem.choices.join(', ')}`;
    case 'amount':
      return problem.field === 'maal'
        ? 'maal must be an object'
        : `${problem.field} must be a whole number from 0 to ${problem.max}`;
    default:
      return 'kidnap and murder cannot both be on';
  }
}

/** Human-readable (English) problems with a config; empty when valid. */
export function validateRules(rules: unknown): string[] {
  return ruleProblems(rules).map(describeRuleProblem);
}

export const isRulesConfig = (value: unknown): value is RulesConfig =>
  validateRules(value).length === 0;
