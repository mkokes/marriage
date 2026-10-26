/**
 * Deterministic, cryptographically strong randomness: the ChaCha20 keystream (RFC 8439)
 * under a 256-bit key. The engine never calls Math.random. Every random choice reads
 * the next keystream word, and the position is kept in the game state, so a hand
 * replays exactly from its key. The key decides every hidden card, so it must come from
 * a CSPRNG (the server uses crypto.getRandomValues) and must never reach clients
 * before the hand is over: a weak or leaked key reveals every hand.
 */
export interface RngState {
  /** 256-bit ChaCha20 key as 64 hex characters. */
  key: string;
  /** Index of the next 32-bit keystream word to use. */
  position: number;
}

const KEY_PATTERN = /^[0-9a-f]{64}$/;

export function createRng(key: string): RngState {
  if (!KEY_PATTERN.test(key))
    throw new RangeError('An RNG key must be 64 lowercase hex characters');
  return { key, position: 0 };
}

const SIGMA = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]; // "expand 32-byte k"

/** The key's 8 little-endian 32-bit words. */
export function chacha20KeyWords(key: string): number[] {
  return Array.from({ length: 8 }, (_, i) => {
    const bytes = key
      .slice(i * 8, i * 8 + 8)
      .match(/../g)!
      .map((b) => parseInt(b, 16));
    return (bytes[0]! | (bytes[1]! << 8) | (bytes[2]! << 16) | (bytes[3]! << 24)) >>> 0;
  });
}

const rotl = (x: number, n: number): number => ((x << n) | (x >>> (32 - n))) >>> 0;

function quarterRound(s: number[], ia: number, ib: number, ic: number, id: number): void {
  let a = s[ia]!;
  let b = s[ib]!;
  let c = s[ic]!;
  let d = s[id]!;
  a = (a + b) >>> 0;
  d = rotl(d ^ a, 16);
  c = (c + d) >>> 0;
  b = rotl(b ^ c, 12);
  a = (a + b) >>> 0;
  d = rotl(d ^ a, 8);
  c = (c + d) >>> 0;
  b = rotl(b ^ c, 7);
  s[ia] = a;
  s[ib] = b;
  s[ic] = c;
  s[id] = d;
}

/** The ChaCha20 block function: 16 keystream words for one block counter. */
export function chacha20Block(
  key: readonly number[],
  counter: number,
  nonce: readonly number[] = [0, 0, 0],
): number[] {
  const input = [...SIGMA, ...key, counter >>> 0, ...nonce];
  const s = [...input];
  for (let i = 0; i < 10; i++) {
    quarterRound(s, 0, 4, 8, 12);
    quarterRound(s, 1, 5, 9, 13);
    quarterRound(s, 2, 6, 10, 14);
    quarterRound(s, 3, 7, 11, 15);
    quarterRound(s, 0, 5, 10, 15);
    quarterRound(s, 1, 6, 11, 12);
    quarterRound(s, 2, 7, 8, 13);
    quarterRound(s, 3, 4, 9, 14);
  }
  return s.map((word, i) => (word + input[i]!) >>> 0);
}

function nextWord(rng: RngState): { value: number; rng: RngState } {
  const block = chacha20Block(chacha20KeyWords(rng.key), Math.floor(rng.position / 16));
  return { value: block[rng.position % 16]!, rng: { key: rng.key, position: rng.position + 1 } };
}

/** A uniformly random integer in [0, max), without modulo bias. */
export function randomInt(max: number, rng: RngState): { value: number; rng: RngState } {
  if (!Number.isInteger(max) || max < 1 || max > 2 ** 32) throw new RangeError('Bad range');
  const limit = 2 ** 32 - (2 ** 32 % max);
  let r = nextWord(rng);
  while (r.value >= limit) r = nextWord(r.rng);
  return { value: r.value % max, rng: r.rng };
}

/** Fisher–Yates shuffle; returns a new array and the advanced RNG state. */
export function shuffle<T>(items: readonly T[], rng: RngState): { items: T[]; rng: RngState } {
  const out = [...items];
  let state = rng;
  for (let i = out.length - 1; i > 0; i--) {
    const r = randomInt(i + 1, state);
    state = r.rng;
    [out[i], out[r.value]] = [out[r.value]!, out[i]!];
  }
  return { items: out, rng: state };
}
