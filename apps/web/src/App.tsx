import { buildShoe } from '@marriage/engine';
import { usePartySocket } from 'partysocket/react';
import { useState } from 'react';

const room = new URLSearchParams(window.location.search).get('table') ?? 'lobby';

function isPresence(message: unknown): message is { type: 'presence'; count: number } {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    message.type === 'presence' &&
    'count' in message &&
    typeof message.count === 'number'
  );
}

export function App() {
  const [connected, setConnected] = useState(0);

  usePartySocket({
    party: 'table',
    room,
    onMessage(event: MessageEvent<string>) {
      const message: unknown = JSON.parse(event.data);
      if (isPresence(message)) setConnected(message.count);
    },
  });

  return (
    <main>
      <h1>Marriage</h1>
      <p>
        Table <strong>{room}</strong>: {connected} connected
      </p>
      <p>Shoe size (Standard): {buildShoe(3, false).length} cards</p>
    </main>
  );
}
