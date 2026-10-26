# Marriage — Web Multiplayer Spec

A mobile-first, web-based multiplayer version of the Nepali rummy-style card game [Marriage](<https://en.wikipedia.org/wiki/Marriage_(card_game)>) for friends & family. Every rule and variant is configurable per table, with a **"Standard" preset** (the most common/popular rules) as the default.

## Product scope (v1)

- **Audience:** private tables, joined via shareable link / short room code. No accounts — display name + a device-local player token (localStorage) for seat reclaim.
- **Players:** 2–5 per table. Host creates table, picks preset/tweaks rules, starts hands.
- **Bots:** simple bots can fill empty seats (also used for automated testing).
- **Connectivity:** reconnect to same seat; configurable turn timer (default 60s). On timeout: auto-draw from stock, auto-discard the drawn card.
- **Session:** play successive hands until the host ends the session → final totals screen.
- **Social:** text chat, emoji reactions, spectators (see table + discards, never hands).
- **Devices:** mobile first, installable PWA; works on desktop.
- **Out of scope v1:** accounts, public matchmaking, long-term stats, voice chat, real money.

## Game rules (rules engine)

Terminology: _pure sequence_ (3+ consecutive same suit, no jokers), _tunnela_ (3 identical cards — same rank & suit), _trial_ (3 same rank, different suits), _dublee_ (2 identical cards), _tiplu_ (maal reference card), _seen/unseen_.

Hand flow:

1. Shuffle 3 decks (+ optional printed jokers), deal 21 each; remainder is the stock; one card turned to start discard pile.
2. Turn: draw (stock, or top discard **only if it immediately completes a set** in hand) → discard 1.
3. **Seeing:** on their turn a player shows 3 pure sequences/tunnelas (or 7 dublees if enabled). The first player to see selects the tiplu from the stock (revealed to seen players only). Unseen players cannot see the tiplu nor use jokers; can't pick a joker from discard.
4. **Jokers:** after seeing, cards of tiplu rank (and maal per config) act as wild in remaining sets.
5. **Finish ("game"):** seen player with all 21 cards forming valid sets (7×3, incl. shown sets) after drawing, discards last card. Dublee path: 8 dublees (if enabled). Server validates; invalid declarations are **rejected with explanation** (no false-show penalty).
6. Stock exhausted → hand void (configurable: void or score as-is).

Scoring (Standard net settlement): each player's maal total M_i; total T = ΣM; player i receives `M_i × N − T`. Then winner collects penalties: unseen players pay _unseenPenalty_, seen non-winners pay _seenPenalty_. Running score table per session.

### Rule config (`RulesConfig`, Standard defaults)

| Option                        | Standard default                                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| decks                         | 3                                                                                                                                        |
| printedJokers (Man)           | off                                                                                                                                      |
| seeRequirement                | 3 pure sequences or tunnelas                                                                                                             |
| allowDubleeSee / dubleeFinish | on / on (8 dublees)                                                                                                                      |
| discardPickup                 | only to complete a set                                                                                                                   |
| maal cards counted            | tiplu, jhiplu, poplu, alter, man (if jokers), marriage bonus                                                                             |
| maal values                   | tiplu 3, jhiplu 2, poplu 2, alter 5, man 5, marriage 10, tunnela 5 (provisional — confirmed as the starting point, expected to be tuned) |
| unseenPenalty / seenPenalty   | 10 / 3                                                                                                                                   |
| dubleeFinishBonus             | +5 from each player                                                                                                                      |
| kidnap                        | off                                                                                                                                      |
| murder                        | off                                                                                                                                      |
| turnTimerSeconds              | 60 (0 = none)                                                                                                                            |
| stockExhausted                | void hand                                                                                                                                |

Presets: `Standard` (above) plus room for named house presets later. All options exposed in a "Create table → Rules" screen; non-default choices shown as badges in the lobby.

## Architecture

- **Monorepo (pnpm workspaces), all TypeScript:**
  - `packages/engine` — pure, deterministic rules engine: card model, seeded shuffle, state machine (`applyAction(state, action) → state | error`), set validation, maal & settlement scoring, per-player state redaction. Zero I/O; shared by server, client (for UI hints like valid-group highlighting) and bots.
  - `apps/server` — PartyKit-style server using **`partyserver`** on **Cloudflare Workers + Durable Objects**: one DO per table, authoritative state, WebSocket fan-out of redacted views (hands private, tiplu hidden from unseen), turn timers via DO alarms, bots run in-process.
  - `apps/web` — **Vite + React + TypeScript**, `partysocket` client, PWA (vite-plugin-pwa), mobile-first layout.
- **Persistence (DO storage):** current game state (survives deploys/restarts), session score history, append-only action log per hand (enables **replays**: replay = seed + action log through the engine).
- **Security/integrity:** server never sends other players' hands or unseen tiplu; client actions are intents validated by the engine; shuffle seed kept server-side until hand end.

## UX

- Lobby: create table (name, rules preset/overrides), share link/QR, seat list, add bot, spectator join.
- Table (phone portrait first, landscape supported): opponents around top, stock/discard center, hand at bottom with **auto-sort (suit/rank) + drag to group**; valid groups highlighted; "Show" and "Game" actions enabled only when the engine says they're valid. Maal/tiplu indicator once seen.
- End-of-hand: reveal all hands, maal breakdown, settlement table, "next hand" (host). Replay viewer for finished hands.
- Chat drawer + emoji reactions overlay.

## Milestones

1. Spec into `docs/SPEC.md`; scaffold monorepo, lint/test (Vitest).
2. Engine: cards, deal, sets validation, seeing, jokers, finishing, scoring, config — heavily unit-tested incl. property tests.
3. Server DO: rooms, seats, reconnect, redaction, timers, persistence, action log.
4. Web client: lobby, table, hand UI, end-of-hand, PWA.
5. Bots (simple heuristic), chat/reactions/spectators, replays.
6. Deploy to Cloudflare.

## Verification

- `pnpm test` — engine unit tests: every set type, joker use pre/post seeing, discard pickup rule, each config toggle, settlement sums to zero (before penalties), kidnap/murder.
- Bot-vs-bot simulation: thousands of seeded hands complete without engine errors.
- `wrangler dev` + `vite` locally; open 3 browser tabs (one mobile emulation via Chrome DevTools/Playwright), play a hand end to end, kill/reload a tab to test reconnect, restart server to test persistence, verify redacted payloads in network inspector.
