# Marriage

Play the Nepali card game Marriage with friends and family in the browser.

A mobile-first, multiplayer web version of [Marriage](<https://en.wikipedia.org/wiki/Marriage_(card_game)>), the rummy-style game played with three decks, a hidden tiplu and maal points. Tables are private and joined by link, with no accounts. Rules vary a lot between households, so every rule and variant is a table setting, and a "Standard" preset covers the most common way to play.

**Status:** early development. The rules engine is in place; the multiplayer server and the game UI are next. See the milestones in [docs/SPEC.md](docs/SPEC.md#milestones).

## Features

Planned for v1 (see the [spec](docs/SPEC.md)):

- 2–5 players per private table, plus simple bots to fill seats
- Configurable rules: seeing requirements, dublees, discard pickup, wild cards, maal values, penalties, kidnap and murder
- Server-validated play: invalid shows and finishes are rejected with an explanation
- Reconnect to your seat, with an optional turn timer
- Running session scores and replays of finished hands
- Text chat, emoji reactions and spectators
- Installable on phones as a PWA

## Tech stack

- TypeScript 7, pnpm workspaces, Node 22+
- Rules engine: dependency-free TypeScript (`packages/engine`)
- Server: Cloudflare Workers + Durable Objects via [`partyserver`](https://www.npmjs.com/package/partyserver) (`apps/server`)
- Client: Vite + React with `partysocket` and `vite-plugin-pwa` (`apps/web`)
- Tooling: Vitest, oxlint, oxfmt, husky

## Getting started

Requires Node 22+ and pnpm 10.

```sh
git clone https://github.com/mkokes/marriage.git
cd marriage
pnpm install
pnpm dev
```

`pnpm dev` starts the Worker on `localhost:8787` and the web app on [localhost:5173](http://localhost:5173). Add `?table=<code>` to join a specific table.

## Development

```sh
pnpm test        # run all tests
pnpm lint        # type-aware lint
pnpm format      # format code
pnpm typecheck   # type-check every package
pnpm build       # production build of the web app
```

A pre-push hook runs lint, format check, typecheck and tests. Work happens on branches and lands through pull requests.

Project structure, conventions and gotchas are in [AGENTS.md](AGENTS.md); product scope and the full rules are in [docs/SPEC.md](docs/SPEC.md).
