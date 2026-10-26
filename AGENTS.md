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
  - Screens: `Home` (start or join a table), `Lobby` (seats, invite link, `RulesEditor`), `Game` (table, hand, actions), `Results`/`FinalScores`. `App` picks one from `?table=<code>` and the table status; `useTable` owns the socket.
  - `arrangement.ts` (the player's local grouping of their hand), `moves.ts` (which groups can show or finish, using engine rules) and `replaySteps.ts` (rebuilds a finished hand from its replay record) are pure and unit-tested. `Chat`, `ReactionBubble` and `Replay` are the social and replay UI.
  - Styling is one stylesheet, `src/styles.css`, with design tokens on `:root`: night indigo table, crimson and marigold accents, lokta-paper cards, Yatra One and Mukta from Google Fonts, and a CSS dhaka-weave band. Keep new UI on those tokens.
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
pnpm run preview      # production build served by wrangler dev on :8787 (one Worker: assets + game)
pnpm run deploy       # build + wrangler deploy (needs `wrangler login`); not `pnpm deploy`, a pnpm built-in
```

The **pre-push hook** runs `lint`, `format:check`, `typecheck` and `test`; all must pass before pushing.

## Conventions

- **Engine purity:** no `Math.random`, `Date`, or I/O in `packages/engine`. Randomness is a ChaCha20 keystream whose state (`rng`: a 256-bit key plus a position) is part of `HandState`, so a hand replays exactly from its key plus its action log. The key must come from a CSPRNG (`crypto.getRandomValues` on the server) and must never reach a client before the hand is over: it reveals every hidden card.
- **Untrusted input:** `applyAction` takes `unknown` and checks the action's shape (`isAction`), and `validateRules` checks every rule field with bounds. Client or host input must never be able to throw.
- **Immutable transitions:** `applyAction(state, action)` never mutates its input; it returns `{ ok: true, state }` or `{ ok: false, error }` with a player-facing message. Internally it works on a `structuredClone`, so validation may fail half-way safely.
- **Rules are data:** any rule difference between households becomes a `RulesConfig` option with its Standard default in `STANDARD_RULES`, documented in the spec's config table. Don't hard-code a variant.
- **Never trust the client:** the server must validate every client message (`isClientMessage`, then the engine) and only broadcast messages it builds itself. Never rebroadcast raw client input. Clients receive `tableView`/`viewFor` output, never raw `HandState` (which holds every hand, the stock order and the RNG key). The server overwrites `playerId` on game actions with the sender's own seat.
- **Identity:** a device sends a secret token (`TOKEN_PATTERN`) when connecting; the server keeps only its SHA-256 hash (`credential`) and other clients see only the public `playerId`. Never put tokens or credentials in a view.
- **Types:** strict TS with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Avoid `as` casts. The type-aware linter flags unsafe assertions, so narrow with type guards instead.
- Formatting is oxfmt (single quotes, trailing commas, 100 columns); don't hand-format.

## Gotchas

- **Deployment:** one Worker named `marriage` serves `apps/web/dist` as static assets (single-page-app fallback) and runs the game at `/parties/*` (`run_worker_first`). The Worker falls back to `env.ASSETS` for everything else. Build the web app before `wrangler deploy`.
- **TypeScript 7** (the Go-based compiler) is in use, with `oxlint-tsgolint` for type-aware lint. Target/lib is ES2023.
- The engine has two tsconfigs. `tsconfig.json` includes tests and Node types (for the editor, linter and test-only `node:crypto`). `tsconfig.src.json` checks the source alone without Node or DOM types, so the engine can't come to depend on one runtime; `structuredClone` is declared in `src/globals.d.ts` for it. `pnpm typecheck` runs both.
- pnpm 10 blocks dependency install scripts. `esbuild` and `workerd` are allow-listed in `pnpm-workspace.yaml` (`onlyBuiltDependencies`), and wrangler needs both. Add others there deliberately.
- Test helpers build RNG keys with `testKey(n)`; never use those outside tests.
- Hand arrangements live only in the browser (localStorage, keyed by table and hand number) via `src/storage.ts`, whose wrappers never throw. The server only sees groups when a player shows or finishes.
- macOS file systems are case-insensitive: don't create files whose names differ only by case (e.g. `replay.ts` beside `Replay.tsx`).
- Card ids are `<deck>-<suit>-<rank>` (e.g. `0-hearts-7`) or `<deck>-joker-<n>`. Identical faces from different decks are distinct cards; compare faces with `sameFace`/`faceKey`, not ids.
- Stock and discard pile arrays have their **top at the end**. The tiplu sits at the **bottom** of the stock (index 0).
- In a set, `classifySet` reports a natural kind (e.g. `trial`) before trying wilds, so a test meant to exercise wilds must use cards that aren't already a natural set.
