import { isRecord } from '@marriage/engine';
import {
  TABLE_PARTY,
  type ClientMessage,
  type ServerMessage,
  type TableView,
} from '@marriage/protocol';
import { usePartySocket } from 'partysocket/react';
import { useState } from 'react';
import { deviceToken } from './token';

const room = new URLSearchParams(window.location.search).get('table') ?? 'lobby';
const token = deviceToken();

function isServerMessage(value: unknown): value is ServerMessage {
  return isRecord(value) && (value.type === 'table' || value.type === 'error');
}

/** Placeholder table screen until the game UI (milestone 4) lands. */
export function App() {
  const [table, setTable] = useState<TableView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');

  const socket = usePartySocket({
    party: TABLE_PARTY,
    room,
    query: { token },
    onMessage(event: MessageEvent<string>) {
      const message: unknown = JSON.parse(event.data);
      if (!isServerMessage(message)) return;
      if (message.type === 'table') {
        setTable(message.table);
        setError(null);
      } else {
        setError(message.message);
      }
    },
  });

  const send = (message: ClientMessage) => socket.send(JSON.stringify(message));

  return (
    <main>
      <h1>Marriage</h1>
      <p>
        Table <strong>{room}</strong>: {table?.status ?? 'connecting…'}
      </p>
      <ul>
        {table?.seats.map((seat) => (
          <li key={seat.playerId}>
            {seat.name}
            {seat.playerId === table.hostId ? ' (host)' : ''}
            {seat.connected ? '' : ' (away)'}: {table.scores[seat.playerId] ?? 0}
          </li>
        ))}
      </ul>
      {table && !table.you.playerId && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send({ type: 'sit', name });
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          <button type="submit">Sit down</button>
        </form>
      )}
      {table?.you.isHost && table.status !== 'playing' && (
        <button onClick={() => send({ type: 'start' })}>Deal a hand</button>
      )}
      {table?.hand?.you && <p>Your hand: {table.hand.you.hand.length} cards</p>}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
