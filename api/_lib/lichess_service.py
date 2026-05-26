"""Thin async client over the Lichess public API (no key required).

Notes on endpoint choice (verified against the live API):
  * ``GET /api/tv/{channel}`` (Accept: application/json) returns NDJSON of the
    channel's current top games, each with BOTH players, ratings, and the full
    move list. This is the richest single call, so it powers /api/live-games.
  * ``GET /api/game/export/{id}`` proved unreliable (404s) for in-progress TV
    games, but ``POST /api/games/export/_ids`` returns the same game JSON
    reliably. We use the bulk endpoint for bet settlement.
"""

import asyncio
from typing import Optional

import httpx

LICHESS_BASE = "https://lichess.org/api"
HEADERS = {"User-Agent": "Clutchbook/1.0 (esports betting demo)"}

# Time controls Clutchbook lists markets for, mapped to TV channel names.
CHANNELS = ("bullet", "blitz", "rapid", "classical")


def _parse_ndjson(text: str) -> list[dict]:
    """Parse a newline-delimited JSON payload into a list of dicts."""
    import json

    out: list[dict] = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


async def get_tv_channels() -> dict:
    """Fetch the single featured game per channel from Lichess TV."""
    async with httpx.AsyncClient(headers=HEADERS) as client:
        r = await client.get(f"{LICHESS_BASE}/tv/channels", timeout=8)
        r.raise_for_status()
        return r.json()


async def _get_channel_games(client: httpx.AsyncClient, channel: str) -> list[dict]:
    """Fetch the current top games for one TV channel (NDJSON)."""
    try:
        r = await client.get(
            f"{LICHESS_BASE}/tv/{channel}",
            headers={**HEADERS, "Accept": "application/json"},
            timeout=8,
        )
        r.raise_for_status()
    except httpx.HTTPError:
        return []
    return _parse_ndjson(r.text)


async def get_live_games_raw() -> list[dict]:
    """Fetch live standard games across all tracked channels, de-duplicated.

    Each returned dict is annotated with ``_channel`` (the time control bucket
    it was sourced from) so the caller doesn't have to re-derive it.
    """
    async with httpx.AsyncClient(headers=HEADERS) as client:
        results = await asyncio.gather(
            *(_get_channel_games(client, ch) for ch in CHANNELS)
        )

    seen: set[str] = set()
    games: list[dict] = []
    for channel, channel_games in zip(CHANNELS, results):
        for g in channel_games:
            gid = g.get("id")
            if not gid or gid in seen:
                continue
            # Only standard chess, only in-progress games get live markets.
            if g.get("variant") not in (None, "standard"):
                continue
            if g.get("status") not in (None, "started", "created"):
                continue
            g["_channel"] = channel
            seen.add(gid)
            games.append(g)
    return games


async def get_game_result(game_id: str) -> Optional[dict]:
    """Fetch a single game's metadata/result via the bulk export endpoint.

    Returns the raw Lichess game dict, or ``None`` if the game can't be found.
    """
    async with httpx.AsyncClient(headers=HEADERS) as client:
        try:
            r = await client.post(
                f"{LICHESS_BASE}/games/export/_ids",
                content=game_id.encode(),
                headers={
                    **HEADERS,
                    "Accept": "application/x-ndjson",
                    "Content-Type": "text/plain",
                },
                params={"moves": "true", "clocks": "false", "evals": "false"},
                timeout=8,
            )
            r.raise_for_status()
        except httpx.HTTPError:
            return None
    games = _parse_ndjson(r.text)
    return games[0] if games else None
