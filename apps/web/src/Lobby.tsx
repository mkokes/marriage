import { MAX_PLAYERS, MIN_PLAYERS } from '@marriage/engine';
import type { ClientMessage, TableView } from '@marriage/protocol';
import { useState } from 'react';
import { ReactionBubble } from './ReactionBubble';
import { RulesEditor } from './RulesEditor';
import { ruleChanges } from './rules';
import { SitForm } from './SitForm';
import type { Reactions } from './useTable';

interface Props {
  room: string;
  table: TableView;
  send: (message: ClientMessage) => void;
  reactions: Reactions;
}

export function Lobby({ room, table, send, reactions }: Props) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const link = `${window.location.origin}${window.location.pathname}?table=${room}`;
  const host = table.seats.find((s) => s.playerId === table.hostId);
  const changes = ruleChanges(table.rules);
  const enough = table.seats.length >= MIN_PLAYERS;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="lobby">
      <div className="dhaka-band" aria-hidden="true" />
      <header className="lobby__header">
        <h1 className="lobby__title">Table {room}</h1>
        <p className="muted">
          Tell the people you're playing with the code <strong className="code">{room}</strong>, or
          send them this link.
        </p>
        <div className="field-row">
          <input
            className="lobby__link"
            value={link}
            readOnly
            onFocus={(e) => e.target.select()}
            aria-label="Invite link"
          />
          <button type="button" className="button" onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </header>

      <section aria-labelledby="players">
        <h2 id="players">
          Players {table.seats.length} of {MAX_PLAYERS}
        </h2>
        <ol className="seats">
          {table.seats.map((seat) => (
            <li key={seat.playerId} className={seat.connected ? 'seat' : 'seat seat--away'}>
              <span className="seat__name">{seat.name}</span>
              {seat.playerId === table.hostId && <span className="tag">Host</span>}
              {seat.playerId === table.you.playerId && <span className="tag tag--you">You</span>}
              {seat.isBot && <span className="tag">Bot</span>}
              {!seat.connected && <span className="muted">away</span>}
              <ReactionBubble reactions={reactions} playerId={seat.playerId} />
              {seat.isBot && table.you.isHost && (
                <button
                  type="button"
                  className="button button--quiet seat__remove"
                  onClick={() => send({ type: 'removeBot', playerId: seat.playerId })}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ol>
        {table.you.isHost && table.seats.length < MAX_PLAYERS && (
          <button type="button" className="button" onClick={() => send({ type: 'addBot' })}>
            Add a bot
          </button>
        )}
        {table.you.playerId ? (
          !table.you.isHost && (
            <button
              type="button"
              className="button button--quiet"
              onClick={() => send({ type: 'leave' })}
            >
              Leave seat
            </button>
          )
        ) : (
          <SitForm
            full={table.seats.length >= MAX_PLAYERS}
            onSit={(name) => send({ type: 'sit', name })}
          />
        )}
      </section>

      <section aria-labelledby="rules">
        <h2 id="rules">Rules</h2>
        <p>{changes.length ? `Standard, with: ${changes.join(', ')}.` : 'Standard rules.'}</p>
        {table.you.isHost &&
          (editing ? (
            <RulesEditor
              rules={table.rules}
              onSave={(rules) => {
                send({ type: 'setRules', rules });
                setEditing(false);
              }}
            />
          ) : (
            <button type="button" className="button" onClick={() => setEditing(true)}>
              Change rules
            </button>
          ))}
      </section>

      <footer className="lobby__start">
        {table.you.isHost ? (
          <>
            <button
              type="button"
              className="button button--primary button--large"
              disabled={!enough}
              onClick={() => send({ type: 'start' })}
            >
              Deal the first hand
            </button>
            {!enough && <p className="muted">Waiting for at least one more player.</p>}
          </>
        ) : (
          <p className="muted">
            {host ? `${host.name} will deal when everyone's here.` : 'Waiting for a host.'}
          </p>
        )}
      </footer>
    </main>
  );
}
