# Money Match — Roadmap

**Last updated:** 2026-06-18
**Companion document:** [`overview.md`](./overview.md) — read first for product definition.

This roadmap covers the path from the current play-money demo to a real-money, peer-to-peer skill-contest platform. Chess (via Lichess) is the only game through the first real-money launch; multi-game expansion is sketched in [§5](#5-phase-3-multi-game-expansion).

The legal/economic model is **peer-to-peer entry-fee contests with a fixed rake** (the Triumph / Skillz model, layered on existing games) — see [`overview.md` §2](./overview.md#2-why-peer-to-peer--rake-and-not-a-sportsbook). Everything below builds toward that model. The pre-pivot sportsbook/house-banked docs are archived in [`docs/old/`](./old/).

---

## 0. Phase 0 — Current state (deprecated house-banked demo)

The repo currently ships a **single-player, house-banked, play-money demo**: a verified user accepts a stat-derived "skill contract" priced against a house line and watches it auto-settle against their real Lichess games. It is polished and proves the data pipeline and UX primitives — but its **economic model is the one we are leaving behind** (a house line is a proposition bet; see overview §2).

**Carries forward into Phase 1:**

- The Lichess data pipeline / `chess.lichess` adapter (`api/_lib/adapters/chess_lichess.py`).
- The settlement-by-host-API polling pattern (generalizes to contest resolution).
- The wallet/balance abstraction (`src/hooks/useWallet.ts`) → escrow-aware wallet.
- The `GameAdapter` interface + registry (already game-agnostic).
- Layout / UI shell, currency + persistence utilities, telemetry scaffold.

**Does not carry forward:**

- **House-banked pricing.** The odds engine stops setting payout lines; it becomes a skill-rating + bracketing service (`overview.md` §3.2).
- **Single-player vs. the house** as a real-money mode. Replaced by peer-to-peer contests.
- Copy that implies wagering against a line / the house. Replace with "contest", "entry", "pot", "rake", "head-to-head".

---

## 1. Phase 1 — Peer-to-peer head-to-head (chess, play-money demo)

> **One sentence:** Two verified users in different sessions are paired by skill bracket, each stakes a (play-money) entry into an escrowed pot, they play one Lichess game, and the winner is paid the pot minus a fixed rake — fully auto-settled.

This phase re-architects the demo from house-banked solo contracts into the real legal model, still on the throwaway demo stack and still play-money.

### 1.1 Scope

**In:**

- Chess only, via Lichess.
- **Peer-to-peer head-to-head** as the primary mode: 2 players, 1 game, winner takes pot − rake.
- Skill-bracketed matchmaking queue keyed on `(game, format, entry tier, rating band)` with widening tolerance.
- Confirmation handshake (both must accept within a tight window) and under-the-hood Lichess challenge generation.
- Escrow + rake mechanics with the `sum(payouts) + rake = sum(entries)` invariant enforced and visible.
- Contract lifecycle `OPEN → MATCHED → ACTIVE → RESOLVING → SETTLED / CANCELED` backed by polling.
- Lobby (primary surface) + Builder (post a custom contest).
- Lichess account linking: OAuth (preferred; mockable in demo) + username fallback.
- Multi-entrant tournament family stubbed behind head-to-head.
- Compliance-shaped UX: rake disclosed on every contest, self-set loss caps, responsible-gaming surfaces stubbed.
- Anti-collusion **scaffolding**: pair-frequency limit + a place to hang clustering signals (full detection is production).

**Out:**

- Real money, real KYC, real Postgres, real audit ledger (production milestone).
- Multi-entrant tournaments as a polished mode (fast-follow within Phase 1 once head-to-head is solid).
- Any game besides chess.
- Native mobile apps — responsive web only.

### 1.2 User journey

1. **Land** → brand wall, single CTA: *Link your Lichess account*.
2. **Link** → OAuth or username fallback; fetch skill profile; seed play-money wallet ($1,000).
3. **Lobby** → join an open contest or quick-join by format/entry tier; one tap reserves the entry and enters matchmaking.
4. **Match found** → confirmation surface (opponent rating, entry, format, pot, rake, net payout). Both confirm within ~15s → entries escrow.
5. **Play** → *Go play* deep-links the Lichess challenge; user plays normally.
6. **Resolve** → on game end, RESOLVING (sub-minute) → SETTLED; winner's wallet animates the pot − rake; receipt in My Contests.
7. **Re-queue or stop** → frictionless re-queue; loss/session limits apply.

### 1.3 Surfaces

| Surface | Purpose |
| --- | --- |
| Lobby | Open contests + quick-join; primary engagement loop. |
| Builder | Post a custom contest within allowed dimensions. |
| Active | In-flight contests with window countdown / live state. |
| My Contests | History of settled + canceled contests, receipts, P&L. |
| Profile / Stats | Linked identity, verified skill profile, wallet, limits. |
| Responsible Gaming | Self-set deposit / loss / session limits, self-exclusion (stub). |

### 1.4 Engineering work

**Data model (`src/types/`, `api/_lib/schemas.py`):**
- Reshape `Contract` to the peer-to-peer shape: `entrants`, `entry`, `pot`, `rake_pct`, `prize`, `participants[]` (account links), `state` (OPEN…CANCELED), `matched_at`, `qualifying_game_ids[]`, `winner`, `outcome`.
- Replace the house-banked `Line` with a `Bracket` (rating band, match-quality signal). No payout line.
- `Objective` stays a typed union (`WinHeadToHead`, `WinUnderNMoves`, `TournamentRank`, …); Builder and Lobby emit identical shapes.

**Matchmaking (`api/_lib/matchmaking.py`, new):**
- Queue keyed on `(game, format, entry_tier, rating_band)`; widening tolerance over time.
- Pairing + confirmation handshake with timeout and re-queue on decline.
- Anti-collusion: no repeated pairing of the same two accounts within a window; no self-pairing (device/instrument checks stubbed).

**Skill-rating service (rename `odds_engine.py`):**
- Repurpose from pricing to **bracketing**: estimate strength from the `SkillProfile`, output rating band + an honest match-quality signal. Calibration tables stay under `api/_lib/calibration/chess.py`.

**Match creation + lifecycle (`adapters/chess_lichess.py`, `api/index.py`):**
- `createMatch(a, b, format)` → Lichess challenge between the two accounts; handle to both.
- `POST /api/contracts/{id}/confirm`, `/activate` (escrow both entries atomically).
- Settlement worker (client-driven in demo) polling per active contract; resolve via adapter; enforce the escrow/rake invariant.
- Abort/cancel handling with **full refund** (never a loss).

**Escrow wallet (`useWallet.ts`):**
- available / escrow / locked balances; entry → escrow on match; pot − rake → winner on settle; rake → platform ledger entry; refund on cancel.

**Compliance UX:**
- Rake disclosed on every contest card and detail view (the peer-to-peer analog of house-edge disclosure).
- Self-set daily loss limit (instant lower, 24h cooldown to raise — mockable); responsible-gaming page; geo-gating stub.

**Renaming pass + telemetry:**
- Strip "odds / line / vs the house / bet" wording. New vocabulary per [`overview.md` §10](./overview.md#10-glossary).
- Events: `contest_viewed`, `entry_queued`, `match_found`, `match_confirmed`, `contest_settled`, `rake_collected`, `limit_changed`, `oauth_linked`, `collusion_flagged`. Names outlast the demo.

### 1.5 Demo constraints

- Play-money wallet; schemas/limits/copy are real, currency is virtual.
- No deposits/withdrawals; reset button restores bankroll.
- `localStorage` client state; shapes match the future DB.
- Two "players" simulated in two browser sessions/tabs (and/or a bot opponent) to demonstrate matchmaking end-to-end without a real second user.
- OAuth may be faithfully mocked but must exercise the same `linkAccount` / `createMatch` interfaces.

### 1.6 Success criteria

- Two sessions can queue, match, confirm, play one Lichess game, and watch the pot settle to the winner minus rake — no manual intervention.
- The escrow invariant `sum(payouts) + rake = sum(entries)` holds on every settled contest and is visible/auditable.
- Every contest card shows the rake in plain language.
- Zero remaining references to "odds / line / sportsbook / wager against the house" (grep gate in CI).
- The `GameAdapter` + matchmaking + settlement layers are written against the interface, not Lichess directly; a stub second adapter compiles.
- Deployed on Vercel with no build/runtime regressions. A 5-minute walkthrough needs no "imagine if."

---

## 2. Production milestone (between demo and real-money launch)

The gate between "great demo" and "taking real money." Non-negotiable.

### 2.1 Infrastructure
- **Postgres** (Neon/Supabase): users, accounts, contracts, wallets, ledger.
- **Server-side matchmaking queue** (Redis/Postgres) replacing client simulation.
- **Append-only audit ledger** — every wallet mutation, state change, and **rake extraction** as an immutable event; source of truth for disputes/regulators.
- **Background settlement worker** replacing client polling.
- **Feature flags + per-game / per-user kill switches** without a deploy.
- **Observability**: structured logs, error tracking, metrics for queue depth, match wait time, settlement latency, payout/rake integrity.

### 2.2 Real money
- **Payments partner** with a gaming-licensed correspondent; instant cash-out (Venmo / debit / PayPal / ACH, à la Triumph).
- **Same-instrument-in/out** AML default; **velocity monitoring** on deposits/entries/withdrawals.
- **KYC partner** at the defined threshold; **sanctions screening** at KYC and on payment events.
- **Tax reporting** (1099 generation above threshold).

### 2.3 Integrity & compliance (the part that is *not* free for us)
- **Anti-collusion system in production form** (not a stub): pair-frequency limits, device/instrument/IP clustering, directional win/loss-flow detection between account pairs, sandbagging detection on rating bands. This is the milestone item most specific to layering on third-party games — see overview §6.
- **Honor host cheat flags** + post-settlement clawback per user agreement.
- **Geofencing live** with a recognized geolocation partner (GPS, not IP-only); excluded-states enforcement (overview §9.2).
- **Account-binding immutability** (rebinding requires support).
- ToS / user agreement / privacy with gaming counsel; responsible-gaming controls in production form; documented + staffed dispute process.

### 2.4 Identity at production grade
- Lichess OAuth with refresh-token rotation, scoped to the minimum read + challenge issuance.

---

## 3. Phase 2 — Multi-entrant tournaments & scale

> **One sentence:** Add Skillz/Triumph-style N-player skill tournaments on top of the head-to-head core, plus the social and competitive surfaces that drive retention.

### 3.1 Scope

**In:**
- Multi-entrant tournaments: N players each play qualifying game(s), ranked by an objective metric, prize pool split among top finishers minus rake.
- Bracketed tournament formats (single/double elimination for head-to-head chains; leaderboard pools for solo-play tournaments).
- A re-scoped **leaderboard** based on record / ROI (not raw $ won — avoids pay-to-play optics).
- Live spectator view of one's own active match (board stream / move list + clock) — the visible "this is happening on money match" difference.
- Match history and head-to-head P&L surfaces.

**Out:**
- Friend/direct challenges as a launch feature (fast-follow once queues are healthy).
- Open posted-contract marketplace beyond the Builder (not committed).
- Any game besides chess.

### 3.2 Engineering highlights
- Tournament state machine + prize-pool split logic layered on the contest primitive; escrow generalizes to N-sided.
- Draw / abort / disconnect handling each with a documented, tested code path (draw policy is an open decision — see §3.4).
- Anti-collusion at tournament scale: collusion rings, soft-play within brackets, account-pair clustering surfaced to risk dashboards.
- Spectator streaming via Lichess board streaming or short-poll.

### 3.3 Success criteria
- Real users can enter a tournament, complete their games, and see correct top-N payouts settle from real results — no operator action.
- Median match wait under target at peak (simulated load).
- Escrow/rake invariant holds across N-sided pots: `sum(payouts) + rake = sum(entries)`, always.
- Anti-collusion limits are exercised and observable.

### 3.4 Open decisions
- **Draw handling** (head-to-head chess draws): rematch, split-pot-minus-rake, or refund-minus-fee.
- **Tournament cancellation** when fewer than the minimum entrants join.
- **Spectator fidelity**: full board stream vs. move list + clock.
- **Cross-time-control matching**: strict same-format vs. nearby-format widening for liquidity.

---

## 4. Phase 3 — Multi-game expansion

The operational mode once chess is validated end-to-end on real money. The architecture supports it from day one (overview §8.3).

### 4.1 Adapter onboarding gate (all five must hold)
1. Documented stable API or scrape-safe public stats.
2. Per-user match history queryable by verified identity.
3. Enough granularity to define head-to-head and tournament objectives.
4. Publisher ToS permits third-party stat use for our purpose.
5. Player base large enough for matchmaking liquidity.

### 4.2 Target order
1. **Counter-Strike 2** — Steam Web API + community match history.
2. **Dota 2** — Steam + OpenDota / STRATZ.
3. **League of Legends** — Riot API.
4. **Rocket League** — Psyonix / public stat sites.
5. **Valorant** — Riot API (rate-limited; partnership may be needed).

### 4.3 What does NOT scale automatically (re-done per title)
- **Skill-predominance assessment.** Chess is near-pure skill; FPS/MOBA titles carry more variance and must individually pass the dominant-factor / material-element tests per state. This can shift the legal map per game.
- **Anti-cheat + anti-collusion reliance.** Each title's host anti-cheat quality differs; the collusion surface (overview §6) is re-evaluated per game.
- **Compliance review.** New titles can change the regulatory profile (loot/RNG mechanics, publisher monetization, ToS).
- **Rating calibration** for bracketing — empirical per game.

---

## 5. Cross-cutting open items

- **Rake calibration & transparency**: the exact rake by game/format/contest type, and the precise disclosure copy/placement (counsel weighs in; design owns the surface).
- **Collusion economics**: model the breakeven where colluding to dodge the rake becomes worthwhile, and set pair limits / thresholds against it. The defining risk of the layer-on-third-party-games model.
- **Liquidity / cold-start**: matchmaking needs two-sided demand. Plan bot opponents (clearly labeled, play-money) and seeded contests for early lobbies; decide if/when bots are ever allowed in real-money play (default: never).
- **Customer support & disputes**: even with auto-settlement, real-money users dispute. Staffing, hours, escalation.
- **Promotional contests**: "first contest on us" promos have regulatory implications — design only after counsel.
- **Referral / viral mechanics**: post-Phase 2.
- **MA legislative watch**: pending iGaming/skill legislation could reshape the MA posture either direction; monitor through launch (overview §9.2).
