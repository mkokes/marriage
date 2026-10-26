import { NO_WILDS, wildsFor, type Card } from '@marriage/engine';
import type { ClientMessage, TableView } from '@marriage/protocol';
import { useState } from 'react';
import { moveCards, reconcile, sortByRank, sortBySuit, type Arrangement } from './arrangement';
import { describeGroup, finishGroups, showGroups } from './moves';
import { CardBack, PlayingCard } from './PlayingCard';
import { ReactionBubble } from './ReactionBubble';
import { Results } from './Results';
import { Scores } from './Scores';
import { local } from './storage';
import { useNow } from './useNow';
import type { Reactions } from './useTable';

interface Props {
  room: string;
  table: TableView;
  send: (message: ClientMessage) => void;
  reactions: Reactions;
}

const isArrangement = (value: unknown): value is Arrangement =>
  Array.isArray(value) &&
  value.every((g) => Array.isArray(g) && g.every((id) => typeof id === 'string'));

function loadArrangement(key: string): Arrangement | null {
  try {
    const value: unknown = JSON.parse(local.get(key) ?? 'null');
    return isArrangement(value) ? value : null;
  } catch {
    return null;
  }
}

const SEEN_LABEL = { unseen: null, seen: 'Seen', seenDublees: 'Seen with dublees' } as const;

