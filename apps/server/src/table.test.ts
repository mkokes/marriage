import {
  applyAction,
  dealHand,
  STANDARD_RULES,
  type Card,
  type Rank,
  type Suit,
} from '@marriage/engine';
import type { ClientMessage } from '@marriage/protocol';
import { describe, expect, it } from 'vitest';
import {
  handleMessage,
  BOT_DELAY_MS,
  handleTimeout,
  newTable,
  nextWake,
  tableView,
  type Outcome,
  type ReplayRecord,
  type TableDeps,
  type TableState,
} from './table';

const card = (id: string, suit: Suit, rank: Rank): Card => ({ id, kind: 'standard', suit, rank });

function fakeDeps() {
  let clock = 1_000_000;
  let ids = 0;
  let keys = 0;
  const deps: TableDeps & { advance(ms: number): void } = {
    now: () => clock,
    newKey: () => (++keys).toString(16).padStart(64, '0'),
    newId: () => `player-${++ids}`,
    advance: (ms) => {
      clock += ms;
    },
  };
  return deps;
}

function ok(outcome: Outcome | null): TableState {
  if (!outcome) throw new Error('Expected an outcome');
  if (!outcome.ok) throw new Error(outcome.error);
  return outcome.table;
}

function err(outcome: Outcome): string {
  if (outcome.ok) throw new Error('Expected an error');
  return outcome.error;
}

/** A table with `n` seated players (credentials c1..cn); c1 is the host. */
function seated(n: number, deps = fakeDeps()) {
  let table = ok(
    handleMessage(
      newTable(),
      'c1',
      { type: 'createTable', name: 'Player 1', rules: STANDARD_RULES },
      deps,
    ),
  );
  for (let i = 2; i <= n; i++) {
    table = ok(handleMessage(table, `c${i}`, { type: 'sit', name: `Player ${i}` }, deps));
  }
  return { table, deps };
}

function started(n = 3) {
  const { table, deps } = seated(n);
  return { table: ok(handleMessage(table, 'c1', { type: 'start' }, deps)), deps };
}

const send = (table: TableState, credential: string, message: ClientMessage, deps: TableDeps) =>
  handleMessage(table, credential, message, deps);

