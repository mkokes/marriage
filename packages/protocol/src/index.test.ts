import { describe, expect, it } from 'vitest';
import { isClientMessage, MAX_CHAT_LENGTH, MAX_NAME_LENGTH, TOKEN_PATTERN } from './index';

describe('isClientMessage', () => {
  it.each([
    { type: 'sit', name: 'Asha' },
    { type: 'leave' },
    { type: 'setRules', rules: {} },
    { type: 'start' },
    { type: 'action', action: { type: 'drawStock' } },
    { type: 'endSession' },
    { type: 'addBot' },
    { type: 'removeBot', playerId: 'abc' },
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
    ['removeBot without id', { type: 'removeBot' }],
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
