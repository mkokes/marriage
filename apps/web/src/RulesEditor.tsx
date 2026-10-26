import { STANDARD_RULES, validateRules, type MaalValues, type RulesConfig } from '@marriage/engine';
import { useState } from 'react';

const MAAL_FIELDS: [keyof MaalValues, string][] = [
  ['tiplu', 'Tiplu'],
  ['jhiplu', 'Jhiplu'],
  ['poplu', 'Poplu'],
  ['alter', 'Alter'],
  ['man', 'Man (printed joker)'],
  ['marriage', 'Marriage'],
  ['tunnela', 'Tunnela'],
];

/** Reads a number input as a whole number ≥ 0. */
const whole = (value: string) => Math.max(0, Math.floor(Number(value) || 0));

interface Props {
  rules: RulesConfig;
  onSave: (rules: RulesConfig) => void;
}

/** The host's rules form. Changes apply from the next hand. */
export function RulesEditor({ rules, onSave }: Props) {
  const [draft, setDraft] = useState(rules);
  const problems = validateRules(draft);
  const changed = JSON.stringify(draft) !== JSON.stringify(rules);

  const set = <K extends keyof RulesConfig>(key: K, value: RulesConfig[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const setMaal = (key: keyof MaalValues, value: number) =>
    setDraft((d) => ({ ...d, maal: { ...d.maal, [key]: value } }));

  return (
    <form
      className="rules"
      onSubmit={(e) => {
        e.preventDefault();
        if (problems.length === 0) onSave(draft);
      }}
    >
      <fieldset>
        <legend>Cards</legend>
        <label className="field">
          <span>Decks</span>
          <select
            value={draft.decks}
            onChange={(e) => set('decks', e.target.value === '4' ? 4 : 3)}
          >
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.printedJokers}
            onChange={(e) => set('printedJokers', e.target.checked)}
          />
          Add printed jokers (Man)
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.jhipluPopluWild}
            onChange={(e) => set('jhipluPopluWild', e.target.checked)}
          />
          Jhiplu and poplu are jokers
        </label>
      </fieldset>

      <fieldset>
        <legend>Play</legend>
        <label className="field">
          <span>To see the tiplu, show</span>
          <select
            value={draft.seeRequirement}
            onChange={(e) =>
              set(
                'seeRequirement',
                e.target.value === 'pureSequenceOnly'
                  ? 'pureSequenceOnly'
                  : 'pureSequenceOrTunnela',
              )
            }
          >
            <option value="pureSequenceOrTunnela">3 pure sequences or tunnelas</option>
            <option value="pureSequenceOnly">3 pure sequences</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.dublees}
            onChange={(e) => set('dublees', e.target.checked)}
          />
          Allow seeing with 7 dublees and finishing with an 8th
        </label>
        <label className="field">
          <span>Taking the discard</span>
          <select
            value={draft.discardPickup}
            onChange={(e) => {
              const v = e.target.value;
              set('discardPickup', v === 'free' ? 'free' : v === 'never' ? 'never' : 'completeSet');
            }}
          >
            <option value="completeSet">Only to complete a set</option>
            <option value="free">Any time</option>
            <option value="never">Never</option>
          </select>
        </label>
        <label className="field">
          <span>Turn timer (seconds, 0 for none)</span>
          <input
            type="number"
            min={0}
            max={600}
            value={draft.turnTimerSeconds}
            onChange={(e) => set('turnTimerSeconds', whole(e.target.value))}
          />
        </label>
        <label className="field">
          <span>When the stock runs out</span>
          <select
            value={draft.stockExhausted}
            onChange={(e) =>
              set('stockExhausted', e.target.value === 'reshuffle' ? 'reshuffle' : 'void')
            }
          >
            <option value="void">Nobody wins the hand</option>
            <option value="reshuffle">Reshuffle the discards</option>
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>Maal points</legend>
        <div className="field-grid">
          {MAAL_FIELDS.map(([key, label]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                type="number"
                min={0}
                value={draft.maal[key]}
                onChange={(e) => setMaal(key, whole(e.target.value))}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Settling up</legend>
        <div className="field-grid">
          <label className="field">
            <span>Unseen players pay</span>
            <input
              type="number"
              min={0}
              value={draft.unseenPenalty}
              onChange={(e) => set('unseenPenalty', whole(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Seen players pay</span>
            <input
              type="number"
              min={0}
              value={draft.seenPenalty}
              onChange={(e) => set('seenPenalty', whole(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Dublee win bonus</span>
            <input
              type="number"
              min={0}
              value={draft.dubleeFinishBonus}
              onChange={(e) => set('dubleeFinishBonus', whole(e.target.value))}
            />
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.kidnap}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                kidnap: e.target.checked,
                murder: e.target.checked ? false : d.murder,
              }))
            }
          />
          Kidnap: the winner takes unseen players' maal
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.murder}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                murder: e.target.checked,
                kidnap: e.target.checked ? false : d.kidnap,
              }))
            }
          />
          Murder: unseen players' maal counts for nothing
        </label>
      </fieldset>

      {problems.length > 0 && (
        <ul className="rules__problems" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="button-row">
        <button
          type="button"
          className="button"
          onClick={() => setDraft(structuredClone(STANDARD_RULES))}
        >
          Reset to Standard
        </button>
        <button
          type="submit"
          className="button button--primary"
          disabled={!changed || problems.length > 0}
        >
          Save rules
        </button>
      </div>
    </form>
  );
}
