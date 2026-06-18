# Clutchbook — Product Overview

**Last updated:** 2026-05-28

---

## 1. Summary

Clutchbook is a skill-based wagering platform layered on top of existing competitive games. Players wager money against platform-generated skill contracts. These are concrete, stat-derived performance objectives. Then, they play normal ranked matches on the games they already play. Results are auto-verified through the host game's official API, and payouts settle without a human in the loop.

Clutchbook starts with chess (via Lichess) because chess has a mature public API, a deeply rated player base, and built-in anti-cheat. The product is built so additional titles with open APIs (Counter-Strike 2, Dota 2, League of Legends, etc.) plug in as new game adapters without re-architecting the contract, odds, or settlement layers.

This document defines what Clutchbook is. The companion [`roadmap.md`](./roadmap.md) defines what we are building, in what order, and against what success criteria.

---

## 2. What Clutchbook Is Not

To prevent positioning drift, three things Clutchbook is not:

- **Not a sportsbook.** Users do not wager on third parties' matches. Every contract resolves against the user's own play. (The internal v1 demo used a sportsbook-style UI to test mechanics; that framing is deprecated.)
- **Not fantasy / DFS.** There is no roster construction, no salary cap, no proxy contests.
- **Not a casino.** Outcomes are determined by the user's measurable skilled performance in a regulated game environment, not by random number generation.

The legal and marketing posture flows from those three negations.

---

## 3. Skill Contract

A skill contract is the atomic unit of Clutchbook. It is a structured offer:

> "If you achieve **{objective}** in **{game / format}** within **{window}**, we pay you **{stake × multiplier}**."

A contract has six required fields:

