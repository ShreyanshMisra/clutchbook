"""Pure-Python odds math for Clutchbook. No third-party odds libraries."""

import math
import random


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


def generate_match_odds(rating_a: int, rating_b: int) -> dict:
    """
    Given two Elo ratings, return American and decimal odds for both sides.
    Applies a 5% vig to the implied probabilities.
    """
    raw_prob_a = elo_win_probability(rating_a, rating_b)
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


def generate_result_type_market() -> dict:
    """
    Three-way market: Checkmate / Resignation / Draw.
    Approximate real-world frequencies with slight vig.
    """
    probs = {"checkmate": 0.18, "resignation": 0.58, "draw": 0.24}
    vigged = {k: apply_vig(v, vig=0.08) for k, v in probs.items()}
    return {
        result: {
            "american": prob_to_american(p),
            "decimal": american_to_decimal(prob_to_american(p)),
        }
        for result, p in vigged.items()
    }


def add_noise_to_american(american: int, noise_pct: float = 0.03) -> int:
    """Slightly move an odds line to simulate market movement."""
    delta = int(abs(american) * noise_pct * random.uniform(-1, 1))
    return american + delta
