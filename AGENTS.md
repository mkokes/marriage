# AGENTS.md

A mobile-first, web-based multiplayer version of the Nepali card game Marriage, for private tables among friends and family. Every rule and variant is configurable per table, with a "Standard" preset as the default. The full product and rules spec is [docs/SPEC.md](docs/SPEC.md); read it before changing game behaviour.

## Layout

pnpm workspace, all TypeScript:

- `packages/engine` — the rules engine. Pure and deterministic, with no I/O, so the server, client and (later) bots can all share it. Consumed as source (`exports` points at `src/index.ts`); there is no build step.
  - `cards.ts` card model and shoe, `random.ts` ChaCha20 RNG, `guards.ts` runtime type guards, `config.ts` `RulesConfig` + `STANDARD_RULES`, `sets.ts` set validation, `maal.ts` tiplu roles/wilds/points, `game.ts` hand state machine (`dealHand`, `applyAction`), `scoring.ts` settlement, `view.ts` per-player redaction (`viewFor`), `bot.ts` the bot (`chooseBotAction`), which decides only from its own `viewFor` view so it can't cheat.
  - Tests sit next to each module (`*.test.ts`); `src/test/helpers.ts` builds cards from codes like `7H`, `10S`, `QS#2` (deck copy), `JK` (printed joker).
- `packages/protocol` — client↔server message types (`ClientMessage`, `ServerMessage`, `TableView`) and their runtime checks (`isClientMessage`). Shared by server and web.
- `apps/server` — Cloudflare Worker using `partyserver`: one Durable Object (`Table`) per game table, routed at `/parties/table/<room>?token=<token>`. Config in `wrangler.jsonc`.
  - `table.ts` is the pure table logic (seats and bots, host, rules, hands, scores, chat, turn timer, bot turns and auto-play on timeout, per-connection views). `nextWake` gives the next alarm time (turn timeout or bot move). Time, RNG keys and ids are injected via `TableDeps`, so it's tested in plain Node (`table.test.ts`).
  - `index.ts` is the thin Durable Object: token hashing, message parsing, storage (`table` key, plus `replay:<n>` per finished hand), alarms and broadcasting. It hibernates, so all state must live in storage or connection state.
