import type { ClientMessage, TableView } from '@marriage/protocol';
import { PlayingCard } from './PlayingCard';
import { ManageSeats } from './HostControls';
import { useI18n } from './i18n';
import { Scores } from './Scores';
import { SitForm } from './SitForm';

interface Props {
  table: TableView;
  send: (message: ClientMessage) => void;
}

/** End of a hand: who won, maal and points per player, every hand revealed. */
export function Results({ table, send }: Props) {
  const { t } = useI18n();
  const hand = table.hand!;
  const result = hand.result!;
  const name = (id: string) => table.names[id] ?? t.common.formerPlayer;
  const won = result.kind === 'won';
  const winnerName = won ? name(hand.seats[result.winner]!.id) : null;

  return (
    <section className="results" aria-labelledby="results-title">
      <h2 id="results-title">
        {won
          ? (result.method === 'dublees' ? t.results.winsDublees : t.results.wins)(winnerName!)
          : t.results.noWinner}
      </h2>
      {hand.tiplu && (
        <div className="results__tiplu">
          <span>{t.results.tipluWas}</span>
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
                  <span className="muted">{t.results.maal(result.settlement.maal[i]!)}</span>
                  <span className={result.settlement.net[i]! < 0 ? 'negative' : 'positive'}>
                    {t.format.signed(result.settlement.net[i]!)}
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
          {t.results.watchReplay}
        </button>
      ) : null}
      {!table.you.playerId && (
        <SitForm table={table} onSit={(n) => send({ type: 'sit', name: n })} />
      )}
      <ManageSeats table={table} send={send} />
      {table.you.isHost ? (
        <div className="button-row">
          <button type="button" className="button" onClick={() => send({ type: 'endSession' })}>
            {t.results.endSession}
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => send({ type: 'start' })}
          >
            {t.results.dealNext}
          </button>
        </div>
      ) : (
        <p className="muted">{t.results.waitingNext}</p>
      )}
    </section>
  );
}

export function FinalScores({ table, send }: Props) {
  const { t } = useI18n();
  return (
    <main className="final">
      <div className="dhaka-band" aria-hidden="true" />
      <h1 className="lobby__title">{t.results.thanks}</h1>
      <Scores table={table} />
      {table.history.length > 0 && (
        <section className="final__hands" aria-labelledby="hands">
          <h2 id="hands">{t.results.hands}</h2>
          <ol>
            {table.history.map((h) => (
              <li key={h.handNumber}>
                <span>
                  {h.winner
                    ? t.results.handWon(
                        h.handNumber,
                        table.names[h.winner] ?? t.common.formerPlayer,
                      )
                    : t.results.handNoWinner(h.handNumber)}
                </span>
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() => send({ type: 'getReplay', handNumber: h.handNumber })}
                >
                  {t.results.replay}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
      <a className="button button--primary" href="?new">
        {t.results.newTable}
      </a>
    </main>
  );
}
