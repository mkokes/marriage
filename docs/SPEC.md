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

Implemented in `packages/engine`. Sources disagree on many details (the Wikipedia article is itself flagged as confusing), so where they do, the choice made is noted here and most are table settings.

### Sets

- **Pure sequence:** 3+ consecutive cards of one suit, no wilds. Ace is low (A-2-3) or high (Q-K-A) but never wraps (K-A-2).
- **Tunnela:** three identical cards (same rank and suit).
- **Trial:** 3–4 cards of one rank, all different suits.
- **Dirty sequence / dirty trial:** the same shapes completed with wild cards (seen players only). A group made only of wilds is valid.
- **Dublee:** two identical cards. Wilds never stand in; two printed jokers do pair up.

### Tiplu, jokers and maal

The first player to see picks the **tiplu** from the stock (random if they don't choose); it is moved to the bottom of the stock and revealed only to seen players. Relative to it:

| Card           | Definition                                      | Wild for seen players   | Maal (Standard)               |
| -------------- | ----------------------------------------------- | ----------------------- | ----------------------------- |
| Tiplu          | same rank and suit                              | yes                     | 3                             |
| Jhiplu / Poplu | one rank below / above, same suit (A ↔ K wraps) | yes (`jhipluPopluWild`) | 2 each                        |
| Alter          | same rank, same colour, other suit              | yes                     | 5                             |
| Ordinary joker | same rank, other colour                         | yes                     | 0                             |
| Man            | printed joker (only with `printedJokers`)       | yes                     | 5                             |
| Marriage       | jhiplu + tiplu + poplu held together            | —                       | 10, **replaces** the trio's 7 |
| Tunnela        | each tunnela shown as a primary set             | —                       | 5                             |

Maal counts every card a player holds (concealed and shown), whether or not it is in a set. Setting a maal value to 0 removes that card type from maal.

### Hand flow

1. Shuffle (seeded) and deal 21 cards each; the next card is turned up as the offered card (start of the discard pile).
2. **Turn:** draw one card, then discard one.
   - From the stock, or the top discard subject to `discardPickup`. Standard (`completeSet`): the player names the hand cards it completes a set with (natural sets for unseen players, wilds allowed once seen). After seeing with dublees, only a discard that makes a dublee may be taken.
   - A card taken from the discard pile can't be discarded straight back.
3. **Seeing** happens with the discard: the player shows 3 primary sets (pure sequences or tunnelas, per `seeRequirement`), or 7 dublees when `dublees` is on. Shown sets leave the concealed hand and are visible to everyone.
4. **Finishing ("game")** replaces the discard. A player who saw with sets must group every remaining concealed card into valid sets (wilds allowed). A player who saw with dublees finishes with an eighth dublee; their other cards don't matter. A player must have seen on an earlier turn. Invalid declarations are **rejected with an explanation** (no false-show penalty).
5. **Stock exhausted** (`stockExhausted`): Standard voids the hand; `reshuffle` turns the discard pile (minus its top card) into a new stock.

### Scoring

With N players, total maal T and player maal M: each player receives `M × N − T` (settling maal against every other player). Then every other player pays the winner `unseenPenalty` if they never saw or `seenPenalty` if they did, plus `dubleeFinishBonus` if the winner finished with dublees. Net points always sum to zero. Variants applied first:

- **Kidnap:** the winner takes unseen players' maal.
- **Murder:** unseen players' maal counts as zero. (Kidnap and murder can't both be on.)

A running score table is kept per session.

### Rule config (`RulesConfig`, Standard defaults)

All values are provisional: confirmed as the starting point and expected to be tuned.

| Option                                | Standard default                                                   |
| ------------------------------------- | ------------------------------------------------------------------ |
| decks                                 | 3 (4 allowed)                                                      |
| printedJokers (Man)                   | off                                                                |
| seeRequirement                        | pure sequences or tunnelas                                         |
| dublees (see with 7, finish with 8th) | on                                                                 |
| discardPickup                         | `completeSet` (also `free`, `never`)                               |
| jhipluPopluWild                       | on                                                                 |
| maal values                           | tiplu 3, jhiplu 2, poplu 2, alter 5, man 5, marriage 10, tunnela 5 |
| unseenPenalty / seenPenalty           | 10 / 3                                                             |
| dubleeFinishBonus                     | 5 from each player                                                 |
| kidnap / murder                       | off / off                                                          |
| turnTimerSeconds                      | 60 (0 = none; enforced by the server)                              |
| stockExhausted                        | `void` (also `reshuffle`)                                          |

Presets: `Standard` (above) plus room for named house presets later. All options exposed in a "Create table → Rules" screen; non-default choices shown as badges in the lobby.

## Architecture

- **Monorepo (pnpm workspaces), all TypeScript:**
  - `packages/engine` — pure, deterministic rules engine: card model, seeded shuffle, state machine (`applyAction(state, action) → state | error`), set validation, maal & settlement scoring, per-player state redaction. Zero I/O; shared by server, client (for UI hints like valid-group highlighting) and bots.
  - `apps/server` — PartyKit-style server using **`partyserver`** on **Cloudflare Workers + Durable Objects**: one DO per table, authoritative state, WebSocket fan-out of redacted views (hands private, tiplu hidden from unseen), turn timers via DO alarms, bots run in-process.
  - `apps/web` — **Vite + React + TypeScript**, `partysocket` client, PWA (vite-plugin-pwa), mobile-first layout.
- **Persistence (DO storage):** current game state (survives deploys/restarts), session score history, append-only action log per hand (enables **replays**: replay = seed + action log through the engine).
- **Security/integrity:** server never sends other players' hands or unseen tiplu; client actions are intents validated by the engine; shuffles use ChaCha20 under a 256-bit key from a CSPRNG, kept server-side until hand end (a small seed could be brute-forced from one player's hand); actions and rule settings are validated at runtime.

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

- `pnpm test` — engine unit tests: every set type, joker use pre/post seeing, discard pickup rule, each config toggle, settlement always sums to zero, kidnap/murder.
- Bot-vs-bot simulation: thousands of seeded hands complete without engine errors.
- `wrangler dev` + `vite` locally; open 3 browser tabs (one mobile emulation via Chrome DevTools/Playwright), play a hand end to end, kill/reload a tab to test reconnect, restart server to test persistence, verify redacted payloads in network inspector.
