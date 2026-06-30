"""money match API — FastAPI app (Phase 1: single-player skill contracts).

Stateless serverless functions over real Lichess data. The client owns contract
and wallet state (localStorage in the demo); the server verifies identity,
matches players, generates the lobby, and grades settlement against the
user's real games. Routes live under ``/api`` so the same paths work in dev
(Vite proxy) and prod (vercel.json rewrite).
"""

import os
import sys
import time

# Make ``_lib`` importable under uvicorn, direct run, or Vercel's runtime.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Query  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from _lib import (  # noqa: E402
    faceit_service,
    leaderboard,
    lichess_service,
    lobby,
    opendota_service,
    solo_challenge,
    spectate,
    tournament,
    tracker,
)
from _lib.adapters import registry  # noqa: E402
from _lib.adapters.base import GameFilters  # noqa: E402
from _lib.schemas import (  # noqa: E402
    Contract,
    LeaderboardResponse,
    LobbyResponse,
    PriceRequest,
    SettleRequest,
    SettleResponse,
    SettleResult,
    SkillProfile,
    SoloEnterRequest,
    SoloLobbyResponse,
    SoloPool,
    MatchTrackerResponse,
    SoloPoolCreate,
    SoloSettleRequest,
    SpectateResponse,
    Tournament,
    TournamentCreate,
    TournamentEnterRequest,
    TournamentLobbyResponse,
    TournamentSettleRequest,
)

app = FastAPI(title="money match API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _now_ms() -> int:
    return int(time.time() * 1000)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "service": "money-match", "games": registry.ids()}


@app.get("/api/profile", response_model=SkillProfile)
async def profile(
    username: str = Query(..., min_length=1),
    game: str = Query(registry.DEFAULT_GAME),
) -> SkillProfile:
    """Link / refresh a skill profile. Demo uses the username (public) path."""
    adapter = registry.get(game)
    try:
        return await adapter.link_account("username", username)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Host API error: {exc}")


@app.get("/api/lobby", response_model=LobbyResponse)
async def get_lobby(
    username: str = Query(..., min_length=1),
    game: str = Query(registry.DEFAULT_GAME),
) -> LobbyResponse:
    """Personalized lobby of OPEN head-to-head contests for the linked user."""
    adapter = registry.get(game)
    try:
        prof = await adapter.link_account("username", username)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Host API error: {exc}")

    contests = lobby.generate(prof)
    for c in contests:
        c.account_id = prof.username  # the linked account this contract settles against
    return LobbyResponse(profile=prof, contests=contests)


@app.post("/api/contracts/price", response_model=Contract)
async def price(
    req: PriceRequest,
    username: str = Query(..., min_length=1),
) -> Contract:
    """Match + build a Builder draft into a full OPEN contest for ``username``."""
    adapter = registry.get(req.game)
    try:
        prof = await adapter.fetch_profile(username)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Host API error: {exc}")
    contract = lobby.build_contract(prof, req)
    contract.account_id = prof.username
    return contract


@app.post("/api/contracts/settle", response_model=SettleResponse)
async def settle(req: SettleRequest) -> SettleResponse:
    """Server-authoritative grading of the user's ACTIVE contracts.

    Fetches the user's real games once (since the earliest activation), then
    grades each contract against its qualifying subset via the adapter.
    """
    active = [c for c in req.contracts if c.state in ("ACTIVE", "RESOLVING")]
    if not active:
        return SettleResponse(results=[])

    # Group by (game, account) so each adapter is polled once per linked account
    # — a session can hold contracts on chess (Lichess) and CS2 (FaceIt) at once.
    by_key: dict[tuple[str, str], list[Contract]] = {}
    for c in active:
        account = c.account_id or req.username
        by_key.setdefault((c.game, account), []).append(c)

    now = _now_ms()
    results: list[SettleResult] = []

    for (game_id, account), contracts in by_key.items():
        adapter = registry.get(game_id)
        since = min((c.matched_at or now) for c in contracts)
        speeds = {c.speed for c in contracts}
        try:
            games = await adapter.poll_eligible_games(
                account, int(since), GameFilters(speeds=speeds)
            )
        except Exception:  # noqa: BLE001 - leave contracts ACTIVE, retry next poll
            continue
        for c in contracts:
            results.append(adapter.resolve_contract(c, games, now))

    return SettleResponse(results=results)


# ---------------------------------------------------------------------------
# Algorithmic Solo Challenges — POOLED solo tournament (overview §10). Additive,
# isolated from the peer-to-peer routes above. No house: prize comes from the
# entrants' pool, platform takes only rake. Play-money only in the demo.
# ---------------------------------------------------------------------------


@app.get("/api/solo/lobby", response_model=SoloLobbyResponse)
async def solo_lobby() -> SoloLobbyResponse:
    """Open pooled solo tournaments a player can join (seeded with bot entrants)."""
    return SoloLobbyResponse(pools=solo_challenge.generate_solo_lobby())


