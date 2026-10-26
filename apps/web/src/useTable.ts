import { isRecord } from '@marriage/engine';
import {
  TABLE_PARTY,
  type ClientMessage,
  type Reaction,
  type ReplayRecord,
  type ServerMessage,
  type TableView,
} from '@marriage/protocol';
import { usePartySocket } from 'partysocket/react';
import { useCallback, useState } from 'react';
import { deviceToken } from './token';

const token = deviceToken();

const SERVER_TYPES = new Set(['table', 'error', 'reaction', 'replay']);

function isServerMessage(value: unknown): value is ServerMessage {
  return isRecord(value) && typeof value.type === 'string' && SERVER_TYPES.has(value.type);
}

export type Reactions = Record<string, { emoji: Reaction; at: number }>;

/** Connects to a table and keeps its latest view. Errors clear on the next update. */
export function useTable(room: string) {
  const [table, setTable] = useState<TableView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  /** The latest reaction from each player, with when it arrived. */
  const [reactions, setReactions] = useState<Reactions>({});
  const [replay, setReplay] = useState<ReplayRecord | null>(null);

  const socket = usePartySocket({
    party: TABLE_PARTY,
    room,
    query: { token },
    onOpen: () => setConnected(true),
    onClose: () => setConnected(false),
    onMessage(event: MessageEvent<string>) {
      let message: unknown;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!isServerMessage(message)) return;
      switch (message.type) {
        case 'table':
          setTable(message.table);
          setError(null);
          break;
        case 'error':
          setError(message.message);
          break;
        case 'reaction':
          setReactions((r) => ({
            ...r,
            [message.playerId]: { emoji: message.emoji, at: Date.now() },
          }));
          break;
        case 'replay':
          setReplay(message.replay);
          break;
      }
    },
  });

  const send = useCallback(
    (message: ClientMessage) => socket.send(JSON.stringify(message)),
    [socket],
  );
  const dismissError = useCallback(() => setError(null), []);
  const closeReplay = useCallback(() => setReplay(null), []);

  return { table, error, connected, send, dismissError, reactions, replay, closeReplay };
}
