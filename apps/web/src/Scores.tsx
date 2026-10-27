import type { TableView } from '@marriage/protocol';
import { useI18n } from './i18n';

/** Session totals, highest first. */
export function Scores({ table }: { table: TableView }) {
  const { t } = useI18n();
  const names = new Map(table.seats.map((s) => [s.playerId, s.name]));
  const rows = Object.entries(table.scores)
    .filter(([id]) => names.has(id))
    .toSorted(([, a], [, b]) => b - a);
  return (
    <table className="scores">
      <caption>{t.scores.caption(table.history.length)}</caption>
      <tbody>
        {rows.map(([id, score]) => (
          <tr key={id}>
            <th scope="row">{names.get(id)}</th>
            <td className={score < 0 ? 'negative' : undefined}>{t.format.signed(score)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
