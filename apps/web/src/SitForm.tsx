import { MAX_PLAYERS } from '@marriage/engine';
import { MAX_NAME_LENGTH, type TableView } from '@marriage/protocol';
import { useState } from 'react';
import { local, NAME_KEY } from './storage';

/**
 * Asks for a name and takes a seat, or explains why you can't. Remembers the name on
 * this device.
 */
export function SitForm({ table, onSit }: { table: TableView; onSit: (name: string) => void }) {
  const [name, setName] = useState(() => local.get(NAME_KEY) ?? '');
  if (table.you.removed) return <p className="muted">The host removed you from this table.</p>;
  if (table.locked) {
    return <p className="muted">This table is locked. Ask the host to unlock it to sit down.</p>;
  }
  if (table.seats.length >= MAX_PLAYERS) {
    return <p className="muted">The table is full. You're watching.</p>;
  }
  return (
    <form
      className="sit"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        local.set(NAME_KEY, trimmed);
        onSit(trimmed);
      }}
    >
      <label htmlFor="name">Your name</label>
      <div className="field-row">
        <input
          id="name"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          autoComplete="nickname"
        />
        <button type="submit" className="button button--primary">
          Sit down
        </button>
      </div>
    </form>
  );
}
