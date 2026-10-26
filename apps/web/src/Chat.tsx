import { MAX_CHAT_LENGTH, REACTIONS, type ClientMessage, type TableView } from '@marriage/protocol';
import { useState } from 'react';

interface Props {
  table: TableView;
  send: (message: ClientMessage) => void;
}

/** Table chat in a slide-up panel, with quick reactions for seated players. */
export function Chat({ table, send }: Props) {
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
        Chat{unread > 0 && <span className="chat-toggle__badge">{unread}</span>}
      </button>
      {open && (
        <section className="chat" aria-label="Table chat">
          <header className="chat__header">
            <h2>Chat</h2>
            <button type="button" className="button button--quiet" onClick={() => toggle(false)}>
              Close
            </button>
          </header>
          {table.chat.length === 0 ? (
            <p className="muted">No messages yet. Say namaste.</p>
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
                  <strong>{table.names[m.playerId] ?? 'A former player'}</strong> {m.text}
                </li>
              ))}
            </ol>
          )}
          {seated ? (
            <>
              <div className="reactions" role="group" aria-label="Send a reaction">
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
                  aria-label="Message"
                  placeholder="Message"
                />
                <button type="submit" className="button button--primary">
                  Send
                </button>
              </form>
            </>
          ) : (
            <p className="muted">Sit down to chat.</p>
          )}
        </section>
      )}
    </>
  );
}
