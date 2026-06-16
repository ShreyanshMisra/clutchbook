"""The chess.lichess GameAdapter — the one real adapter in Phase 1."""

from __future__ import annotations

from typing import Optional

from _lib import lichess_service
from _lib.adapters.base import GameAdapter, GameFilters, NormGame
from _lib.schemas import (
    Contract,
    FormatStat,
    SettleResult,
    SkillProfile,
    Speed,
)

_SPEEDS: tuple[Speed, ...] = ("bullet", "blitz", "rapid", "classical")

# Lichess game statuses that mean the game finished with a real result.
_FINISHED = {
    "mate", "resign", "stalemate", "timeout", "draw", "outoftime",
    "cheat", "variantEnd",
}
_DRAW_STATUSES = {"draw", "stalemate"}


def _move_count(moves: Optional[str]) -> int:
    if not moves:
        return 0
    return (len(moves.split()) + 1) // 2


class ChessLichessAdapter(GameAdapter):
    id = "chess.lichess"

    async def link_account(self, method: str, identifier: str) -> SkillProfile:
        # OAuth is the production path; the demo uses the public username path.
        # Both funnel through fetch_profile so the code path is identical.
        profile = await self.fetch_profile(identifier)
        profile.link_method = "oauth" if method == "oauth" else "username"
        return profile

    async def fetch_profile(self, account_id: str) -> SkillProfile:
        raw = await lichess_service.get_user(account_id)
        if raw is None:
            raise ValueError(f"Lichess user '{account_id}' not found")
        return self._to_profile(raw)

    async def poll_eligible_games(
        self, account_id: str, since_ms: int, filters: GameFilters
    ) -> list[NormGame]:
        perf_types = filters.speeds or ({filters.speed} if filters.speed else None)
        raw_games = await lichess_service.get_user_games(
            account_id, since_ms, perf_types=perf_types
        )
        out: list[NormGame] = []
        for g in raw_games:
            norm = self._normalize(g, account_id)
            if norm is not None:
                out.append(norm)
        # Oldest first so "next game" objectives read naturally.
        out.sort(key=lambda x: x.created_at_ms)
        return out

    def resolve_contract(
        self, contract: Contract, games: list[NormGame], now_ms: int
    ) -> SettleResult:
        obj = contract.objective
        activated = contract.activated_at or 0
        window_ms = contract.window_hours * 3_600_000
        expired = now_ms > activated + window_ms

        # Games that actually qualify for THIS contract.
        q = [
            g for g in games
            if g.created_at_ms >= activated
            and g.speed == contract.speed
            and g.rated
        ]

        def settled(outcome: str, ids: list[str]) -> SettleResult:
            payout = contract.projected_payout if outcome == "won" else (
                contract.stake if outcome == "refunded" else 0.0
            )
            state = "EXPIRED" if outcome == "refunded" else "SETTLED"
            return SettleResult(
                id=contract.id, state=state, outcome=outcome,
                qualifying_game_ids=ids, resolved_at=now_ms, payout=round(payout, 2),
            )

        def active(progress: str, ids: list[str]) -> SettleResult:
            return SettleResult(
                id=contract.id, state="ACTIVE", qualifying_game_ids=ids,
                progress=progress, payout=0.0,
            )

        kind = obj.kind
        wins = sum(1 for g in q if g.won)

        if kind == "win_game":
            if q:
                g = q[0]
                return settled("won" if g.won else "lost", [g.id])
            return settled("refunded", []) if expired else active("Awaiting your next game", [])

        if kind == "win_under_moves":
            if q:
                g = q[0]
                ok = bool(g.won) and g.moves < (obj.moves or 30)
                return settled("won" if ok else "lost", [g.id])
            return settled("refunded", []) if expired else active(
                f"Win in under {obj.moves} moves — awaiting game", []
            )

        if kind == "win_series":
            n = obj.games
            k = obj.series_wins or n
            played = len(q)
            remaining = n - played
            ids = [g.id for g in q[:n]]
            if wins >= k:
                return settled("won", ids)
            if wins + remaining < k:
                return settled("lost", ids)
            if played >= n:
                return settled("won" if wins >= k else "lost", ids)
            if expired:
                return settled("refunded", ids)
            return active(f"{played}/{n} games · {wins}/{k} wins", ids)

        if kind == "performance_line":
            n = obj.games
            played = len(q)
            ids = [g.id for g in q[:n]]
            if played >= n:
                sample = q[:n]
                if obj.metric == "avg_moves":
                    value = sum(g.moves for g in sample) / n
                else:  # win_rate
                    value = sum(1 for g in sample if g.won) / n
                line = obj.line or 0.0
                ok = value < line if obj.side == "under" else value > line
                return settled("won" if ok else "lost", ids)
            if expired:
                return settled("refunded", ids)
            return active(f"{played}/{n} games tracked", ids)

        return active("In progress", [])

    # ------------------------------------------------------------------
    # Host-specific mapping (kept private to the adapter).
    # ------------------------------------------------------------------

    def _to_profile(self, raw: dict) -> SkillProfile:
        perfs = raw.get("perfs", {}) or {}
        formats: list[FormatStat] = []
        for speed in _SPEEDS:
            p = perfs.get(speed)
            if p and p.get("games", 0) > 0:
                formats.append(
                    FormatStat(
                        speed=speed,
                        rating=int(p.get("rating", 1500)),
                        games=int(p.get("games", 0)),
                        provisional=bool(p.get("prov", False)),
                    )
                )

        count = raw.get("count", {}) or {}
        total = int(count.get("rated", 0)) or int(count.get("all", 0))
        wins = int(count.get("win", 0))
        draws = int(count.get("draw", 0))
        win_rate = (wins + 0.5 * draws) / total if total > 0 else 0.5
        draw_rate = draws / total if total > 0 else 0.12

        primary = max(formats, key=lambda f: f.games).speed if formats else "blitz"

        created = raw.get("createdAt")
        import time as _time
        age_days = (
            int((_time.time() * 1000 - created) / 86_400_000) if created else None
        )

        username = raw.get("username") or raw.get("id", "")
        return SkillProfile(
            username=username,
            display_name=username,
            url=raw.get("url", f"https://lichess.org/@/{username}"),
            link_method="username",
            account_age_days=age_days,
            win_rate=round(win_rate, 4),
            draw_rate=round(draw_rate, 4),
            total_games=total,
            formats=formats,
            primary_speed=primary,
        )

    def _normalize(self, g: dict, account_id: str) -> Optional[NormGame]:
        status = g.get("status")
        if status not in _FINISHED:
            return None
        if g.get("variant", "standard") != "standard":
            return None

        players = g.get("players", {}) or {}
        white_id = (((players.get("white") or {}).get("user") or {}).get("id") or "").lower()
        black_id = (((players.get("black") or {}).get("user") or {}).get("id") or "").lower()
        me = account_id.lower()
        if me == white_id:
            my_color = "white"
        elif me == black_id:
            my_color = "black"
        else:
            return None  # not actually the linked user's game

        winner = g.get("winner")
        drawn = winner is None and status in _DRAW_STATUSES
        won: Optional[bool]
        if winner is None:
            won = False if drawn else None
        else:
            won = winner == my_color

        return NormGame(
            id=g.get("id", ""),
            speed=g.get("speed", "blitz"),
            rated=bool(g.get("rated", False)),
            created_at_ms=int(g.get("createdAt", 0)),
            moves=_move_count(g.get("moves")),
            won=won,
            drawn=drawn,
        )
