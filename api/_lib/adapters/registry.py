"""Adapter registry. Callers resolve adapters by game id, never by import."""

from __future__ import annotations

from _lib.adapters.base import GameAdapter
from _lib.adapters.chess_lichess import ChessLichessAdapter

# Only chess is live in Phase 1. The CS2 stub is intentionally not registered;
# it merely proves a second game compiles against the interface.
_ADAPTERS: dict[str, GameAdapter] = {
    ChessLichessAdapter.id: ChessLichessAdapter(),
}

DEFAULT_GAME = ChessLichessAdapter.id


def get(game_id: str) -> GameAdapter:
    try:
        return _ADAPTERS[game_id]
    except KeyError:
        raise ValueError(f"No adapter registered for game '{game_id}'")


def ids() -> list[str]:
    return list(_ADAPTERS.keys())
