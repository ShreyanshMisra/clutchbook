# money match — Implementation & Context Reference

> **Purpose of this document.** This is a single-file, ground-truth description of
> the application as it actually exists in the repo right now: what's built, how
> the pieces fit together, how it looks, what's real vs. mocked, and what still
> needs to be done. It is written to be pasted into an AI assistant (Claude) as
> context so it can reason about the codebase without re-reading every file.
>
> Product framing lives in [`overview.md`](./overview.md); build order lives in
> [`roadmap.md`](./roadmap.md). This file is the engineering map.

---

## 0. Naming (read this first — it's confusing)

The project has been through a pivot, so three names coexist:

| Name | Where it appears | Meaning |
|---|---|---|
| **clutchbook** | repo folder, this workspace, `electron/main.ts` prod URL `clutchbook.app` | The old brand / repo name. |
| **money match** | the UI brand wall, header, FastAPI title, doc copy | The **current** product name shown to users. |
| **money-match** | `package.json` `name` field | npm package id. |

The product **pivoted from a house-banked sportsbook ("Clutchbook") to a
peer-to-peer skill-wagering platform ("money match")**. The pre-pivot docs are
archived under `docs/old/`. When you see "Clutchbook" in code (e.g. a comment or
the prod URL) treat it as legacy; the live product is **money match**. Throughout
this doc I use "money match" / "the app".

---

## 1. What the product is

**money match is a peer-to-peer skill-wagering platform layered on games people
already play.** Verified players stake an equal entry into an escrowed pot, play a
real match, the result is auto-verified through the game's official API, and the
winner takes the pot **minus a fixed platform rake**. The platform never takes a
position on the outcome — its only revenue is the rake. This is the Skillz /
Triumph "play for cash" legal structure, applied on top of existing games rather
than in-house games.

**Phase 1 ships one real game: Chess via the Lichess public API.** Everything is
**play-money** in the demo (wallet starts at $1,000 of virtual currency).

There are **two wagering products**:

1. **Head-to-Head (P2P contracts)** — two players (you vs. a skill-matched bot in
   the demo) each stake an entry; whoever wins the next qualifying chess game
   takes the pot minus rake. Backed by real Lichess game results.
