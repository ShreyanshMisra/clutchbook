"""Contract pricing for money match.

Repurposed from the deprecated sportsbook market pricing: instead of pricing a
two-sided market between strangers, this prices a single skill contract from a
calibrated success probability and a configured house margin. It outputs both
the offered multiplier and the fair-odds reference so the UI can disclose the
house edge on every contract (overview §7.2, roadmap §1.4 "Compliance UX").
"""

from __future__ import annotations

from _lib.schemas import Line

# Default house margin baked into offered odds. Per-objective overrides let the
# riskier, higher-variance contracts carry a touch more edge.
DEFAULT_MARGIN = 0.06
MARGIN_BY_KIND = {
    "win_game": 0.05,
    "win_under_moves": 0.07,
    "win_series": 0.07,
    "performance_line": 0.06,
}


def prob_to_american(prob: float) -> int:
    prob = max(0.01, min(0.99, prob))
    if prob >= 0.5:
        return round(-100 * prob / (1 - prob))
    return round(100 * (1 - prob) / prob)


def american_to_decimal(american: int) -> float:
    if american > 0:
        return round((american / 100) + 1, 3)
    return round((100 / abs(american)) + 1, 3)


def price_contract(fair_prob: float, margin: float = DEFAULT_MARGIN) -> Line:
    """Turn a fair success probability into an offered :class:`Line`.

    The fair multiplier is 1/p. We bake the margin in by shrinking the payout
    (equivalently, pricing off an inflated implied probability), so the offered
    multiplier is always below fair and the edge is exactly ``margin``.
    """
    fair_prob = max(0.02, min(0.98, fair_prob))
    fair_decimal = round(1.0 / fair_prob, 3)

    offered_decimal = round(fair_decimal * (1 - margin), 3)
    # Guard: never offer worse than a token payout.
    offered_decimal = max(offered_decimal, 1.01)
    implied = round(1.0 / offered_decimal, 4)
    american = prob_to_american(implied)

    return Line(
        decimal=offered_decimal,
        american=american,
        implied_prob=implied,
        fair_decimal=fair_decimal,
        fair_prob=round(fair_prob, 4),
        house_edge_pct=round(margin * 100, 1),
    )


def margin_for(kind: str) -> float:
    return MARGIN_BY_KIND.get(kind, DEFAULT_MARGIN)
