import { isRecord, type HandView, type RulesConfig } from '@marriage/engine';

/** Path of the table WebSocket: `/parties/table/<code>?token=<token>`. */
export const TABLE_PARTY = 'table';

/**
 * The secret a device keeps in localStorage to reclaim its seat. It is sent only when
 * connecting and is never shown to other players.
 */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;
export const MAX_NAME_LENGTH = 24;
export const MAX_CHAT_LENGTH = 200;
/** How many recent chat messages a table keeps. */
export const CHAT_HISTORY = 50;
/** The quick reactions players can send. */
export const REACTIONS = ['🙏', '👏', '😂', '😮', '😢', '🔥'] as const;
export type Reaction = (typeof REACTIONS)[number];
/** Larger messages are rejected unread. */
export const MAX_MESSAGE_BYTES = 16 * 1024;

export type ClientMessage =
  /** Take a seat (lobby or between hands). Re-sending updates your name. */
  | { type: 'sit'; name: string }
  /** Give up your seat (lobby or between hands). */
  | { type: 'leave' }
  /** Host only, between hands: seat a bot. */
  | { type: 'addBot' }
  /** Host only, between hands: remove a bot. */
  | { type: 'removeBot'; playerId: string }
  /** Host only, outside a hand. Checked by the server with `validateRules`. */
  | { type: 'setRules'; rules: unknown }
  /** Host only: deal the next hand. */
  | { type: 'start' }
  /** A game action for the current hand; checked by the engine. */
  | { type: 'action'; action: unknown }
  /** Host only: end the session and show final totals. */
  | { type: 'endSession' }
  /** Seated players only. */
  | { type: 'chat'; text: string }
  /** Seated players only; shown briefly, not stored. */
  | { type: 'react'; emoji: Reaction }
  /** Ask for a finished hand's replay. */
  | { type: 'getReplay'; handNumber: number };

export interface SeatInfo {
  playerId: string;
  name: string;
  connected: boolean;
  isBot: boolean;
}

export interface HandSummary {
  handNumber: number;
  /** Null for a void hand. */
  winner: string | null;
  /** Points won (+) or paid (−) this hand, by player id. */
  net: Record<string, number>;
}

export interface ChatMessage {
  playerId: string;
  text: string;
  /** Epoch ms. */
  at: number;
}

/** Enough to replay a finished hand through the engine: its RNG key and every action. */
export interface ReplayRecord {
  handNumber: number;
  key: string;
  playerIds: string[];
  rules: RulesConfig;
  firstPlayer: number;
  actions: unknown[];
}

export type TableStatus = 'lobby' | 'playing' | 'handOver' | 'ended';

/** Everything one connection may see about a table. */
export interface TableView {
  status: TableStatus;
  /** Your public player id if seated, else null (spectating). */
  you: { playerId: string | null; isHost: boolean };
  hostId: string | null;
  seats: SeatInfo[];
  rules: RulesConfig;
  handNumber: number;
  /** Session totals by player id. */
  scores: Record<string, number>;
  history: HandSummary[];
  /** Names of everyone who has played this session, including players who left. */
  names: Record<string, string>;
  chat: ChatMessage[];
  /** The current or last hand, redacted for this viewer. */
  hand: HandView | null;
  /** Epoch ms when the current turn times out, if a timer is running. */
  turnDeadline: number | null;
}

export type ServerMessage =
  | { type: 'table'; table: TableView }
  | { type: 'error'; message: string }
  | { type: 'reaction'; playerId: string; emoji: Reaction }
  | { type: 'replay'; replay: ReplayRecord };

const isName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= MAX_NAME_LENGTH;

const isChatText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_CHAT_LENGTH;

const isReaction = (value: unknown): value is Reaction =>
  REACTIONS.some((emoji) => emoji === value);

/** Runtime shape check for messages from clients. Rules are checked later by the engine. */
export function isClientMessage(value: unknown): value is ClientMessage {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case 'sit':
      return isName(value.name);
    case 'setRules':
      return 'rules' in value;
    case 'action':
      return 'action' in value;
    case 'removeBot':
      return typeof value.playerId === 'string' && value.playerId.length <= 64;
    case 'chat':
      return isChatText(value.text);
    case 'react':
      return isReaction(value.emoji);
    case 'getReplay':
      return Number.isInteger(value.handNumber);
    case 'leave':
    case 'addBot':
    case 'start':
    case 'endSession':
      return true;
    default:
      return false;
  }
}
