import { useCallback, useState } from 'react';
import { fetchProfile } from '../utils/apiClient';
import { loadState, saveState, clearState } from '../utils/storage';
import { track } from '../utils/telemetry';
import type { SkillProfile } from '../types';

const STORAGE_KEY = 'profile';

interface UseProfile {
  profile: SkillProfile | null;
  linking: boolean;
  error: string | null;
  link: (username: string) => Promise<boolean>;
  unlink: () => void;
}

/**
 * The linked Lichess identity. Phase 1 demo uses the username-claim path (public
 * stats); the OAuth path swaps in behind the same `link` call. Persisted so the
 * session survives refreshes.
 */
export function useProfile(): UseProfile {
  const [profile, setProfile] = useState<SkillProfile | null>(() =>
    loadState<SkillProfile | null>(STORAGE_KEY, null),
  );
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = useCallback(async (username: string): Promise<boolean> => {
    const name = username.trim();
    if (!name) return false;
    setLinking(true);
    setError(null);
    try {
      const p = await fetchProfile(name);
      setProfile(p);
      saveState(STORAGE_KEY, p);
      track('username_claimed', { username: p.username });
      return true;
    } catch (err) {
      setError((err as Error).message || 'Could not link that account');
      return false;
    } finally {
      setLinking(false);
    }
  }, []);

  const unlink = useCallback(() => {
    setProfile(null);
    setError(null);
    clearState(STORAGE_KEY);
  }, []);

  return { profile, linking, error, link, unlink };
}
