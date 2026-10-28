# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GPL-3.0-or-later license (`LICENSE`).

## [0.4.0] - 2026-10-26

### Added

- Light and dark themes. The app follows the device's setting by default; a System / Light / Dark switch beside the language switch (a single button on phones) overrides it, and the choice is remembered on the device. Light mode is a daytime lokta-paper look; the card table stays a night-indigo felt in both.

### Changed

- A more festive look: a starry Tihar night sky with diyo glow (or a paper-grain day), a marigold garland under the dhaka band, a clay diyo on the home screen, Yatra One section headings with a beaded rule, a woven felt table with a lamp-lit centre, and cards with a printed paper face and a framed dhaka back with a marigold medallion.
- Motion: cards are dealt into your hand, each discard lands on the pile, the player whose turn it is has a flickering diyo, your turn prompt glows, and screens rise into place. All of it is off when the device asks for reduced motion.

## [0.3.0] - 2026-10-26

### Added

- English and Nepali. A switch in the top corner of every screen changes language instantly, mid-game included. The first visit follows the browser's language, and the choice is remembered on the device. Nepali uses Devanagari digits and the words players use at the table (टिप्लु, माल, डबली…), with traditional card and suit names (एक्का, बादशाह, बेगम, गुलाम; पान, ईंट, चिडी, हुकुम).
- Error codes: every engine and server error carries a stable `code` alongside its English text, so the app shows it in the player's language. Rule-validation problems are structured (`ruleProblems`) for the same reason.

### Changed

- The "To see…" error names the right sets when a table allows only pure sequences.
- The invalid-set error no longer lists internal card ids.

## [0.2.1] - 2026-10-26

### Fixed

- After a release, returning players got the previous version from the offline cache until they reloaded, so an old app could talk to a newer game server. The app now reloads itself as soon as a new version is downloaded, and long-open tabs check for updates hourly.

### Changed

- The Deploy workflow builds the web app before deploying the game server, so a broken build can't leave a new server live behind the old app. The pre-push hook now runs the production build too.

## [0.2.0] - 2026-10-26

### Added

- Host controls: the host can remove another player between hands (they can't sit at that table again) and lock the table so nobody new can take a seat.
- Table setup step: "Start a table" now opens a page with your name and the rules, pre-filled with Standard. "Create table" claims a code and opens the lobby with you as host.
- A "No table called …" page for codes nobody has created.
- Continuous deployment: every push to `main` runs the checks, deploys the game server to Cloudflare, then publishes the web app, in that order.

### Changed

- Table codes are four capital consonants, like a Jackbox room code (e.g. `SRWX`). Joining accepts lowercase, and the lobby shows the code to read out.
- Tables must be created before anyone can sit; unclaimed codes accept only `createTable`.
- The game server only creates Durable Objects for well-formed table codes.
- "Remove" in the lobby now works for any player, not just bots.
- The version now lives in the root `package.json`, starting at 0.2.0.

### Fixed

- Local development: game connections through the Vite proxy were rejected by the origin check, because `wrangler dev` rewrites the Origin to the custom domain. Same-origin requests are now allowed.

## [0.1.0] - 2026-10-26

### Added

- Product and rules spec in `docs/SPEC.md`.
- pnpm monorepo: shared `@marriage/engine` package, a `partyserver` Cloudflare Worker with one Durable Object per table, and a Vite + React PWA client connected over `partysocket`.
- Rules engine: seeded shuffling, configurable `RulesConfig` with a Standard preset, set validation (pure/dirty sequences, tunnelas, trials, dublees), tiplu roles and wild cards, maal points, the hand state machine (deal, draw, discard, see, finish, stock exhaustion), net settlement with penalties, kidnap and murder, and per-player redacted views.
- Tooling: Vitest, oxlint (type-aware), oxfmt, and a husky pre-push hook running lint, format check, typecheck and tests.
- Table server: seats with a host, rule changes between hands, dealing with a rotating first player, server-validated play, session scores and hand history, and spectators.
- Turn timer: a Durable Object alarm auto-plays a timed-out turn (draw from the stock, discard the newest card).
- Persistence: table state survives restarts and deploys, and every finished hand is stored as a replay (RNG key plus action log).
- Reconnecting: devices keep a secret token that reclaims their seat; the server stores only its hash.
- `@marriage/protocol` package with the client/server message types and runtime checks.
- Game UI: start or join a table by code, a lobby with an invite link and a rules editor for the host, and the table itself: opponents, stock and discard, the tiplu once seen, a turn prompt with timer, and your hand as grouped fans you arrange by tapping, with set names shown as you build them. Discard, show and finish are offered only when valid. End-of-hand results reveal every hand with maal and points, and the session ends with final totals.
- Nepali-inspired look: night indigo table, crimson and marigold accents, lokta-paper cards and a dhaka-weave band.
- Bots: the host can seat bots between hands. They play from their own view of the table only (no peeking), take discards that complete sets, show and finish when they can, and move after a short pause.
- Table chat with recent history, and quick emoji reactions that appear beside the sender's name.
- Deployment: the web app is published to GitHub Pages (cards.martykokes.com) by a workflow that runs the checks first. The game server is a Cloudflare Worker on cards-api.martykokes.com (`pnpm run deploy`). `pnpm run preview` serves the production build locally.
- Replays: watch any finished hand step by step with every card face up, from the results screen or the final totals.

### Changed

- Linting and formatting moved from ESLint and Prettier to oxlint and oxfmt.
- TypeScript upgraded to 7.

### Security

- The table server no longer rebroadcasts raw client messages, which let players forge server messages.
- Shuffling uses ChaCha20 under a 256-bit key instead of a 32-bit seed, which could be brute-forced from a player's own hand to reveal every other hand.
- The engine validates every action and rule field at runtime, so malformed client input is rejected instead of crashing a hand.
- The game server only accepts browser connections from the web app's own origin.
