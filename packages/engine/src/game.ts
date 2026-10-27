import { buildShoe, type Card } from './cards';
import { MAX_PLAYERS, MIN_PLAYERS, validateRules, type RulesConfig } from './config';
import { ENGINE_ERRORS, type EngineErrorCode } from './errors';
import { wildsFor } from './maal';
import { isRecord } from './guards';
import { createRng, randomInt, shuffle, type RngState } from './random';
import { settle, type Settlement } from './scoring';
import { classifySet, isDublee, NO_WILDS, type SetKind } from './sets';

export const HAND_SIZE = 21;

/** `seen` showed three primary sets; `seenDublees` showed seven dublees. */
export type SeenStatus = 'unseen' | 'seen' | 'seenDublees';

export interface PlayerHand {
  id: string;
  /** Concealed cards. Sets shown when seeing move out of here into `shown`. */
  hand: Card[];
  shown: Card[][];
  seen: SeenStatus;
}

export type HandResult =
  | { kind: 'void' }
  | { kind: 'won'; winner: number; method: 'sets' | 'dublees'; settlement: Settlement };

export interface HandState {
  rules: RulesConfig;
  players: PlayerHand[];
  /** Face down; the top card is the last element. */
  stock: Card[];
  /** Face up; the top card is the last element. */
  discardPile: Card[];
  /** Chosen by the first player to see, and moved to the bottom of the stock. */
  tiplu: Card | null;
  /** Seat index of the player to act. */
  turn: number;
  phase: 'draw' | 'discard' | 'over';
  /** The card taken from the discard pile this turn; it can't be discarded straight back. */
  pickedFromDiscard: string | null;
  /** Secret: decides every hidden card. Never send it to clients before the hand is over. */
  rng: RngState;
  result: HandResult | null;
}

/** Card ids grouped into sets. */
export type Groups = readonly (readonly string[])[];

export type Action =
  | { type: 'drawStock'; playerId: string }
  /** `withCards`: the hand cards the discard completes a set (or dublee) with. */
  | { type: 'drawDiscard'; playerId: string; withCards?: string[] }
  /**
   * Ends the turn. `show` sees at the same time: three primary sets or seven dublees.
   * The first player to see picks the tiplu by stock position (random if omitted).
   */
  | {
      type: 'discard';
      playerId: string;
      cardId: string;
      show?: { groups: Groups; tipluPick?: number };
    }
  /** Discards and ends the hand. `groups` must cover every remaining concealed card. */
  | { type: 'finish'; playerId: string; cardId: string; groups: Groups };

/** On failure, `code` identifies the problem for translation; `error` is its English text. */
export type ActionResult =
  | { ok: true; state: HandState }
  | { ok: false; error: string; code: EngineErrorCode };

// Bounds for client-supplied arrays; generous for real play, small enough to stay cheap.
const MAX_ID_LENGTH = 64;
const MAX_GROUPS = 22;

const isId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH;

const isIdList = (value: unknown, max: number): value is string[] =>
  Array.isArray(value) && value.length <= max && value.every(isId);

const isGroups = (value: unknown): value is Groups =>
  Array.isArray(value) &&
  value.length <= MAX_GROUPS &&
  value.every((group) => isIdList(group, MAX_GROUPS));

/**
 * Runtime check of an action's shape, for input that arrives over the network.
 * applyAction calls it too, so malformed input yields `{ ok: false }`, never a throw.
 */
export function isAction(value: unknown): value is Action {
  if (!isRecord(value)) return false;
  const a = value;
  if (!isId(a.playerId)) return false;
  switch (a.type) {
    case 'drawStock':
      return true;
    case 'drawDiscard':
      return a.withCards === undefined || isIdList(a.withCards, 4);
    case 'discard': {
      if (!isId(a.cardId)) return false;
      if (a.show === undefined) return true;
      const show = a.show;
      if (!isRecord(show)) return false;
      return (
        isGroups(show.groups) && (show.tipluPick === undefined || Number.isInteger(show.tipluPick))
      );
    }
    case 'finish':
      return isId(a.cardId) && isGroups(a.groups);
    default:
      return false;
  }
}

class RuleError extends Error {
  constructor(readonly code: EngineErrorCode) {
    super(ENGINE_ERRORS[code]);
  }
}

const fail = (code: EngineErrorCode): never => {
  throw new RuleError(code);
};

