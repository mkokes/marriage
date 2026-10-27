import { STANDARD_RULES } from '@marriage/engine';
import { MAX_NAME_LENGTH, newTableCode } from '@marriage/protocol';
import { useState } from 'react';
import { useI18n } from './i18n';
import { pendingTables } from './pendingTables';
import { navigate } from './router';
import { RulesEditor } from './RulesEditor';
import { local, NAME_KEY } from './storage';

const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));

/** Choose the rules (Standard to start) and your name, then create the table. */
export function NewTable() {
  const { t } = useI18n();
  const [name, setName] = useState(() => local.get(NAME_KEY) ?? '');

  return (
    <main className="setup">
      <div className="dhaka-band" aria-hidden="true" />
      <header className="setup__header">
        <h1 className="lobby__title">{t.setup.title}</h1>
        <p>{t.setup.intro}</p>
      </header>
      <RulesEditor
        rules={STANDARD_RULES}
        submitLabel={t.setup.create}
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
          <span>{t.setup.yourName}</span>
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
        {t.setup.back}
      </button>
    </main>
  );
}

/** For a code nobody has created, or one that can't be a code. */
export function NoTable({ code }: { code: string }) {
  const { t } = useI18n();
  return (
    <main className="final">
      <div className="dhaka-band" aria-hidden="true" />
      <h1 className="lobby__title">{t.noTable.title(code)}</h1>
      <p>{t.noTable.body}</p>
      <div className="button-row">
        <button type="button" className="button button--primary" onClick={() => navigate('')}>
          {t.noTable.enterAnother}
        </button>
        <button type="button" className="button" onClick={() => navigate('?new')}>
          {t.noTable.start}
        </button>
      </div>
    </main>
  );
}
