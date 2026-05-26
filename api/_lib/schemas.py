"""Pydantic models describing the API surface Clutchbook's frontend consumes."""

from pydantic import BaseModel
from typing import Optional


class PlayerOdds(BaseModel):
    american: int
    decimal: float
    implied_prob: float


class MatchWinnerMarket(BaseModel):
    player_a: PlayerOdds
    player_b: PlayerOdds


class TotalMovesMarket(BaseModel):
    line: float
    over_american: int
    under_american: int
    over_decimal: float
    under_decimal: float


class OutcomeOdds(BaseModel):
    american: int
    decimal: float


class ResultTypeMarket(BaseModel):
    checkmate: OutcomeOdds
    resignation: OutcomeOdds
    draw: OutcomeOdds


class MatchMarkets(BaseModel):
    match_winner: MatchWinnerMarket
    total_moves: TotalMovesMarket
    result_type: ResultTypeMarket


class LiveGame(BaseModel):
    game_id: str
    game_url: str
    time_control: str             # "bullet" | "blitz" | "rapid" | "classical"
    speed: str                    # raw Lichess speed field
    player_white: str             # username
    player_black: str             # username
    rating_white: Optional[int] = None
    rating_black: Optional[int] = None
    move_count: Optional[int] = None
    phase: str                    # "Opening" | "Middlegame" | "Endgame"
    status: str                   # "started" | "finished" etc.
    markets: MatchMarkets


class GameResult(BaseModel):
    game_id: str
    status: str                   # "started" | "mate" | "resign" | "draw" ...
    winner: Optional[str] = None  # "white" | "black" | None
    finished: bool
    move_count: Optional[int] = None
