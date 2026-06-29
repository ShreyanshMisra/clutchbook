"""Tests for the Phase 2 retention surfaces: leaderboard + spectator parsing."""

from _lib import leaderboard, spectate


# --------------------------------------------------------------------------- #
# Leaderboard
# --------------------------------------------------------------------------- #

def test_leaderboard_is_sorted_by_roi_desc_and_stable():
    a = leaderboard.generate_leaderboard()
    b = leaderboard.generate_leaderboard()
    assert [e.player_id for e in a] == [e.player_id for e in b]  # deterministic
    rois = [e.roi for e in a]
    assert rois == sorted(rois, reverse=True)                     # ranked by ROI
    assert all(e.is_bot for e in a)
    assert len(a) >= 10


def test_leaderboard_records_are_self_consistent():
    for e in leaderboard.generate_leaderboard():
        assert 0 <= e.wins <= e.contests
        assert e.staked > 0
        assert round(e.net / e.staked, 2) == round(e.roi, 2) or abs(e.net - e.staked * e.roi) < 0.01


# --------------------------------------------------------------------------- #
# Spectator parsing (pure)
# --------------------------------------------------------------------------- #

def test_spectate_unavailable_when_no_game():
    assert spectate.parse_current_game(None).available is False
    assert spectate.parse_current_game({}).available is False
    assert spectate.parse_current_game({"id": ""}).available is False


def test_spectate_parses_ongoing_game():
    raw = {
        "id": "abcd1234",
        "status": "started",
        "speed": "blitz",
        "players": {
            "white": {"user": {"name": "alice"}, "rating": 1800},
            "black": {"user": {"name": "bob"}, "rating": 1765},
        },
        "moves": "e4 e5 Nf3 Nc6 Bb5",       # 5 plies → black to move
        "clocks": [30000, 29800, 29500, 29100, 28800],  # centiseconds remaining
    }
    s = spectate.parse_current_game(raw)
    assert s.available and not s.finished
    assert s.game_id == "abcd1234"
    assert s.url == "https://lichess.org/abcd1234"
    assert s.white.name == "alice" and s.black.rating == 1765
    assert s.moves == ["e4", "e5", "Nf3", "Nc6", "Bb5"]
    assert s.turn == "black"                 # 5 moves played → black's turn
    assert s.white_clock == 288               # last white clock (28800cs) → 288s
    assert s.black_clock == 291               # last black clock (29100cs) → 291s


def test_spectate_marks_finished_game_and_winner():
    raw = {
        "id": "zzzz9999",
        "status": "mate",
        "speed": "rapid",
        "players": {"white": {"user": {"name": "a"}}, "black": {"user": {"name": "b"}}},
        "moves": "e4 e5",
        "winner": "white",
    }
    s = spectate.parse_current_game(raw)
    assert s.finished is True
    assert s.winner == "white"
    assert s.turn is None                     # no "to move" once finished


def test_spectate_handles_ai_opponent():
    raw = {
        "id": "ai123456",
        "status": "started",
        "players": {
            "white": {"user": {"name": "human"}, "rating": 1500},
            "black": {"aiLevel": 5},
        },
        "moves": "d4",
    }
    s = spectate.parse_current_game(raw)
    assert s.white.name == "human"
    assert s.black.name == "Stockfish level 5"
