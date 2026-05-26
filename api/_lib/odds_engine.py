"""Pure-Python odds math for Clutchbook. No third-party odds libraries."""

import math
import random
import time


def elo_win_probability(rating_a: int, rating_b: int) -> float:
    """Standard Elo expected score formula."""
    return 1 / (1 + math.pow(10, (rating_b - rating_a) / 400))


def apply_vig(prob: float, vig: float = 0.05) -> float:
    """Shade a probability toward 0.5 by the vig margin."""
    return prob * (1 - vig) + 0.5 * vig


def prob_to_american(prob: float) -> int:
    """Convert win probability to American moneyline odds."""
    prob = max(0.01, min(0.99, prob))  # clamp
    if prob >= 0.5:
        return round(-100 * prob / (1 - prob))
    return round(100 * (1 - prob) / prob)


def american_to_decimal(american: int) -> float:
    """Convert American odds to decimal format."""
    if american > 0:
        return round((american / 100) + 1, 3)
    return round((100 / abs(american)) + 1, 3)


def market_drift(seed: str, amplitude: float = 0.045, period_s: float = 26.0) -> float:
    """A smooth, bounded perturbation that varies with wall-clock time.

    Each game gets its own phase (seeded by game id) so live match-winner odds
    gently drift on every poll — simulating market movement — instead of
    sitting perfectly still at the Elo-fair price. Deterministic given the
    time, so near-simultaneous requests agree and the front-end sparkline
    traces a coherent curve rather than random jitter.
    """
    phase = random.Random(seed).uniform(0, 2 * math.pi)
    return amplitude * math.sin(time.time() / period_s + phase)


def generate_match_odds(
    rating_a: int, rating_b: int, seed: str | None = None
) -> dict:
    """
    Given two Elo ratings, return American and decimal odds for both sides.
    Applies a 5% vig to the implied probabilities.

    When ``seed`` is provided, a small time-based drift is layered on so the
    line moves between polls (see :func:`market_drift`).
    """
    raw_prob_a = elo_win_probability(rating_a, rating_b)
    if seed is not None:
        raw_prob_a = min(0.95, max(0.05, raw_prob_a + market_drift(seed)))
    raw_prob_b = 1 - raw_prob_a

    vigged_a = apply_vig(raw_prob_a)
    vigged_b = apply_vig(raw_prob_b)

    am_a = prob_to_american(vigged_a)
    am_b = prob_to_american(vigged_b)

    return {
        "player_a": {
            "american": am_a,
            "decimal": american_to_decimal(am_a),
            "implied_prob": round(vigged_a, 4),
        },
        "player_b": {
            "american": am_b,
            "decimal": american_to_decimal(am_b),
            "implied_prob": round(vigged_b, 4),
        },
    }


def generate_total_moves_line(time_control: str, seed: str | None = None) -> dict:
    """
    Over/under on total moves played. Line varies by time control type.

    A per-game ``seed`` keeps the line stable across re-polls of the same game
    while still differing from game to game (so a card's line doesn't jitter on
    every 12s refresh).
    """
    baselines = {
        "bullet": 38.5,
        "blitz": 44.5,
        "rapid": 52.5,
        "classical": 58.5,
    }
    line = baselines.get(time_control.lower(), 44.5)

    rng = random.Random(seed) if seed is not None else random
    line += rng.uniform(-3, 3)  # noise to simulate market movement
    line = round(line * 2) / 2  # snap to nearest 0.5

    return {
        "line": line,
        "over_american": -110,
        "under_american": -110,
        "over_decimal": american_to_decimal(-110),
        "under_decimal": american_to_decimal(-110),
    }


def generate_result_type_market(seed: str | None = None) -> dict:
    """
    Three-way market: Checkmate / Resignation / Draw.
    Approximate real-world frequencies with slight vig.

    A per-game ``seed`` jitters the base frequencies (then renormalizes) so
    each match shows its own prices rather than every card displaying an
    identical, obviously-synthetic line.
    """
    probs = {"checkmate": 0.18, "resignation": 0.58, "draw": 0.24}
    if seed is not None:
        rng = random.Random(f"{seed}:result")
        probs = {k: max(0.05, v + rng.uniform(-0.07, 0.07)) for k, v in probs.items()}
        total = sum(probs.values())
        probs = {k: v / total for k, v in probs.items()}
    vigged = {k: apply_vig(v, vig=0.08) for k, v in probs.items()}
    return {
        result: {
            "american": prob_to_american(p),
            "decimal": american_to_decimal(prob_to_american(p)),
        }
        for result, p in vigged.items()
    }
