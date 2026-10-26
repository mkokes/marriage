import { isRecord } from '@marriage/engine';
import {
  TABLE_PARTY,
  type ClientMessage,
  type ServerMessage,
  type TableView,
} from '@marriage/protocol';
import { usePartySocket } from 'partysocket/react';
import { useCallback, useState } from 'react';
import { deviceToken } from './token';

const token = deviceToken();

function isServerMessage(value: unknown): value is ServerMessage {
  return isRecord(value) && (value.type === 'table' || value.type === 'error');
}

/** Connects to a table and keeps its latest view. Errors clear on the next update. */
export function useTable(room: string) {
  const [table, setTable] = useState<TableView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

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
      if (message.type === 'table') {
        setTable(message.table);
        setError(null);
      } else {
        setError(message.message);
      }
    },
  });

  const send = useCallback(
    (message: ClientMessage) => socket.send(JSON.stringify(message)),
    [socket],
  );
  const dismissError = useCallback(() => setError(null), []);

  return { table, error, connected, send, dismissError };
}
