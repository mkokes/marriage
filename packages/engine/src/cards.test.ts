import { describe, expect, it } from 'vitest';
import { buildShoe } from './cards';

describe('buildShoe', () => {
  it('builds three standard decks with unique ids', () => {
    const shoe = buildShoe(3, false);
    expect(shoe).toHaveLength(156);
    expect(new Set(shoe.map((c) => c.id)).size).toBe(156);
  });

  it('adds two printed jokers per deck when enabled', () => {
    const shoe = buildShoe(3, true);
    expect(shoe.filter((c) => c.kind === 'printedJoker')).toHaveLength(6);
  });
});