@app.post("/api/solo/pools", response_model=SoloPool)
async def create_solo_pool(req: SoloPoolCreate) -> SoloPool:
    """Open a pooled solo tournament for a game + qualifying standard."""
    return solo_challenge.create_pool(
        game=req.game,
        metric_target=req.metric_target,
        entry_fee=req.entry_fee,
        rake_pct=req.rake_pct,
        min_entrants=req.min_entrants,
    )


@app.post("/api/solo/pools/enter", response_model=SoloPool)
async def enter_solo_pool(req: SoloEnterRequest) -> SoloPool:
    """Escrow an entry into a pool. The geo-fence runs BEFORE the fee — a
    restricted region is rejected with 403 and never charged (overview §10)."""
    try:
        return solo_challenge.enter_pool(req.pool, req.player_id, req.state)
    except solo_challenge.RegionBlockedError as exc:
        raise HTTPException(status_code=403, detail=str(exc))


@app.post("/api/solo/pools/settle", response_model=SoloPool)
async def settle_solo_pool(req: SoloSettleRequest) -> SoloPool:
    """Mock telemetry webhook: grade each entry and distribute the pool to
    clearers minus rake (refund all if under-subscribed or no clearers)."""
    return solo_challenge.settle_pool(req.pool, req.telemetry)


# ---------------------------------------------------------------------------
# Multi-entrant tournaments (roadmap §3 — Phase 2). Same neutral-operator
# escrow/rake model as the routes above: top finishers split pool − rake, no
# house. Play-money only in the demo.
# ---------------------------------------------------------------------------


@app.get("/api/tournaments/lobby", response_model=TournamentLobbyResponse)
async def tournaments_lobby() -> TournamentLobbyResponse:
    """Open tournaments a player can join (seeded with bot entrants, one slot open)."""
    return TournamentLobbyResponse(tournaments=tournament.generate_tournament_lobby())


@app.post("/api/tournaments", response_model=Tournament)
async def create_tournament(req: TournamentCreate) -> Tournament:
    """Open a tournament for a game + ranking standard."""
    return tournament.create_tournament(
        game=req.game,
        name=req.name,
        ranking_metric=req.ranking_metric,
        entry_fee=req.entry_fee,
        higher_is_better=req.higher_is_better,
        fmt=req.format,
        rake_pct=req.rake_pct,
        max_entrants=req.max_entrants,
        min_entrants=req.min_entrants,
        prize_split=req.prize_split,
    )


@app.post("/api/tournaments/enter", response_model=Tournament)
async def enter_tournament(req: TournamentEnterRequest) -> Tournament:
    """Escrow an entry. The geo-fence runs BEFORE the fee — a restricted region
    is rejected with 403 and never charged; a full field is rejected with 409."""
    try:
        return tournament.enter_tournament(req.tournament, req.player_id, req.state)
    except solo_challenge.RegionBlockedError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except tournament.TournamentFullError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@app.post("/api/tournaments/settle", response_model=Tournament)
async def settle_tournament(req: TournamentSettleRequest) -> Tournament:
    """Mock telemetry webhook: rank every entrant and distribute the pool to the
    top finishers minus rake (refund all if under-subscribed or un-verifiable)."""
    return tournament.settle_tournament(req.tournament, req.telemetry)


# ---------------------------------------------------------------------------
# Leaderboard + spectator (roadmap §3 — Phase 2 retention surfaces)
# ---------------------------------------------------------------------------


@app.get("/api/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard() -> LeaderboardResponse:
    """Seeded competitive field, best ROI first. The client merges in the
    signed-in user's own record and re-ranks (ranked by ROI, never raw $)."""
    return LeaderboardResponse(entries=leaderboard.generate_leaderboard())


@app.get("/api/spectate", response_model=SpectateResponse)
async def get_spectate(username: str = Query(..., min_length=1)) -> SpectateResponse:
    """Move list + clock for the user's current Lichess game (roadmap §3.4).

    Sourced live from the public Lichess current-game endpoint; returns
    ``available=false`` with a note when the user has no game to watch."""
    raw = await lichess_service.get_current_game(username)
    return spectate.parse_current_game(raw)


@app.get("/api/track", response_model=MatchTrackerResponse)
async def track(
    game: str = Query(..., min_length=1),
    username: str = Query(..., min_length=1),
) -> MatchTrackerResponse:
    """Live/most-recent match tracker for CS2 (FaceIt) and Dota 2 (OpenDota).

    The spectator analog for titles without a move-by-move stream — a compact
    summary of the player's current / latest match."""
    if game == "cs2.faceit":
        player = await faceit_service.get_player(username, game="cs2")
        if player is None:
            return tracker.unavailable("Couldn't find that FaceIt player right now.")
        pid = player.get("player_id", "")
        items = await faceit_service.get_player_history(pid, "cs2", limit=1)
        return tracker.parse_faceit(pid, items[0] if items else None)
    if game == "dota2.opendota":
        matches = await opendota_service.get_recent_matches(username, limit=1)
        return tracker.parse_dota(matches[0] if matches else None)
    return tracker.unavailable("Live tracking isn't available for this game.")
