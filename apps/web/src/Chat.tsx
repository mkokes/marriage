import { MAX_CHAT_LENGTH, REACTIONS, type ClientMessage, type TableView } from '@marriage/protocol';
import { useState } from 'react';
import { useI18n } from './i18n';

interface Props {
  table: TableView;
  send: (message: ClientMessage) => void;
}

/** Table chat in a slide-up panel, with quick reactions for seated players. */
export function Chat({ table, send }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [readCount, setReadCount] = useState(table.chat.length);
  const seated = table.you.playerId !== null;
  const unread = open ? 0 : Math.max(0, table.chat.length - readCount);

  /** Opening or closing marks everything so far as read. */
  const toggle = (next: boolean) => {
    setReadCount(table.chat.length);
    setOpen(next);
  };

  return (
    <>
      <button
        type="button"
        className="chat-toggle"
        aria-expanded={open}
        onClick={() => toggle(!open)}
      >
        {t.chat.open}
        {unread > 0 && <span className="chat-toggle__badge">{t.format.number(unread)}</span>}
      </button>
      {open && (
        <section className="chat" aria-label={t.chat.region}>
          <header className="chat__header">
            <h2>{t.chat.title}</h2>
            <button type="button" className="button button--quiet" onClick={() => toggle(false)}>
              {t.common.close}
            </button>
          </header>
          {table.chat.length === 0 ? (
            <p className="muted">{t.chat.empty}</p>
          ) : (
            <ol className="chat__list">
              {table.chat.map((m, i) => (
                <li
                  key={`${m.at}-${m.playerId}`}
                  // Keep the newest message in view as messages arrive.
                  ref={
                    i === table.chat.length - 1
                      ? (el) => el?.scrollIntoView({ block: 'end' })
                      : undefined
                  }
                >
                  <strong>{table.names[m.playerId] ?? t.common.formerPlayer}</strong> {m.text}
                </li>
              ))}
            </ol>
          )}
          {seated ? (
            <>
              <div className="reactions" role="group" aria-label={t.chat.reactions}>
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="reactions__button"
                    onClick={() => send({ type: 'react', emoji })}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <form
                className="field-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!text.trim()) return;
                  send({ type: 'chat', text });
                  setText('');
                }}
              >
                <input
                  value={text}
                  maxLength={MAX_CHAT_LENGTH}
                  onChange={(e) => setText(e.target.value)}
                  aria-label={t.chat.message}
                  placeholder={t.chat.message}
                />
                <button type="submit" className="button button--primary">
                  {t.chat.send}
                </button>
              </form>
            </>
          ) : (
            <p className="muted">{t.chat.sitToChat}</p>
          )}
        </section>
      )}
    </>
  );
}
