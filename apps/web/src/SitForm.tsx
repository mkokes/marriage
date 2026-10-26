import { MAX_NAME_LENGTH } from '@marriage/protocol';
import { useState } from 'react';
import { local } from './storage';

const NAME_KEY = 'marriage.name';

/** Asks for a name and takes a seat. Remembers the name on this device. */
export function SitForm({ onSit, full }: { onSit: (name: string) => void; full: boolean }) {
  const [name, setName] = useState(() => local.get(NAME_KEY) ?? '');
  if (full) return <p className="muted">The table is full. You're watching.</p>;
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
