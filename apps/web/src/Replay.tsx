import type { ReplayRecord } from '@marriage/protocol';
import { useEffect, useMemo, useState } from 'react';
import { sortBySuit } from './arrangement';
import { PlayingCard } from './PlayingCard';
import { buildReplay } from './replaySteps';

interface Props {
  record: ReplayRecord;
  names: Record<string, string>;
  onClose: () => void;
}

const SEEN_LABEL = { unseen: null, seen: 'Seen', seenDublees: 'Seen with dublees' } as const;

/** Steps through a finished hand with every card face up. */
export function Replay({ record, names, onClose }: Props) {
  const steps = useMemo(() => buildReplay(record, names), [record, names]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = steps.length - 1;
  const step = steps[Math.min(index, last)]!;
  const { state } = step;

  // Autoplay stops by itself at the last step.
  const autoplaying = playing && index < last;
  useEffect(() => {
    if (!autoplaying) return undefined;
    const id = setInterval(() => setIndex((i) => i + 1), 900);
    return () => clearInterval(id);
  }, [autoplaying]);

  const go = (i: number) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(last, i)));
  };
  const top = state.discardPile.at(-1);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="replay-title">
      <section className="replay">
        <header className="replay__header">
          <h2 id="replay-title">Hand {record.handNumber} replay</h2>
          <button type="button" className="button button--quiet" onClick={onClose}>
            Close
          </button>
        </header>

        <p className="replay__caption" aria-live="polite">
          {step.caption}
        </p>

        <div className="replay__table">
          <span className="muted">{state.stock.length} in stock</span>
          {top && <PlayingCard card={top} size="small" />}
          {state.tiplu && (
            <span className="replay__tiplu">
              Tiplu <PlayingCard card={state.tiplu} size="small" />
            </span>
          )}
        </div>

        <ul className="results__seats">
          {state.players.map((player, seat) => (
            <li
              key={player.id}
              className={
                seat === state.turn && state.phase !== 'over'
                  ? 'replay__seat replay__seat--turn'
                  : 'replay__seat'
              }
            >
              <div className="results__line">
                <strong>{names[player.id] ?? 'A former player'}</strong>
                {SEEN_LABEL[player.seen] && <span className="tag">{SEEN_LABEL[player.seen]}</span>}
              </div>
              <div className="results__cards">
                {[
                  ...player.shown,
                  ...sortBySuit(player.hand).map((ids) =>
                    ids.map((id) => player.hand.find((c) => c.id === id)!),
                  ),
                ].map((group, g) => (
                  <span key={g} className="mini-group">
                    {group.map((card) => (
                      <PlayingCard key={card.id} card={card} size="small" />
                    ))}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <div className="replay__controls">
          <input
            type="range"
            min={0}
            max={last}
            value={index}
            onChange={(e) => go(Number(e.target.value))}
            aria-label={`Step ${index + 1} of ${last + 1}`}
          />
          <div className="button-row">
            <button type="button" className="button" onClick={() => go(0)} disabled={index === 0}>
              Start
            </button>
            <button
              type="button"
              className="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
            >
              Back
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => (index >= last ? go(0) : setPlaying(!autoplaying))}
            >
              {autoplaying ? 'Pause' : index >= last ? 'Replay' : 'Play'}
            </button>
            <button
              type="button"
              className="button"
              onClick={() => go(index + 1)}
              disabled={index >= last}
            >
              Next
            </button>
            <button
              type="button"
              className="button"
              onClick={() => go(last)}
              disabled={index >= last}
            >
              End
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
