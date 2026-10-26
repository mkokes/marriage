import { FinalScores } from './Results';
import { Game } from './Game';
import { Home } from './Home';
import { Lobby } from './Lobby';
import { useTable } from './useTable';

const tableCode = new URLSearchParams(window.location.search).get('table');

export function App() {
  return tableCode ? <TableScreen room={tableCode} /> : <Home />;
}

function TableScreen({ room }: { room: string }) {
  const { table, error, connected, send, dismissError } = useTable(room);

  let screen;
  if (!table) screen = <p className="loading">Joining table {room}…</p>;
  else if (table.status === 'lobby') screen = <Lobby room={room} table={table} send={send} />;
  else if (table.status === 'ended') screen = <FinalScores table={table} />;
  else screen = <Game key={table.handNumber} room={room} table={table} send={send} />;

  return (
    <>
      {screen}
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