- `apps/web` — Vite + React PWA, connects with `partysocket`. In dev, Vite proxies `/parties` to `wrangler dev` on port 8787.
  - Screens: `Home` (start, or join by code), `NewTable` (name and rules, then create), `Lobby` (seats, code and invite link, `RulesEditor`), `Game` (table, hand, actions), `Results`/`FinalScores`, `NoTable`. `router.ts` maps the query string (`/`, `?new`, `?table=QXRT`) to a screen and navigates with `history.pushState`; `useTable` owns the socket.
  - Creating a table: `NewTable` stores the choice in `pendingTables` (in memory) and navigates to a fresh code; `App`'s `TableScreen` sends `createTable` once the code reports status `new`, or picks another code if it's taken.
  - `arrangement.ts` (the player's local grouping of their hand), `moves.ts` (which groups can show or finish, using engine rules) and `replaySteps.ts` (rebuilds a finished hand from its replay record) are pure and unit-tested. `Chat`, `ReactionBubble` and `Replay` are the social and replay UI.
  - Styling is one stylesheet, `src/styles.css`: fixed brand colours (crimson, marigold, lokta paper, ink) plus role tokens (`--bg`, `--surface`, `--line`, `--text`, `--muted`, `--accent-text`, …) defined per theme under `:root[data-theme='dark'|'light']`. Yatra One and Mukta come from Google Fonts; the dhaka-weave band and marigold garland are pure CSS. The felt re-scopes the text tokens, so it reads as a night table in both themes. Keep new UI on the role tokens (never raw hex), and put any motion inside the `prefers-reduced-motion: no-preference` block.
  - Themes: `theme.tsx` (`ThemeProvider`, `useTheme`) resolves the saved System/Light/Dark choice against `prefers-color-scheme` and sets `data-theme` on `<html>`; an inline script in `index.html` does the same before first paint, so keep the two in step. `ThemeSwitch` sits beside `LanguageSwitch` in `App`.
- `docs/SPEC.md` — product spec, rule decisions and milestones.

## Commands

Run from the repo root:

```sh
pnpm install          # also installs the husky git hooks
pnpm dev              # wrangler dev (:8787) + vite (:5173); open http://localhost:5173/?table=<code>
pnpm test             # vitest, all workspace projects
pnpm vitest run --project engine   # engine tests only
pnpm lint             # oxlint, type-aware, warnings fail
pnpm format           # oxfmt (format:check to verify only)
pnpm typecheck        # tsc per package
pnpm build            # builds the web app
pnpm run preview      # production web build on :4173 (vite preview) against wrangler dev on :8787
pnpm run deploy       # wrangler deploy of the game server (needs `wrangler login`); not `pnpm deploy`, a pnpm built-in
```

The **pre-push hook** runs `lint`, `format:check`, `typecheck`, `test` and `build`; all must pass before pushing.

## Conventions

- **Engine purity:** no `Math.random`, `Date`, or I/O in `packages/engine`. Randomness is a ChaCha20 keystream whose state (`rng`: a 256-bit key plus a position) is part of `HandState`, so a hand replays exactly from its key plus its action log. The key must come from a CSPRNG (`crypto.getRandomValues` on the server) and must never reach a client before the hand is over: it reveals every hidden card.
- **Untrusted input:** `applyAction` takes `unknown` and checks the action's shape (`isAction`), and `validateRules` checks every rule field with bounds. Client or host input must never be able to throw.
- **Immutable transitions:** `applyAction(state, action)` never mutates its input; it returns `{ ok: true, state }` or `{ ok: false, error }` with a player-facing message. Internally it works on a `structuredClone`, so validation may fail half-way safely.
- **Rules are data:** any rule difference between households becomes a `RulesConfig` option with its Standard default in `STANDARD_RULES`, documented in the spec's config table. Don't hard-code a variant.
- **Never trust the client:** the server must validate every client message (`isClientMessage`, then the engine) and only broadcast messages it builds itself. Never rebroadcast raw client input. Clients receive `tableView`/`viewFor` output, never raw `HandState` (which holds every hand, the stock order and the RNG key). The server overwrites `playerId` on game actions with the sender's own seat.
- **Identity:** a device sends a secret token (`TOKEN_PATTERN`) when connecting; the server keeps only its SHA-256 hash (`credential`) and other clients see only the public `playerId`. Never put tokens or credentials in a view.
- **Types:** strict TS with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Avoid `as` casts. The type-aware linter flags unsafe assertions, so narrow with type guards instead.
- Formatting is oxfmt (single quotes, trailing commas, 100 columns); don't hand-format.

## Versioning and releases

The version lives in the root `package.json` (`version`) and follows [Semantic Versioning](https://semver.org/). Every pull request that changes behavior must:

1. **Bump the version** for the kind of change, relative to the latest tag:
   - **major**: breaking changes, such as a protocol change that makes old clients or saved tables stop working. While the version is `0.x`, breaking changes bump the minor version instead.
   - **minor**: new features or rule options, backwards-compatible.
   - **patch**: bug fixes, copy and styling tweaks, or dependency updates with no behavior change.

   If several changes land in one PR, use the largest. Docs-only or CI-only PRs don't need a bump.

2. **Update `CHANGELOG.md`**: move the entries for this release from `Unreleased` into a new `## [X.Y.Z] - YYYY-MM-DD` section (Keep a Changelog format).
3. **After the PR is merged**, tag the merge commit on `main` and push the tag as a follow-up:

   ```sh
   git switch main && git pull
   git tag -a vX.Y.Z -m "vX.Y.Z: <one-line summary>"
   git push origin vX.Y.Z
   ```

   The tag must match `package.json`'s version. Never tag a commit that isn't on `main`.

## Gotchas

- **Deployment is split.** The web app is on GitHub Pages at `cards.martykokes.com`, and the game server is the `marriage` Worker on the custom domain `cards-api.martykokes.com`. `.github/workflows/deploy.yml` deploys both on pushes to `main`, server first (with the `CLOUDFLARE_API_TOKEN` secret), then the web app built with `VITE_GAME_HOST=cards-api.martykokes.com`. `pnpm run deploy` deploys the server by hand. Without `VITE_GAME_HOST` (dev), the app connects to its own host and Vite proxies `/parties`.
- **Origin allowlist:** the Worker rejects browser connections whose `Origin` isn't in `ALLOWED_ORIGINS` (wrangler.jsonc vars) or `http://localhost:*`. Add new frontend origins there.
- **TypeScript 7** (the Go-based compiler) is in use, with `oxlint-tsgolint` for type-aware lint. Target/lib is ES2023.
- The engine has two tsconfigs. `tsconfig.json` includes tests and Node types (for the editor, linter and test-only `node:crypto`). `tsconfig.src.json` checks the source alone without Node or DOM types, so the engine can't come to depend on one runtime; `structuredClone` is declared in `src/globals.d.ts` for it. `pnpm typecheck` runs both.
- pnpm 10 blocks dependency install scripts. `esbuild` and `workerd` are allow-listed in `pnpm-workspace.yaml` (`onlyBuiltDependencies`), and wrangler needs both. Add others there deliberately.
- Test helpers build RNG keys with `testKey(n)`; never use those outside tests.
- Hand arrangements live only in the browser (localStorage, keyed by table and hand number) via `src/storage.ts`, whose wrappers never throw. The server only sees groups when a player shows or finishes.
- macOS file systems are case-insensitive: don't create files whose names differ only by case (e.g. `replay.ts` beside `Replay.tsx`).
- Table codes are four capital consonants (`TABLE_CODE_LETTERS` in the protocol). A fresh Durable Object starts with status `new` and accepts only `createTable`, which seats its creator as host. The Worker 404s room names that aren't valid codes.
- The service worker is registered in `apps/web/src/serviceWorker.ts` (`injectRegister: false`), with `skipWaiting`/`clientsClaim` on, so a new release takes over and reloads open pages right away. Keep it that way: a stale cached app talking to a newer game server breaks.
- **All UI text goes through i18n.** Components read strings from `useI18n().t` (`apps/web/src/i18n/`). Add every new string to `en.ts` and `ne.ts`; `ne` is typed as `Messages`, so a missing translation fails the build. Format numbers with `t.format.number`/`t.format.signed` (Nepali uses Devanagari digits, mapped by hand because browsers' `Intl` data for `ne` varies). Card faces (A, K, Q, J, 2–10) and table codes stay in Latin letters.
- **Errors are codes.** The engine fails with an `EngineErrorCode` (`ENGINE_ERRORS` in `packages/engine/src/errors.ts`) and the server with a `TableErrorCode` (`TABLE_ERRORS` in the protocol); results and `{ type: 'error' }` messages carry `code` plus English `error`/`message`. New errors need an entry in the catalog and a Nepali translation in `ne.ts` → `errors`.
- Card ids are `<deck>-<suit>-<rank>` (e.g. `0-hearts-7`) or `<deck>-joker-<n>`. Identical faces from different decks are distinct cards; compare faces with `sameFace`/`faceKey`, not ids.
- Stock and discard pile arrays have their **top at the end**. The tiplu sits at the **bottom** of the stock (index 0).
- In a set, `classifySet` reports a natural kind (e.g. `trial`) before trying wilds, so a test meant to exercise wilds must use cards that aren't already a natural set.
