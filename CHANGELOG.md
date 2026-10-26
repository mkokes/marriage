# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
