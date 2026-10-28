# Marriage

Play the Nepali card game Marriage with friends and family in the browser.

A mobile-first, multiplayer web version of [Marriage](<https://en.wikipedia.org/wiki/Marriage_(card_game)>), the rummy-style game played with three decks, a hidden tiplu and maal points. Tables are private and joined by link, with no accounts. Rules vary a lot between households, so every rule and variant is a table setting, and a "Standard" preset covers the most common way to play.

**Status:** live at [cards.martykokes.com](https://cards.martykokes.com). Play in English or Nepali. Start a table with the rules your family plays, share its four-letter code, fill empty seats with bots, chat and react, and watch replays of finished hands.

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
pnpm test        # run all tests
pnpm lint        # type-aware lint
pnpm format      # format code
pnpm typecheck   # type-check every package
pnpm build       # production build of the web app
```

### Deploying

Every push to `main` deploys automatically through the [Deploy workflow](.github/workflows/deploy.yml). It runs the checks, deploys the **game server**, then publishes the **web app**, so the server is always live before any web code that needs it.

- **Web app:** [cards.martykokes.com](https://cards.martykokes.com), on GitHub Pages.
- **Game server:** `cards-api.martykokes.com`, a Cloudflare Worker with one Durable Object per table. It accepts game connections only from the web app's origin (and `localhost`). The free Workers plan is enough for private games.

The workflow needs one repository secret, `CLOUDFLARE_API_TOKEN`:

1. In the Cloudflare dashboard, go to **My Profile → API Tokens → Create Token** and pick the **Edit Cloudflare Workers** template.
2. Under **Account Resources**, include only your account. Under **Zone Resources**, include only `martykokes.com`.
3. Create the token, then save it in GitHub: `gh secret set CLOUDFLARE_API_TOKEN` (paste it when prompted, so it stays out of your shell history).

To deploy the game server by hand instead, run `pnpm --filter @marriage/server exec wrangler login` once, then `pnpm run deploy`. Use `pnpm run deploy`, not `pnpm deploy`, which is a built-in pnpm command.

`pnpm run preview` serves the production web build on `http://localhost:4173` against a local Worker.

A pre-push hook runs lint, format check, typecheck, tests and the production build. Work happens on branches and lands through pull requests.

Project structure, conventions and gotchas are in [AGENTS.md](AGENTS.md); product scope and the full rules are in [docs/SPEC.md](docs/SPEC.md).

## License

Copyright (C) 2026 Marty Kokes

Licensed under the GNU General Public License v3.0 or later. See [LICENSE](LICENSE).
