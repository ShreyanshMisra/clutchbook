import { useCallback, useState } from 'react';
import { fetchProfile } from '../utils/apiClient';
import { loadState, saveState, clearState } from '../utils/storage';
import { track } from '../utils/telemetry';
import type { SkillProfile } from '../types';

interface UseProfile {
  profile: SkillProfile | null;
  linking: boolean;
  error: string | null;
  link: (username: string) => Promise<boolean>;
  unlink: () => void;
}

interface UseProfileOptions {
  storageKey?: string; // localStorage slot (one per linked game)
  game?: string;       // adapter id; omitted ⇒ the default (chess) adapter
}

/**
 * A linked game identity, verified from the host API and persisted so the
 * session survives refreshes. Defaults to the Lichess (chess) profile; pass a
 * storageKey + game to link another title (e.g. CS2 via FaceIt). Linking uses
 * the public username path; OAuth swaps in behind the same `link` call.
 */
export function useProfile(options: UseProfileOptions = {}): UseProfile {
  const storageKey = options.storageKey ?? 'profile';
  const game = options.game;
  const [profile, setProfile] = useState<SkillProfile | null>(() =>
    loadState<SkillProfile | null>(storageKey, null),
  );
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const link = useCallback(async (username: string): Promise<boolean> => {
    const name = username.trim();
    if (!name) return false;
    setLinking(true);
    setError(null);
    try {
      const p = await fetchProfile(name, game);
      setProfile(p);
      saveState(storageKey, p);
      track('username_claimed', { username: p.username, game: p.game ?? game });
      return true;
    } catch (err) {
      setError((err as Error).message || 'Could not link that account');
      return false;
    } finally {
      setLinking(false);
    }
  }, [game, storageKey]);

  const unlink = useCallback(() => {
    setProfile(null);
    setError(null);
    clearState(storageKey);
  }, [storageKey]);

  return { profile, linking, error, link, unlink };
}
