import { describe, expect, it } from 'vitest';
import { isClientMessage, MAX_NAME_LENGTH, TOKEN_PATTERN } from './index';

describe('isClientMessage', () => {
  it.each([
    { type: 'sit', name: 'Asha' },
    { type: 'leave' },
    { type: 'setRules', rules: {} },
    { type: 'start' },
    { type: 'action', action: { type: 'drawStock' } },
    { type: 'endSession' },
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
