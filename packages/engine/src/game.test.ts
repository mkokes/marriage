import { describe, expect, it } from 'vitest';
import { applyAction, HAND_SIZE, type Action, type HandState } from './game';
import { card, cards, ids, newHand, rig } from './test/helpers';

function act(state: HandState, action: Action): HandState {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

function errorOf(state: HandState, action: Action): string {
  const result = applyAction(state, action);
  if (result.ok) throw new Error('Expected the action to be rejected');
  return result.error;
}

/** Three pure sequences + 12 loose cards: a hand ready to see. */
const READY_TO_SEE = 'AS 2S 3S  5H 6H 7H  9C 10C JC  2D 4D 6D 8D 10D QD 3H 9H JH KH 4S 8S';
const PRIMARY = ['AS 2S 3S', '5H 6H 7H', '9C 10C JC'].map(ids);

function withDiscard(rules: Parameters<typeof newHand>[0] = {}) {
  const state = rig(newHand(rules), 0, '6H 7H 2C 9S');
  state.discardPile = [card('8H')];
  return state;
}

function readyToSee(rules: Parameters<typeof newHand>[0] = {}) {
  const state = rig(newHand(rules), 0, READY_TO_SEE);
  return act(state, { type: 'drawStock', playerId: 'p0' });
}

/** p0 has seen (tiplu 7H) and holds 12 cards; the next stock card is `draw`. */
function seenPlayer(hand: string, draw: string): HandState {
  const state = rig(newHand(), 0, hand);
  const p0 = state.players[0]!;
  p0.seen = 'seen';
  p0.shown = ['AS 2S 3S', '5H 6H 7H#1', '9C 10C JC'].map(cards);
  state.tiplu = card('7H');
  state.stock.push(card(draw));
  return act(state, { type: 'drawStock', playerId: 'p0' });
}

function lastStockCard(rules: Parameters<typeof newHand>[0]) {
  const state = newHand(rules);
  state.stock = state.stock.slice(-1);
  const drawn = act(state, { type: 'drawStock', playerId: 'p0' });
  return act(drawn, { type: 'discard', playerId: 'p0', cardId: drawn.players[0]!.hand[0]!.id });
}

describe('dealHand', () => {
  it('deals 21 cards each, offers one card, and keeps every card exactly once', () => {
    const state = newHand({}, 4);
    for (const p of state.players) expect(p.hand).toHaveLength(HAND_SIZE);
    expect(state.discardPile).toHaveLength(1);
    expect(state.stock).toHaveLength(156 - 4 * HAND_SIZE - 1);
    const all = [...state.stock, ...state.discardPile, ...state.players.flatMap((p) => p.hand)];
    expect(new Set(all.map((c) => c.id)).size).toBe(156);
  });

  it('is deterministic for a seed', () => {
    expect(newHand({}, 3, 9)).toEqual(newHand({}, 3, 9));
  });

  it('rejects bad player counts and invalid rules', () => {
    expect(() => newHand({}, 1)).toThrow(RangeError);
    expect(() => newHand({}, 6)).toThrow(RangeError);
    expect(() => newHand({ kidnap: true, murder: true })).toThrow(/kidnap and murder/);
  });
});

describe('turns', () => {
  it('enforces turn order and draw-then-discard', () => {
    const state = newHand();
    expect(errorOf(state, { type: 'drawStock', playerId: 'p1' })).toMatch(/isn't your turn/);
    const discardFirst = {
      type: 'discard',
      playerId: 'p0',
      cardId: state.players[0]!.hand[0]!.id,
    } as const;
    expect(errorOf(state, discardFirst)).toMatch(/Draw a card first/);

    const drawn = act(state, { type: 'drawStock', playerId: 'p0' });
    expect(drawn.players[0]!.hand).toHaveLength(22);
    expect(errorOf(drawn, { type: 'drawStock', playerId: 'p0' })).toMatch(/already drawn/);

    const next = act(drawn, { ...discardFirst });
    expect(next.players[0]!.hand).toHaveLength(21);
    expect(next.discardPile.at(-1)!.id).toBe(discardFirst.cardId);
    expect(next.turn).toBe(1);
    expect(next.phase).toBe('draw');
  });

  it('never mutates the input state', () => {
    const state = newHand();
    const before = structuredClone(state);
    act(state, { type: 'drawStock', playerId: 'p0' });
    expect(state).toEqual(before);
  });
});

describe('taking the discard', () => {
  it('is allowed when it completes a set with named hand cards', () => {
    const state = act(withDiscard(), {
      type: 'drawDiscard',
      playerId: 'p0',
      withCards: ids('6H 7H'),
    });
    expect(state.players[0]!.hand.map((c) => c.id)).toContain(card('8H').id);
    expect(state.pickedFromDiscard).toBe(card('8H').id);
  });

  it('is rejected when it does not complete a set', () => {
    expect(errorOf(withDiscard(), { type: 'drawDiscard', playerId: 'p0' })).toMatch(
      /completes a set/,
    );
    const wrong = { type: 'drawDiscard', playerId: 'p0', withCards: ids('2C 9S') } as const;
    expect(errorOf(withDiscard(), wrong)).toMatch(/completes a set/);
    const notHeld = { type: 'drawDiscard', playerId: 'p0', withCards: ids('6H 9H') } as const;
    expect(errorOf(withDiscard(), notHeld)).toMatch(/isn't in your hand/);
  });

  it('follows the discardPickup setting', () => {
    expect(
      errorOf(withDiscard({ discardPickup: 'never' }), { type: 'drawDiscard', playerId: 'p0' }),
    ).toMatch(/not allowed/);
    expect(
      applyAction(withDiscard({ discardPickup: 'free' }), { type: 'drawDiscard', playerId: 'p0' })
        .ok,
    ).toBe(true);
  });

  it("can't be discarded straight back", () => {
    const state = act(withDiscard({ discardPickup: 'free' }), {
      type: 'drawDiscard',
      playerId: 'p0',
    });
    expect(errorOf(state, { type: 'discard', playerId: 'p0', cardId: card('8H').id })).toMatch(
      /just picked up/,
    );
  });
});

describe('seeing', () => {
  it('shows three pure sequences, sets the tiplu, and moves it to the bottom of the stock', () => {
    const before = readyToSee();
    const pick = before.stock[10]!;
    const state = act(before, {
      type: 'discard',
      playerId: 'p0',
      cardId: card('KH').id,
      show: { groups: PRIMARY, tipluPick: 10 },
    });
    const p0 = state.players[0]!;
    expect(p0.seen).toBe('seen');
    expect(p0.shown).toHaveLength(3);
    expect(p0.hand).toHaveLength(12);
    expect(state.tiplu).toEqual(pick);
    expect(state.stock[0]).toEqual(pick);
    expect(state.stock).toHaveLength(before.stock.length);
  });

  it('accepts tunnelas unless the table requires pure sequences only', () => {
    const groups = [ids('4S 4S#1 4S#2'), ...PRIMARY.slice(1)];
    // Swap the A-2-3 run for a tunnela of 4♠ (the loose 4♠ completes it) plus a spare K♠.
    const hand = READY_TO_SEE.replace('AS 2S 3S', '4S#1 4S#2 KS');
    const base = (rules = {}) =>
      act(rig(newHand(rules), 0, hand), { type: 'drawStock', playerId: 'p0' });
    const show = {
      type: 'discard',
      playerId: 'p0',
      cardId: card('KS').id,
      show: { groups },
    } as const;
    expect(act(base(), show).players[0]!.seen).toBe('seen');
    expect(errorOf(base({ seeRequirement: 'pureSequenceOnly' }), show)).toMatch(/To see/);
  });

  it('rejects anything else and leaves the hand untouched', () => {
    const state = readyToSee();
    const groups = [...PRIMARY.slice(0, 2), ids('2D 4D 6D')];
    const action = {
      type: 'discard',
      playerId: 'p0',
      cardId: card('KH').id,
      show: { groups },
    } as const;
    expect(errorOf(state, action)).toMatch(/To see/);
    expect(state.players[0]!.hand).toHaveLength(22);
  });

  it('sees with seven dublees when enabled', () => {
    const dublees = 'AS AS#1 3D 3D#1 5C 5C#1 7H 7H#1 9S 9S#1 JD JD#1 KC KC#1';
    const hand = `${dublees} 2H 4H 6H 8H 10H QH 2C`;
    const groups = dublees.match(/\S+ \S+/g)!.map(ids);
    const action = {
      type: 'discard',
      playerId: 'p0',
      cardId: card('2C').id,
      show: { groups },
    } as const;
    const ready = (rules = {}) =>
      act(rig(newHand(rules), 0, hand), { type: 'drawStock', playerId: 'p0' });

    const state = act(ready(), action);
    expect(state.players[0]!.seen).toBe('seenDublees');
    expect(state.players[0]!.hand).toHaveLength(7);
    expect(errorOf(ready({ dublees: false }), action)).toMatch(/To see/);
  });
});

describe('finishing', () => {
  const SETS = ['2C 3C 4C', '5D 5S 5H#1', '10S JS QS', 'KD 7S AD'];

  it('wins with every concealed card in a valid set, using jokers', () => {
    const state = seenPlayer(SETS.join(' '), '9D');
    const done = act(state, {
      type: 'finish',
      playerId: 'p0',
      cardId: card('9D').id,
      groups: SETS.map(ids),
    });
    expect(done.phase).toBe('over');
    expect(done.result).toMatchObject({ kind: 'won', winner: 0, method: 'sets' });
    expect(done.discardPile.at(-1)!.id).toBe(card('9D').id);
  });

  it('rejects invalid sets and incomplete groupings', () => {
    const state = seenPlayer(SETS.join(' '), '9D');
    const bad = [...SETS.slice(0, 3), 'KD 9D AD'];
    const discardAD = {
      type: 'finish',
      playerId: 'p0',
      cardId: card('7S').id,
      groups: bad.map(ids),
    } as const;
    expect(errorOf(state, discardAD)).toMatch(/Not a valid set/);
    const partial = {
      type: 'finish',
      playerId: 'p0',
      cardId: card('9D').id,
      groups: SETS.slice(1).map(ids),
    } as const;
    expect(errorOf(state, partial)).toMatch(/exactly one set/);
  });

  it('requires having seen', () => {
    const state = act(rig(newHand(), 0, READY_TO_SEE), { type: 'drawStock', playerId: 'p0' });
    const action = { type: 'finish', playerId: 'p0', cardId: card('KH').id, groups: [] } as const;
    expect(errorOf(state, action)).toMatch(/must see/);
  });

  it('wins with an eighth dublee after seeing with dublees', () => {
    const state = rig(newHand(), 0, '2H 4H 6H 8H 10H QH 2C');
    const p0 = state.players[0]!;
    p0.seen = 'seenDublees';
    p0.shown = 'AS AS#1 3D 3D#1 5C 5C#1 7H 7H#1 9S 9S#1 JD JD#1 KC KC#1'
      .match(/\S+ \S+/g)!
      .map(cards);
    state.tiplu = card('9D');
    state.stock.push(card('4H#1'));
    const drawn = act(state, { type: 'drawStock', playerId: 'p0' });

    const done = act(drawn, {
      type: 'finish',
      playerId: 'p0',
      cardId: card('2C').id,
      groups: [ids('4H 4H#1')],
    });
    expect(done.result).toMatchObject({ kind: 'won', method: 'dublees' });
    const notPair = {
      type: 'finish',
      playerId: 'p0',
      cardId: card('2C').id,
      groups: [ids('4H 6H')],
    } as const;
    expect(errorOf(drawn, notPair)).toMatch(/eighth dublee/);
  });
});

describe('stock exhaustion', () => {
  it('voids the hand by default', () => {
    const state = lastStockCard({});
    expect(state.phase).toBe('over');
    expect(state.result).toEqual({ kind: 'void' });
  });

  it('can reshuffle the discard pile into a new stock, keeping the top card', () => {
    const state = lastStockCard({ stockExhausted: 'reshuffle' });
    expect(state.phase).toBe('draw');
    expect(state.stock).toHaveLength(1);
    expect(state.discardPile).toHaveLength(1);
  });
});
