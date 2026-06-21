"""Pydantic models for money match's Phase 1 API surface.

Phase 1 is **peer-to-peer head-to-head**: two players stake an equal entry into
an escrowed pot, play one qualifying game, and the winner takes the pot minus a
fixed platform rake (roadmap §1, overview §2). The platform never sets a payout
line and never takes a position — it matches players and collects the rake.

In the play-money demo the opponent is a skill-bracketed bot (overview §8.1,
roadmap §1.5); the shapes are the ones the production DB will store, so a real
second player drops into the same `Opponent` slot later.

These shapes mirror the TypeScript types in ``src/types``; they are flat and
JSON-friendly so the same objects round-trip between the Python serverless
functions and the React client (which persists them to localStorage).
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Identity / skill profile
# ---------------------------------------------------------------------------

# Lichess time controls money match runs contests for.
Speed = Literal["bullet", "blitz", "rapid", "classical"]

# How an account was linked. OAuth is the production path; "username" is the
# play-money demo path (public stats only) — see roadmap §1.1 "Identity".
LinkMethod = Literal["oauth", "username"]


class FormatStat(BaseModel):
    """A single time-control's verified stats, sourced from the host API."""

    speed: Speed
    rating: int
    games: int
    provisional: bool = False


class SkillProfile(BaseModel):
    """Verified, host-derived skill profile that drives matchmaking/bracketing."""

    username: str
    display_name: str
    url: str
    link_method: LinkMethod
    account_age_days: Optional[int] = None
    # Overall record across the user's history (a soft signal for bracketing).
    win_rate: float            # (wins + 0.5*draws) / total, 0..1
    draw_rate: float           # draws / total, 0..1
    total_games: int
    formats: list[FormatStat]
    primary_speed: Speed


# ---------------------------------------------------------------------------
# Objectives (the "what decides the contest" of a head-to-head)
# ---------------------------------------------------------------------------

ObjectiveKind = Literal[
    "win_h2h",          # win the head-to-head qualifying game
    "win_under_moves",  # win the head-to-head game in under N moves
]


class Objective(BaseModel):
    """A typed, parameterized objective. Builder and Lobby emit this shape.

    Phase 1 ships the two head-to-head families; multi-entrant tournament
    objectives are a Phase 2 addition (roadmap §3).
    """

    kind: ObjectiveKind
    # win_under_moves only.
    moves: Optional[int] = None


# ---------------------------------------------------------------------------
# Matchmaking: bracket + opponent (replace the deprecated house-banked Line)
# ---------------------------------------------------------------------------


class Bracket(BaseModel):
    """How fair the pairing is. Matchmaking creates fairness, not odds."""

    your_rating: int
    band_low: int
    band_high: int
    match_quality: float    # 0..1; 1.0 == dead-even pairing
    label: str              # "Even match" / "You're favored" / "Reach" / …


class Opponent(BaseModel):
    """The matched counterparty. A skill-bracketed bot in the demo."""

    username: str
    display_name: str
    rating: int
    is_bot: bool = True


# ---------------------------------------------------------------------------
# Contracts (a peer-to-peer head-to-head contest)
# ---------------------------------------------------------------------------

ContractState = Literal[
    "OPEN",       # listed in the lobby; no entry committed
    "MATCHED",    # opponent confirmed; entries escrowed
    "ACTIVE",     # qualifying game underway
    "RESOLVING",  # game done; confirming via host API
    "SETTLED",    # outcome verified; pot paid minus rake
    "CANCELED",   # no qualifying game / abort / outage — entries refunded
]
ContractOutcome = Literal["won", "lost", "refunded"]
Winner = Literal["you", "opponent"]


class ContractDraft(BaseModel):
    """A pre-matched contest request (from the Builder or Lobby generator)."""

    game: str = "chess.lichess"   # adapter id
    speed: Speed
    format: str                   # human label, e.g. "Rated Blitz"
    objective: Objective
    window_hours: int = 6
    entry: float = 5.0            # per-player stake


class Contract(BaseModel):
    """A fully-built head-to-head contest. ``state`` advances OPEN → SETTLED.

    Pot economics: ``pot = entry * entrants``; the winner receives
    ``prize = pot * (1 - rake_pct)`` and money match keeps ``rake = pot - prize``.
    Invariant at settlement: payout(winner) + rake == pot (overview §7.1).
    """

    id: str
    game: str
    speed: Speed
    format: str
    title: str                    # short human summary, e.g. "Win the blitz match"
    objective: Objective
    window_hours: int

    # Money (escrow + rake — never an odds line).
    entry: float
    entrants: int = 2
    rake_pct: float
    pot: float
    prize: float                  # what the winner receives
    rake: float                   # what money match keeps

    # Matchmaking.
    bracket: Bracket
    opponent: Opponent

    state: ContractState = "OPEN"
    matched_at: Optional[float] = None     # epoch ms (when entries escrowed)
    resolved_at: Optional[float] = None    # epoch ms
    qualifying_game_ids: list[str] = []
    progress: Optional[str] = None         # e.g. "Awaiting your next blitz game"
    winner: Optional[Winner] = None
    outcome: Optional[ContractOutcome] = None


# ---------------------------------------------------------------------------
# API request/response envelopes
# ---------------------------------------------------------------------------


class LobbyResponse(BaseModel):
    profile: SkillProfile
    contests: list[Contract]


class PriceRequest(ContractDraft):
    """Body for POST /api/contracts/price — a draft to match + price."""


