import type { GameResult, LiveGame } from '../types';

// Same-origin in production (Vercel serves /api via the Python function).
// In dev, Vite proxies /api -> http://localhost:8000. Override with VITE_API_BASE.
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function getJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${path}`);
  }
  return (await res.json()) as T;
}

export function fetchLiveGames(signal?: AbortSignal): Promise<LiveGame[]> {
  return getJSON<LiveGame[]>('/api/live-games', signal);
}

export function fetchGameResult(
  gameId: string,
  signal?: AbortSignal,
): Promise<GameResult> {
  return getJSON<GameResult>(`/api/game/${gameId}`, signal);
}
