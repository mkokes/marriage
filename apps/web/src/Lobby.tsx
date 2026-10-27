import { MAX_PLAYERS, MIN_PLAYERS } from '@marriage/engine';
import type { ClientMessage, TableView } from '@marriage/protocol';
import { useState } from 'react';
import { LockToggle } from './HostControls';
import { useI18n } from './i18n';
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
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const link = `${window.location.origin}${window.location.pathname}?table=${room}`;
  const host = table.seats.find((s) => s.playerId === table.hostId);
  const changes = ruleChanges(table.rules, t);
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
        <h1 className="lobby__title">{t.lobby.title(room)}</h1>
        <p className="muted">
          {t.lobby.shareBefore}{' '}
          <strong className="code" lang="en">
            {room}
          </strong>
          {t.lobby.shareAfter}
        </p>
        <div className="field-row">
          <input
            className="lobby__link"
            value={link}
            readOnly
            onFocus={(e) => e.target.select()}
            aria-label={t.lobby.inviteLink}
          />
          <button type="button" className="button" onClick={() => void copy()}>
            {copied ? t.lobby.copied : t.lobby.copy}
          </button>
        </div>
      </header>

      <section aria-labelledby="players">
        <h2 id="players">{t.lobby.players(table.seats.length, MAX_PLAYERS)}</h2>
        <ol className="seats">
          {table.seats.map((seat) => (
            <li key={seat.playerId} className={seat.connected ? 'seat' : 'seat seat--away'}>
              <span className="seat__name">{seat.name}</span>
              {seat.playerId === table.hostId && <span className="tag">{t.common.host}</span>}
              {seat.playerId === table.you.playerId && (
                <span className="tag tag--you">{t.common.you}</span>
              )}
              {seat.isBot && <span className="tag">{t.common.bot}</span>}
              {!seat.connected && <span className="muted">{t.common.away}</span>}
              <ReactionBubble reactions={reactions} playerId={seat.playerId} />
              {table.you.isHost && seat.playerId !== table.you.playerId && (
                <button
                  type="button"
                  className="button button--quiet seat__remove"
                  aria-label={t.common.removeNamed(seat.name)}
                  onClick={() => send({ type: 'removePlayer', playerId: seat.playerId })}
                >
                  {t.common.remove}
                </button>
              )}
            </li>
          ))}
        </ol>
        {table.you.isHost && table.seats.length < MAX_PLAYERS && (
          <button type="button" className="button" onClick={() => send({ type: 'addBot' })}>
            {t.lobby.addBot}
          </button>
        )}
        <LockToggle table={table} send={send} />
        {table.locked && !table.you.isHost && table.you.playerId && (
          <p className="muted">{t.lobby.lockedNote}</p>
        )}
        {table.you.playerId ? (
          !table.you.isHost && (
            <button
              type="button"
              className="button button--quiet"
              onClick={() => send({ type: 'leave' })}
            >
              {t.lobby.leave}
            </button>
          )
        ) : (
          <SitForm table={table} onSit={(name) => send({ type: 'sit', name })} />
        )}
      </section>

      <section aria-labelledby="rules">
        <h2 id="rules">{t.lobby.rules}</h2>
        <p>{changes.length ? t.lobby.standardWith(changes) : t.lobby.standard}</p>
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
              {t.lobby.changeRules}
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
              {t.lobby.deal}
            </button>
            {!enough && <p className="muted">{t.lobby.waitingForPlayer}</p>}
          </>
        ) : (
          <p className="muted">{host ? t.lobby.hostWillDeal(host.name) : t.lobby.waitingForHost}</p>
        )}
      </footer>
    </main>
  );
}
