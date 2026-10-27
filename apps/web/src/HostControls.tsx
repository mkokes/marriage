import type { ClientMessage, TableView } from '@marriage/protocol';
import { useI18n } from './i18n';

interface Props {
  table: TableView;
  send: (message: ClientMessage) => void;
}

/** Host-only: lock the table to new seats, or unlock it. */
export function LockToggle({ table, send }: Props) {
  const { t } = useI18n();
  if (!table.you.isHost) return null;
  return (
    <div className="lock">
      <button
        type="button"
        className="button"
        aria-pressed={table.locked}
        onClick={() => send({ type: 'setLocked', locked: !table.locked })}
      >
        {table.locked ? t.host.unlock : t.host.lock}
      </button>
      <span className="muted">{table.locked ? t.host.lockedHint : t.host.unlockedHint}</span>
    </div>
  );
}

/** Host-only, between hands: remove anyone else at the table. */
export function ManageSeats({ table, send }: Props) {
  const { t } = useI18n();
  const others = table.seats.filter((s) => s.playerId !== table.you.playerId);
  if (!table.you.isHost || others.length === 0) return null;
  return (
    <section className="manage" aria-labelledby="manage-title">
      <h3 id="manage-title">{t.host.players}</h3>
      <ul>
        {others.map((seat) => (
          <li key={seat.playerId}>
            <span>
              {seat.name}
              {seat.isBot && <span className="tag">{t.common.bot}</span>}
            </span>
            <button
              type="button"
              className="button button--quiet"
              aria-label={t.common.removeNamed(seat.name)}
              onClick={() => send({ type: 'removePlayer', playerId: seat.playerId })}
            >
              {t.common.remove}
            </button>
          </li>
        ))}
      </ul>
      <LockToggle table={table} send={send} />
    </section>
  );
}