| Field           | Example                                              |
| --------------- | ---------------------------------------------------- |
| `game`          | `chess.lichess`                                      |
| `format`        | Rated Blitz 5+0                                      |
| `objective`     | Win the next game                                    |
| `window`        | Next 1 qualifying game OR 2 hours, whichever first   |
| `line` / `odds` | Decimal multiplier (e.g. 1.85x) priced by the engine |
| `stake_range`   | Min $1, Max $100 (Phase 1 caps — see [§7](#7-money-mechanics)) |

The line is computed from the user's verified stats so the contract is *personalized*. A 1200-rated player and a 2100-rated player are offered different multipliers for the "win your next blitz game" contract because their underlying probabilities differ.

### 3.1 Contract types

Phase 1 ships three contract families. The catalog can mix them.

1. **Single-game objective** — resolves in one game.
   *Examples:* "Win your next rated blitz game", "Win a blitz game in under 30 moves", "Avoid losing on time in your next rapid game."

2. **Multi-game series** — resolves over N qualifying games.
   *Examples:* "Win 3 of your next 5 rated blitz games", "Net +20 rating over your next 10 games."

3. **Performance line (over/under)** — platform sets a numeric line based on your historical stats; user picks side.
   *Examples:* "Avg game length under 32 moves over next 5 games", "Win rate over 55% across next 10 rapid games."

### 3.2 Odds generation

Odds are produced by Clutchbook's **odds engine** (current home: `api/_lib/odds_engine.py`). The engine consumes:

- The user's verified stats from the host game's API (rating, recent results, opening repertoire breadth, time-trouble rate, etc.).
- The contract's objective and window.
- Configured **house margin** (see [§7.2](#72-revenue-margin-baked-into-odds)).

It outputs a decimal multiplier such that the *fair* (zero-margin) implied probability matches a calibrated estimate of the user's success rate, then trims the multiplier to bake in margin.

The engine is the single source of truth for pricing. UI does not invent or display unsourced odds.

### 3.3 Contract resolution

A contract progresses through four states: `OFFERED → ACTIVE → RESOLVING → SETTLED`.

- **OFFERED** — visible in the user's catalog. No stake committed.
- **ACTIVE** — user accepted the contract and committed stake. Clock and qualifying-game counter started.
- **RESOLVING** — the qualifying game(s) have completed; we are confirming results via the host API. Typically sub-minute.
- **SETTLED** — outcome determined; payout credited (win) or stake forfeit recorded (loss). Receipt issued.

A game qualifies if it matches the contract's `game`, `format`, and rating/match-type filters (e.g. "rated only"). Aborted games, disconnect-aborts before move 1, and games against banned/cheat-flagged accounts do not qualify and do not consume the window.

If the window expires with insufficient qualifying games, the contract resolves as `EXPIRED` and the stake is refunded. (Expiration is a refund event, not a loss event — this is important to communicate.)

---

## 4. User Experience — High Level

Two surfaces drive Phase 1:

### 4.1 Catalog (primary)

A personalized feed of 6–10 live contracts, regenerated as the user's stats and the queue state evolve. Each card shows objective, window, line, stake input, and projected payout. One tap activates.

### 4.2 Builder (power feature)

For users who want to specify their own objective inside the platform's allowed dimensions:

- Game and format
- Objective from a typed list (win, win in under N moves, win rate over X, etc.)
- Window (next 1, 3, 5, 10 qualifying games)
- Stake

The builder generates a line on the fly and lets the user activate the resulting contract. It is *not* an open-ended request box — every contract still goes through the engine and lives inside the platform's defined contract grammar.

### 4.3 Phase 2 — Two-player matched wagers

Phase 2 adds a head-to-head surface where two real users wager against each other rather than the house. Matchmaking is a **skill-bracketed queue** keyed on (game, format, stake tier, rating band). When two queued players match, Clutchbook generates a Lichess challenge under the hood; the result of that game resolves both stakes minus the platform margin.

Phase 2 is detailed in the roadmap. Phase 1 is single-player vs. platform.

---

## 5. Identity, Verification, and Fair Play

Every paid feature requires a verified identity binding to the host game account whose stats determine the odds. This is non-negotiable for both fairness and compliance.

### 5.1 Account linking

- **Lichess OAuth (primary).** Users sign in with Lichess. We receive a verified `user.id` plus scoped read access to game history. This is the canonical path.
- **Username claim (fallback).** Users assert a username and we read only the public stats endpoint. Username-only accounts have reduced limits (lower stake cap, longer cooldowns) until they upgrade to OAuth.

### 5.2 Result verification

All settlement reads from the host game's authoritative API. The user's client never reports its own outcome. For chess (Lichess) this means polling `/api/games/user/{username}` filtered to qualifying games since the contract's `activated_at`.

### 5.3 Anti-cheat reliance

We do not build our own anti-cheat. We rely on the host platform's:

- Game-engine analysis (Lichess flags suspicious accuracy distributions).
- Reputation and account-age signals from the host API.
- Our own account-age and minimum-games-played thresholds before contracts unlock.

If the host platform later flags a game or account as cheating after settlement, Clutchbook reserves the right to claw back the affected payout per the user agreement.

### 5.4 Withdrawal, abort, and edge cases

- **Aborts (before move 1):** do not count, window unaffected.
- **Resigning early:** counts. A loss is a loss. (This prevents abuse of "I started losing so I quit.")
- **Opponent disconnect or AFK:** if the host platform awards the win to our user, the contract counts that as a win.
- **Server outage on Lichess:** active contracts pause and have their windows extended by the outage duration.

---

## 6. Multi-Game Architecture

Clutchbook is built **game-agnostic at the core** from day one. Chess is the first implementation, not the only one.

### 6.1 GameAdapter interface

Every supported game implements the `GameAdapter` contract:

```ts
interface GameAdapter {
  id: string;                                  // e.g. "chess.lichess"
  metadata: GameMetadata;                      // display, supported formats
  linkAccount(method: 'oauth' | 'username'): Promise<AccountLink>;
  fetchProfile(accountId: string): Promise<SkillProfile>;
  pollEligibleGames(accountId: string, since: Date, filters: GameFilters): Promise<Game[]>;
  resolveContract(contract: Contract, games: Game[]): ResolutionResult;
}
```

The contract layer, the odds engine, the bet slip / wallet, the settlement loop, and the UI shell are all written against this interface. Adding Counter-Strike means writing a `cs2.steam` adapter — not refactoring core.

### 6.2 Expansion targets

In rough priority order, based on API openness, audience size, and fit for skill-contract framing:

1. **Counter-Strike 2** via Steam Web API + community match history endpoints.
2. **Dota 2** via Steam + OpenDota / STRATZ.
3. **League of Legends** via Riot API.
4. **Rocket League** via Psyonix / public stat sites.
5. **Valorant** via Riot API (rate-limited; partnership may be required).

Each candidate is evaluated against a fixed checklist: (a) is there a documented stable API, (b) are match results queryable by user identity, (c) does the API expose enough detail to set lines (rating, K/D, ACS, etc.), (d) does the title's publisher allow third-party stat use under ToS, (e) is the player base large enough to justify the adapter cost.

### 6.3 What stays game-specific vs. shared

| Layer                     | Game-specific?  | Notes                                           |
| ------------------------- | --------------- | ----------------------------------------------- |
| Account linking           | Yes             | OAuth flow varies per platform.                 |
| Profile / stat schema     | Yes             | Each game has its own normalized schema.        |
| Game polling              | Yes             | Each adapter knows its API.                     |
| Contract object           | Shared          | Objective + window + line is universal.         |
| Odds engine               | Shared core + per-game calibration | Engine is shared; calibration tables are per-game. |
| Wallet / KYC / payouts    | Shared          |                                                 |
| Settlement state machine  | Shared          |                                                 |
| Catalog generation rules  | Shared core + per-game contract templates |                                       |
| UI shell                  | Shared          |                                                 |
| Game card / detail surface | Themed per game | Same React primitives, different visuals.      |

---

## 7. Money Mechanics

Clutchbook handles real money at launch. The demos remain play-money sandboxes; the production system handles deposits, wagers, and withdrawals in regulated currency.

### 7.1 Wallet model

Every verified user has a Clutchbook wallet with:

- **Available balance** — withdrawable, not committed to any contract.
- **Pending balance** — stake held by `ACTIVE` or `RESOLVING` contracts.
- **Locked balance** — held during KYC review, withdrawal processing, or compliance flags.

Stakes move from available → pending on contract activation. On settlement, payouts move from house → available (win) or pending → house (loss). Expirations return pending → available.

### 7.2 Revenue: margin baked into odds

Clutchbook's primary revenue is **the spread between true probability and offered odds.** If the engine prices a contract at a fair multiplier of 2.00x and the configured margin is 6%, the user is offered 1.88x. Over a large enough volume of priced contracts, the margin is the take.

Properties of this model:

- Transparent to engineering: house edge is a configurable per-game, per-contract-type parameter.
- Transparent to legal: no commission line item; the wager is the price.
- Generalizes cleanly to Phase 2: in matched wagers the margin is taken before the winner is paid the opponent's stake.

Secondary revenue paths (not committed for Phase 1, listed for completeness): premium contract types behind subscription, leaderboard-tournament rake, sponsored contracts tied to live events.

### 7.3 Stake and risk limits

Phase 1 launch caps, intended to be tuned by risk / compliance once we have volume data:

| Limit                           | Phase 1 value | Why                                                        |
| ------------------------------- | ------------- | ---------------------------------------------------------- |
| Per-contract minimum stake      | $1            | Lowers barrier to first-contract activation.               |
| Per-contract maximum stake      | $100          | Caps single-contract loss exposure pre-KYC.                |
| Daily loss cap (user)           | $200          | Responsible-gaming control; user-adjustable downward.      |
| Daily wager cap (user)          | $500          | Velocity limit pre-KYC.                                    |
| KYC-required threshold          | $500 cumulative wagered | Triggers identity verification flow.              |
| Withdrawal threshold            | $20           | Min withdrawal; reduces processing overhead.               |
| Max simultaneously active contracts | 3         | Caps platform exposure per user and simplifies UX.         |

These numbers are commitments for engineering and design to build to. They will be revisited before public launch with risk / legal input. Treat the schema as load-bearing; treat the values as tunable.

### 7.4 Deposits and withdrawals

Out of scope for Phase 1 demo. The production milestone between Phase 1 and Phase 2 implements deposits via a regulated payments partner (Stripe Treasury or similar with gaming-licensed correspondent). Withdrawals route to the same instrument as the deposit by default to satisfy AML controls.

---

## 8. Tech Architecture

### 8.1 Current state (carried into Phase 1 demo)

The Phase 1 *demo* keeps the existing stack — React 18 + TypeScript + Vite on the frontend, FastAPI on Vercel Python for the backend, client-side state via `localStorage`. This is the right scope for a demo because it iterates fast and is cheap to throw away.

Key existing modules that survive the pivot (with renaming and reshaping):

- `api/_lib/odds_engine.py` — repurposed from market-pricing to contract-pricing.
- `api/_lib/lichess_service.py` — becomes the Lichess GameAdapter.
- `src/hooks/useBalance.ts`, `useBetSlip.ts`, `useBetSettlement.ts` — generalize from market bets to contracts.
- The Tabs / Layout / UI components — most reusable; copy and labeling change.

### 8.2 Production architecture (forward-looking)

The production milestone between Phase 1 demo and Phase 2 introduces:

- **Postgres** (Neon or Supabase) for users, accounts, contracts, wallets, ledger entries.
- **Lichess OAuth** server-side, with refresh-token rotation and scoped read.
- **Background worker** for settlement polling (each ACTIVE contract has its own poll cadence; cheaper than serverless invocations for sustained polling).
- **Payments partner** for deposits and withdrawals.
- **KYC partner** (Persona, Veriff, or similar) for identity verification at threshold.
- **Audit ledger** — append-only event log of every wallet mutation and contract state change. Required for both compliance and dispute resolution.
- **Feature flags + risk kill switches** — per-game, per-contract-type, per-user toggles operable without a deploy.

This is documented up-front because Phase 1 demo decisions (data shapes, API surface, event names) should not paint Phase 2 into a corner.

### 8.3 Multi-game seams

The GameAdapter interface from [§6.1](#61-gameadapter-interface) is implemented on day one with chess. The contract schema, odds engine entry points, and settlement state machine are written against the adapter, not against Lichess directly. New adapters register through a small `registry.py` module.

---

## 9. Glossary

| Term                | Definition                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Skill contract**  | A priced, stat-derived performance offer the user can accept against real currency.                |
| **Catalog**         | The personalized feed of currently-OFFERED contracts a user sees.                                   |
| **Builder**         | The form-driven surface that lets a user assemble a contract within allowed dimensions.            |
| **Line / odds**     | The decimal multiplier the engine has priced for a contract.                                       |
| **Window**          | The time and qualifying-game budget within which a contract must resolve.                          |
| **Qualifying game** | A host-platform game that matches the contract's game, format, and match-type filters.             |
| **Activate**        | The user action that commits stake and moves a contract from OFFERED to ACTIVE.                    |
| **Settlement**      | The automatic process of reading host-platform results and resolving the contract.                  |
| **GameAdapter**     | The interface every supported title implements so the contract / odds / settlement layers stay shared. |
| **House margin**    | The configured spread between fair odds and offered odds. Clutchbook's revenue per contract.       |

---

## 10. Compliance & Legal Positioning

> This section is not legal advice. It is the engineering and product team's *working model* of the compliance posture, sufficient to make consistent decisions and to brief specialist counsel. Every numerical limit, threshold, or jurisdiction commitment here must be validated by counsel before public launch.

### 10.1 Skill-game framing

Clutchbook positions itself under the **skill-based competition** legal frame, in line with the precedent established by daily fantasy sports operators in the U.S. The core argument: contracts resolve against the user's own measurable, repeatable skilled performance in a deterministic-rules game; chance is a minor and disclosed factor, not the dominant determinant of outcome.

This framing has implications for how we describe the product to users (we wager on *skill*; we do not bet on *chance*), how contracts are constructed (no contract may resolve purely on a random outcome), and which markets we can operate in.

### 10.2 Jurisdiction strategy

We do **not** launch nationally on day one. The launch sequence is:

1. **Skill-friendly U.S. states first.** The opening jurisdiction set mirrors DFS-permitted states. Specific list to be confirmed by counsel.
2. **Geofencing.** Account creation, deposits, and contract activation are geo-gated. We will use a recognized geolocation partner, not IP-only.
3. **Explicit exclusion** of jurisdictions where the skill-game frame does not hold (e.g. Washington state historically, certain prohibitive jurisdictions). The user agreement enumerates excluded jurisdictions.
4. **International expansion** is deferred until U.S. footprint is stable. Each country onboarding is its own compliance project.

### 10.3 KYC / AML

Triggered at the [stake threshold defined in §7.3](#73-stake-and-risk-limits). The KYC partner is selected before production launch. Until KYC clears, the user is capped at the pre-KYC limits and cannot withdraw beyond the lowest tier.

AML controls include:

- Same-instrument-in / same-instrument-out as the default for deposits and withdrawals.
- Velocity monitoring on deposits, wagers, and withdrawals.
- Sanctions screening at KYC.
- Suspicious activity reporting (SAR) capability built into the audit ledger.

### 10.4 Responsible gaming

Non-negotiable controls present from production launch:

- Self-set deposit, loss, and session limits, lowerable instantly, raisable only after a 24-hour cooldown.
- Self-exclusion with a 7-day minimum and durations up to permanent.
- Reality checks (configurable session-time prompts).
- Clear, accurate display of expected value: every contract surfaces its fair-odds equivalent and the implied house edge in plain language somewhere reachable. Users should be able to see what they are paying.

### 10.5 Open compliance items

Captured here so they are not lost in roadmap iteration:

- Final jurisdiction list and per-state nuances.
- KYC partner selection.
- Payments partner with gaming-licensed correspondent.
- State-by-state registration / licensing where required.
- Terms of service, privacy policy, user agreement (with counsel).
- Fair-play and disputes process beyond automated host-API verification.
- Tax reporting (1099 thresholds where applicable).
