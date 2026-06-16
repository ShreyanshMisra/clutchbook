"""Pydantic models for money match's Phase 1 API surface (skill contracts).

These shapes are shared, conceptually, with the TypeScript types in
``src/types``. They are intentionally flat and JSON-friendly so the same objects
round-trip cleanly between the Python serverless functions and the React client
(which persists them to localStorage in the demo).
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Identity / skill profile
# ---------------------------------------------------------------------------

# Lichess time controls money match offers contracts for.
Speed = Literal["bullet", "blitz", "rapid", "classical"]

# How an account was linked. OAuth is the production path; "username" is the
# play-money demo path (public stats only) — see roadmap §1.4 "Identity".
LinkMethod = Literal["oauth", "username"]


class FormatStat(BaseModel):
    """A single time-control's verified stats, sourced from the host API."""

    speed: Speed
    rating: int
    games: int
    provisional: bool = False


class SkillProfile(BaseModel):
    """Verified, host-derived skill profile that personalizes pricing."""

    username: str
    display_name: str
    url: str
    link_method: LinkMethod
    account_age_days: Optional[int] = None
    # Overall record across the user's history (drives single-game win prob).
    win_rate: float            # (wins + 0.5*draws) / total, 0..1
    draw_rate: float           # draws / total, 0..1
    total_games: int
    formats: list[FormatStat]
    primary_speed: Speed


# ---------------------------------------------------------------------------
# Objectives (the "what you must achieve" of a contract)
# ---------------------------------------------------------------------------

ObjectiveKind = Literal[
    "win_game",          # win the next qualifying game
    "win_under_moves",   # win the next qualifying game in under N moves
    "win_series",        # win K of the next N qualifying games
    "performance_line",  # over/under a metric across the next N games
]

PerfMetric = Literal["win_rate", "avg_moves"]


class Objective(BaseModel):
    """A typed, parameterized objective. Builder and Catalog emit this shape.

    Only the fields relevant to ``kind`` are populated; the rest stay ``None``.
    Keeping it a single model (rather than a discriminated union) keeps the
    TypeScript mirror and localStorage round-tripping trivial.
    """

    kind: ObjectiveKind
    # Window: number of qualifying games the contract resolves over.
    games: int = 1
    # win_under_moves
    moves: Optional[int] = None
    # win_series — need `series_wins` of `games`.
    series_wins: Optional[int] = None
    # performance_line
    metric: Optional[PerfMetric] = None
    side: Optional[Literal["over", "under"]] = None
    line: Optional[float] = None


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------


class Line(BaseModel):
    """A priced line: the offered multiplier plus the fair-odds disclosure."""

    decimal: float          # offered multiplier (margin baked in)
    american: int
    implied_prob: float     # implied by the offered (vigged) price
    fair_decimal: float     # zero-margin multiplier
    fair_prob: float        # calibrated true success probability
    house_edge_pct: float   # the disclosed margin


# ---------------------------------------------------------------------------
# Contracts
# ---------------------------------------------------------------------------

ContractState = Literal["OFFERED", "ACTIVE", "RESOLVING", "SETTLED", "EXPIRED"]
ContractOutcome = Literal["won", "lost", "refunded"]


class ContractDraft(BaseModel):
    """A pre-priced contract request (from the Builder or Catalog generator)."""

    game: str = "chess.lichess"   # adapter id
    speed: Speed
    format: str                   # human label, e.g. "Rated Blitz"
    objective: Objective
    window_hours: int = 6
    stake: float = 10.0


class Contract(BaseModel):
    """A fully-priced contract. ``state`` advances OFFERED → … → SETTLED."""

    id: str
    game: str
    speed: Speed
    format: str
    title: str                    # short human summary, e.g. "Win your next blitz game"
    objective: Objective
    window_hours: int
    line: Line
    stake: float
    projected_payout: float       # stake * line.decimal
    state: ContractState = "OFFERED"
    activated_at: Optional[float] = None   # epoch ms
    resolved_at: Optional[float] = None    # epoch ms
    qualifying_game_ids: list[str] = []
    progress: Optional[str] = None         # e.g. "2/5 games · 1 win"
    outcome: Optional[ContractOutcome] = None


# ---------------------------------------------------------------------------
# API request/response envelopes
# ---------------------------------------------------------------------------


class CatalogResponse(BaseModel):
    profile: SkillProfile
    contracts: list[Contract]


class PriceRequest(ContractDraft):
    """Body for POST /api/contracts/price — a draft to price."""


class SettleRequest(BaseModel):
    """Body for POST /api/contracts/settle.

    The demo keeps contract state on the client; settlement is server-authoritative
    grading against the user's real games. The client sends its ACTIVE contracts
    and the server returns the ones that changed.
    """

    username: str
    contracts: list[Contract]


class SettleResult(BaseModel):
    id: str
    state: ContractState
    outcome: Optional[ContractOutcome] = None
    qualifying_game_ids: list[str] = []
    progress: Optional[str] = None
    resolved_at: Optional[float] = None
    payout: float = 0.0           # credited to the user on this settlement


class SettleResponse(BaseModel):
    results: list[SettleResult]
