import { useCallback, useEffect, useRef, useState } from 'react';
import { loadState, saveState } from '../utils/storage';
import { track } from '../utils/telemetry';

const STARTING_BALANCE = 1000;
const DEFAULT_LOSS_LIMIT = 200; // matches overview §7.3 daily loss cap
const ANIMATION_MS = 600;
const STORAGE_KEY = 'wallet';

interface WalletState {
  available: number;
  pending: number;
  locked: number;
  lossLimit: number;
  lossToday: number;
}

const INITIAL: WalletState = {
  available: STARTING_BALANCE,
  pending: 0,
  locked: 0,
  lossLimit: DEFAULT_LOSS_LIMIT,
  lossToday: 0,
};

export interface UseWallet extends WalletState {
  displayAvailable: number;
  animating: boolean;
  remainingLoss: number;
  /** True if a stake can be committed without breaching balance or loss cap. */
  canActivate: (stake: number) => boolean;
  commitStake: (stake: number) => void;
  /** Apply a settlement: release the held stake, credit payout, record loss. */
  applySettlement: (args: {
    stake: number;
    payout: number;
    isLoss: boolean;
  }) => void;
  setLossLimit: (limit: number) => void;
  reset: () => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Play-money wallet with available / pending / locked buckets. The schema and
 * the loss-cap behavior match the production model (overview §7); only the
 * currency is virtual. Persisted to localStorage.
 */
export function useWallet(): UseWallet {
  const [state, setState] = useState<WalletState>(() =>
    loadState<WalletState>(STORAGE_KEY, INITIAL),
  );
  const [displayAvailable, setDisplayAvailable] = useState(state.available);
  const [animating, setAnimating] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    saveState(STORAGE_KEY, state);
  }, [state]);

  // Animate displayAvailable toward the real value on change.
  useEffect(() => {
    if (displayAvailable === state.available) return;
    setAnimating(true);
    const from = displayAvailable;
    const to = state.available;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ANIMATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayAvailable(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayAvailable(to);
        setAnimating(false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.available]);

  const remainingLoss = Math.max(0, state.lossLimit - state.lossToday);

  const canActivate = useCallback(
    (stake: number) =>
      stake > 0 && stake <= state.available && stake <= remainingLoss + state.available,
    [state.available, remainingLoss],
  );

  const commitStake = useCallback((stake: number) => {
    setState((s) => ({
      ...s,
      available: round2(s.available - stake),
      pending: round2(s.pending + stake),
    }));
  }, []);

  const applySettlement = useCallback(
    ({ stake, payout, isLoss }: { stake: number; payout: number; isLoss: boolean }) => {
      setState((s) => ({
        ...s,
        pending: round2(Math.max(0, s.pending - stake)),
        available: round2(s.available + payout),
        lossToday: isLoss ? round2(s.lossToday + stake) : s.lossToday,
      }));
    },
    [],
  );

  const setLossLimit = useCallback((limit: number) => {
    setState((s) => ({ ...s, lossLimit: Math.max(0, Math.round(limit)) }));
    track('wallet_limit_changed', { lossLimit: limit });
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL);
    setDisplayAvailable(INITIAL.available);
  }, []);

  return {
    ...state,
    displayAvailable,
    animating,
    remainingLoss,
    canActivate,
    commitStake,
    applySettlement,
    setLossLimit,
    reset,
  };
}
