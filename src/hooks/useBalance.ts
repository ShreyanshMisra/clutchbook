import { useCallback, useEffect, useRef, useState } from 'react';

const STARTING_BALANCE = 1000;
const ANIMATION_MS = 600;

interface UseBalance {
  balance: number;
  displayBalance: number; // animated value for count-up/down
  animating: boolean;
  deduct: (amount: number) => void;
  credit: (amount: number) => void;
}

/**
 * Virtual balance starting at $1,000. Any change animates `displayBalance`
 * from its previous value to the new one over 600ms (count up/down).
 */
export function useBalance(): UseBalance {
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [displayBalance, setDisplayBalance] = useState(STARTING_BALANCE);
  const [animating, setAnimating] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Animate displayBalance toward balance whenever it changes.
  useEffect(() => {
    if (displayBalance === balance) return;
    setAnimating(true);
    const from = displayBalance;
    const to = balance;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ANIMATION_MS);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayBalance(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayBalance(to);
        setAnimating(false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // We intentionally only react to `balance` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance]);

  const deduct = useCallback((amount: number) => {
    setBalance((b) => Math.round((b - amount) * 100) / 100);
  }, []);

  const credit = useCallback((amount: number) => {
    setBalance((b) => Math.round((b + amount) * 100) / 100);
  }, []);

  return { balance, displayBalance, animating, deduct, credit };
}
