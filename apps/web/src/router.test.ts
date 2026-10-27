import { describe, expect, it } from 'vitest';
import { parseRoute } from './router';

describe('parseRoute', () => {
  it.each([
    ['', { kind: 'home' }],
    ['?new', { kind: 'setup' }],
    ['?table=QXRT', { kind: 'table', code: 'QXRT' }],
    ['?table=qxrt', { kind: 'table', code: 'QXRT' }],
    ['?table=launch-check', { kind: 'badCode', input: 'launch-check' }],
  ])('%s', (search, route) => {
    expect(parseRoute(search)).toEqual(route);
  });
});