2. **Solo Pools (algorithmic solo challenges)** — many players pay into a shared
   pool against a *qualifying skill standard* (e.g. "≥82% chess accuracy over ≥20
   moves"). Everyone who clears the standard splits the pool minus rake; if nobody
   clears, everyone is refunded and the platform earns nothing. No house, ever.

There is also a **desktop in-game overlay** (Electron) that shows a contract
widget on top of a running game — currently a separate demo surface, not wired to
the real contract backend yet.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript, Vite 5 |
| Styling | Tailwind (layout utilities only) + CSS custom properties (design tokens) in `src/index.css` |
| Animation | Framer Motion (overlay widget); CSS keyframes (everything else) |
| Charts | Recharts (`Sparkline` component — defined, not yet used in tabs) |
| Icons | `lucide-react` |
| Analytics | `@vercel/analytics` |
| Backend | Python **FastAPI** (async), `httpx` for Lichess calls, Pydantic v2 schemas |
| Hosting | **Vercel** — static frontend + Python serverless function at `api/index.py` |
| Desktop overlay | Electron 42 + `vite-plugin-electron` |
| OS window detection | `get-windows` (ESM-only) |
| Cross-platform env | `cross-env` |

There is **no database**. In the demo, the client owns all wallet/contract/pool
state in `localStorage`; the backend is **stateless** (it verifies identity,
generates lobbies, and grades settlement against real Lichess data). The Pydantic
/ TypeScript shapes are designed to match what a production DB will eventually
store.

---

## 3. How to run (and the #1 gotcha)

The app has **two processes in dev**: the Vite frontend (port 5173) and the
FastAPI backend (port 8000). Vite proxies `/api/*` → `http://localhost:8000`
(see `vite.config.ts`). **If the backend isn't running, every account link / lobby
/ settlement call fails.**

```bash
# 1. Backend (REQUIRED for linking accounts, lobby, settlement)
python -m uvicorn api.index:app --reload --port 8000

# 2. Frontend web app
npm run dev                      # http://localhost:5173

# Electron overlay variants (optional, separate from the web app)
npm run electron:dev:mock        # mock game detector, hotkey-driven, no game needed
npm run electron:dev             # real detector, needs a borderless-windowed game
npm run electron:build           # build the electron bundle
```

> **Known failure mode (important):** if `/api/profile?username=...` returns
> `{"detail":"Not Found"}` when linking a chess account, it means **the wrong
> server is on port 8000** (or none is). The clutchbook backend's health check is
> `GET /api/health` → `{"status":"ok","service":"money-match","games":["chess.lichess"]}`.
> If health returns something else (or 404), kill whatever is on :8000 and start
> `uvicorn api.index:app --port 8000` from the repo root. Vercel/`localhost`
> sometimes resolves to IPv6 `::1`; uvicorn binds IPv4 `127.0.0.1` by default, so
> if you hit proxy flakiness, set the Vite proxy target to `http://127.0.0.1:8000`.

`npm run lint` = `tsc -b --noEmit`. `npm run build` = `tsc -b && vite build`.

---

## 4. Repository layout

```
/api                         FastAPI backend (Python, stateless, serverless)
  index.py                   App + all routes (/api/profile, /api/lobby, /api/contracts/*, /api/solo/*)
  _lib/
    schemas.py               Pydantic models — SOURCE OF TRUTH for data shapes (mirrors src/types)
    lobby.py                 build_contract() + generate() — drafts → matched OPEN contests
    matchmaking.py           find_opponent() (bot in band), can_pair() anti-collusion stub
    skill_rating.py          Elo expectancy, bracket labels, per-objective rake
    solo_challenge.py        Pooled solo engine: geo-fence, pool seeding, grading, settlement
    lichess_service.py       Thin async httpx client over the Lichess public API
    adapters/
      base.py                GameAdapter ABC + NormGame/GameFilters value types
      registry.py            id → adapter; only chess.lichess registered; DEFAULT_GAME
      chess_lichess.py       The one real adapter (profile, games, contract resolution)
      stub_cs2.py            Throwaway 2nd adapter — proves the seam compiles; NOT registered

/src                         React web app + electron renderer
  main.tsx                   Entry; routes ?electron / ?overlay / (default) to a React root
  App.tsx                    Web app root — owns top-level state, wires hooks, renders tabs
  ElectronApp.tsx            Overlay renderer root (transparent, listens to game focus/blur)
  getWagerForGame.ts         Seam: process name → overlay ContractContent (returns demo data)
  electron.d.ts              window.overlay typing for the renderer
  types/
    index.ts                 Domain types — mirrors api/_lib/schemas.py + client-only view types
    overlay.ts               GameTarget + ContractContent (shared with electron/)
  hooks/
    useWallet.ts             Play-money wallet: available / escrow / locked, loss cap, anim
    useContracts.ts          Lobby fetch + join + settlement poll loop (P2P)
    useSoloPools.ts          Solo pool lobby + join + settle (pooled)
    useProfile.ts            Lichess link / unlink
    useToasts.ts             Toast queue
  utils/
    format.ts                formatCurrency, formatPct  (NOTE: NOT "oddsFormatter")
    contractText.ts          objectiveDetail, windowLabel, timeLeftLabel, outcomeBadge, matchQualityTone
    soloText.ts              standardLabel, genTelemetry (mock telemetry for the demo)
    games.ts                 GAMES[] — game metadata (chess live; cs2/clash/rl coming soon)
    states.ts                US_STATES, EXCLUDED_STATES (14), ALLOWED_STATES, isStateAllowed
    apiClient.ts             fetch wrapper for all backend calls
    storage.ts               localStorage get/set/clear, prefixed "moneymatch:"
    telemetry.ts             track(event, props) — console.debug in dev; analytics seam
    sampleContracts.ts       Static demo contracts for the pre-link preview
  components/
    Layout/       Header.tsx (balance), Sidebar.tsx (nav)
    Onboarding/   Landing.tsx (brand wall + 18+/state eligibility gate)
    Tabs/         Lobby, SoloPools, LinkAccounts, ActiveContracts, MyContests, Profile,
                  ResponsibleGaming, Builder
    Contracts/    ContestCard (lobby), ActiveContractCard (active)
    Solo/         SoloPoolCard
    Catalog/      GameTabs (game switcher), PreviewContracts (locked/soon previews)
    UI/           Badge, Toast, Skeleton, Sparkline
    Overlay/      ContractOverlay (the in-game widget), OverlayDemo (fake game backdrop)

/electron
  main.ts                    BrowserWindow setup, IPC, detector wiring
  preload.ts                 contextBridge → window.overlay
  detector/                  types.ts, polling.ts, mock.ts, index.ts (factory)

/docs                        overview.md, roadmap.md, IMPLEMENTATION.md (this), old/ (deprecated)

vite.config.ts               Web app; proxies /api → :8000
vite.electron.config.ts      Web app + electron main + preload bundles
vercel.json                  Rewrites /api/* → /api/index; bundles api/_lib/**
```

---

## 5. Entry points & routing

`src/main.tsx` reads the URL query string and mounts one of three roots — all
share one Vite dev server and `index.css`:

| URL | Root | Purpose |
|---|---|---|
| `?electron=1` | `ElectronApp` | Transparent overlay renderer (Electron). |
| `?overlay` | `OverlayDemo` | Fake game backdrop to test the widget in a browser. |
| (default) | `App` | The full web app. |

---

## 6. Domain model (the data shapes)

The canonical definitions are `api/_lib/schemas.py` (Pydantic) and `src/types/index.ts`
(TypeScript) — they are kept in lockstep and are flat/JSON-friendly so the same
objects round-trip from Python → client → `localStorage`.

### Identity
- **`SkillProfile`** — what comes back from linking a Lichess account: `username`,
  `display_name`, `url`, `link_method` (`oauth` | `username`), `account_age_days`,
  `win_rate`, `draw_rate`, `total_games`, `formats[]` (per-time-control rating +
  games), `primary_speed`. Drives matchmaking/bracketing.
- **`FormatStat`** — `{ speed, rating, games, provisional }` per time control.
- **`Speed`** = `bullet | blitz | rapid | classical`.

### Head-to-Head contracts
- **`Objective`** — `{ kind, moves? }`; `kind` ∈ `win_h2h` | `win_under_moves`.
- **`Bracket`** — `your_rating`, `band_low/high`, `match_quality` (0..1, 1 = dead
  even), `label` (e.g. "Even match", "You're favored", "Reach"). Matchmaking
  creates **fairness, not odds** — there is no payout line anywhere in the system.
- **`Opponent`** — `{ username, display_name, rating, is_bot }`. Always a bot in
  the demo.
- **`Contract`** — the core object. Money fields: `entry` (per-player stake),
  `entrants` (2 for H2H), `rake_pct`, `pot = entry*entrants`, `prize = pot*(1-rake_pct)`,
  `rake = pot - prize`. Plus `bracket`, `opponent`, `objective`, `window_hours`,
  and a lifecycle `state`:

  `OPEN` (in lobby) → `MATCHED` (entries escrowed) → `ACTIVE` (game underway) →
  `RESOLVING` → `SETTLED` (paid) | `CANCELED` (refunded).

  *In the current client flow, `join()` jumps an `OPEN` contract straight to
  `ACTIVE` and stamps `matched_at` — `MATCHED` is defined but not used as an
  intermediate client state.* Resolution fields: `qualifying_game_ids`, `winner`
  (`you` | `opponent`), `outcome` (`won` | `lost` | `refunded`), `progress`.
- **`ContractDraft`** — a pre-match request the Builder/lobby generator emits.
- **`LobbyResponse`** = `{ profile, contests[] }`.
- **`SettleResult` / `SettleResponse`** — server-authoritative grading output;
  `payout` is what gets credited to the user (prize on win, entry on refund, 0 on
  loss).

### Solo pools
- **`MetricTarget`** — the qualifying standard: `metric`, `comparator` (`gte`|`lte`),
  `threshold`, plus an optional secondary constraint (compound standards like
  "≥4000 crown-tower damage **using ≤30 elixir**").
- **`MetricKind`** — `rl_aerial_accuracy_pct`, `rl_match_score`,
  `cr_crown_tower_damage`, `chess_accuracy_pct` (prop-bet-style metrics are banned
  by policy).
- **`SoloEntry`** — `{ player_id, state, status, cleared?, payout, detail? }`;
  status ∈ `LOCKED | CLEARED | MISSED | REFUNDED | BLOCKED_REGION`.
- **`SoloPool`** — `{ id, game, metric_target, entry_fee, rake_pct, min_entrants,
  entrants[], pool, rake, prize_pool, status }`; status ∈ `OPEN | SETTLED | CANCELED`.
- **`TelemetrySample`** — `{ game, metrics: Record<string, number> }`; mocked in
  the demo, would arrive from a game data webhook in production.

### Client-only
- **`TabKey`** = `h2h | solo | link | active | history | profile | responsible`.
- **`ToastMessage`** — `{ id, title, description?, variant }`; variant ∈ `info |
  success | win | loss`.

---

## 7. Frontend architecture

### `App.tsx` — the coordinator
Owns top-level state and wires the hooks together:
- `started` (localStorage `started`) — mock-auth gate. While false, renders
  `<Landing>` (brand wall + eligibility). `handleStart(state)` stores residence,
  flips `started`, and routes to the Link Accounts tab.
- `residence` (localStorage `residence`) — the user's US state, used for the
  geo-fence on solo pools.
- `activeTab` (default `h2h`) — switch statement renders one tab component.
- `navOpen` — mobile drawer.

It instantiates `useProfile`, `useWallet`, `useToasts`, `useContracts`,
`useSoloPools`, and threads their values to tabs as props (no Context — the tree
is shallow). Cross-cutting flows it owns:
- **`handleJoin(contest)`** (H2H): validates entry ($1–$100), available balance,
  and daily loss cap → `contracts.join()` + `wallet.escrowEntry()` + success toast
  → switches to the Active tab.
- **`onSettle(contract, result)`**: `wallet.applySettlement()` + a win/loss/cancel
  toast. Passed into `useContracts` so the poll loop can fire it.
- **`handleReset()`**: wipes contracts, solo pools, wallet back to $1,000.

### Hooks
- **`useWallet`** — three buckets: `available` (spendable), `escrow` (staked in
  flight), `locked` (compliance holds, unused in demo). Starts at **$1,000**,
  default **daily loss limit $200**. `canJoin(entry)` checks balance + loss cap;
  `escrowEntry` moves available→escrow; `applySettlement({entry, payout, isLoss})`
  releases escrow and credits payout; `setLossLimit`; `reset`. `displayAvailable`
  is a `requestAnimationFrame`-eased value for the header's balance animation.
  Persists to `localStorage` (`wallet`).
- **`useContracts`** — owns the user's contracts (localStorage `contests`),
  the OPEN `lobby` (fetched per linked user), and the **settlement poll loop**
  (every **15s**, `POST /api/contracts/settle` with in-flight contracts, abortable,
  re-entrancy guarded). Derives `active` (`ACTIVE`/`RESOLVING`) and `settled`
  (`SETTLED`/`CANCELED`). `join(open)` creates the ACTIVE contract. Designed so a
  server-side worker can replace the client poll without a UI rewrite.
- **`useSoloPools`** — owns the solo `lobby` (open pools the user hasn't joined)
  and `mine` (entered pools, localStorage `solo_pools`). `join(pool)` →
  `POST /api/solo/pools/enter` (geo-checked server-side; throws on 403). `settle`
  generates **mock telemetry** for all entrants (you per the button, bots at a
  ~55% clear rate) and `POST /api/solo/pools/settle`.
- **`useProfile`** — `link(username)` → `GET /api/profile`, stores `SkillProfile`
  in localStorage (`profile`); `unlink()` clears it. Demo uses the username-claim
  path (public stats); OAuth swaps in behind the same call.
- **`useToasts`** — `pushToast` / `dismissToast` queue.

### Utils worth knowing
- **`format.ts`** — `formatCurrency` (Intl currency) and `formatPct`. **There is
  no odds formatting** — the product shows entries/pots/prizes/rake, never a line.
  (Historical note: an `oddsFormatter` module was referenced by old code and does
  not exist; imports should point here.)
- **`contractText.ts`** — human strings: `objectiveDetail`, `windowLabel`,
  `timeLeftLabel`, `outcomeBadge`, `matchQualityTone` (green ≥0.8, amber ≥0.5,
  crimson below).
- **`soloText.ts`** — `standardLabel` (renders a `MetricTarget` as
  "Accuracy ≥82% · Moves ≥20") and `genTelemetry` (demo mock).
- **`states.ts`** — `US_STATES`, the **14 EXCLUDED_STATES**, `ALLOWED_STATES`,
  `isStateAllowed`. Mirrors the backend `RESTRICTED_STATES`.
- **`games.ts`** — `GAMES[]`: **Chess (live)**, Counter-Strike 2, Clash Royale,
  Rocket League (all `live: false`). Each has color/gradient/icon and providers
  (chess: Lichess live, Chess.com "soon").

### `apiClient.ts` endpoints
`GET /api/profile?username=` · `GET /api/lobby?username=` ·
`POST /api/contracts/price?username=` · `POST /api/contracts/settle` ·
`GET /api/solo/lobby` · `POST /api/solo/pools/enter` · `POST /api/solo/pools/settle`.
`API_BASE` = `import.meta.env.VITE_API_BASE ?? ''` (same-origin; Vite proxy in dev).

---

## 8. How it looks (visual design)

Dark, premium gaming/wagering aesthetic. Near-black backgrounds, **electric lime**
for brand & interactive affordances, **emerald** for money/wins — deliberately
distinct so lime never means "you won". Headings use **Barlow Condensed**
(condensed, uppercase-friendly), body uses **DM Sans**. A faint noise texture sits
over the page; custom dark scrollbars.

### Color semantics (tokens in `:root`, `src/index.css`)
| Token | Value | Meaning |
|---|---|---|
| `--bg` | `#0a0b0f` | Page background |
| `--surface` / `--surface-raised` / `--surface-hover` | `#13151c` / `#181b24` / `#1c2029` | Card surfaces |
| `--border` / `--border-strong` | `rgba(255,255,255,.06/.12)` | Dividers / outlines |
| `--lime` | `#a3e635` | Brand / primary CTA / active nav |
| `--pos` | `#34d399` | Money positive (balance, win, payout) |
| `--cyan` | `#00d4ff` | Live / info / focus rings |
| `--crimson` | `#ff4d4d` | Loss / error |
| `--amber` | `#ffb020` | Warnings / pending |
| `--gold/silver/bronze` | `#ffd24a/#c9d2dc/#d98a4b` | Leaderboard medals |
| `--text` / `--text-muted` / `--text-faint` | `#f1f3f6` / `#9aa1b4` / `#79808f` | Text hierarchy |
| `--radius` / `--radius-sm` | `10px` / `7px` | Corners |

Each color also has a `-dim` variant (low-alpha fill for badges/backgrounds) and
there are glow shadows (`--glow-lime/pos/cyan/crimson`).

### Reusable classes & motion
- Surfaces/buttons: `.surface`, `.surface-card` (hover lift), `.btn`, `.btn-primary`
  (lime, glow on hover), `.btn-ghost`, `.chip` / `.chip.is-active`, `.input`,
  `.toggle`.
- Badges: `.badge-{bullet,blitz,rapid,classical}` (speeds), `.badge-{won,lost,pending,phase}`,
  `.live-badge` + pulsing `.live-dot`.
- Nav: `.nav-item` / `.is-active`, `.nav-count` pill.
- Data: `.data-table`, `.row-you`, `.rank-medal` `.rank-1/2/3`.
- Game/catalog: `.game-card` (per-card `--accent`), `.game-tile` (gradient icon),
  `.blur-content` + `.card-overlay` (locked previews), `.game-tabs`/`.game-tab`,
  `.preview-overlay`.
- Feedback: `.skeleton` (shimmer), `.toast*` (slide-in from right), `.balance-pop`,
  `.place-flash`, `.fade-in`, `.state-panel`/`.state-icon` (empty states).

### Layout / responsive
- **Header** (64px, sticky, blurred): hamburger (mobile) + brand glyph + "money
  match" + "Demo" badge; right side shows **Available** balance (emerald, animated)
  with escrow appended inline.
- **Desktop (≥1024px)**: fixed **248px sticky left sidebar** + scrollable main.
- **Mobile (<1024px)**: sidebar hidden; hamburger opens a 280px drawer with a
  dark backdrop. Extra breakpoints at 640/520px tighten gutters.

### Navigation tabs (Sidebar)
| Key | Label | Icon |
|---|---|---|
| `h2h` | Head-to-Head | Swords |
| `solo` | Solo Pools | Trophy |
| `link` | Link Accounts | Link2 |
| `active` | Active Matches | Hourglass (+count pill) |
| `history` | My Contests | Receipt |
| `profile` | Profile | UserRound |
| `responsible` | Responsible Gaming | HeartHandshake |
Sidebar footer: linked username + **Reset demo** + a demo disclaimer card.

### Screen-by-screen
- **Landing** (pre-auth): centered brand wall (lime glyph, "money match"), an
  eligibility panel with an **18+ checkbox** and a **US state select**; blocked
  states show a crimson message and disable Start. Footer: "Play money only · No
  deposits".
- **Head-to-Head (Lobby)**: a `GameTabs` switcher on top. If chess is linked,
  shows the **Builder** ("post a match": pick objective/time-control/entry, live
  debounced matchmaking preview with opponent + bracket + pot/rake, two-step
  Find match → Confirm escrow) and a grid of **open matches** (`ContestCard`s,
  each a two-step Join → Confirm). Loading = skeleton grid; empty/error states
  present. If chess isn't linked → `PreviewContracts` (blurred, "link" CTA). Other
  games → `PreviewContracts` ("coming soon").
- **Solo Pools**: region bar (must pick an allowed state), "your pools" + "open
  pools" grids of `SoloPoolCard`s. Each card shows the qualifying standard,
  entry/pool/rake, a Join→Confirm flow, and (for your OPEN pools) demo "I cleared
  it" / "I missed" buttons that trigger settlement; settled cards show payout +
  clearer count.
- **Active Matches**: `ActiveContractCard`s with a live countdown, objective,
  "Win to take" prize, and a **Go play** deep-link to Lichess.
- **My Contests**: a `.data-table` history (match, opponent, outcome badge, entry,
  P&L color-coded, settled date) with record / win-rate / net P&L summary.
- **Profile**: linked accounts list, chess skill card (rating per format, win/draw/
  games, external profile link), and the wallet breakdown (available/escrow/locked).
- **Responsible Gaming**: a daily-loss-limit slider ($0–$500, step $25, persisted)
  and a self-exclusion stub (toast only in demo).
- **Link Accounts**: a `.game-card` grid; chess has an inline form (provider chips
  — Lichess live, Chess.com soon — + username input); linked card shows a check,
  display name, rating/games, and Unlink. Other games show a "Coming soon" lock.

---

## 9. Backend (FastAPI, `api/`)

Stateless serverless functions; routes live under `/api` so the same paths work in
dev (Vite proxy) and prod (Vercel rewrite → `api/index`). CORS allows the Vite dev
origins.

### Routes (`api/index.py`)
| Method & path | Purpose |
|---|---|
| `GET /api/health` | `{status, service:"money-match", games:[...]}` — use to verify the right server is up. |
| `GET /api/profile?username=&game=` | Link/refresh a `SkillProfile`. 404 if the Lichess user doesn't exist; 502 on host error. |
| `GET /api/lobby?username=&game=` | `{profile, contests[]}` — a generated lobby of OPEN H2H contests. |
| `POST /api/contracts/price?username=` | Build one draft (from the Builder) into a matched OPEN `Contract`. |
| `POST /api/contracts/settle` | Server-authoritative grading of the user's in-flight contracts against real games. |
| `GET /api/solo/lobby` | Seeded OPEN solo pools (with bot entrants). |
| `POST /api/solo/pools` | Create a pool. |
| `POST /api/solo/pools/enter` | Escrow an entry — **geo-fence runs before charging**; 403 if region-blocked. |
| `POST /api/solo/pools/settle` | Grade telemetry, distribute pool to clearers minus rake. |

### Lobby & matchmaking
- `lobby.build_contract(profile, draft)` is the single place a draft becomes a
  fully-matched OPEN contest: it calls `matchmaking.find_opponent` (a bot whose
  rating is drawn from the user's ±80 band), computes `bracket` via
  `skill_rating.make_bracket` (Elo expectancy → quality + label), and applies the
  per-objective rake (`win_h2h` 8%, `win_under_moves` 12%; default 10%). Pot/prize/
  rake are derived from `entry * 2`.
- `lobby.generate(profile)` produces ~8 varied contests across the user's top two
  time controls and entry tiers ($1/$5/$10/$25), mixing win-the-match and
  win-quickly (around the format's median move count) objectives.
- `matchmaking.can_pair` is an **anti-collusion stub** (rejects self-pairing /
  repeats) — the seam for production device/payment/pair-frequency checks.

### Chess settlement (`adapters/chess_lichess.py` + `lichess_service.py`)
- `link_account` / `fetch_profile` → `GET https://lichess.org/api/user/{username}`
  (no key). Maps perfs to `FormatStat`s, computes win/draw rates, primary speed.
  Returns `None` → raises `ValueError("Lichess user '...' not found")` → 404.
- `poll_eligible_games` → `GET /api/games/user/{username}` (NDJSON, `moves=true`,
  rated, filtered by `perfType`), normalized to `NormGame`.
- `resolve_contract` grades a contract against the user's **first qualifying game
  since `matched_at`** (same speed, rated): `win_h2h` = won; `win_under_moves` =
  won AND under N full moves. No qualifying game before the window expires →
  CANCELED + refund. Otherwise stays ACTIVE with a `progress` string.

### Adapter pattern
`GameAdapter` ABC (`base.py`) with `link_account`, `fetch_profile`,
`poll_eligible_games`, `resolve_contract`, producing host-agnostic `NormGame`s so
settlement never sees host JSON. `registry.py` maps id → adapter; **only
`chess.lichess` is registered**; `stub_cs2.py` exists solely to prove a second game
compiles against the interface (it raises if called and is not registered).

### Solo engine (`solo_challenge.py`)
- **Geo-fence first**: `assert_can_enter(state)` raises `RegionBlockedError`
  (→ 403) for any of the 14 `RESTRICTED_STATES` *before* an entry is escrowed.
- Pools are seeded with bot entrants so they're joinable in the demo.
- `grade_entry` checks telemetry against the (possibly compound) `MetricTarget`;
  missing/mismatched telemetry → `None` (refund, never a "failure").
- `settle_pool` invariant in all cases: **`sum(payouts) + rake == sum(entries)`**.
  Under min entrants → CANCELED + full refund, zero rake. No clearers → SETTLED +
  full refund, zero rake (the platform earns nothing on a payout-less round).
  ≥1 clearer → un-verifiable entries refunded off the top, the rest is raked and
  split equally among clearers; non-clearers get 0.

---

## 10. Compliance & responsible gaming (built-in, load-bearing)

- **No house / no odds.** Every surface shows entry/pot/prize/rake. The pricing
  engine was repurposed to do *matchmaking/bracketing*, never payout lines.
- **Geo-fence.** 14 "Any Chance" states are blocked both client-side
  (`states.ts`, the Landing gate disables Start) and server-side
  (`solo_challenge.RESTRICTED_STATES`, enforced before any escrow). Keep the two
  lists in sync.
- **Daily loss limit.** Default $200, adjustable on Responsible Gaming; enforced in
  `useWallet.canJoin`.
- **Anti-collusion seam.** `matchmaking.can_pair` is the hook for production
  controls; bots are always pairable in the demo.
- **Play-money only.** No deposits/withdrawals; wallet is virtual.

---

## 11. Desktop overlay (Electron)

A sibling, transparent, always-on-top `BrowserWindow` that sits above a
borderless-windowed game (never injected into the game process; exclusive
fullscreen is unsupported because it owns a dedicated GPU plane).

- **`electron/main.ts`** builds the overlay (`transparent`,
  `backgroundColor:'#00000000'`, `frame:false`, `alwaysOnTop`, `focusable:false`,
  `setAlwaysOnTop(true,'screen-saver')`, `setIgnoreMouseEvents(true,{forward:true})`),
  loads `?electron=1`, and wires the detector: on `focus` it resizes to the game
  bounds and `showInactive()` (shows without stealing focus) + sends `game:focus`;
  on `move` it repositions; on `blur` it hides. IPC: `overlay:clickThrough` toggles
  mouse pass-through; `overlay:openContract` opens the web app in the browser.
- **`detector/`** — `GameDetector` interface; `PollingDetector` calls `get-windows`
  every 750ms and classifies via DENY list (browsers, desktop apps, our own
  Electron) → ALLOW list (known game exes) → an 85%-of-display-area heuristic, with
  a DPI fix (divide physical px by `scaleFactor`). `get-windows` is ESM-only and
  loaded via dynamic `import()` (the main bundle is CJS). `MockDetector` fires the
  same events from `globalShortcut` hotkeys (Ctrl+Alt+F focus / B blur / 1·2 sizes
  / M second monitor). Factory: `OVERLAY_MOCK=1` → mock.
- **`ContractOverlay.tsx`** — the tab↔card widget, works in `web` and `desktop`
  modes. Collapsed "tab" expands to a card. Uses Framer Motion with separate
  `AnimatePresence` blocks each self-centering (`y:'-50%'` as a motion value), a
  shared spring, and a pulsing live dot. In desktop mode the header is a
  `-webkit-app-region: drag` region (close button must be `no-drag`); hover
  enter/leave toggle click-through via IPC. **It currently imports `formatCurrency`
  from `../../utils/format`.**
- **`getWagerForGame(process)`** — the **only** seam between a detected game and the
  widget content; currently returns one static `DEMO_CONTENT` for every game.

> The overlay still uses the older `ContractContent` shape (with `line`/`fairLine`/
> `houseEdgePct`) from the pre-pivot odds model. It is **not yet connected** to the
> peer-to-peer contract backend — it's a standalone demo surface.

---

## 12. State persistence (localStorage)

All keys are prefixed `moneymatch:` (`utils/storage.ts`). Keys: `started`,
`residence`, `profile`, `wallet`, `contests`, `solo_pools`. **Reset demo** clears
the gameplay ones. The backend stores nothing.

---

## 13. What works vs. what's mocked vs. what's missing

### Works end-to-end (with the backend running)
- Linking a **real Lichess account** (real ratings/stats).
- Generating a personalized H2H lobby and the Builder's live matchmaking preview.
- Joining a contract (escrow), the 15s settlement poll, and **real grading against
  the user's actual Lichess games** (win/loss/refund + wallet/toast).
- Solo pools: join (geo-fenced), settle, pool distribution math (invariant holds).
- Wallet, daily loss limit, geo-fence gate, history, profile.

### Mocked / demo-only
- **Opponents are bots** (no real second player; no real matchmaking queue).
- **Solo telemetry is fabricated** client-side (`genTelemetry`); production needs a
  game data webhook. Bots clear at ~55%.
- **Play money** only; no payments/KYC/withdrawals.
- Client owns contract/pool/wallet state; no DB; settlement poll is client-side.

### Not built yet
- OAuth account linking (only username-claim path).
- The Electron overlay's per-game content + wiring to the real contract backend
  (`getWagerForGame` returns static demo data using the legacy odds shape).
- Additional game adapters (CS2/Clash/Rocket League are UI "coming soon" + a
  compile-only stub).
- Phase 2 multi-entrant tournaments / real P2P matchmaking.
- Electron packaging (electron-builder, signing, auto-update); exclusive-fullscreen
  detection + user messaging; macOS Screen Recording permission prompt.
- `Sparkline`/`MatchCardSkeleton` components exist but aren't used in tabs yet.

---

## 14. Gotchas & conventions for making changes

- **Currency/format imports** come from `src/utils/format.ts`. There is no
  `oddsFormatter` (a stale import to it will break the Vite build).
- **Schema parity**: change a shape in `api/_lib/schemas.py` *and*
  `src/types/index.ts` together.
- **Geo lists parity**: `states.ts` `EXCLUDED_STATES` ↔
  `solo_challenge.RESTRICTED_STATES` (14 states, full names).
- **No odds/lines anywhere** — the product is rake-only, peer-to-peer. Don't
  reintroduce house-banked pricing concepts on user-facing surfaces.
- **Backend must be on :8000** for any account/lobby/settlement work; verify with
  `GET /api/health`. A foreign server on :8000 yields `{"detail":"Not Found"}` on
  app calls.
- **Money math invariants**: H2H `payout(winner) + rake == pot`; solo
  `sum(payouts) + rake == sum(entries)`. Preserve these.
- **Telemetry event names** (`utils/telemetry.ts`) are intended to outlast the
  demo — keep them stable.
- Tailwind is for layout only; colors/typography/surfaces come from the CSS tokens.
```
