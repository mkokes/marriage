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

### Changed

- Linting and formatting moved from ESLint and Prettier to oxlint and oxfmt.
- TypeScript upgraded to 7.

### Security

- The table server no longer rebroadcasts raw client messages, which let players forge server messages.
- Shuffling uses ChaCha20 under a 256-bit key instead of a 32-bit seed, which could be brute-forced from a player's own hand to reveal every other hand.
- The engine validates every action and rule field at runtime, so malformed client input is rejected instead of crashing a hand.
