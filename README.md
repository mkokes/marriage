# Marriage

Play the Nepali card game Marriage with friends and family in the browser.

A mobile-first, multiplayer web version of [Marriage](<https://en.wikipedia.org/wiki/Marriage_(card_game)>), the rummy-style game played with three decks, a hidden tiplu and maal points. Tables are private and joined by link, with no accounts. Rules vary a lot between households, so every rule and variant is a table setting, and a "Standard" preset covers the most common way to play.

**Status:** live at [cards.martykokes.com](https://cards.martykokes.com). Play in English or Nepali. Start a table with the rules your family plays, share its four-letter code, fill empty seats with bots, chat and react, and watch replays of finished hands.

## Features

Implemented for v1 (full rules and scope in the [spec](docs/SPEC.md)):

- 2–5 players per private table, plus simple bots to fill seats
- Configurable rules: seeing requirements, dublees, discard pickup, wild cards, maal values, penalties, kidnap and murder
- Server-validated play: invalid shows and finishes are rejected with an explanation
- Reconnect to your seat, with an optional turn timer
- Running session scores and replays of finished hands
- Text chat, emoji reactions and spectators
- English and Nepali UI (with Devanagari digits), plus light, dark and system themes
- Installable on phones as a PWA

## Project layout

- `apps/web` — Vite + React PWA client
- `apps/server` — Cloudflare Worker + Durable Objects table server (`partyserver`)
- `packages/engine` — dependency-free TypeScript rules engine
- `packages/protocol` — shared client/server message types and runtime validation
- `docs/SPEC.md` — product scope and full game rules specification

## Tech stack

- TypeScript 7, pnpm workspaces, Node 22+
- Rules engine: dependency-free TypeScript (`packages/engine`)
- Server: Cloudflare Workers + Durable Objects via [`partyserver`](https://www.npmjs.com/package/partyserver) (`apps/server`)
- Client: Vite + React with `partysocket` and `vite-plugin-pwa` (`apps/web`)
- Shared client/server protocol (`packages/protocol`)
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
pnpm test          # run all tests
pnpm lint          # type-aware lint
pnpm format        # format code
pnpm format:check  # check formatting without writing
pnpm typecheck     # type-check every package
pnpm build         # production build of all packages
pnpm run preview   # serve production web build (:4173) against local Worker (:8787)
```

### Environment variables

- `VITE_GAME_HOST` — web build-time host for the game server (set to `cards-api.martykokes.com` in production; defaults to `window.location.host` in dev so Vite proxies `/parties` to `localhost:8787`).
- `ALLOWED_ORIGINS` — comma-separated browser origins allowed by the Worker in `apps/server/wrangler.jsonc` (`https://cards.martykokes.com`; any `http://localhost` origin is also allowed).
- `CLOUDFLARE_API_TOKEN` — GitHub Actions repository secret used to deploy the Worker.

### Deploying

Every push to `main` deploys automatically through the [Deploy workflow](.github/workflows/deploy.yml). It runs the checks and builds the web app, deploys the **game server**, then publishes the **web app** to GitHub Pages, so the server is always live before any web code that needs it.

- **Web app:** [cards.martykokes.com](https://cards.martykokes.com), on GitHub Pages.
- **Game server:** `cards-api.martykokes.com`, a Cloudflare Worker with one Durable Object per table. It accepts game connections only from the web app's origin (and `localhost`). The free Workers plan is enough for private games.

The workflow needs one repository secret, `CLOUDFLARE_API_TOKEN`:

1. In the Cloudflare dashboard, go to **My Profile → API Tokens → Create Token** and pick the **Edit Cloudflare Workers** template.
2. Under **Account Resources**, include only your account. Under **Zone Resources**, include only `martykokes.com`.
3. Create the token, then save it in GitHub: `gh secret set CLOUDFLARE_API_TOKEN` (paste it when prompted, so it stays out of your shell history).

To deploy the game server by hand instead, run `pnpm --filter @marriage/server exec wrangler login` once, then `pnpm run deploy`. Use `pnpm run deploy`, not `pnpm deploy`, which is a built-in pnpm command.

A pre-push hook runs lint, format check, typecheck, tests and the production build. Work happens on branches and lands through pull requests.

Project structure, conventions and gotchas are in [AGENTS.md](AGENTS.md); product scope and the full rules are in [docs/SPEC.md](docs/SPEC.md).

## License

Copyright (C) 2026 Marty Kokes

Licensed under the GNU General Public License v3.0 or later. See [LICENSE](LICENSE).
