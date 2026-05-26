import { useCallback, useEffect, useRef } from 'react';
import { fetchGameResult } from '../utils/apiClient';
import { evaluateLeg, evaluateParlay } from '../utils/settle';
import { formatCurrency, potentialPayout } from '../utils/oddsFormatter';
import type { BetSelection, BetStatus, GameResult, ToastMessage } from '../types';

const POLL_INTERVAL_MS = 15_000;

interface SettlementDeps {
  placed: BetSelection[];
  updateStatus: (id: string, status: BetStatus) => void;
  credit: (amount: number) => void;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

/**
 * Polls /api/game/{id} for every pending placed bet's game(s) every 15s.
 * When a game resolves: marks the bet won/lost, credits the balance on a win,
 * and fires a toast. Runs app-wide so bets settle regardless of active tab.
 */
export function useBetSettlement({
  placed,
  updateStatus,
  credit,
  pushToast,
}: SettlementDeps): void {
  // Keep latest callbacks/data in refs so the interval closure stays stable.
  const ref = useRef({ placed, updateStatus, credit, pushToast });
  ref.current = { placed, updateStatus, credit, pushToast };

  const settleOnce = useCallback(async (signal?: AbortSignal) => {
    const { placed: bets, updateStatus: setStatus, credit: addFunds, pushToast: toast } =
      ref.current;

    const pendingBets = bets.filter((b) => b.status === 'pending');
    if (pendingBets.length === 0) return;

    // Collect every gameId we need a fresh result for.
    const gameIds = new Set<string>();
    for (const bet of pendingBets) {
      if (bet.isParlay) {
        for (const leg of bet.legs ?? []) gameIds.add(leg.gameId);
      } else {
        gameIds.add(bet.gameId);
      }
    }

    const resultsByGame = new Map<string, GameResult>();
    await Promise.all(
      [...gameIds].map(async (gid) => {
        try {
          const result = await fetchGameResult(gid, signal);
          resultsByGame.set(gid, result);
        } catch {
          // Leave unresolved; we'll retry on the next poll.
        }
      }),
    );
    if (signal?.aborted) return;

    for (const bet of pendingBets) {
      const status = bet.isParlay
        ? evaluateParlay(bet, resultsByGame)
        : (() => {
            const result = resultsByGame.get(bet.gameId);
            return result ? evaluateLeg(bet, result) : 'pending';
          })();

      if (status === 'pending') continue;

      setStatus(bet.id, status);
      if (status === 'won') {
        const payout = potentialPayout(bet.wager, bet.decimalOdds);
        addFunds(payout);
        toast({
          variant: 'win',
          title: 'Bet won!',
          description: `${bet.gameLabel} — +${formatCurrency(payout - bet.wager)} profit`,
        });
      } else {
        toast({
          variant: 'loss',
          title: 'Bet lost',
          description: `${bet.gameLabel} — ${formatCurrency(bet.wager)} stake`,
        });
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Kick once on mount, then on an interval.
    void settleOnce(controller.signal);
    const id = window.setInterval(() => {
      void settleOnce(controller.signal);
    }, POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [settleOnce]);
}
