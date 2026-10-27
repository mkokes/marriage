import { registerSW } from 'virtual:pwa-register';

/** How often a long-open tab checks for a new version. */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Registers the offline service worker. With `registerType: 'autoUpdate'`, the page
 * reloads as soon as a new version takes control, so nobody keeps playing on a stale
 * app that no longer matches the game server. Reloading is safe mid-game: the seat
 * comes back via the device token and the hand arrangement is in localStorage.
 */
export function startServiceWorker(): void {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), UPDATE_CHECK_MS);
    },
  });
}
