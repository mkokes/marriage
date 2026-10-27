import { ruleProblems, STANDARD_RULES, type MaalValues, type RulesConfig } from '@marriage/engine';
import { useState, type ReactNode } from 'react';
import { useI18n } from './i18n';

const MAAL_FIELDS: (keyof MaalValues)[] = [
  'tiplu',
  'jhiplu',
  'poplu',
  'alter',
  'man',
  'marriage',
  'tunnela',
];

/** Reads a number input as a whole number ≥ 0. */
const whole = (value: string) => Math.max(0, Math.floor(Number(value) || 0));

interface Props {
  /** The starting values. */
  rules: RulesConfig;
  onSave: (rules: RulesConfig) => void;
  submitLabel?: string;
  /** Disable submitting until something differs from `rules`. */
  requireChange?: boolean;
  /** Extra checks from the page around the form (e.g. a name is filled in). */
  canSubmit?: boolean;
  /** Extra fields shown above the rules, submitted with them. */
  children?: ReactNode;
}

/** The rules form, used when setting up a table and by the host in the lobby. */
export function RulesEditor({
  rules,
  onSave,
  submitLabel,
  requireChange = true,
  canSubmit = true,
  children,
}: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(rules);
  // One message per kind of problem; the form can only produce a few.
  const problems = [...new Set(ruleProblems(draft).map(t.rules.problem))];
  const changed = JSON.stringify(draft) !== JSON.stringify(rules);
  const ready = canSubmit && problems.length === 0 && (changed || !requireChange);

  const set = <K extends keyof RulesConfig>(key: K, value: RulesConfig[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const setMaal = (key: keyof MaalValues, value: number) =>
    setDraft((d) => ({ ...d, maal: { ...d.maal, [key]: value } }));

  return (
    <form
      className="rules"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSave(draft);
      }}
    >
      {children}
      <fieldset>
        <legend>{t.rules.cards}</legend>
        <label className="field">
          <span>{t.rules.decks}</span>
          <select
            value={draft.decks}
            onChange={(e) => set('decks', e.target.value === '4' ? 4 : 3)}
          >
            <option value={3}>{t.format.number(3)}</option>
            <option value={4}>{t.format.number(4)}</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.printedJokers}
            onChange={(e) => set('printedJokers', e.target.checked)}
          />
          {t.rules.printedJokers}
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.jhipluPopluWild}
            onChange={(e) => set('jhipluPopluWild', e.target.checked)}
          />
          {t.rules.jhipluPopluWild}
        </label>
      </fieldset>

      <fieldset>
        <legend>{t.rules.play}</legend>
        <label className="field">
          <span>{t.rules.seeRequirement}</span>
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
            <option value="pureSequenceOrTunnela">{t.rules.seePureOrTunnela}</option>
            <option value="pureSequenceOnly">{t.rules.seePureOnly}</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.dublees}
            onChange={(e) => set('dublees', e.target.checked)}
          />
          {t.rules.dublees}
        </label>
        <label className="field">
          <span>{t.rules.discardPickup}</span>
          <select
            value={draft.discardPickup}
            onChange={(e) => {
              const v = e.target.value;
              set('discardPickup', v === 'free' ? 'free' : v === 'never' ? 'never' : 'completeSet');
            }}
          >
            <option value="completeSet">{t.rules.pickupCompleteSet}</option>
            <option value="free">{t.rules.pickupFree}</option>
            <option value="never">{t.rules.pickupNever}</option>
          </select>
        </label>
        <label className="field">
          <span>{t.rules.turnTimer}</span>
          <input
            type="number"
            min={0}
            max={600}
            value={draft.turnTimerSeconds}
            onChange={(e) => set('turnTimerSeconds', whole(e.target.value))}
          />
        </label>
        <label className="field">
          <span>{t.rules.stockExhausted}</span>
          <select
            value={draft.stockExhausted}
            onChange={(e) =>
              set('stockExhausted', e.target.value === 'reshuffle' ? 'reshuffle' : 'void')
            }
          >
            <option value="void">{t.rules.stockVoid}</option>
            <option value="reshuffle">{t.rules.stockReshuffle}</option>
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>{t.rules.maalPoints}</legend>
        <div className="field-grid">
          {MAAL_FIELDS.map((key) => (
            <label className="field" key={key}>
              <span>{t.rules.maal[key]}</span>
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
        <legend>{t.rules.settling}</legend>
        <div className="field-grid">
          <label className="field">
            <span>{t.rules.unseenPenalty}</span>
            <input
              type="number"
              min={0}
              value={draft.unseenPenalty}
              onChange={(e) => set('unseenPenalty', whole(e.target.value))}
            />
          </label>
          <label className="field">
            <span>{t.rules.seenPenalty}</span>
            <input
              type="number"
              min={0}
              value={draft.seenPenalty}
              onChange={(e) => set('seenPenalty', whole(e.target.value))}
            />
          </label>
          <label className="field">
            <span>{t.rules.dubleeFinishBonus}</span>
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
          {t.rules.kidnap}
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
          {t.rules.murder}
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
          {t.rules.reset}
        </button>
        <button type="submit" className="button button--primary" disabled={!ready}>
          {submitLabel ?? t.rules.save}
        </button>
      </div>
    </form>
  );
}
