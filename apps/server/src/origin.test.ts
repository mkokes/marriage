import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from './origin';

const ALLOWED = 'https://cards.martykokes.com, https://other.example';

describe('isAllowedOrigin', () => {
  it.each([
    ['https://cards.martykokes.com', true],
    ['https://other.example', true],
    ['http://localhost:5173', true],
    ['http://localhost', true],
    [null, true],
    ['https://evil.example', false],
    ['http://cards.martykokes.com', false],
    ['https://cards.martykokes.com.evil.example', false],
    ['http://localhost.evil.example', false],
    ['https://localhost:5173', false],
    ['http://cards-api.martykokes.com', true], // same origin as the server
    ['https://cards-api.martykokes.com.evil.example', false],
    ['not a url', false],
  ])('%s → %s', (origin, expected) => {
    expect(isAllowedOrigin(origin, ALLOWED, 'cards-api.martykokes.com')).toBe(expected);
  });
});
