"""Catalog generation + shared contract pricing/build.

``build_contract`` is the single place a draft becomes a fully-priced Contract;
both the Catalog generator and the Builder's /price endpoint go through it so
the two surfaces always produce identical shapes (roadmap §1.4).
"""

from __future__ import annotations

import uuid

from _lib import odds_engine
from _lib.calibration import chess as cal
from _lib.schemas import (
    Contract,
    ContractDraft,
    Objective,
    SkillProfile,
    Speed,
)

_SPEED_LABEL = {
    "bullet": "Bullet",
    "blitz": "Blitz",
    "rapid": "Rapid",
    "classical": "Classical",
}
_MEDIAN_MOVES = {"bullet": 32, "blitz": 38, "rapid": 44, "classical": 52}


def title_for(objective: Objective, speed: Speed) -> str:
    s = _SPEED_LABEL.get(speed, speed.title())
    kind = objective.kind
    if kind == "win_game":
        return f"Win your next {s.lower()} game"
    if kind == "win_under_moves":
        return f"Win a {s.lower()} game in under {objective.moves} moves"
    if kind == "win_series":
        return f"Win {objective.series_wins} of your next {objective.games} {s.lower()} games"
    if kind == "performance_line":
        if objective.metric == "avg_moves":
            return f"Avg game under {objective.line:g} moves over {objective.games} {s.lower()} games"
        pct = round((objective.line or 0) * 100)
        return f"Win rate over {pct}% across {objective.games} {s.lower()} games"
    return "Skill contract"


def build_contract(profile: SkillProfile, draft: ContractDraft) -> Contract:
    """Price a draft into a full, OFFERED contract."""
    fair = cal.fair_prob(profile, draft.objective, draft.speed)
    margin = odds_engine.margin_for(draft.objective.kind)
    line = odds_engine.price_contract(fair, margin)

    stake = round(draft.stake, 2)
    projected = round(stake * line.decimal, 2)

    return Contract(
        id=uuid.uuid4().hex,
        game=draft.game,
        speed=draft.speed,
        format=draft.format,
        title=title_for(draft.objective, draft.speed),
        objective=draft.objective,
        window_hours=draft.window_hours,
        line=line,
        stake=stake,
        projected_payout=projected,
        state="OFFERED",
    )


def _top_speeds(profile: SkillProfile, n: int = 2) -> list[Speed]:
    if not profile.formats:
        return [profile.primary_speed]
    ranked = sorted(profile.formats, key=lambda f: f.games, reverse=True)
    return [f.speed for f in ranked[:n]]


def generate(profile: SkillProfile, count: int = 8) -> list[Contract]:
    """Produce a varied, personalized catalog of OFFERED contracts."""
    speeds = _top_speeds(profile, 2)
    primary = speeds[0]
    secondary = speeds[1] if len(speeds) > 1 else primary

    drafts: list[ContractDraft] = []

    def label(speed: Speed) -> str:
        return f"Rated {_SPEED_LABEL.get(speed, speed.title())}"

    # 1. Win your next game (primary speed) — the bread-and-butter contract.
    drafts.append(ContractDraft(
        speed=primary, format=label(primary),
        objective=Objective(kind="win_game", games=1), window_hours=6,
    ))
    # 2. Win your next game (secondary speed) for variety.
    if secondary != primary:
        drafts.append(ContractDraft(
            speed=secondary, format=label(secondary),
            objective=Objective(kind="win_game", games=1), window_hours=6,
        ))
    # 3 & 4. Win quickly — two move thresholds around the format median.
    med = _MEDIAN_MOVES.get(primary, 40)
    drafts.append(ContractDraft(
        speed=primary, format=label(primary),
        objective=Objective(kind="win_under_moves", games=1, moves=med), window_hours=8,
    ))
    drafts.append(ContractDraft(
        speed=primary, format=label(primary),
        objective=Objective(kind="win_under_moves", games=1, moves=med - 10), window_hours=8,
    ))
    # 5. Series — win 3 of next 5.
    drafts.append(ContractDraft(
        speed=primary, format=label(primary),
        objective=Objective(kind="win_series", games=5, series_wins=3), window_hours=24,
    ))
    # 6. Series — win 2 of next 3 (shorter).
    drafts.append(ContractDraft(
        speed=secondary, format=label(secondary),
        objective=Objective(kind="win_series", games=3, series_wins=2), window_hours=24,
    ))
    # 7. Performance line — win rate over (set near the user's mean).
    mean = round(cal.single_game_win_prob(profile, primary), 2)
    line_wr = max(0.3, min(0.7, round(mean - 0.05, 2)))
    drafts.append(ContractDraft(
        speed=primary, format=label(primary),
        objective=Objective(
            kind="performance_line", games=10, metric="win_rate", side="over", line=line_wr
        ),
        window_hours=24,
    ))
    # 8. Performance line — avg moves under the format median.
    drafts.append(ContractDraft(
        speed=primary, format=label(primary),
        objective=Objective(
            kind="performance_line", games=5, metric="avg_moves", side="under",
            line=float(med),
        ),
        window_hours=24,
    ))

    contracts = [build_contract(profile, d) for d in drafts]
    return contracts[:count]
