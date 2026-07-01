# Money Match — Product Roadmap

**Last updated:** 2026-07-01

A product-level roadmap: what the demo does today, and the product work to turn
it into a mature, investor-ready MVP. Everything here is play-money and
demo-buildable. Real-money rails (payments, KYC, production geofencing) and
legal/compliance sign-off are tracked separately and intentionally out of scope
for this document.

The model is unchanged throughout: **peer-to-peer, rake-only, no house** — the
platform matches players and takes a fixed rake off the pot; it never sets a
line or holds an outcome position. The escrow invariant `sum(payouts) + rake =
sum(entries)` holds on every settlement.

---

## Phase 0 — Shipped (play-money demo)

The current build is a polished, multi-game, play-money demo that proves the
whole loop against **real, verified game data**.

**Games (3 real integrations, one game-agnostic adapter layer):**
- **Chess — Lichess:** verified profile, contests settle against your real rated games.
- **Counter-Strike 2 — FaceIt:** verified identity/stats; H2H settles against your real FaceIt match.
- **Dota 2 — OpenDota:** verified identity/stats; H2H settles against your real match.

**Contest formats:**
- **Head-to-head:** a wager creator (works for every game), an open-match lobby, a confirm handshake, escrow → auto-settle, and full refund on expiry. The opponent is a skill-bracketed bot in the demo.
- **Solo pools:** pooled, rake-only "clear the standard" contests, geo-fenced entry, settle to clearers.
- **Tournaments:** leaderboard pools + single-elimination brackets (draws rematch to decisive), top-N prize split.

**Surfaces & polish:**
- Leaderboard (ranked by ROI/record), spectator view (chess board + move list + clock) and a live match tracker (CS2/Dota), match history with per-opponent H2H P&L.
- A shared game filter across Head-to-Head / Solo / Tournaments — persistent across pages, ordered by most-recently-used, animated.
- Consolidated Profile (link accounts + verified skill + wallet + history), responsible-gaming loss limit, geo-fence stub for restricted states.
- Escrow/rake invariant enforced everywhere, backed by a 90+ test suite. Consistent design system (shared page headers, card shell, empty states, page transitions).

**What's demo-shaped (the honest gaps Phases 1+ close):**
- State lives client-side (localStorage); there is no shared server truth.
- The "second player" in head-to-head is a bot, not a real opponent.
- Anti-collusion is a stub; there is no operator visibility.

**The through-line for Phases 1–2:** move from a single-session client demo to a
**shared, server-backed product** — the prerequisite for real players and
provable money.

---

## Phase 1 — Real head-to-head matchmaking

> **One sentence:** Two real players, in separate sessions, are paired by skill bracket, both stake, play one real game, and the winner is paid automatically — no bot, no operator.

