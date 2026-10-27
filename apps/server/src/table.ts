import {
  applyAction,
  chooseBotAction,
  dealHand,
  ENGINE_ERRORS,
  isRecord,
  isRulesConfig,
  MAX_PLAYERS,
  MIN_PLAYERS,
  STANDARD_RULES,
  viewFor,
  type HandState,
  type RulesConfig,
} from '@marriage/engine';
import {
  CHAT_HISTORY,
  TABLE_ERRORS,
  type ErrorCode,
  type TableErrorCode,
  type ChatMessage,
  type ClientMessage,
  type HandSummary,
  type Reaction,
  type ReplayRecord,
  type TableStatus,
  type TableView,
} from '@marriage/protocol';

export type { ReplayRecord };

/** How long a bot "thinks" before playing its turn. */
export const BOT_DELAY_MS = 900;
const BOT_NAMES = ['Hari', 'Sita', 'Gopal', 'Maya', 'Bishnu', 'Kamala'];

/**
 * Pure table logic: seats, host, rules, hands, scores and the turn timer. The Durable
 * Object wraps it with connections, storage and alarms. Players are identified by a
 * `credential` (a hash of their device token) that never leaves the server; everyone
 * else sees only their public `playerId`.
 */
export interface SeatState {
  playerId: string;
  name: string;
  /** For bots, `bot:<playerId>`; it can never equal a token hash. */
  credential: string;
  isBot: boolean;
}

export interface TableState {
  status: TableStatus;
  hostId: string | null;
  seats: SeatState[];
  rules: RulesConfig;
  handNumber: number;
  scores: Record<string, number>;
  history: HandSummary[];
  /** Every player's latest name, kept after they leave so history stays readable. */
  names: Record<string, string>;
  chat: ChatMessage[];
  hand: HandState | null;
  /** The current hand's seating and accepted actions, for its replay. */
  handLog: Omit<ReplayRecord, 'key'> | null;
  turnDeadline: number | null;
  /** When the bot whose turn it is should play. */
  botDueAt: number | null;
  /** While locked, nobody new can take a seat. */
  locked: boolean;
  /** Credentials of people the host removed; they can't sit here again. Server-only. */
  banned: string[];
}

export interface TableDeps {
  now(): number;
  /** A 256-bit RNG key from a CSPRNG, as 64 hex chars. */
  newKey(): string;
  /** A fresh public player id. */
  newId(): string;
}

export type Outcome =
  | {
      ok: true;
      table: TableState;
      /** Set when a hand just ended: its replay, to store. */
      finished?: ReplayRecord;
      /** Set for a reaction: broadcast it, don't store it. */
      reaction?: { playerId: string; emoji: Reaction };
    }
  | { ok: false; error: string; code: ErrorCode };

export function newTable(): TableState {
  return {
    status: 'new',
    hostId: null,
    seats: [],
    rules: structuredClone(STANDARD_RULES),
    handNumber: 0,
    scores: {},
    history: [],
    names: {},
    chat: [],
    hand: null,
    handLog: null,
    turnDeadline: null,
    botDueAt: null,
    locked: false,
    banned: [],
  };
}

export const seatOf = (table: TableState, credential: string): SeatState | undefined =>
  table.seats.find((s) => s.credential === credential);

const fail = (code: TableErrorCode): Outcome => ({ ok: false, error: TABLE_ERRORS[code], code });

const betweenHands = (table: TableState) => table.status === 'lobby' || table.status === 'handOver';