class SettleRequest(BaseModel):
    """Body for POST /api/contracts/settle.

    The demo keeps contract state on the client; settlement is server-authoritative
    grading against the user's real games. The client sends its in-flight contests
    and the server returns the ones that changed.
    """

    username: str
    contracts: list[Contract]


class SettleResult(BaseModel):
    id: str
    state: ContractState
    outcome: Optional[ContractOutcome] = None
    winner: Optional[Winner] = None
    qualifying_game_ids: list[str] = []
    progress: Optional[str] = None
    resolved_at: Optional[float] = None
    payout: float = 0.0           # credited to the user (prize on win, entry on refund)


class SettleResponse(BaseModel):
    results: list[SettleResult]


# ---------------------------------------------------------------------------
# Algorithmic Solo Challenges — POOLED solo tournament (overview §10)
# ---------------------------------------------------------------------------
#
# Players each pay an entry fee into a shared pool for a given game + qualifying
# standard. Everyone plays their own game; the platform verifies API telemetry
# against the standard (a measurable metric, never a win/loss or prediction).
# Entrants who CLEAR the standard split the pool MINUS a fixed platform rake.
#
# There is NO house: the prize comes entirely from entrants' pooled fees, the
# platform never funds a prize and holds no outcome position. Invariant at
# settlement: ``sum(payouts) + rake == sum(entries)`` — identical to the P2P
# escrow/rake model (overview §2 / §7.1). This is the legally compliant,
# neutral-operator structure; play-money in the demo.

SoloGame = Literal[
    "rocketleague.psyonix",
    "clashroyale.supercell",
    "chess.lichess",
]

# A measurable, player-controlled performance metric. Prop-betting metrics (pure
# time predictions, etc.) are banned by policy (overview §10 guardrails).
MetricKind = Literal[
    "rl_aerial_accuracy_pct",   # Rocket League: % of aerial hits on target
    "rl_match_score",           # Rocket League: in-match score points
    "cr_crown_tower_damage",    # Clash Royale: total crown-tower damage dealt
    "chess_accuracy_pct",       # Chess: Stockfish accuracy % over the game
]

Comparator = Literal["gte", "lte"]


class MetricTarget(BaseModel):
    """The qualifying standard an entrant must clear.

    ``metric`` compared via ``comparator`` against ``threshold``. An optional
    secondary constraint expresses compound standards (e.g. Clash Royale:
    "4,000+ crown-tower damage using <30 total elixir" or Chess: "≥82% accuracy
    over ≥20 moves").
    """

    metric: MetricKind
    comparator: Comparator
    threshold: float
    # Optional compound constraint, e.g. {"metric": "cr_total_elixir",
    # "comparator": "lte", "threshold": 30} or a minimum-moves gate for chess.
    secondary_metric: Optional[str] = None
    secondary_comparator: Optional[Comparator] = None
    secondary_threshold: Optional[float] = None


class TelemetrySample(BaseModel):
    """Mock game telemetry posted to the verification webhook."""

    game: SoloGame
    metrics: dict[str, float]     # e.g. {"rl_aerial_accuracy_pct": 71.5, "rl_match_score": 640}


SoloEntryStatus = Literal[
    "LOCKED",          # entry escrowed into the pool, awaiting play + telemetry
    "CLEARED",         # standard met — shares the post-rake pool
    "MISSED",          # standard not met — entry stays in the pool for clearers
    "REFUNDED",        # pool canceled / no clearers — entry returned
    "BLOCKED_REGION",  # geo-fenced state — never entered/charged
]

SoloPoolStatus = Literal[
    "OPEN",       # accepting entrants
    "SETTLED",    # graded; pool distributed to clearers minus rake
    "CANCELED",   # below min entrants — all entries refunded, no rake
]


class SoloEntry(BaseModel):
    """One player's stake in a pooled solo tournament."""

    player_id: str
    state: str                    # residence state (for the geo-check)
    status: SoloEntryStatus = "LOCKED"
    cleared: Optional[bool] = None
    payout: float = 0.0           # share of the pool credited on settlement
    detail: Optional[str] = None


class SoloPool(BaseModel):
    """A pooled solo tournament: shared prize pool, rake-only, no house."""

    id: str
    game: SoloGame
    metric_target: MetricTarget
    entry_fee: float              # equal stake every entrant pays
    rake_pct: float
    min_entrants: int = 2         # below this the pool cancels + refunds
    entrants: list[SoloEntry] = []
    pool: float = 0.0             # sum of all entries
    rake: float = 0.0             # taken only when a prize is actually distributed
    prize_pool: float = 0.0       # pool - rake, split among clearers
    status: SoloPoolStatus = "OPEN"
    created_at: Optional[float] = None
    resolved_at: Optional[float] = None


class SoloPoolCreate(BaseModel):
    """Body for POST /api/solo/pools — open a pooled tournament."""

    game: SoloGame
    metric_target: MetricTarget
    entry_fee: float = 5.0
    rake_pct: float = 0.10
    min_entrants: int = 2


class SoloEnterRequest(BaseModel):
    """Body for POST /api/solo/pools/enter — join a pool (geo-fenced)."""

    pool: SoloPool
    player_id: str
    state: str                    # player's residence state (for the geo-fence)


class SoloSettleRequest(BaseModel):
    """Body for POST /api/solo/pools/settle — grade + distribute the pool.

    ``telemetry`` maps each entrant's ``player_id`` to their game telemetry.
    """

    pool: SoloPool
    telemetry: dict[str, TelemetrySample]


class SoloLobbyResponse(BaseModel):
    """Open pooled solo tournaments a player can join (GET /api/solo/lobby)."""

    pools: list[SoloPool]
