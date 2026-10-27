import type { ClientMessage, TableView } from '@marriage/protocol';

interface Props {
  table: TableView;
  send: (message: ClientMessage) => void;
}

/** Host-only: lock the table to new seats, or unlock it. */
export function LockToggle({ table, send }: Props) {
  if (!table.you.isHost) return null;
  return (
    <div className="lock">
      <button
        type="button"
        className="button"
        aria-pressed={table.locked}
        onClick={() => send({ type: 'setLocked', locked: !table.locked })}
      >
        {table.locked ? 'Unlock table' : 'Lock table'}
      </button>
      <span className="muted">
        {table.locked ? 'Locked: nobody new can sit down.' : 'Lock it once everyone is here.'}
      </span>
    </div>
  );
}

/** Host-only, between hands: remove anyone else at the table. */
export function ManageSeats({ table, send }: Props) {
  const others = table.seats.filter((s) => s.playerId !== table.you.playerId);
  if (!table.you.isHost || others.length === 0) return null;
  return (
    <section className="manage" aria-labelledby="manage-title">
      <h3 id="manage-title">Players</h3>
      <ul>
        {others.map((seat) => (
          <li key={seat.playerId}>
            <span>
              {seat.name}
              {seat.isBot && <span className="tag">Bot</span>}
            </span>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => send({ type: 'removePlayer', playerId: seat.playerId })}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <LockToggle table={table} send={send} />
    </section>
  );
}
