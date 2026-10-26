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
  const name = (id: string) =>
    table.seats.find((s) => s.playerId === id)?.name ?? 'A former player';
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

export function FinalScores({ table }: { table: TableView }) {
  return (
    <main className="final">
      <div className="dhaka-band" aria-hidden="true" />
      <h1 className="lobby__title">Thanks for playing</h1>
      <Scores table={table} />
      <a className="button button--primary" href={window.location.pathname}>
        Start a new table
      </a>
    </main>
  );
}
