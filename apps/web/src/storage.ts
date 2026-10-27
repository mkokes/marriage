/** Where this device remembers the player's name. */
export const NAME_KEY = 'marriage.name';

/** localStorage that never throws (private browsing, blocked storage, previews). */
export const local = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Not persisted; fine for conveniences.
    }
  },
};