**Status (2026-07-01): implemented (demo).** A server-side in-memory queue
(`api/_lib/match_queue.py`) pairs two sessions by `(game, format, entry, rating
band)` with a band that widens over time, runs the confirm handshake, and owns
the match lifecycle (`/api/mm/queue|poll|match|confirm|cancel|settle`). Chess is
**brokered** — on both-confirm the server creates a real Lichess open challenge
and hands each player their color URL; CS2/Dota are **coordinated** (copy the
opponent's handle). Settlement grades the shared match: the brokered game id for
chess, or the earliest match shared by both accounts' histories for CS2/Dota;
draws/expiry refund both. Frontend: `FindOpponent` (`useMatchmaking`) drives
idle → searching → match-found → confirm → play → result, wired to the wallet
(escrow on confirm, reconcile on settle), and is the primary Head-to-Head path
(the bot creator is now a secondary "custom match"). Verified end-to-end against
live Lichess. Demo notes: state is in-memory (single instance, resets on
restart) and two same-browser tabs share one wallet, so a true two-player demo
uses two browsers/profiles.

**In:**
- Server-side matchmaking queue keyed on `(game, format, entry tier, rating band)` with tolerance that widens over time.
- Live pairing across sessions; a "searching…" presence state and a "match found" surface.
- Confirmation handshake with a tight timeout; re-queue on decline or timeout.
- Shared contest state both players see update in real time (join → matched → active → settled).
- Frictionless re-queue after a result.

### Ensuring the two play *each other*

The integrity anchor: settlement keys on **the single match that contains both
matched players** (same host game/match id, opposite sides) — never "your next
qualifying game." If no shared match appears before the window closes, both
entries are refunded. This is what makes it a real head-to-head rather than
"beat a random weak opponent." Getting the pair into that match differs by game:

- **Brokered — chess (Lichess), the hero flow.** On mutual confirm, the server
  creates an **open challenge** via the Lichess API (agreed time control) and
  gets back a game id plus two color URLs. Each player's **"Go play"** button
  deep-links them to their URL; both land in the same game and we settle on that
  game id. No account OAuth and no handle-sharing required — the platform brokers
  the pairing end to end.
- **Coordinated — CS2 (FaceIt) / Dota 2 (OpenDota).** Their public APIs are
  read-only, so we can't force two accounts into a private match. The **match-found
  modal shows the opponent's handle with a copy button** and per-game instructions
  ("Add **{FaceIt handle}** and start a match" / "Invite **{Steam ID}** to a
  lobby"). The players play each other; settlement then finds the shared match
  (both accounts, opposite factions) in the window and settles on it.

### End-to-end flow
1. **Queue** → skill-bracketed pairing of two real sessions.
2. **Match-found modal** (both players): opponent handle + rating, entry, pot, rake, net payout. Both confirm within a tight window → entries escrow. Decline/timeout → re-queue.
3. **Go play:** Lichess opens the brokered game URL; CS2/Dota show the opponent handle + copy button + "add / lobby up" instructions.
4. **Settle** on the shared match → winner takes pot − rake; both sessions update live.
5. **No shared match before the window closes** → refund both, no rake.

### Engineering deltas
- `Contract` gains `opponent_account` (the real counterparty) and `host_game_id` (set once the match exists).
- `resolve_contract` grades the match containing **both** accounts, not the next game.
- Chess adapter adds `create_match()` (open-challenge brokering); CS2/Dota adapters stay read-only and rely on the shared-match check.

**Out:**
- Real money. Bots stay only as a clearly-labeled, play-money queue-warmer for empty lobbies.

**Success:** two browsers queue, get matched, confirm, play one real Lichess/FaceIt/OpenDota game *against each other*, and the pot settles to the winner minus rake from that shared match — both sessions update with zero manual steps.

---

## Phase 1.5 — Recommendation signal & settlement moment

> **One sentence:** Help players pick the right contest, and make winning feel like winning.

**In:**
- **AI recommendation indicator.** A small red / yellow / green dot in the bottom-right of every joinable card (posted head-to-head match, tournament, solo challenge). Hovering opens a short popover explaining the call, based on the player's skill/ELO versus the contest: green = favorable, yellow = competitive, red = a stretch. For head-to-head it uses the ELO win-expectancy against the matched opponent; for pooled tournaments/solo it uses the player's skill for that game versus the field/stake. (Heuristic today; the same slot swaps to a model later.)
- **Match settlement popup.** On win/loss/refund, a celebratory modal with a fancy animation showing the amount won or lost, the payout math (pot − rake), and *why* — "You beat {opponent}", "You cleared the standard", "You finished #2 of 8", or "Drawn — refunded". Replaces the quiet toast for the headline moment.

**Out:**
- A trained recommendation model (the heuristic stands in); confetti libraries (animate with the framer-motion already in the app).

**Success:** every joinable card shows an explained r/y/g pick, and every settlement lands with a clear "you won $X because …" moment.

---

## Phase 2 — Audit ledger & server-authoritative money

> **One sentence:** Every cent is provable — the wallet becomes server-authoritative and every money movement is an immutable event.

**In:**
- Append-only ledger: entry escrowed, match settled, rake extracted, refund issued, limit changed — each an immutable, timestamped event.
- Server-side wallet as the single source of truth (balances survive refresh and follow the user across devices).
- A user-facing **Activity / receipts** view, and an **integrity** view that reconciles `sum(payouts) + rake = entries` per contest straight from the ledger.
- Persisted, consistent contest lifecycle states.

**Out:**
- External accounting/export integrations.

**Success:** any settled contest can be traced event-by-event; the invariant is visibly reconciled from the ledger; the same balances appear on a second device.

---

## Phase 3 — Operator metrics & insight

> **One sentence:** See the marketplace's health at a glance.

**In:**
- An operator dashboard: queue depth and median match wait per `(game, tier, bracket)`, settlement latency, active/settled/canceled counts, rake collected / gross gaming revenue, payout integrity, and per-game liquidity.
- Simple time-series and a funnel: contest viewed → queued → matched → settled.
- Player-facing insight already exists (leaderboard, P&L) and is refined here.

**Success:** at any moment, one screen answers "are people matching, how fast, and what's the rake?"

---

## Phase 4 — Integrity & anti-collusion

> **One sentence:** Make layering on games we don't control safe — detect and deter collusion, soft-play, and sandbagging.

**In:**
- Pair-frequency limits (no repeated pairing of the same two accounts within a window) and self-pairing prevention — building on the existing `can_pair` seam.
- Clustering signals (device / payment instrument / IP) and directional win/loss-flow detection between account pairs.
- Sandbagging / rating-manipulation detection on bracket entry.
- Honoring host cheat flags with post-settlement clawback.
- A **risk view** surfacing flagged pairs/accounts and the action taken.

**Out:**
- Full ML fraud modeling.

**Success:** a colluding pair (repeated pairing plus one-directional value flow) is automatically flagged and blocked from re-pairing, and the flag is visible and actionable.

---

## Phase 5 — Engagement & depth

> **One sentence:** Deeper play and stickier loops.

**In:**
- Friend / direct challenges (challenge a specific player).
- Notifications (match found, your turn, contest settled) in-app and push.
- Richer spectator: full board stream, extended to more titles.
- Double-elimination brackets; standalone head-to-head draw handling (rematch / split-pot / refund choice).
- Real solo-pool telemetry (replace the mocked webhook with posted match telemetry).
- One-tap re-queue / rematch; onboarding refinements; season / streak mechanics.

**Success:** a player can challenge a friend, get notified on match and settle, and re-queue in one tap; solo pools grade off real posted telemetry.

---

## Cross-cutting product principles

- **Depth over breadth.** Chess (Lichess) stays the hero for the deepest, most reliable flows; CS2 and Dota prove the architecture generalizes. Add new titles only after the core loop is excellent.
- **Bots are play-money only,** clearly labeled, and used solely to warm empty queues — never in real-money play.
- **Trust is a feature.** The rake is always disclosed, the invariant is always visible, and (from Phase 2) every movement is auditable.
