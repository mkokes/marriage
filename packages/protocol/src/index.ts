import { isRecord, type HandView, type RulesConfig } from '@marriage/engine';

/** Path of the table WebSocket: `/parties/table/<code>?token=<token>`. */
export const TABLE_PARTY = 'table';

/**
 * The secret a device keeps in localStorage to reclaim its seat. It is sent only when
 * connecting and is never shown to other players.
 */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;
export const MAX_NAME_LENGTH = 24;
/** Larger messages are rejected unread. */
export const MAX_MESSAGE_BYTES = 16 * 1024;

export type ClientMessage =
  /** Take a seat (lobby or between hands). Re-sending updates your name. */
  | { type: 'sit'; name: string }
  /** Give up your seat (lobby or between hands). */
  | { type: 'leave' }
  /** Host only, outside a hand. Checked by the server with `validateRules`. */
  | { type: 'setRules'; rules: unknown }
  /** Host only: deal the next hand. */
  | { type: 'start' }
  /** A game action for the current hand; checked by the engine. */
  | { type: 'action'; action: unknown }
  /** Host only: end the session and show final totals. */
  | { type: 'endSession' };

export interface SeatInfo {
  playerId: string;
  name: string;
  connected: boolean;
}

export interface HandSummary {
  handNumber: number;
  /** Null for a void hand. */
  winner: string | null;
  /** Points won (+) or paid (−) this hand, by player id. */
  net: Record<string, number>;
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
  /** The current or last hand, redacted for this viewer. */
  hand: HandView | null;
  /** Epoch ms when the current turn times out, if a timer is running. */
  turnDeadline: number | null;
}

export type ServerMessage =
  | { type: 'table'; table: TableView }
  | { type: 'error'; message: string };

const isName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= MAX_NAME_LENGTH;

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
    case 'leave':
    case 'start':
    case 'endSession':
      return true;
    default:
      return false;
  }
}
