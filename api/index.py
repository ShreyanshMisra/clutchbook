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

from _lib import lobby, solo_challenge  # noqa: E402
from _lib.adapters import registry  # noqa: E402
from _lib.adapters.base import GameFilters  # noqa: E402
from _lib.schemas import (  # noqa: E402
    Contract,
    LobbyResponse,
    PriceRequest,
    SettleRequest,
    SettleResponse,
    SettleResult,
    SkillProfile,
    SoloEnterRequest,
    SoloLobbyResponse,
    SoloPool,
    SoloPoolCreate,
    SoloSettleRequest,
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

    return LobbyResponse(profile=prof, contests=lobby.generate(prof))


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
    return lobby.build_contract(prof, req)


@app.post("/api/contracts/settle", response_model=SettleResponse)
async def settle(req: SettleRequest) -> SettleResponse:
    """Server-authoritative grading of the user's ACTIVE contracts.

    Fetches the user's real games once (since the earliest activation), then
    grades each contract against its qualifying subset via the adapter.
    """
    active = [c for c in req.contracts if c.state in ("ACTIVE", "RESOLVING")]
    if not active:
        return SettleResponse(results=[])

    by_game: dict[str, list[Contract]] = {}
    for c in active:
        by_game.setdefault(c.game, []).append(c)

    now = _now_ms()
    results: list[SettleResult] = []

    for game_id, contracts in by_game.items():
        adapter = registry.get(game_id)
        since = min((c.matched_at or now) for c in contracts)
        speeds = {c.speed for c in contracts}
        try:
            games = await adapter.poll_eligible_games(
                req.username, int(since), GameFilters(speeds=speeds)
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