export function handleMessage(
  table: TableState,
  credential: string,
  message: ClientMessage,
  deps: TableDeps,
): Outcome {
  const next = structuredClone(table);
  const seat = seatOf(next, credential);
  const isHost = seat !== undefined && seat.playerId === next.hostId;
  if (next.status === 'ended') return fail('sessionEnded');
  if (next.status === 'new' && message.type !== 'createTable') {
    return fail('noSuchTable');
  }

  switch (message.type) {
    case 'createTable': {
      if (next.status !== 'new') return fail('codeTaken');
      if (!isRulesConfig(message.rules)) return fail('invalidRules');
      const name = message.name.trim();
      const playerId = deps.newId();
      next.rules = structuredClone(message.rules);
      next.seats = [{ playerId, name, credential, isBot: false }];
      next.hostId = playerId;
      next.scores[playerId] = 0;
      next.names[playerId] = name;
      next.status = 'lobby';
      return { ok: true, table: next };
    }
    case 'sit': {
      const name = message.name.trim();
      if (seat) {
        seat.name = name;
        next.names[seat.playerId] = name;
        return { ok: true, table: next };
      }
      if (next.banned.includes(credential)) return fail('removedFromTable');
      if (next.locked) return fail('tableLocked');
      if (!betweenHands(next)) return fail('sitBetweenHands');
      if (next.seats.length >= MAX_PLAYERS) return fail('tableFull');
      const playerId = deps.newId();
      next.seats.push({ playerId, name, credential, isBot: false });
      next.hostId ??= playerId;
      next.scores[playerId] ??= 0;
      next.names[playerId] = name;
      return { ok: true, table: next };
    }
    case 'addBot': {
      if (!isHost) return fail('hostOnlyBots');
      if (!betweenHands(next)) return fail('botsBetweenHands');
      if (next.seats.length >= MAX_PLAYERS) return fail('tableFull');
      const taken = new Set(next.seats.map((s) => s.name));
      const name = BOT_NAMES.find((n) => !taken.has(n)) ?? `Bot ${next.seats.length + 1}`;
      const playerId = deps.newId();
      next.seats.push({ playerId, name, credential: `bot:${playerId}`, isBot: true });
      next.scores[playerId] ??= 0;
      next.names[playerId] = name;
      return { ok: true, table: next };
    }
    case 'removePlayer': {
      if (!isHost) return fail('hostOnlyRemove');
      if (!betweenHands(next)) return fail('removeBetweenHands');
      const target = next.seats.find((s) => s.playerId === message.playerId);
      if (!target) return fail('playerNotAtTable');
      if (target === seat) return fail('cantRemoveSelf');
      next.seats = next.seats.filter((s) => s !== target);
      if (!target.isBot) next.banned.push(target.credential);
      return { ok: true, table: next };
    }
    case 'setLocked': {
      if (!isHost) return fail('hostOnlyLock');
      next.locked = message.locked;
      return { ok: true, table: next };
    }
    case 'chat': {
      if (!seat) return fail('sitToChat');
      next.chat = [
        ...next.chat,
        { playerId: seat.playerId, text: message.text.trim(), at: deps.now() },
      ].slice(-CHAT_HISTORY);
      return { ok: true, table: next };
    }
    case 'react': {
      if (!seat) return fail('sitToReact');
      return { ok: true, table: next, reaction: { playerId: seat.playerId, emoji: message.emoji } };
    }
    case 'leave': {
      if (!seat) return fail('notSeated');
      if (!betweenHands(next)) return fail('cantLeaveMidHand');
      next.seats = next.seats.filter((s) => s !== seat);
      if (isHost) next.hostId = next.seats[0]?.playerId ?? null;
      return { ok: true, table: next };
    }
    case 'setRules': {
      if (!isHost) return fail('hostOnlyRules');
      if (!betweenHands(next)) return fail('rulesBetweenHands');
      if (!isRulesConfig(message.rules)) return fail('invalidRules');
      next.rules = structuredClone(message.rules);
      return { ok: true, table: next };
    }
    case 'start': {
      if (!isHost) return fail('hostOnlyStart');
      if (!betweenHands(next)) return fail('handInProgress');
      if (next.seats.length < MIN_PLAYERS) return fail('needMorePlayers');
      const playerIds = next.seats.map((s) => s.playerId);
      const firstPlayer = next.handNumber % playerIds.length;
      next.hand = dealHand({ playerIds, rules: next.rules, seed: deps.newKey(), firstPlayer });
      next.handNumber++;
      next.handLog = {
        handNumber: next.handNumber,
        playerIds,
        rules: next.rules,
        firstPlayer,
        actions: [],
      };
      next.status = 'playing';
      restartTimer(next, deps);
      return { ok: true, table: next };
    }
    case 'action': {
      if (next.status !== 'playing' || !next.hand) return fail('noHand');
      if (!seat) return fail('notInHand');
      if (!isRecord(message.action))
        return { ok: false, error: ENGINE_ERRORS.malformedAction, code: 'malformedAction' };
      // Players always act as themselves, whatever playerId the client sent.
      return play(next, { ...message.action, playerId: seat.playerId }, deps);
    }
    case 'endSession': {
      if (!isHost) return fail('hostOnlyEnd');
      // A hand in progress is abandoned without scoring.
      next.status = 'ended';
      next.turnDeadline = null;
      next.botDueAt = null;
      return { ok: true, table: next };
    }
    default:
      return fail('unknownMessage');
  }
}

