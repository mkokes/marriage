import { describe, expect, it } from 'vitest';
import {
  isClientMessage,
  MAX_CHAT_LENGTH,
  MAX_NAME_LENGTH,
  newTableCode,
  parseTableCode,
  TABLE_CODE_PATTERN,
  TOKEN_PATTERN,
} from './index';

describe('isClientMessage', () => {
  it.each([
    { type: 'sit', name: 'Asha' },
    { type: 'leave' },
    { type: 'setRules', rules: {} },
    { type: 'start' },
    { type: 'action', action: { type: 'drawStock' } },
    { type: 'endSession' },
    { type: 'addBot' },
    { type: 'createTable', name: 'Asha', rules: {} },
    { type: 'removePlayer', playerId: 'abc' },
    { type: 'setLocked', locked: true },
    { type: 'chat', text: 'namaste' },
    { type: 'react', emoji: '🙏' },
    { type: 'getReplay', handNumber: 2 },
  ])('accepts $type', (message) => {
    expect(isClientMessage(message)).toBe(true);
  });

  it.each([
    ['not an object', 'start'],
    ['an array', ['start']],
    ['unknown type', { type: 'deal' }],
    ['blank name', { type: 'sit', name: '   ' }],
    ['long name', { type: 'sit', name: 'x'.repeat(MAX_NAME_LENGTH + 1) }],
    ['missing rules', { type: 'setRules' }],
    ['missing action', { type: 'action' }],
    ['blank chat', { type: 'chat', text: '  ' }],
    ['long chat', { type: 'chat', text: 'x'.repeat(MAX_CHAT_LENGTH + 1) }],
    ['unknown reaction', { type: 'react', emoji: '💩' }],
    ['fractional hand number', { type: 'getReplay', handNumber: 1.5 }],
    ['removePlayer without id', { type: 'removePlayer' }],
    ['setLocked without a boolean', { type: 'setLocked', locked: 'yes' }],
  ])('rejects %s', (_, message) => {
    expect(isClientMessage(message)).toBe(false);
  });
});

describe('TOKEN_PATTERN', () => {
  it('requires a long URL-safe token', () => {
    expect(TOKEN_PATTERN.test('a'.repeat(22))).toBe(true);
    expect(TOKEN_PATTERN.test('short')).toBe(false);
    expect(TOKEN_PATTERN.test(`${'a'.repeat(22)}&name=x`)).toBe(false);
  });
});

describe('table codes', () => {
  it('makes four-consonant codes from random bytes, skipping biased bytes', () => {
    const bytes = [240, 255, 0, 1, 19, 20, 7, 7];
    const code = newTableCode((n) => Uint8Array.from(bytes.slice(0, n)));
    expect(code).toBe('BCZB');
    expect(TABLE_CODE_PATTERN.test(code)).toBe(true);
  });

  it('parses what people type', () => {
    expect(parseTableCode(' bcdf ')).toBe('BCDF');
    expect(parseTableCode('ABCD')).toBeNull(); // vowels never appear in codes
    expect(parseTableCode('BCD')).toBeNull();
    expect(parseTableCode('BCDFG')).toBeNull();
  });
});
