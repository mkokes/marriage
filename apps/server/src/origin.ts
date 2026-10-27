/**
 * Browsers always send an Origin header, so this stops other websites from opening
 * game connections from a visitor's browser. Requests without one (scripts, tests)
 * are allowed; they can't borrow a visitor's identity anyway, since that lives in
 * the token, not a cookie. Same-origin requests are always fine; this also covers
 * `wrangler dev`, which rewrites Host and Origin to the route's custom domain.
 */
export function isAllowedOrigin(
  origin: string | null,
  allowed: string,
  requestUrl: string,
): boolean {
  if (origin === null) return true;
  if (URL.canParse(origin) && new URL(origin).origin === new URL(requestUrl).origin) return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return allowed.split(',').some((o) => o.trim() === origin);
}
