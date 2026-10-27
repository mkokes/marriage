# Marriage

Play the Nepali card game Marriage with friends and family in the browser.

A mobile-first, multiplayer web version of [Marriage](<https://en.wikipedia.org/wiki/Marriage_(card_game)>), the rummy-style game played with three decks, a hidden tiplu and maal points. Tables are private and joined by link, with no accounts. Rules vary a lot between households, so every rule and variant is a table setting, and a "Standard" preset covers the most common way to play.

**Status:** live at [cards.martykokes.com](https://cards.martykokes.com). Start a table with the rules your family plays, share its four-letter code, fill empty seats with bots, chat and react, and watch replays of finished hands.

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

The app is deployed in two parts:

- **Web app:** [cards.martykokes.com](https://cards.martykokes.com), on GitHub Pages. The [Pages workflow](.github/workflows/pages.yml) runs the checks, builds it and publishes it on every push to `main`.
- **Game server:** `cards-api.martykokes.com`, a Cloudflare Worker with one Durable Object per table. It accepts game connections only from the web app's origin (and `localhost`). Deploy it from your machine; the free Workers plan is enough for private games.

```sh
pnpm --filter @marriage/server exec wrangler login   # once, opens a browser
pnpm run deploy    # deploys the Worker (creates the custom domain's DNS on first deploy)
```

Use `pnpm run deploy`, not `pnpm deploy`, which is a built-in pnpm command. Deploy the Worker before (or with) any web change that relies on new server behavior.

`pnpm run preview` serves the production web build on `http://localhost:4173` against a local Worker.

A pre-push hook runs lint, format check, typecheck and tests. Work happens on branches and lands through pull requests.

Project structure, conventions and gotchas are in [AGENTS.md](AGENTS.md); product scope and the full rules are in [docs/SPEC.md](docs/SPEC.md).