/** The table during a hand, and the results once it's over. Keyed by hand number. */
export function Game({ room, table, send, reactions }: Props) {
  const hand = table.hand!;
  const you = hand.you;
  const cards = you?.hand ?? [];
  const byId = new Map(cards.map((c) => [c.id, c]));
  const storageKey = `marriage.arrangement.${room}.${table.handNumber}`;

  const [stored, setStored] = useState<Arrangement>(
    () => loadArrangement(storageKey) ?? sortBySuit(cards),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const arrangement = reconcile(stored, cards);
  const selection = selected.filter((id) => byId.has(id));

  const arrange = (next: Arrangement) => {
    setStored(next);
    local.set(storageKey, JSON.stringify(next));
  };
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const act = (action: Record<string, unknown>) => {
    send({ type: 'action', action });
    setSelected([]);
  };

  const over = hand.phase === 'over';
  const myTurn = you !== null && !over && hand.turn === you.seat;
  const canDraw = myTurn && hand.phase === 'draw';
  const canDiscard = myTurn && hand.phase === 'discard';
  const isWild =
    you && you.seen !== 'unseen' && hand.tiplu ? wildsFor(hand.tiplu, table.rules) : NO_WILDS;

  const discardId = canDiscard && selection.length === 1 ? selection[0]! : null;
  const without = (id: string): Card[][] =>
    arrangement
      .map((g) => g.filter((x) => x !== id).map((x) => byId.get(x)!))
      .filter((g) => g.length > 0);
  const show =
    discardId && you?.seen === 'unseen' ? showGroups(without(discardId), table.rules) : null;
  const finish = discardId && you ? finishGroups(without(discardId), you.seen, isWild) : null;

  const now = useNow(table.turnDeadline !== null && !over);
  const secondsLeft =
    table.turnDeadline === null ? null : Math.max(0, Math.ceil((table.turnDeadline - now) / 1000));

  const name = (id: string) => table.names[id] ?? 'A former player';
  const seatAway = (id: string) => table.seats.find((s) => s.playerId === id)?.connected === false;
  const turnName = name(hand.seats[hand.turn]!.id);
  const topDiscard = hand.discardPile.at(-1) ?? null;
  const pickupNeedsCards = table.rules.discardPickup === 'completeSet';

  const takeDiscard = () =>
    act(pickupNeedsCards ? { type: 'drawDiscard', withCards: selection } : { type: 'drawDiscard' });

  let prompt: string;
  if (!myTurn) prompt = you ? `${turnName}'s turn` : `Watching: ${turnName}'s turn`;
  else if (canDraw) {
    prompt = pickupNeedsCards
      ? 'Your turn. Draw from the stock, or select the cards the discard completes and take it.'
      : 'Your turn. Draw from the stock or take the discard.';
  } else if (show) prompt = 'You can show your sets as you discard.';
  else if (finish) prompt = 'You can finish the game with this discard.';
  else prompt = 'Select one card to discard.';

  return (
    <main className="game">
      <div className="dhaka-band" aria-hidden="true" />
      <header className="game__bar">
        <span className="game__table">Table {room}</span>
        <span className="muted">Hand {table.handNumber}</span>
        <details className="game__scores">
          <summary>Scores</summary>
          <Scores table={table} />
        </details>
      </header>

      <ul className="opponents">
        {hand.seats.map((seat, i) =>
          i === you?.seat ? null : (
            <li
              key={seat.id}
              className={`opponent${hand.turn === i && !over ? ' opponent--turn' : ''}${seatAway(seat.id) ? ' opponent--away' : ''}`}
            >
              <span className="opponent__name">
                {name(seat.id)}
                <ReactionBubble reactions={reactions} playerId={seat.id} />
              </span>
              <span className="opponent__meta">
                {seat.handCount} cards
                {SEEN_LABEL[seat.seen] && <span className="tag">{SEEN_LABEL[seat.seen]}</span>}
                {seatAway(seat.id) && <span className="muted">away</span>}
              </span>
              {seat.shown.length > 0 && (
                <span className="opponent__shown">
                  {seat.shown.map((group, g) => (
                    <span key={g} className="mini-group">
                      {group.map((card) => (
                        <PlayingCard key={card.id} card={card} size="small" />
                      ))}
                    </span>
                  ))}
                </span>
              )}
            </li>
          ),
        )}
      </ul>

      <section className="felt" aria-label="Table">
        <div className="felt__piles">
          <button
            type="button"
            className="pile"
            disabled={!canDraw}
            onClick={() => act({ type: 'drawStock' })}
            aria-label={`Draw from the stock, ${hand.stockCount} cards`}
          >
            <CardBack />
            <span className="pile__count">{hand.stockCount}</span>
          </button>
          <button
            type="button"
            className="pile"
            disabled={!canDraw || !topDiscard || table.rules.discardPickup === 'never'}
            onClick={takeDiscard}
            aria-label={topDiscard ? 'Take the discard' : 'The discard pile is empty'}
          >
            {topDiscard ? (
              <PlayingCard card={topDiscard} />
            ) : (
              <span className="card card--hand card--empty" />
            )}
            <span className="pile__count">{hand.discardPile.length}</span>
          </button>
          {hand.tiplu && (
            <div className="tiplu">
              <PlayingCard card={hand.tiplu} size="small" />
              <span>Tiplu</span>
            </div>
          )}
        </div>
        <p className={myTurn ? 'prompt prompt--yours' : 'prompt'} aria-live="polite">
          {prompt}
          {secondsLeft !== null && <span className="prompt__timer">{secondsLeft}s</span>}
        </p>
      </section>

      {you && (
        <section className="me" aria-label="Your cards">
          {you.shown.length > 0 && (
            <div className="me__shown">
              {you.shown.map((group, g) => (
                <span key={g} className="mini-group">
                  {group.map((card) => (
                    <PlayingCard key={card.id} card={card} size="small" wild={isWild(card)} />
                  ))}
                </span>
              ))}
            </div>
          )}

          {canDiscard && (
            <div className="actions">
              <button
                type="button"
                className="button"
                disabled={!discardId}
                onClick={() => act({ type: 'discard', cardId: discardId })}
              >
                Discard
              </button>
              {you.seen === 'unseen' && (
                <button
                  type="button"
                  className="button button--primary"
                  disabled={!show}
                  onClick={() =>
                    act({ type: 'discard', cardId: discardId, show: { groups: show } })
                  }
                >
                  Discard and show
                </button>
              )}
              {you.seen !== 'unseen' && (
                <button
                  type="button"
                  className="button button--primary"
                  disabled={!finish}
                  onClick={() => act({ type: 'finish', cardId: discardId, groups: finish })}
                >
                  Discard and finish
                </button>
              )}
            </div>
          )}

          <div className="hand">
            {arrangement.map((ids, g) => {
              const groupCards = ids.map((id) => byId.get(id)!);
              const label = describeGroup(groupCards, isWild);
              const canMoveHere =
                selection.length > 0 && !selection.every((id) => ids.includes(id));
              return (
                <div key={ids[0]} className={label ? 'group group--set' : 'group'}>
                  <div className="group__cards">
                    {groupCards.map((card) => (
                      <PlayingCard
                        key={card.id}
                        card={card}
                        selected={selection.includes(card.id)}
                        wild={isWild(card)}
                        onClick={() => toggle(card.id)}
                      />
                    ))}
                  </div>
                  {canMoveHere ? (
                    <button
                      type="button"
                      className="group__move"
                      onClick={() => {
                        arrange(moveCards(arrangement, selection, g));
                        setSelected([]);
                      }}
                    >
                      Move here
                    </button>
                  ) : (
                    <span className="group__label">{label ?? ' '}</span>
                  )}
                </div>
              );
            })}
            {selection.length > 0 && (
              <button
                type="button"
                className="group group--new"
                onClick={() => {
                  // A new group is laid out in order, whatever order the cards were tapped in.
                  const ordered = sortBySuit(selection.map((id) => byId.get(id)!)).flat();
                  arrange(moveCards(arrangement, ordered, null));
                  setSelected([]);
                }}
              >
                New group
              </button>
            )}
          </div>

          <div className="tools">
            <ReactionBubble reactions={reactions} playerId={you.id} />
            <button
              type="button"
              className="button button--quiet"
              onClick={() => arrange(sortBySuit(cards))}
            >
              Sort by suit
            </button>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => arrange(sortByRank(cards))}
            >
              Sort by rank
            </button>
            {selection.length > 0 && (
              <button
                type="button"
                className="button button--quiet"
                onClick={() => setSelected([])}
              >
                Clear selection
              </button>
            )}
          </div>
        </section>
      )}

      {over && (
        <div className="overlay">
          <Results table={table} send={send} />
        </div>
      )}
    </main>
  );
}