/** Applies one engine action and handles the end of the hand. Mutates `table`. */
function play(table: TableState, action: Record<string, unknown>, deps: TableDeps): Outcome {
  const hand = table.hand!;
  const result = applyAction(hand, action);
  if (!result.ok) return result;

  table.hand = result.state;
  table.handLog!.actions.push(action);

  if (result.state.phase !== 'over') {
    if (result.state.turn !== hand.turn) restartTimer(table, deps);
    return { ok: true, table };
  }

  const outcome = result.state.result!;
  const net: Record<string, number> = {};
  let winner: string | null = null;
  if (outcome.kind === 'won') {
    winner = table.handLog!.playerIds[outcome.winner]!;
    table.handLog!.playerIds.forEach((id, seat) => {
      net[id] = outcome.settlement.net[seat]!;
      table.scores[id] = (table.scores[id] ?? 0) + net[id];
    });
  }
  table.history.push({ handNumber: table.handNumber, winner, net });
  table.status = 'handOver';
  table.turnDeadline = null;
  table.botDueAt = null;
  const finished = { ...table.handLog!, key: result.state.rng.key };
  table.handLog = null;
  return { ok: true, table, finished };
}

/** Starts the clock for a new turn: the turn timer, and the bot's move if it's a bot. */
function restartTimer(table: TableState, deps: TableDeps): void {
  const seconds = table.rules.turnTimerSeconds;
  table.turnDeadline = seconds > 0 ? deps.now() + seconds * 1000 : null;
  const hand = table.hand!;
  const current = hand.players[hand.turn]!.id;
  table.botDueAt = isBot(table, current) ? deps.now() + BOT_DELAY_MS : null;
}

const isBot = (table: TableState, playerId: string) =>
  table.seats.some((s) => s.playerId === playerId && s.isBot);

/** The next time the table needs waking (a turn timeout or a bot move), if any. */
export function nextWake(table: TableState): number | null {
  const times = [table.turnDeadline, table.botDueAt].filter((t) => t !== null);
  return times.length ? Math.min(...times) : null;
}

/**
 * Runs whatever is due: a bot's turn, or the turn of a player who ran out of time.
 * Returns null when nothing is due.
 */
export function handleTimeout(table: TableState, deps: TableDeps): Outcome | null {
  if (table.status !== 'playing' || !table.hand) return null;
  const now = deps.now();
  if (table.botDueAt !== null && now >= table.botDueAt) return playBotTurn(table, deps);
  if (table.turnDeadline === null || now < table.turnDeadline) return null;
  return autoPlay(structuredClone(table), deps);
}

/** A bot draws, then discards (or shows, or finishes), deciding from its own view. */
function playBotTurn(table: TableState, deps: TableDeps): Outcome {
  let next = structuredClone(table);
  next.botDueAt = null;
  const playerId = next.hand!.players[next.hand!.turn]!.id;
  while (next.status === 'playing' && next.hand!.players[next.hand!.turn]!.id === playerId) {
    const before = next.hand!;
    let outcome = play(next, chooseBotAction(viewFor(before, playerId)), deps);
    // A bot bug must never stall the table: fall back to the timeout move.
    if (!outcome.ok) outcome = autoPlay(next, deps);
    if (!outcome.ok || outcome.finished) return outcome;
    next = outcome.table;
    if (next.hand!.turn !== before.turn) break;
  }
  return { ok: true, table: next };
}

/**
 * Plays the current turn the simple way: draw from the stock (if not drawn yet), then
 * discard the newest card that may be discarded. Mutates and returns `table`.
 */
function autoPlay(table: TableState, deps: TableDeps): Outcome {
  let next = table;
  const playerId = next.hand!.players[next.hand!.turn]!.id;
  if (next.hand!.phase === 'draw') {
    const drawn = play(next, { type: 'drawStock', playerId }, deps);
    if (!drawn.ok) return drawn;
    next = drawn.table;
  }
  const hand = next.hand!;
  const cards = hand.players[hand.turn]!.hand;
  const card = cards.findLast((c) => c.id !== hand.pickedFromDiscard) ?? cards.at(-1)!;
  return play(next, { type: 'discard', playerId, cardId: card.id }, deps);
}

/** The table as one connection may see it. `connected` holds credentials currently online. */
export function tableView(
  table: TableState,
  credential: string | null,
  connected: ReadonlySet<string>,
): TableView {
  const seat = credential === null ? undefined : seatOf(table, credential);
  const playerId = seat?.playerId ?? null;
  return {
    status: table.status,
    you: {
      playerId,
      isHost: playerId !== null && playerId === table.hostId,
      removed: credential !== null && table.banned.includes(credential),
    },
    locked: table.locked,
    hostId: table.hostId,
    seats: table.seats.map((s) => ({
      playerId: s.playerId,
      name: s.name,
      connected: s.isBot || connected.has(s.credential),
      isBot: s.isBot,
    })),
    rules: table.rules,
    handNumber: table.handNumber,
    scores: table.scores,
    history: table.history,
    names: table.names,
    chat: table.chat,
    hand: table.hand ? viewFor(table.hand, playerId) : null,
    turnDeadline: table.turnDeadline,
  };
}
