# Clutchbook — Roadmap

**Last updated:** 2026-05-28
**Companion document:** [`overview.md`](./overview.md) — read first for product definition.

This roadmap covers two demo phases plus the production milestone that sits between them. Chess (via Lichess) is the only game in both demos; multi-game expansion is sketched in [§5](#5-phase-3-multi-game-expansion) and detailed in `overview.md` §6.

---

## 0. Phase 0 — Current State (Sportsbook Demo)

The repo currently ships a **sportsbook-style demo** in which users place virtual bets on third-party Lichess games (match winner, total moves, result type). It is functional and was used to validate UX patterns and the Lichess data pipeline. The sportsbook framing is now deprecated.

**Carries forward into Phase 1:**

- The Lichess data pipeline in `api/_lib/lichess_service.py` (pivots into the `chess.lichess` GameAdapter).
- The odds engine in `api/_lib/odds_engine.py` (re-targeted from market pricing to contract pricing).
- The wallet / balance abstraction in `src/hooks/useBalance.ts`.
- The settlement-polling pattern in `src/hooks/useBetSettlement.ts` (generalized to contracts).
- The Layout / UI shell (`Header`, `Sidebar`, `Toast`, basic surfaces).
- The odds-format toggle, currency formatter, and persistence utilities.

**Does not carry forward:**

- The Markets concept (`match_winner`, `total_moves`, `result_type`) — replaced by Skill Contracts.
- The parlay bet-slip — Phase 1 does not parlay contracts. (Revisit post-Phase 2.)
- The "Live Now / Upcoming" sportsbook framing — Live Now becomes the Catalog.
- The Leaderboard tab as currently implemented — re-spec'd around contract performance in a later phase.
- All marketing copy that uses the words "bet", "betting", "sportsbook", "wager on a match". Replace with "skill contract", "challenge", "wager against the line".

---

## 1. Phase 1 — Single-Player Skill Contracts

> **One sentence:** A polished, chess-only sandbox in which a verified user browses or builds personalized skill contracts, activates them, plays Lichess, and watches them auto-settle — entirely on the existing demo stack.

### 1.1 Scope

In:

- Chess only, via Lichess.
- Single-player vs. platform contracts only.
- Three contract families: single-game objective, multi-game series, performance line (over/under).
- Catalog (primary surface) + Builder (power feature).
- Lichess account linking with both OAuth (preferred path, mocked in demo if needed) and username fallback.
- Real-time-feeling contract lifecycle (OFFERED → ACTIVE → RESOLVING → SETTLED / EXPIRED) backed by polling.
- Play-money wallet in the demo, with all schemas, limits, and UI text designed for the real-money production model.
- Multi-game abstraction (`GameAdapter`) implemented from day one. Chess is the only registered adapter; the seams are real.
- Compliance-shaped UX: house-edge disclosure on every contract, self-set loss caps, demo "responsible gaming" surfaces stubbed in.

Out:

- Two-player matched wagers (Phase 2).
- Real payments, real KYC, real Postgres, real audit ledger (production milestone).
- Tournaments, social, friend graphs, chat.
- Mobile-native apps. Phase 1 is responsive web only.
- Any non-chess game.

### 1.2 User journey

1. **Land.** First-time visitor sees a marketing-aware landing with the elevator pitch and a single CTA: *Link your Lichess account*.
2. **Link.** OAuth flow (or username-claim fallback). On success, we fetch the user's skill profile from Lichess and seed the wallet (play money in demo — $1,000 starting balance is fine).
3. **Catalog.** The home surface. 6–10 personalized contracts. Each card shows: objective, format, window, line, stake input, projected payout, and a fair-odds disclosure line. One click activates.
4. **Activate.** Contract moves to ACTIVE; the user sees a clear *Go play on Lichess* affordance (deep link to Lichess Quick Pairing in the same format) and an *Active Contracts* panel showing window countdown.
5. **Play.** User plays normally on Lichess. Clutchbook does nothing intrusive; we only poll for qualifying games via the user's account.
6. **Resolve.** When a qualifying game completes, the contract enters RESOLVING (sub-minute visual state), then SETTLED. Wallet updates with animated payout or stake forfeit. Receipt appears in *My Contracts*.
7. **Continue or stop.** User can activate the next contract, set a session limit, or close the tab. Active contracts persist across sessions.

### 1.3 Surfaces (tabs / pages)

| Surface           | Purpose                                                                 | Replaces            |
| ----------------- | ----------------------------------------------------------------------- | ------------------- |
| Catalog           | Personalized OFFERED contracts; primary engagement loop.                | Live Now            |
| Builder           | Form-driven contract assembly within allowed dimensions.                | (new)               |
| Active Contracts  | Currently-running contracts with window countdown and qualifying-game tally. | (new)            |
| My Contracts      | History of SETTLED + EXPIRED contracts with filters, receipts, P&L.     | My Bets             |
| Profile / Stats   | Linked Lichess identity, verified skill profile, wallet, limits.        | (sidebar fragments) |
| Responsible Gaming | Self-set deposit / loss / session limits, self-exclusion.              | (new, stubbed)      |

Leaderboard is dropped from Phase 1. It reappears, re-scoped, in Phase 2.

### 1.4 Engineering work

Grouped by area. Each item is sized for a working AI agent or engineer to pick up.

**Core data model (`src/types/`, `api/_lib/schemas.py`):**

- Replace `MatchMarkets` + `LiveGame` market schemas with a `Contract` schema:
  - `id`, `user_id`, `game` (adapter id), `format`, `objective` (typed enum + params), `window`, `line`, `stake`, `projected_payout`, `house_margin_pct`, `state`, `activated_at`, `qualifying_game_ids[]`, `resolved_at`, `outcome`.
- Replace `BetSelection` + bet-slip slip types with a `ContractDraft` (pre-activation) and `ContractReceipt` (post-settlement) pair.
- Define `Objective` as a discriminated union: `WinGame`, `WinUnderNMoves`, `WinSeries`, `PerformanceLineOverUnder`, plus a parser/validator so the Builder and Catalog produce identical shapes.

**GameAdapter scaffolding (`api/_lib/adapters/`):**

- New `adapters/` package. Define the `GameAdapter` interface (Python typing.Protocol or ABC).
- Implement `adapters/chess_lichess.py` with `link_account`, `fetch_profile`, `poll_eligible_games`, `resolve_contract`.
- Move the existing `lichess_service.py` reads into the adapter.
- Add `adapters/registry.py` exposing `get(game_id) -> GameAdapter`. Catalog and settlement code goes through the registry, not direct imports.

**Odds engine pivot (`api/_lib/odds_engine.py`):**

- Repurpose from sportsbook market pricing to contract pricing.
- Inputs: `SkillProfile` from the adapter + `Objective` + configured `house_margin_pct`.
- Outputs: a calibrated decimal multiplier and the fair-odds reference (for the disclosure UI).
- Calibration tables live under `api/_lib/calibration/chess.py` — initially heuristic, designed to be replaceable with empirical curves once we have settlement data.

**Catalog generation:**

- Server endpoint `GET /api/catalog` returning N personalized OFFERED contracts for the linked user.
- Generator combines: user profile + a per-game contract-template registry + variety / diversity rules (don't ship five identical contracts).

**Builder:**

- Server endpoint `POST /api/contracts/price` accepting a draft (`game`, `format`, `objective`, `window`, `stake`) and returning the priced contract (or a validation error).
- UI: form using primitives from the existing component library; live-updating projected payout.

**Activation & lifecycle:**

- `POST /api/contracts/{id}/activate` — atomic stake debit + state transition.
- `GET /api/contracts/active` — current ACTIVE/RESOLVING for the user.
- Settlement worker: a polling loop (client-driven in demo, server-driven in production) per active contract. Reuse and generalize the pattern in `useBetSettlement.ts`.
- Window expiration handling, including the *refund, not loss* distinction.

**Identity:**

- Lichess OAuth flow (full implementation if feasible in demo; otherwise a faithful mock that exercises the same code paths and is swap-in-ready).
- Username-claim fallback with reduced limits.
- `SkillProfile` schema and the Lichess-specific fetcher.

**Wallet:**

- Generalize `useBalance.ts` to expose available / pending / locked balances.
- Stake commit and refund flows tied to contract state transitions.
- Display the existing animated balance behavior for payouts.

**Compliance UX:**

- Fair-odds and house-edge disclosure baked into every contract card and the contract-detail view.
- Self-set daily loss limit in the demo, lowerable instantly, raisable after a 24h cooldown (cooldown can be mocked in demo).
- Responsible-gaming page with self-exclusion stub.
- Geo-gating stub (the docs path; not blocking the demo).

**Renaming pass:**

- Strip "bet", "sportsbook", "Live Now" wording from copy, component names, and analytics events. New vocabulary per the [glossary in `overview.md` §9](./overview.md#9-glossary).

**Telemetry:**

- Event taxonomy: `contract_offered_viewed`, `contract_activated`, `contract_resolved`, `wallet_limit_changed`, `oauth_linked`, `username_claimed`, `builder_priced`, `catalog_refreshed`. Names matter — they outlast the demo.

### 1.5 Demo constraints (what makes it a *demo*)

- Play-money wallet. The schemas, limits, and copy are real; the currency is virtual.
- No deposits or withdrawals. Wallet reset button restores the starting bankroll.
- localStorage for client state; no server-side persistence yet. The shapes match what the production DB will store.
- OAuth may be faithfully mocked if the demo runs in environments without Lichess developer credentials. The mock must exercise the same `linkAccount` interface.
- Settlement polling runs client-side. The polling cadence and cancellation patterns are designed so a server-side worker can replace them without a UI rewrite.

### 1.6 Success criteria

Phase 1 is considered complete when:

- A new user can land, link a Lichess account (real OAuth or mock), see a personalized Catalog, activate a contract, play on Lichess, and watch it settle to a payout or loss — with no manual intervention from us.
- All three contract families are live and the Builder can produce a contract in each family.
- Every contract card carries the fair-odds disclosure and the house-edge in plain language.
- The codebase contains zero remaining references to "bet", "sportsbook", "match winner market", etc. (one global sweep; ESLint or grep gate in CI is sufficient).
- The `GameAdapter` interface exists and chess is implemented against it. A throwaway second adapter (even a stub) compiles to prove the seams.
- The demo runs deployed on Vercel against the existing Python + Vite setup with no regressions in build or runtime.
- Internal stakeholders can complete a 5-minute walkthrough without the words "imagine if" — the experience speaks for itself.

### 1.7 Out of scope (explicit non-goals)

- Two-player matched wagers — Phase 2.
- Real-money flows — production milestone.
- Real Postgres / audit ledger — production milestone.
- Tournaments, social, chat — post-Phase 2.
- Any game besides chess — post-Phase 2.

---

## 2. Production Milestone (Between Phase 1 Demo and Phase 2 Demo)

A demo is not a product. Before Phase 2 ships against real users, the following must land. This milestone is not a "phase" in the marketing sense — it is the engineering and compliance work that turns the sandbox into a regulated platform.

### 2.1 Infrastructure

- **Postgres** (Neon or Supabase) for users, accounts, contracts, wallets, ledger entries.
- **Append-only audit ledger** — every wallet mutation and contract state change as an immutable event. The single source of truth for disputes and regulators.
- **Background settlement worker** replacing client polling. One worker process owns the settlement loop and writes to the ledger.
- **Feature flags + per-user / per-game kill switches** operable without a deploy.
- **Observability**: structured logs, error tracking, metrics for catalog freshness, settlement latency, payout integrity.

### 2.2 Real-money

- **Payments partner** for deposits and withdrawals, with a gaming-licensed correspondent bank.
- **Same-instrument default** for deposits and withdrawals as the AML baseline.
- **KYC partner** integration at the [defined threshold](./overview.md#73-stake-and-risk-limits).
- **Sanctions screening** at KYC and on payment events.
- **Velocity monitoring** on deposits, wagers, and withdrawals.
- **Tax reporting** support (1099 generation for U.S. users above the threshold).

### 2.3 Compliance

- Final jurisdiction list with geofencing live (recognized geolocation partner, not IP-only).
- Terms of service, user agreement, privacy policy with counsel.
- Responsible-gaming controls in production form (not stubs): self-set deposit/loss/session limits, self-exclusion, reality checks.
- Dispute resolution process documented and staffed.

### 2.4 Identity at production grade

- Lichess OAuth with refresh-token rotation, scoped to the minimum read needed for verification.
- Account-binding immutability: once a Lichess account is bound to a Clutchbook user, rebinding requires support intervention to prevent stat laundering.

This milestone is the gate between "we have a great demo" and "we are taking real money." It is non-negotiable.

---

## 3. Phase 2 — Two-Player Matched Wagers

> **One sentence:** Add a head-to-head wager mode where two real users are paired by skill bracket and play a single Lichess game whose outcome resolves both stakes minus platform margin.

### 3.1 Scope

In:

- Chess only.
- A single matched-wager game format: two users, one Lichess game, winner takes the pot minus margin.
- Skill-bracketed matchmaking queue keyed on (game, format, stake tier, rating band).
- Under-the-hood Lichess challenge generation between the two paired accounts.
- Live spectator view of one's own active match.
- Match history and head-to-head P&L surfaces.
- A re-scoped leaderboard (matched-wager record and ROI, not raw winnings — to avoid pure pay-to-play optics).

Out:

- Tournaments, brackets, ladders (post-Phase 2).
- Friend / direct-challenge matched wagers (a fast-follow after queue is healthy; not in the demo).
- Open lobby / posted-contract marketplace (not committed).
- Single-player contracts go away — they don't. Phase 1 contracts stay live alongside Phase 2.

### 3.2 User journey

1. **Choose mode.** From the home surface the user picks *Solo Contracts* (Phase 1) or *Head-to-Head* (Phase 2).
2. **Queue.** User selects game, format, stake tier. The queue UI shows the rating band being searched and an honest "estimated time" derived from current queue depth.
3. **Match found.** Both users see a brief confirmation surface (opponent rating, stake, format). Confirm or decline within a tight window (10–20 seconds). Both must confirm to proceed.
4. **Challenge created.** Clutchbook fires a Lichess challenge between the two accounts via the Lichess API. Deep link presented to both users.
5. **Play.** Standard Lichess game. Clutchbook tracks state via Lichess board streaming or short-poll.
6. **Resolve.** On game end, the pot is paid to the winner minus configured margin. Draws split the pot minus margin or refund stakes (decision point — see open items).
7. **Re-queue or stop.** Frictionless re-queue. Loss limits and queue cooldowns from responsible-gaming controls apply.

### 3.3 Engineering work

**Matchmaking service:**

- A real, server-side queue (Redis or Postgres-backed). Keyed on `(game, format, stake_tier, rating_band)`.
- Pairing algorithm with widening rating tolerance over time; configurable per-game.
- Confirmation handshake with timeout, retry on the other side if a user declines.
- Anti-collusion: a user cannot be paired with their own alt; rate-limit repeat pairings between the same two accounts within a window.

**Lichess challenge integration:**

- OAuth scope upgrade to issue challenges on behalf of users.
- Challenge generation, polling, state reflection.
- Abort handling: if the Lichess challenge fails to start within a window, stakes refund and both users return to queue with no penalty.

**Contract / wallet generalization:**

- Generalize the Phase 1 `Contract` to a `Wager` abstraction. Solo contracts and head-to-head matches both materialize as wagers in the ledger.
- Two-sided stake escrow: both users' stakes locked at match-found, released to winner at settlement.
- Margin extraction at settlement, ledgered explicitly.

**Spectator / live-state UI:**

- Stream the active game's state to the user's Clutchbook tab. Move list, clock, evaluation hint (optional).
- This is the visible difference between "I'm just playing Lichess" and "this match is happening on Clutchbook."

**Leaderboard re-scope:**

- Per-format leaderboards based on matched-wager record and ROI (not raw $ won).
- Decay / season windows so new users can climb.

**Anti-collusion telemetry:**

- Pair-frequency analysis surfaced to risk dashboards.
- Account-pair clustering to detect organized abuse.

### 3.4 Success criteria

- Two real users in different sessions can enter the queue, match, complete a game, and see correct payouts settle from a single Lichess game — without manual operator action.
- Matchmaking median wait time at target stake tiers is under 60 seconds during simulated peak load.
- Draw handling, abort handling, and disconnect handling each have a documented and tested code path.
- Platform margin is correctly extracted and ledgered on every settled match. Sum of payouts + margin = sum of stakes, always.
- Anti-collusion rate-limits are exercised and observable in dashboards.

### 3.5 Open decisions for Phase 2

To be resolved before Phase 2 build, captured here so they are not lost:

- **Draw payout**: split-minus-margin vs. full refund vs. user-selectable at queue time.
- **Whether to support direct challenges** in the public Phase 2 launch or hold them for a fast-follow.
- **Spectator view fidelity** — full board stream or move list + clock only.
- **Cross-time-control matching** — strictly same format, or allow nearby formats to widen the pool.

---

## 4. Phase 3+ — Multi-Game Expansion

Phase 3 is not a single phase; it is the operational mode the platform enters once both demos are validated. The architecture is set up for it from day one (see `overview.md` §6).

### 4.1 Adapter onboarding cadence

A new game adapter ships when all five of the following are true:

1. The game has a documented stable API or scrape-safe public stats.
2. Per-user match history is queryable by verified identity.
3. The API surfaces enough granularity to set both single-game and series lines.
4. The publisher's ToS permits third-party stat use for our purposes.
5. The player base is large enough that catalog and matchmaking liquidity will work.

### 4.2 Target order

The current priority list (subject to change based on partnerships, API access, and player demand):

1. **Counter-Strike 2** — Steam Web API + community match history.
2. **Dota 2** — Steam + OpenDota / STRATZ.
3. **League of Legends** — Riot API.
4. **Rocket League** — Psyonix / public stat sites.
5. **Valorant** — Riot API (rate-limited; partnership may be needed).

Each addition is its own scoped project: adapter, contract templates, calibration tables, themed UI surface, and a phased rollout matching Phase 1 → Phase 2 within that title.

### 4.3 What does not scale automatically

Three things that do not come for free with a new adapter and must be re-done per title:

- **Calibration**. Each game's skill-probability mapping is empirical. Initial heuristics are easy; calibrating to real settlement data takes volume.
- **Anti-cheat reliance assessment**. Some games' anti-cheat is good enough to trust; some are not. Per-game risk policy.
- **Compliance review**. New games can shift the regulatory profile (e.g. titles with random loot drops, or where the publisher's own monetization complicates the skill-frame).

---

## 5. Cross-cutting Open Items

Carried here because they affect multiple phases and need explicit ownership.

- **Pricing calibration loop**: how do we go from heuristic odds to data-driven odds once Phase 1 settlement data exists? Plan an offline calibration job before Phase 2.
- **Margin transparency UX**: the *exact* copy and placement of the fair-odds and house-edge disclosure. Counsel will weigh in; design owns the surface.
- **Customer support model**: even with auto-settlement, real-money users will have disputes. Staffing, hours, escalation paths.
- **Promotional contracts**: founder-mode promos (e.g. "first contract on us") have regulatory implications. Design only after counsel signs off.
- **Bot / engine detection beyond Lichess fair-play**: we trust Lichess flags, but our own velocity + result-distribution analytics may catch things earlier. Phase 2 ramp.
- **Referral and viral mechanics**: not in either demo. Plan post-Phase 2.
