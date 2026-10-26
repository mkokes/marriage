import { buildShoe } from '@marriage/engine';
import usePartySocket from 'partysocket/react';
import { useState } from 'react';

const room = new URLSearchParams(window.location.search).get('table') ?? 'lobby';

export function App() {
  const [connected, setConnected] = useState(0);

  usePartySocket({
    party: 'table',
    room,
    onMessage(event: MessageEvent<string>) {
      const message = JSON.parse(event.data) as { type: string; count?: number };
      if (message.type === 'presence') setConnected(message.count ?? 0);
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
