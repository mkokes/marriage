import { STANDARD_RULES } from '@marriage/engine';
import { MAX_NAME_LENGTH, newTableCode } from '@marriage/protocol';
import { useState } from 'react';
import { pendingTables } from './pendingTables';
import { navigate } from './router';
import { RulesEditor } from './RulesEditor';
import { local, NAME_KEY } from './storage';

const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

/** Choose the rules (Standard to start) and your name, then create the table. */
export function NewTable() {
  const [name, setName] = useState(() => local.get(NAME_KEY) ?? '');

  return (
    <main className="setup">
      <div className="dhaka-band" aria-hidden="true" />
      <header className="setup__header">
        <h1 className="lobby__title">Set up your table</h1>
        <p>
          These are the Standard rules, the most common way to play. Change anything your family
          plays differently. Once the table is created, you'll get a code to share.
        </p>
      </header>
      <RulesEditor
        rules={STANDARD_RULES}
        submitLabel="Create table"
        requireChange={false}
        canSubmit={name.trim().length > 0}
        onSave={(rules) => {
          const trimmed = name.trim();
          local.set(NAME_KEY, trimmed);
          const code = newTableCode(randomBytes);
          pendingTables.set(code, { name: trimmed, rules });
          navigate(`?table=${code}`);
        }}
      >
        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
            required
          />
        </label>
      </RulesEditor>
      <button type="button" className="button button--quiet" onClick={() => navigate('')}>
        Back
      </button>
    </main>
  );
}

/** For a code nobody has created, or one that can't be a code. */
export function NoTable({ code }: { code: string }) {
  return (
    <main className="final">
      <div className="dhaka-band" aria-hidden="true" />
      <h1 className="lobby__title">No table called {code}</h1>
      <p>Check the code with whoever invited you. Codes are four letters, like QXRT.</p>
      <div className="button-row">
        <button type="button" className="button button--primary" onClick={() => navigate('')}>
          Enter another code
        </button>
        <button type="button" className="button" onClick={() => navigate('?new')}>
          Start a table
        </button>
      </div>
    </main>
  );
}