describe('creating a table', () => {
  it('starts unclaimed and accepts nothing but createTable', () => {
    const deps = fakeDeps();
    const fresh = newTable();
    expect(fresh.status).toBe('new');
    expect(err(send(fresh, 'c1', { type: 'sit', name: 'Asha' }, deps))).toMatch(
      /no table with this code/,
    );
  });

  it('seats the creator as host with their chosen rules', () => {
    const deps = fakeDeps();
    const rules = { ...STANDARD_RULES, kidnap: true, turnTimerSeconds: 30 };
    const table = ok(send(newTable(), 'c1', { type: 'createTable', name: ' Asha ', rules }, deps));
    expect(table.status).toBe('lobby');
    expect(table.rules).toEqual(rules);
    expect(table.seats).toEqual([
      { playerId: 'player-1', name: 'Asha', credential: 'c1', isBot: false },
    ]);
    expect(table.hostId).toBe('player-1');
  });

  it('rejects bad rules and codes that are already taken', () => {
    const deps = fakeDeps();
    const bad = { type: 'createTable', name: 'Asha', rules: { decks: 9 } } as const;
    expect(err(send(newTable(), 'c1', bad, deps))).toMatch(/rules aren't valid/);
    const { table } = seated(1, deps);
    const again = { type: 'createTable', name: 'Bikash', rules: STANDARD_RULES } as const;
    expect(err(send(table, 'c2', again, deps))).toMatch(/already taken/);
  });
});

describe('seats', () => {
  it('seats players, makes the first one host, and starts their score at 0', () => {
    const { table } = seated(2);
    expect(table.seats.map((s) => s.name)).toEqual(['Player 1', 'Player 2']);
    expect(table.hostId).toBe(table.seats[0]!.playerId);
    expect(table.scores).toEqual({ 'player-1': 0, 'player-2': 0 });
  });

  it('updates the name when a seated player sits again', () => {
    const { table, deps } = seated(1);
    const renamed = ok(send(table, 'c1', { type: 'sit', name: '  Asha  ' }, deps));
    expect(renamed.seats).toEqual([
      { playerId: 'player-1', name: 'Asha', credential: 'c1', isBot: false },
    ]);
    expect(renamed.names).toEqual({ 'player-1': 'Asha' });
  });

  it('refuses a sixth player and players arriving mid-hand', () => {
    const { table, deps } = seated(5);
    expect(err(send(table, 'c6', { type: 'sit', name: 'Late' }, deps))).toMatch(/full/);
    const playing = started(3);
    expect(err(send(playing.table, 'c9', { type: 'sit', name: 'Late' }, playing.deps))).toMatch(
      /between hands/,
    );
  });

  it('hands the host role on when the host leaves', () => {
    const { table, deps } = seated(2);
    const left = ok(send(table, 'c1', { type: 'leave' }, deps));
    expect(left.hostId).toBe('player-2');
    expect(left.seats).toHaveLength(1);
  });
});

describe('rules', () => {
  it('lets only the host change rules, and validates them', () => {
    const { table, deps } = seated(2);
    const rules = { ...table.rules, kidnap: true };
    expect(err(send(table, 'c2', { type: 'setRules', rules }, deps))).toMatch(/Only the host/);
    expect(err(send(table, 'c1', { type: 'setRules', rules: { decks: 9 } }, deps))).toMatch(
      /rules aren't valid/,
    );
    expect(ok(send(table, 'c1', { type: 'setRules', rules }, deps)).rules.kidnap).toBe(true);
  });
});

describe('hands', () => {
  it('deals when the host starts with at least two players, and starts the turn timer', () => {
    const { table, deps } = seated(1);
    expect(err(send(table, 'c1', { type: 'start' }, deps))).toMatch(/At least 2/);

    const { table: playing, deps: d } = started(3);
    expect(playing.status).toBe('playing');
    expect(playing.handNumber).toBe(1);
    expect(playing.hand!.players.map((p) => p.id)).toEqual(['player-1', 'player-2', 'player-3']);
    expect(playing.turnDeadline).toBe(d.now() + 60_000);
  });

  it('makes players act as themselves, whatever playerId they send', () => {
    const { table, deps } = started(3);
    // c2 tries to draw for the player whose turn it is (player-1).
    const spoof = { type: 'action', action: { type: 'drawStock', playerId: 'player-1' } } as const;
    expect(err(send(table, 'c2', spoof, deps))).toMatch(/isn't your turn/);
    const drawn = ok(send(table, 'c1', spoof, deps));
    expect(drawn.hand!.phase).toBe('discard');
    expect(drawn.handLog!.actions).toHaveLength(1);
  });

  it('auto-plays a timed-out turn and restarts the timer for the next player', () => {
    const { table, deps } = started(3);
    expect(handleTimeout(table, deps)).toBeNull();

    deps.advance(60_000);
    const next = ok(handleTimeout(table, deps));
    expect(next.hand!.turn).toBe(1);
    expect(next.hand!.players[0]!.hand).toHaveLength(21);
    expect(next.turnDeadline).toBe(deps.now() + 60_000);
  });

  it('records a void hand and returns a replay that reproduces it', () => {
    let { table, deps } = started(2);
    let finished: ReplayRecord | undefined;
    while (table.status === 'playing') {
      deps.advance(60_000);
      const outcome = handleTimeout(table, deps)!;
      table = ok(outcome);
      if (outcome.ok && outcome.finished) finished = outcome.finished;
    }
    expect(table.status).toBe('handOver');
    expect(table.history).toEqual([{ handNumber: 1, winner: null, net: {} }]);
    expect(table.turnDeadline).toBeNull();

    let replayed = dealHand({
      playerIds: finished!.playerIds,
      rules: finished!.rules,
      seed: finished!.key,
      firstPlayer: finished!.firstPlayer,
    });
    for (const action of finished!.actions) {
      const result = applyAction(replayed, action);
      if (!result.ok) throw new Error(result.error);
      replayed = result.state;
    }
    expect(replayed).toEqual(table.hand);
  });

  it('adds a won hand to the scores and rotates the first player', () => {
    let { table, deps } = started(2);
    // Rig player-1 to have seen (tiplu 7H) holding four sets plus the card they'll draw.
    const hand = table.hand!;
    const p1 = hand.players[0]!;
    p1.seen = 'seen';
    p1.shown = [];
    p1.hand = [
      card('a', 'clubs', 2),
      card('b', 'clubs', 3),
      card('c', 'clubs', 4),
      card('d', 'spades', 9),
      card('e', 'spades', 10),
      card('f', 'spades', 11),
    ];
    // player-2 holds no maal either, so only the unseen penalty changes hands.
    hand.players[1]!.hand = [card('y', 'clubs', 9)];
    hand.tiplu = card('t', 'hearts', 7);
    hand.stock.push(card('x', 'diamonds', 13));

    table = ok(send(table, 'c1', { type: 'action', action: { type: 'drawStock' } }, deps));
    const groups = [
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ];
    const finish = { type: 'finish', cardId: 'x', groups };
    const outcome = send(table, 'c1', { type: 'action', action: finish }, deps);
    table = ok(outcome);

    expect(table.status).toBe('handOver');
    expect(table.history[0]!.winner).toBe('player-1');
    // No maal held; player-2 never saw and pays the unseen penalty of 10.
    expect(table.scores).toEqual({ 'player-1': 10, 'player-2': -10 });
    expect(outcome.ok && outcome.finished?.key).toBe('1'.padStart(64, '0'));

    const second = ok(send(table, 'c1', { type: 'start' }, deps));
    expect(second.handNumber).toBe(2);
    expect(second.hand!.turn).toBe(1);
  });
});

describe('ending the session', () => {
  it('is host-only and stops everything afterwards', () => {
    const { table, deps } = started(2);
    expect(err(send(table, 'c2', { type: 'endSession' }, deps))).toMatch(/Only the host/);
    const ended = ok(send(table, 'c1', { type: 'endSession' }, deps));
    expect(ended.status).toBe('ended');
    expect(ended.turnDeadline).toBeNull();
    expect(err(send(ended, 'c1', { type: 'start' }, deps))).toMatch(/session has ended/);
  });
});

describe('tableView', () => {
  it('shows each viewer only their own hand and never exposes credentials or the key', () => {
    const { table } = started(3);
    const connected = new Set(['c1', 'c3']);
    const view = tableView(table, 'c2', connected);

    expect(view.you).toEqual({ playerId: 'player-2', isHost: false, removed: false });
    expect(view.seats.map((s) => s.connected)).toEqual([true, false, true]);
    expect(view.hand!.you!.hand).toEqual(table.hand!.players[1]!.hand);
    expect(view.hand!.seats.every((s) => s.hand === null)).toBe(true);

    const json = JSON.stringify(view);
    expect(json).not.toContain('"c1"');
    expect(json).not.toContain(table.hand!.rng.key);
  });

  it('treats unseated connections as spectators', () => {
    const { table } = started(2);
    const view = tableView(table, 'stranger', new Set());
    expect(view.you).toEqual({ playerId: null, isHost: false, removed: false });
    expect(view.hand!.you).toBeNull();
  });
});

describe('bots', () => {
  it('lets the host add and remove bots between hands', () => {
    const { table, deps } = seated(1);
    expect(err(send(table, 'c2', { type: 'addBot' }, deps))).toMatch(/Only the host/);
    const withBot = ok(send(table, 'c1', { type: 'addBot' }, deps));
    const bot = withBot.seats[1]!;
    expect(bot).toMatchObject({ name: 'Hari', isBot: true, credential: `bot:${bot.playerId}` });
    expect(tableView(withBot, 'c1', new Set()).seats[1]).toMatchObject({
      isBot: true,
      connected: true,
    });

    const removed = ok(send(withBot, 'c1', { type: 'removePlayer', playerId: bot.playerId }, deps));
    expect(removed.seats).toHaveLength(1);
    expect(err(send(removed, 'c1', { type: 'removePlayer', playerId: 'nobody' }, deps))).toMatch(
      /not at the table/,
    );
  });

  it('plays a bot turn once it is due', () => {
    const { table: lobby, deps } = seated(1);
    let table = ok(send(lobby, 'c1', { type: 'addBot' }, deps));
    table = ok(send(table, 'c1', { type: 'start' }, deps));
    expect(table.botDueAt).toBeNull(); // the human (seat 0) starts

    table = ok(send(table, 'c1', { type: 'action', action: { type: 'drawStock' } }, deps));
    const cardId = table.hand!.players[0]!.hand.at(-1)!.id;
    table = ok(send(table, 'c1', { type: 'action', action: { type: 'discard', cardId } }, deps));
    expect(table.botDueAt).toBe(deps.now() + BOT_DELAY_MS);
    expect(nextWake(table)).toBe(table.botDueAt);
    expect(handleTimeout(table, deps)).toBeNull();

    deps.advance(BOT_DELAY_MS);
    table = ok(handleTimeout(table, deps));
    expect(table.hand!.turn).toBe(0);
    expect(table.hand!.players[1]!.hand).toHaveLength(21);
    expect(table.botDueAt).toBeNull();
    expect(table.handLog!.actions).toHaveLength(4);
  });

  it('finishes whole hands with bots and a timed-out human', () => {
    const { table: lobby, deps } = seated(1);
    let table = lobby;
    for (let i = 0; i < 3; i++) table = ok(send(table, 'c1', { type: 'addBot' }, deps));
    table = ok(send(table, 'c1', { type: 'start' }, deps));
    for (let i = 0; i < 2000 && table.status === 'playing'; i++) {
      deps.advance(Math.max(0, nextWake(table)! - deps.now()));
      table = ok(handleTimeout(table, deps));
    }
    expect(table.status).toBe('handOver');
    expect(table.history).toHaveLength(1);
  });
});

describe('chat and reactions', () => {
  it('keeps recent chat from seated players only', () => {
    let { table, deps } = seated(2);
    expect(err(send(table, 'stranger', { type: 'chat', text: 'hi' }, deps))).toMatch(/Sit down/);
    table = ok(send(table, 'c2', { type: 'chat', text: '  namaste  ' }, deps));
    expect(table.chat).toEqual([{ playerId: 'player-2', text: 'namaste', at: deps.now() }]);
    for (let i = 0; i < 60; i++)
      table = ok(send(table, 'c1', { type: 'chat', text: `${i}` }, deps));
    expect(table.chat).toHaveLength(50);
    expect(table.chat.at(-1)!.text).toBe('59');
    expect(tableView(table, null, new Set()).chat).toHaveLength(50);
  });

  it('returns reactions for broadcast without changing the table', () => {
    const { table, deps } = seated(2);
    const outcome = send(table, 'c2', { type: 'react', emoji: '👏' }, deps);
    expect(outcome).toMatchObject({ ok: true, reaction: { playerId: 'player-2', emoji: '👏' } });
    expect(outcome.ok && outcome.table).toEqual(table);
  });
});

describe('host controls', () => {
  it('removes another player, who then cannot sit again', () => {
    const { table, deps } = seated(3);
    expect(err(send(table, 'c2', { type: 'removePlayer', playerId: 'player-3' }, deps))).toMatch(
      /Only the host/,
    );
    expect(err(send(table, 'c1', { type: 'removePlayer', playerId: 'player-1' }, deps))).toMatch(
      /can't remove yourself/,
    );

    const removed = ok(send(table, 'c1', { type: 'removePlayer', playerId: 'player-3' }, deps));
    expect(removed.seats.map((s) => s.playerId)).toEqual(['player-1', 'player-2']);
    expect(tableView(removed, 'c3', new Set()).you).toEqual({
      playerId: null,
      isHost: false,
      removed: true,
    });
    expect(err(send(removed, 'c3', { type: 'sit', name: 'Again' }, deps))).toMatch(/removed you/);
    // The ban list never reaches clients.
    expect(JSON.stringify(tableView(removed, 'c2', new Set()))).not.toContain('"c3"');
  });

  it('cannot remove players during a hand', () => {
    const { table, deps } = started(3);
    expect(err(send(table, 'c1', { type: 'removePlayer', playerId: 'player-2' }, deps))).toMatch(
      /between hands/,
    );
  });

  it('locks the table to new seats without affecting seated players', () => {
    const { table, deps } = seated(2);
    expect(err(send(table, 'c2', { type: 'setLocked', locked: true }, deps))).toMatch(
      /Only the host/,
    );

    const locked = ok(send(table, 'c1', { type: 'setLocked', locked: true }, deps));
    expect(tableView(locked, 'c9', new Set()).locked).toBe(true);
    expect(err(send(locked, 'c9', { type: 'sit', name: 'Stranger' }, deps))).toMatch(/locked/);
    expect(ok(send(locked, 'c2', { type: 'sit', name: 'Renamed' }, deps)).seats[1]!.name).toBe(
      'Renamed',
    );
    expect(ok(send(locked, 'c1', { type: 'addBot' }, deps)).seats).toHaveLength(3);

    const unlocked = ok(send(locked, 'c1', { type: 'setLocked', locked: false }, deps));
    expect(ok(send(unlocked, 'c9', { type: 'sit', name: 'Stranger' }, deps)).seats).toHaveLength(3);
  });
});
