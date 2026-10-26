import { describe, expect, it } from 'vitest';
import { shuffle } from './random';

describe('shuffle', () => {
  const items = Array.from({ length: 52 }, (_, i) => i);

  it('is deterministic for a seed', () => {
    expect(shuffle(items, 42)).toEqual(shuffle(items, 42));
    expect(shuffle(items, 42).items).not.toEqual(shuffle(items, 43).items);
  });

  it('returns a permutation and leaves the input untouched', () => {
    const { items: out } = shuffle(items, 7);
    expect(out.toSorted((a, b) => a - b)).toEqual(items);
    expect(items[0]).toBe(0);
  });
});
