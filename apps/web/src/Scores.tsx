import type { TableView } from '@marriage/protocol';

/** Session totals, highest first. */
export function Scores({ table }: { table: TableView }) {
  const names = new Map(table.seats.map((s) => [s.playerId, s.name]));
  const rows = Object.entries(table.scores)
    .filter(([id]) => names.has(id))
    .toSorted(([, a], [, b]) => b - a);
  return (
    <table className="scores">
      <caption>
        Session totals after {table.history.length} {table.history.length === 1 ? 'hand' : 'hands'}
      </caption>
      <tbody>
        {rows.map(([id, score]) => (
          <tr key={id}>
            <th scope="row">{names.get(id)}</th>
            <td className={score < 0 ? 'negative' : undefined}>
              {score > 0 ? `+${score}` : score}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
