import { newTableCode } from '@marriage/protocol';
import { useEffect, useRef } from 'react';
import { Chat } from './Chat';
import { Game } from './Game';
import { Home } from './Home';
import { Lobby } from './Lobby';
import { NewTable, NoTable } from './NewTable';
import { pendingTables } from './pendingTables';
import { Replay } from './Replay';
import { FinalScores } from './Results';
import { navigate, parseRoute, useSearch } from './router';
import { useTable } from './useTable';

export function App() {
  const route = parseRoute(useSearch());
  switch (route.kind) {
    case 'home':
      return <Home />;
    case 'setup':
      return <NewTable />;
    case 'badCode':
      return <NoTable code={route.input} />;
    default:
      return <TableScreen key={route.code} room={route.code} />;
  }
}

const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

function TableScreen({ room }: { room: string }) {
  const { table, error, connected, send, dismissError, reactions, replay, closeReplay } =
    useTable(room);
  const pending = pendingTables.get(room);
  // Whether this screen has asked to create the table at all, and whether it has asked
  // on the current connection (a dropped connection may have lost the request).
  const askedEver = useRef(false);
  const askedOnConnection = useRef(false);

  useEffect(() => {
    if (!connected) askedOnConnection.current = false;
  }, [connected]);

  // Creating a table: claim the code once connected. The claim succeeded only if we
  // asked and are now its host; any other existing table (someone else's, or one this
  // device made earlier) means the code is taken, so try a fresh one.
  useEffect(() => {
    if (!table || !pending) return;
    if (table.status === 'new') {
      if (!askedOnConnection.current) send({ type: 'createTable', ...pending });
      askedOnConnection.current = true;
      askedEver.current = true;
    } else if (askedEver.current && table.you.isHost) {
      pendingTables.delete(room);
    } else {
      pendingTables.delete(room);
      const code = newTableCode(randomBytes);
      pendingTables.set(code, pending);
      navigate(`?table=${code}`, { replace: true });
    }
  }, [table, pending, room, send]);

  let screen;
  if (!table || (table.status === 'new' && pending)) {
    screen = (
      <p className="loading">{pending ? 'Creating your table…' : `Joining table ${room}…`}</p>
    );
  } else if (table.status === 'new') screen = <NoTable code={room} />;
  else if (table.status === 'lobby')
    screen = <Lobby room={room} table={table} send={send} reactions={reactions} />;
  else if (table.status === 'ended') screen = <FinalScores table={table} send={send} />;
  else
    screen = (
      <Game key={table.handNumber} room={room} table={table} send={send} reactions={reactions} />
    );

  const inTable = table && table.status !== 'new' && table.status !== 'ended';
  return (
    <>
      {screen}
      {inTable && <Chat table={table} send={send} />}
      {replay && table && <Replay record={replay} names={table.names} onClose={closeReplay} />}
      {!connected && table && <p className="banner">Reconnecting…</p>}
      {error && (
        <div className="toast" role="alert">
          <span>{error}</span>
          <button type="button" className="button button--quiet" onClick={dismissError}>
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
