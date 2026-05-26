"""Clutchbook API — FastAPI app.

Serves live, real Lichess data enriched with Clutchbook's own odds. No database,
no auth, no synthetic match data. Runs identically as a local uvicorn server and
as a Vercel Python serverless function (the module exposes ``app``).

Routes are defined under the ``/api`` prefix so the same paths work in dev
(Vite proxies ``/api`` -> uvicorn) and in production (vercel.json rewrites
``/api/(.*)`` -> this function).
"""

import os
import sys

# Ensure ``_lib`` is importable whether launched by uvicorn (api.index:app),
# directly, or by Vercel's Python runtime.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from _lib import lichess_service, odds_engine  # noqa: E402
from _lib.schemas import (  # noqa: E402
    GameResult,
    LiveGame,
    MatchMarkets,
    MatchWinnerMarket,
    PlayerOdds,
    ResultTypeMarket,
    TotalMovesMarket,
)

app = FastAPI(title="Clutchbook API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lichess game statuses that mean the game is over.
_FINISHED_STATUSES = {
    "mate",
    "resign",
    "stalemate",
    "timeout",
    "draw",
    "outoftime",
    "cheat",
    "noStart",
    "unknownFinish",
    "variantEnd",
}


def _move_count(moves: str | None) -> int | None:
    """Count full moves from a space-delimited SAN string (plies / 2)."""
    if not moves:
        return None
    plies = len(moves.split())
    return (plies + 1) // 2


def _phase(move_count: int | None) -> str:
    if move_count is None:
        return "Opening"
    if move_count < 15:
        return "Opening"
    if move_count < 40:
        return "Middlegame"
    return "Endgame"


def _rating(player: dict) -> int | None:
    r = player.get("rating")
    return int(r) if isinstance(r, (int, float)) else None


def _username(player: dict) -> str:
    user = player.get("user") or {}
    name = user.get("name")
    if name:
        return name
    if player.get("aiLevel"):
        return f"Stockfish L{player['aiLevel']}"
    return "Anonymous"


def _to_live_game(raw: dict) -> LiveGame:
    """Map a raw Lichess TV game dict into Clutchbook's enriched LiveGame."""
    players = raw.get("players", {})
    white = players.get("white", {})
    black = players.get("black", {})

    rating_white = _rating(white)
    rating_black = _rating(black)
    # Default unrated/missing ratings to a neutral 1500 for odds math only.
    eff_white = rating_white or 1500
    eff_black = rating_black or 1500

    channel = raw.get("_channel") or raw.get("speed", "blitz")
    move_count = _move_count(raw.get("moves"))
    game_id = raw["id"]

    winner = odds_engine.generate_match_odds(eff_white, eff_black, seed=game_id)
    total = odds_engine.generate_total_moves_line(channel, seed=game_id)
    result_type = odds_engine.generate_result_type_market(seed=game_id)

    markets = MatchMarkets(
        match_winner=MatchWinnerMarket(
            player_a=PlayerOdds(**winner["player_a"]),
            player_b=PlayerOdds(**winner["player_b"]),
        ),
        total_moves=TotalMovesMarket(**total),
        result_type=ResultTypeMarket(**result_type),
    )

    return LiveGame(
        game_id=game_id,
        game_url=f"https://lichess.org/{game_id}",
        time_control=channel,
        speed=raw.get("speed", channel),
        player_white=_username(white),
        player_black=_username(black),
        rating_white=rating_white,
        rating_black=rating_black,
        move_count=move_count,
        phase=_phase(move_count),
        status=raw.get("status", "started"),
        markets=markets,
    )


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "service": "clutchbook"}


@app.get("/api/live-games", response_model=list[LiveGame])
async def live_games() -> list[LiveGame]:
    """Real Lichess TV games enriched with Clutchbook odds.

    Returns an empty list (not an error) when Lichess has no live standard
    games, so the frontend can render its designed empty state.
    """
    try:
        raw_games = await lichess_service.get_live_games_raw()
    except Exception as exc:  # noqa: BLE001 - surface upstream failure cleanly
        raise HTTPException(status_code=502, detail=f"Lichess upstream error: {exc}")

    games: list[LiveGame] = []
    for raw in raw_games:
        try:
            games.append(_to_live_game(raw))
        except Exception:  # noqa: BLE001 - skip any malformed game, keep the rest
            continue
    return games


@app.get("/api/game/{game_id}", response_model=GameResult)
async def game_result(game_id: str) -> GameResult:
    """Game status + result, used by the frontend to settle pending bets."""
    raw = await lichess_service.get_game_result(game_id)
    if raw is None:
        raise HTTPException(status_code=404, detail="Game not found")

    status = raw.get("status", "started")
    return GameResult(
        game_id=game_id,
        status=status,
        winner=raw.get("winner"),
        finished=status in _FINISHED_STATUSES,
        move_count=_move_count(raw.get("moves")),
    )