export interface DealOptions {
  playerIds: string[];
  rules: RulesConfig;
  /** 256-bit key as 64 hex chars, from a CSPRNG (e.g. crypto.getRandomValues). */
  seed: string;
  /** Seat that takes the first turn. */
  firstPlayer?: number;
}

export function dealHand({ playerIds, rules, seed, firstPlayer = 0 }: DealOptions): HandState {
  if (playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) {
    throw new RangeError(`A hand needs ${MIN_PLAYERS}–${MAX_PLAYERS} players`);
  }
  if (new Set(playerIds).size !== playerIds.length) throw new RangeError('Duplicate player id');
  const problems = validateRules(rules);
  if (problems.length > 0) throw new RangeError(`Invalid rules: ${problems.join('; ')}`);

  const shuffled = shuffle(buildShoe(rules.decks, rules.printedJokers), createRng(seed));
  const stock = shuffled.items;
  const players = playerIds.map((id) => ({
    id,
    hand: stock.splice(stock.length - HAND_SIZE),
    shown: [],
    seen: 'unseen' as const,
  }));
  const offered = stock.pop()!;

  return {
    rules,
    players,
    stock,
    discardPile: [offered],
    tiplu: null,
    turn: firstPlayer % playerIds.length,
    phase: 'draw',
    pickedFromDiscard: null,
    rng: shuffled.rng,
    result: null,
  };
}

/**
 * Applies an action, returning a new state; the input state is never mutated. Takes
 * `unknown` because actions come from clients: malformed input is rejected, not thrown.
 */
export function applyAction(state: HandState, action: unknown): ActionResult {
  if (!isAction(action)) {
    return { ok: false, error: ENGINE_ERRORS.malformedAction, code: 'malformedAction' };
  }
  try {
    const next = structuredClone(state);
    apply(next, action);
    return { ok: true, state: next };
  } catch (error) {
    if (error instanceof RuleError) return { ok: false, error: error.message, code: error.code };
    throw error;
  }
}

function apply(state: HandState, action: Action): void {
  if (state.phase === 'over') fail('handOver');
  const player = state.players[state.turn]!;
  if (player.id !== action.playerId) fail('notYourTurn');

  switch (action.type) {
    case 'drawStock': {
      if (state.phase !== 'draw') fail('alreadyDrawn');
      player.hand.push(state.stock.pop() ?? fail('stockEmpty'));
      state.phase = 'discard';
      return;
    }
    case 'drawDiscard': {
      if (state.phase !== 'draw') fail('alreadyDrawn');
      const top = state.discardPile.at(-1) ?? fail('discardEmpty');
      checkDiscardPickup(state, player, top, action.withCards ?? []);
      player.hand.push(state.discardPile.pop()!);
      state.pickedFromDiscard = top.id;
      state.phase = 'discard';
      return;
    }
    case 'discard': {
      discard(state, player, action.cardId);
      if (action.show) see(state, player, action.show.groups, action.show.tipluPick);
      endTurn(state);
      return;
    }
    case 'finish': {
      discard(state, player, action.cardId);
      const method = checkFinish(state, player, action.groups);
      state.phase = 'over';
      state.result = {
        kind: 'won',
        winner: state.turn,
        method,
        settlement: settle(state, state.turn, method),
      };
      return;
    }
  }
}

function discard(state: HandState, player: PlayerHand, cardId: string): void {
  if (state.phase !== 'discard') fail('drawFirst');
  if (cardId === state.pickedFromDiscard) fail('cantDiscardPickup');
  const [card] = takeCards(player, [cardId]);
  state.discardPile.push(card!);
}

/** Removes the given cards from the player's concealed hand, in order. */
function takeCards(player: PlayerHand, ids: readonly string[]): Card[] {
  if (new Set(ids).size !== ids.length) fail('cardUsedTwice');
  return ids.map((id) => {
    const index = player.hand.findIndex((c) => c.id === id);
    if (index === -1) fail('cardNotInHand');
    return player.hand.splice(index, 1)[0]!;
  });
}

function wildsForPlayer(state: HandState, player: PlayerHand) {
  return player.seen !== 'unseen' && state.tiplu ? wildsFor(state.tiplu, state.rules) : NO_WILDS;
}

