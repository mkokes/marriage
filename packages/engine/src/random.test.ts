import { createCipheriv } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { chacha20Block, chacha20KeyWords, createRng, randomInt, shuffle } from './random';
import { testKey } from './test/helpers';

describe('chacha20Block', () => {
  it('matches the RFC 8439 §2.3.2 test vector', () => {
    const key = Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0')).join('');
    const block = chacha20Block(chacha20KeyWords(key), 1, [0x09000000, 0x4a000000, 0]);
    // Serialized: 10 f1 e7 e4 d1 3b 59 15 50 0f dd 1f a3 20 71 c4 ...
    expect(block.slice(0, 4)).toEqual([0xe4e7f110, 0x15593bd1, 0x1fdd0f50, 0xc47120a3]);
  });

  it("matches Node's chacha20 keystream", () => {
    const key = 'a3'.repeat(16) + '5c'.repeat(16);
    const iv = Buffer.alloc(16);
    iv.writeUInt32LE(7, 0);
    const stream = createCipheriv('chacha20', Buffer.from(key, 'hex'), iv).update(Buffer.alloc(64));
    const expected = Array.from({ length: 16 }, (_, i) => stream.readUInt32LE(i * 4));
    expect(chacha20Block(chacha20KeyWords(key), 7)).toEqual(expected);
  });
});

describe('randomInt', () => {
  it('stays in range and covers every value', () => {
    let rng = createRng(testKey(3));
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const r = randomInt(6, rng);
      rng = r.rng;
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(6);
      seen.add(r.value);
    }
    expect(seen.size).toBe(6);
  });
});

describe('shuffle', () => {
  const items = Array.from({ length: 52 }, (_, i) => i);

  it('is deterministic for a key', () => {
    expect(shuffle(items, createRng(testKey(42)))).toEqual(shuffle(items, createRng(testKey(42))));
    expect(shuffle(items, createRng(testKey(42))).items).not.toEqual(
      shuffle(items, createRng(testKey(43))).items,
    );
  });

  it('returns a permutation and leaves the input untouched', () => {
    const { items: out } = shuffle(items, createRng(testKey(7)));
    expect(out.toSorted((a, b) => a - b)).toEqual(items);
    expect(items[0]).toBe(0);
  });
});
