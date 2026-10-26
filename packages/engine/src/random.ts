/**
 * Deterministic PRNG (mulberry32). The engine never calls Math.random: every random
 * choice threads a numeric seed through the game state so hands can be replayed.
 */
export function nextRandom(seed: number): { value: number; seed: number } {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next };
}

/** A random integer in [0, max). */
export function randomInt(max: number, seed: number): { value: number; seed: number } {
  const r = nextRandom(seed);
  return { value: Math.floor(r.value * max), seed: r.seed };
}

/** Fisher–Yates shuffle; returns a new array and the advanced seed. */
export function shuffle<T>(items: readonly T[], seed: number): { items: T[]; seed: number } {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    const r = randomInt(i + 1, s);
    s = r.seed;
    [out[i], out[r.value]] = [out[r.value]!, out[i]!];
  }
  return { items: out, seed: s };
}
