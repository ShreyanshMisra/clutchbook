import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchLiveGames } from '../utils/apiClient';
import type { LiveGame } from '../types';

const POLL_INTERVAL_MS = 12_000;

interface UseLichessGames {
  games: LiveGame[];
  loading: boolean; // true only on the very first load (drives skeletons)
  error: string | null;
  refetch: () => void;
}

/**
 * Polls /api/live-games every 12s. Keeps showing the last good data across
 * re-polls so the UI never flashes empty between refreshes. `loading` is true
 * only for the initial fetch; `error` is set when a fetch fails with no data.
 */
export function useLichessGames(): UseLichessGames {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await fetchLiveGames(signal);
      if (signal?.aborted) return;
      setGames(data);
      setError(null);
      hasLoadedOnce.current = true;
    } catch (err) {
      if (signal?.aborted || (err as Error).name === 'AbortError') return;
      // Only surface a hard error if we have nothing to show yet.
      if (!hasLoadedOnce.current) {
        setError((err as Error).message || 'Failed to load live games');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const id = window.setInterval(() => {
      void load(controller.signal);
    }, POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [load]);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    void load();
  }, [load]);

  return { games, loading, error, refetch };
}
