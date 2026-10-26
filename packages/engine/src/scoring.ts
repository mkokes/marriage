import type { HandState } from './game';
import { maalPoints } from './maal';

export interface Settlement {
  /** Maal each player is credited with, after kidnap/murder. Indexed by seat. */
  maal: number[];
  /** Points won (+) or paid (−) by each seat; always sums to zero. */
  net: number[];
}

/**
 * Net settlement for a won hand. With N players and total maal T, each player
 * receives `maal × N − T` (i.e. settles their maal against every other player). Then
 * every other player pays the winner a penalty: `unseenPenalty` if they never saw,
 * `seenPenalty` if they did, plus `dubleeFinishBonus` when the winner finished with
 * dublees.
 */
export function settle(state: HandState, winner: number, method: 'sets' | 'dublees'): Settlement {
  const { rules, players, tiplu } = state;
  if (!tiplu) throw new Error('A hand cannot be won before the tiplu is chosen');

  const maal = players.map((p) =>
    maalPoints([...p.hand, ...p.shown.flat()], p.shown, tiplu, rules),
  );
  players.forEach((p, seat) => {
    if (seat === winner || p.seen !== 'unseen') return;
    if (rules.kidnap) maal[winner]! += maal[seat]!;
    if (rules.kidnap || rules.murder) maal[seat] = 0;
  });

  const n = players.length;
  const total = maal.reduce((sum, m) => sum + m, 0);
  const net = maal.map((m) => m * n - total);

  players.forEach((p, seat) => {
    if (seat === winner) return;
    const penalty =
      (p.seen === 'unseen' ? rules.unseenPenalty : rules.seenPenalty) +
      (method === 'dublees' ? rules.dubleeFinishBonus : 0);
    net[seat]! -= penalty;
    net[winner]! += penalty;
  });

  return { maal, net };
}
