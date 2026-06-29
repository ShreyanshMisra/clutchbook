"""Adapter registry. Callers resolve adapters by game id, never by import."""

from __future__ import annotations

from _lib.adapters.base import GameAdapter
from _lib.adapters.chess_lichess import ChessLichessAdapter
from _lib.adapters.cs2_faceit import CS2FaceitAdapter

# Chess (Lichess) and CS2 (FaceIt) are live. Chess supports the full contract
# lifecycle; CS2 currently provides verified identity + pooled play (roadmap §5
# onboarding) with head-to-head settlement to follow.
_ADAPTERS: dict[str, GameAdapter] = {
    ChessLichessAdapter.id: ChessLichessAdapter(),
    CS2FaceitAdapter.id: CS2FaceitAdapter(),
}

DEFAULT_GAME = ChessLichessAdapter.id


def get(game_id: str) -> GameAdapter:
    try:
        return _ADAPTERS[game_id]
    except KeyError:
        raise ValueError(f"No adapter registered for game '{game_id}'")


def ids() -> list[str]:
    return list(_ADAPTERS.keys())
