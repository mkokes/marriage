import { describe, expect, it } from 'vitest';
import { card, newHand } from './test/helpers';
import { viewFor } from './view';

describe('viewFor', () => {
  const state = newHand();
  state.tiplu = card('7H');
  state.players[1]!.seen = 'seen';

  it("shows players their own hand but never anyone else's, the stock, or the seed", () => {
    const view = viewFor(state, 'p0');
    expect(view.you?.hand).toEqual(state.players[0]!.hand);
    expect(view.seats.every((s) => s.hand === null)).toBe(true);
    expect(view.seats[1]!.handCount).toBe(21);
    expect(view.stockCount).toBe(state.stock.length);
    expect(JSON.stringify(view)).not.toContain(state.players[1]!.hand[0]!.id + '"');
    expect(view).not.toHaveProperty('stock');
    expect(view).not.toHaveProperty('seed');
  });

  it('reveals the tiplu only to players who have seen', () => {
    expect(viewFor(state, 'p0').tiplu).toBeNull();
    expect(viewFor(state, 'p1').tiplu).toEqual(card('7H'));
  });

  it('gives spectators no hand and no tiplu', () => {
    const view = viewFor(state, null);
    expect(view.you).toBeNull();
    expect(view.tiplu).toBeNull();
  });

  it('reveals everything once the hand is over', () => {
    const over = { ...state, phase: 'over' as const, result: { kind: 'void' as const } };
    const view = viewFor(over, null);
    expect(view.tiplu).toEqual(card('7H'));
    expect(view.seats[2]!.hand).toEqual(state.players[2]!.hand);
  });
});
