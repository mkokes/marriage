import { parseTableCode } from '@marriage/protocol';
import { useSyncExternalStore } from 'react';

/**
 * Screens are chosen by the query string so the app works on static hosting:
 * `/` home, `?new` table setup, `?table=QXRT` a table.
 */
export type Route =
  | { kind: 'home' }
  | { kind: 'setup' }
  | { kind: 'table'; code: string }
  | { kind: 'badCode'; input: string };

export function parseRoute(search: string): Route {
  const params = new URLSearchParams(search);
  if (params.has('new')) return { kind: 'setup' };
  const input = params.get('table');
  if (input === null) return { kind: 'home' };
  const code = parseTableCode(input);
  return code ? { kind: 'table', code } : { kind: 'badCode', input };
}

/** Changes screen without reloading the page. */
export function navigate(search: string, { replace = false } = {}): void {
  const url = search || window.location.pathname;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
};

/** The current location's query string; re-renders on navigation and Back/Forward. */
export const useSearch = (): string =>
  useSyncExternalStore(subscribe, () => window.location.search);