function checkDiscardPickup(
  state: HandState,
  player: PlayerHand,
  top: Card,
  withIds: readonly string[],
): void {
  const { discardPickup } = state.rules;
  if (discardPickup === 'free') return;
  if (discardPickup === 'never') fail('pickupNotAllowed');

  const others = takeCards(structuredClone(player), withIds);
  if (player.seen === 'seenDublees') {
    if (others.length === 1 && isDublee(top, others[0]!)) return;
    fail('pickupDubleeOnly');
  }
  if (others.length >= 2 && classifySet([top, ...others], wildsForPlayer(state, player))) return;
  fail('pickupMustCompleteSet');
}

/** Set kinds that count toward seeing, per `seeRequirement`. */
export const PRIMARY_KINDS: Record<RulesConfig['seeRequirement'], readonly SetKind[]> = {
  pureSequenceOrTunnela: ['pureSequence', 'tunnela'],
  pureSequenceOnly: ['pureSequence'],
};

function see(state: HandState, player: PlayerHand, groups: Groups, tipluPick?: number): void {
  if (player.seen !== 'unseen') fail('alreadySeen');

  // Failing is safe mid-way: applyAction works on a copy that is dropped on error.
  const cardGroups = groups.map((ids) => takeCards(player, ids));
  const allowed = PRIMARY_KINDS[state.rules.seeRequirement];

  if (cardGroups.length === 3 && cardGroups.every((g) => allowed.includes(classifySet(g)!))) {
    player.seen = 'seen';
  } else if (
    state.rules.dublees &&
    cardGroups.length === 7 &&
    cardGroups.every((g) => g.length === 2 && isDublee(g[0]!, g[1]!))
  ) {
    player.seen = 'seenDublees';
  } else {
    const pureOnly = state.rules.seeRequirement === 'pureSequenceOnly';
    if (state.rules.dublees) fail(pureOnly ? 'seePureOrDublees' : 'seeSetsOrDublees');
    fail(pureOnly ? 'seePure' : 'seeSets');
  }
  player.shown = cardGroups;
  if (!state.tiplu) chooseTiplu(state, tipluPick);
}

/** Moves the chosen stock card to the bottom of the stock and makes it the tiplu. */
function chooseTiplu(state: HandState, pick?: number): void {
  if (state.stock.length === 0) {
    // Only possible when the last stock card was just drawn; the hand ends at endTurn anyway.
    const r = randomInt(state.discardPile.length, state.rng);
    state.rng = r.rng;
    state.tiplu = state.discardPile[r.value]!;
    return;
  }
  let index = pick;
  if (index === undefined) {
    const r = randomInt(state.stock.length, state.rng);
    state.rng = r.rng;
    index = r.value;
  }
  if (!Number.isInteger(index) || index < 0 || index >= state.stock.length) {
    fail('pickFromStock');
  }
  const [tiplu] = state.stock.splice(index, 1);
  state.stock.unshift(tiplu!);
  state.tiplu = tiplu!;
}

function checkFinish(state: HandState, player: PlayerHand, groups: Groups): 'sets' | 'dublees' {
  if (player.seen === 'unseen') fail('mustSeeFirst');
  const hand = structuredClone(player);

  if (player.seen === 'seenDublees') {
    // The eighth dublee ends the game; the remaining cards don't need to form sets.
    const [a, b, extra] = groups.length === 1 ? takeCards(hand, groups[0]!) : [];
    if (!a || !b || extra || !isDublee(a, b)) fail('needEighthDublee');
    return 'dublees';
  }

  const covered = groups.flat();
  if (covered.length !== player.hand.length || new Set(covered).size !== covered.length) {
    fail('everyCardInOneSet');
  }
  const cardGroups = groups.map((ids) => takeCards(hand, ids));
  const isWild = wildsForPlayer(state, player);
  const invalid = cardGroups.find((g) => !classifySet(g, isWild));
  if (invalid) fail('invalidSet');
  return 'sets';
}

function endTurn(state: HandState): void {
  state.turn = (state.turn + 1) % state.players.length;
  state.phase = 'draw';
  state.pickedFromDiscard = null;
  if (state.stock.length > 0) return;

  if (state.rules.stockExhausted === 'reshuffle' && state.discardPile.length > 1) {
    const top = state.discardPile.pop()!;
    const reshuffled = shuffle(state.discardPile, state.rng);
    state.stock = reshuffled.items;
    state.rng = reshuffled.rng;
    state.discardPile = [top];
  } else {
    state.phase = 'over';
    state.result = { kind: 'void' };
  }
}
