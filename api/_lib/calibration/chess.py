"""Heuristic chess (Lichess) calibration: profile + objective -> fair probability.

Everything here is a deliberately simple, explainable estimate. The point of
Phase 1 is to validate the loop and the disclosure UX, not to be a sharp book.
Each function returns a probability in (0, 1) that the user achieves the
objective; the odds engine turns that into a priced line.
"""

from __future__ import annotations

import math

from _lib.schemas import FormatStat, Objective, SkillProfile


def _format_for(profile: SkillProfile, speed: str) -> FormatStat | None:
    for f in profile.formats:
        if f.speed == speed:
            return f
    return None


def single_game_win_prob(profile: SkillProfile, speed: str) -> float:
    """P(win the next single game) in this time control.

    Anchored on the user's real overall win rate, nudged by how strong they are
    in this specific format (rating relative to a 1500 reference via Elo).
    """
    base = profile.win_rate if profile.total_games > 0 else 0.5
    fmt = _format_for(profile, speed)
    if fmt is not None:
        # Elo expectation vs a 1500 "field" as a mild per-format adjustment.
        elo_exp = 1.0 / (1.0 + math.pow(10, (1500 - fmt.rating) / 400))
        base = 0.6 * base + 0.4 * elo_exp
    return _clamp(base)


def draw_prob(profile: SkillProfile, speed: str) -> float:
    base = profile.draw_rate if profile.total_games > 0 else 0.12
    # Slower controls draw a bit more; bullet barely at all.
    bump = {"bullet": -0.03, "blitz": 0.0, "rapid": 0.03, "classical": 0.06}
    return _clamp(base + bump.get(speed, 0.0), lo=0.01, hi=0.6)


def win_under_moves_prob(profile: SkillProfile, speed: str, moves: int) -> float:
    """P(win the next game AND it ends in under `moves` full moves).

    We model game length as roughly log-normal around a per-format median and
    multiply the "short enough" mass by the win probability (decisive wins skew
    a touch shorter, captured by a small shift).
    """
    win_p = single_game_win_prob(profile, speed)
    median = {"bullet": 32, "blitz": 38, "rapid": 44, "classical": 52}.get(speed, 40)
    # P(length < moves) under a log-normal with sigma ~0.35; wins run shorter so
    # shift the median down ~10%.
    sigma = 0.38
    z = (math.log(max(moves, 1)) - math.log(median * 0.9)) / sigma
    short_enough = _norm_cdf(z)
    return _clamp(win_p * short_enough, lo=0.02, hi=0.95)


def series_win_prob(profile: SkillProfile, speed: str, n: int, k: int) -> float:
    """P(win at least k of the next n games), binomial on the single-game win p."""
    p = single_game_win_prob(profile, speed)
    total = 0.0
    for i in range(k, n + 1):
        total += _binom(n, i) * (p ** i) * ((1 - p) ** (n - i))
    return _clamp(total, lo=0.01, hi=0.99)


def performance_line_prob(
    profile: SkillProfile, speed: str, metric: str, side: str, line: float, n: int
) -> float:
    """P(metric over n games lands on the chosen side of `line`).

    Normal approximation around the user's expected metric. Lines offered by the
    catalog/builder are set near the user's mean so prices stay interesting.
    """
    if metric == "win_rate":
        mean = single_game_win_prob(profile, speed)
        sd = math.sqrt(max(mean * (1 - mean) / max(n, 1), 1e-4))
    else:  # avg_moves
        mean = {"bullet": 32, "blitz": 38, "rapid": 44, "classical": 52}.get(speed, 40)
        # spread of the per-game-average shrinks with sqrt(n)
        sd = 9.0 / math.sqrt(max(n, 1))

    z = (line - mean) / sd if sd > 0 else 0.0
    p_under = _norm_cdf(z)
    p = p_under if side == "under" else (1 - p_under)
    return _clamp(p, lo=0.05, hi=0.95)


def fair_prob(profile: SkillProfile, objective: Objective, speed: str) -> float:
    """Dispatch an objective to its estimator -> calibrated success probability."""
    kind = objective.kind
    if kind == "win_game":
        return single_game_win_prob(profile, speed)
    if kind == "win_under_moves":
        return win_under_moves_prob(profile, speed, objective.moves or 30)
    if kind == "win_series":
        return series_win_prob(
            profile, speed, objective.games, objective.series_wins or objective.games
        )
    if kind == "performance_line":
        return performance_line_prob(
            profile,
            speed,
            objective.metric or "win_rate",
            objective.side or "over",
            objective.line or 0.5,
            objective.games,
        )
    return 0.5


# ---------------------------------------------------------------------------
# Small numeric helpers (no third-party deps in the serverless runtime).
# ---------------------------------------------------------------------------


def _clamp(x: float, lo: float = 0.02, hi: float = 0.98) -> float:
    return max(lo, min(hi, x))


def _norm_cdf(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def _binom(n: int, k: int) -> float:
    return math.comb(n, k)
