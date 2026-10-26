import { describe, expect, it } from 'vitest';
import { STANDARD_RULES } from './config';
import { maalPoints, maalRole, wildsFor } from './maal';
import { card, cards } from './test/helpers';

describe('maalRole', () => {
  const tiplu = card('7H');

  it.each([
    ['7H#1', 'tiplu'],
    ['6H', 'jhiplu'],
    ['8H', 'poplu'],
    ['7D', 'alter'],
    ['7S', 'ordinaryJoker'],
    ['7C', 'ordinaryJoker'],
    ['JK', 'man'],
    ['9H', null],
    ['6D', null],
  ])('%s is %s', (code, role) => {
    expect(maalRole(card(code), tiplu)).toBe(role);
  });

  it('wraps around the ace', () => {
    expect(maalRole(card('KS'), card('AS'))).toBe('jhiplu');
    expect(maalRole(card('AS'), card('KS'))).toBe('poplu');
  });
});

describe('wildsFor', () => {
  it('makes jhiplu/poplu wild only when configured', () => {
    const tiplu = card('7H');
    expect(wildsFor(tiplu, STANDARD_RULES)(card('8H'))).toBe(true);
    expect(wildsFor(tiplu, { ...STANDARD_RULES, jhipluPopluWild: false })(card('8H'))).toBe(false);
    expect(wildsFor(tiplu, { ...STANDARD_RULES, jhipluPopluWild: false })(card('7S'))).toBe(true);
  });
});

describe('maalPoints', () => {
  const tiplu = card('7H');

  it('adds up individual maal cards', () => {
    // tiplu 3 + jhiplu 2 + alter 5; the ordinary joker and plain cards score nothing
    expect(maalPoints(cards('7H#1 6H 7D 7S 2C'), [], tiplu, STANDARD_RULES)).toBe(10);
  });

  it('scores a marriage instead of its three cards', () => {
    expect(maalPoints(cards('6H 7H#1 8H'), [], tiplu, STANDARD_RULES)).toBe(10);
    expect(maalPoints(cards('6H 7H#1 8H 8H#1'), [], tiplu, STANDARD_RULES)).toBe(12);
  });

  it('treats a value of 0 as not maal', () => {
    const rules = { ...STANDARD_RULES, maal: { ...STANDARD_RULES.maal, alter: 0 } };
    expect(maalPoints(cards('7D'), [], tiplu, rules)).toBe(0);
  });

  it('adds points for shown tunnelas', () => {
    const tunnela = cards('2C 2C#1 2C#2');
    expect(maalPoints(tunnela, [tunnela], tiplu, STANDARD_RULES)).toBe(5);
  });
});
