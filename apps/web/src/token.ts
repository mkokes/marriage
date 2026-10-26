const STORAGE_KEY = 'marriage.token';

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

/**
 * This device's secret token, used to reclaim its seat after a reconnect. Falls back
 * to a per-page token when storage is unavailable (e.g. private browsing).
 */
export function deviceToken(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const token = newToken();
    localStorage.setItem(STORAGE_KEY, token);
    return token;
  } catch {
    return newToken();
  }
}
