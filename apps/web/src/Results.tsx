import { MAX_PLAYERS } from '@marriage/engine';
import type { ClientMessage, TableView } from '@marriage/protocol';
import { PlayingCard } from './PlayingCard';
import { Scores } from './Scores';
import { SitForm } from './SitForm';

interface Props {
  table: TableView;
  send: (message: ClientMessage) => void;
}

/** End of a hand: who won, maal and points per player, every hand revealed. */
export function Results({ table, send }: Props) {
  const hand = table.hand!;
  const result = hand.result!;
  const name = (id: string) => table.names[id] ?? 'A former player';
  const won = result.kind === 'won';
  const winnerName = won ? name(hand.seats[result.winner]!.id) : null;

  return (
    <section className="results" aria-labelledby="results-title">
      <h2 id="results-title">
        {won
          ? `${winnerName} wins${result.method === 'dublees' ? ' with dublees' : ''}`
          : 'No winner: the stock ran out'}
      </h2>
      {hand.tiplu && (
        <div className="results__tiplu">
          <span>The tiplu was</span>
          <PlayingCard card={hand.tiplu} size="small" />
        </div>
      )}
      <ul className="results__seats">
        {hand.seats.map((seat, i) => (
          <li key={seat.id} className="results__seat">
            <div className="results__line">
              <strong>{name(seat.id)}</strong>
              {won && (
                <>
                  <span className="muted">Maal {result.settlement.maal[i]}</span>
                  <span className={result.settlement.net[i]! < 0 ? 'negative' : 'positive'}>
                    {result.settlement.net[i]! > 0 ? '+' : ''}
                    {result.settlement.net[i]}
                  </span>
                </>
              )}
            </div>
            <div className="results__cards">
              {[...seat.shown, seat.hand ?? []].map((group, g) => (
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
      <Scores table={table} />
      {won || hand.discardPile.length > 1 ? (
        <button
          type="button"
          className="button button--quiet results__replay"
          onClick={() => send({ type: 'getReplay', handNumber: table.handNumber })}
        >
          Watch a replay of this hand
        </button>
      ) : null}
      {!table.you.playerId && (
        <SitForm
          full={table.seats.length >= MAX_PLAYERS}
          onSit={(n) => send({ type: 'sit', name: n })}
        />
      )}
      {table.you.isHost ? (
        <div className="button-row">
          <button type="button" className="button" onClick={() => send({ type: 'endSession' })}>
            End session
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => send({ type: 'start' })}
          >
            Deal the next hand
          </button>
        </div>
      ) : (
        <p className="muted">Waiting for the host to deal the next hand.</p>
      )}
    </section>
  );
}

export function FinalScores({ table, send }: Props) {
  return (
    <main className="final">
      <div className="dhaka-band" aria-hidden="true" />
      <h1 className="lobby__title">Thanks for playing</h1>
      <Scores table={table} />
      {table.history.length > 0 && (
        <section className="final__hands" aria-labelledby="hands">
          <h2 id="hands">Hands</h2>
          <ol>
            {table.history.map((h) => (
              <li key={h.handNumber}>
                <span>
                  Hand {h.handNumber}:{' '}
                  {h.winner ? `${table.names[h.winner] ?? 'A former player'} won` : 'no winner'}
                </span>
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() => send({ type: 'getReplay', handNumber: h.handNumber })}
                >
                  Replay
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
      <a className="button button--primary" href={window.location.pathname}>
        Start a new table
      </a>
    </main>
  );
}
