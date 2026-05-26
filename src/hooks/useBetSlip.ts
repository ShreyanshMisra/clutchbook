import { useCallback, useMemo, useState } from 'react';
import type { BetMarket, BetSelection, BetStatus, BetTarget } from '../types';
import { decimalToAmerican, parlayDecimal } from '../utils/oddsFormatter';

// Everything needed to create a selection except client-managed fields.
export type SelectionInput = Omit<
  BetSelection,
  'id' | 'placedAt' | 'status' | 'isParlay' | 'legs'
>;

const DEFAULT_WAGER = 10;

/** Markets that are mutually exclusive for a given game (can't back both). */
function marketGroup(market: BetMarket): 'winner' | 'totals' | 'result' {
  if (market === 'match_winner') return 'winner';
  if (market === 'total_moves_over' || market === 'total_moves_under') return 'totals';
  return 'result';
}

function sameTarget(a: BetTarget, b: BetTarget): boolean {
  return a.side === b.side && a.line === b.line && a.result === b.result;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export interface UseBetSlip {
  selections: BetSelection[];
  pending: BetSelection[]; // unplaced (still in slip)
  placed: BetSelection[]; // wagered
  addSelection: (input: SelectionInput) => void;
  removeSelection: (id: string) => void;
  updateWager: (id: string, amount: number) => void;
  isSelected: (gameId: string, market: BetMarket, target: BetTarget) => boolean;
  clearSlip: () => void;

  parlayMode: boolean;
  toggleParlay: () => void;
  parlayWager: number;
  setParlayWager: (amount: number) => void;
  parlayDecimalOdds: number;
  parlayAmericanOdds: number;

  totalStake: number;
  placeBets: () => BetSelection[]; // returns the newly placed bets
  updateStatus: (id: string, status: BetStatus) => void;
}

export function useBetSlip(): UseBetSlip {
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [parlayMode, setParlayMode] = useState(false);
  const [parlayWager, setParlayWager] = useState(DEFAULT_WAGER);

  const pending = useMemo(
    () => selections.filter((s) => s.placedAt === null),
    [selections],
  );
  const placed = useMemo(
    () => selections.filter((s) => s.placedAt !== null),
    [selections],
  );

  const addSelection = useCallback((input: SelectionInput) => {
    setSelections((prev) => {
      const unplaced = prev.filter((s) => s.placedAt === null);
      const placedBets = prev.filter((s) => s.placedAt !== null);

      // Exact same selection already in the slip -> toggle it off.
      const exact = unplaced.find(
        (s) =>
          s.gameId === input.gameId &&
          s.market === input.market &&
          sameTarget(s.target, input.target),
      );
      if (exact) {
        return [...placedBets, ...unplaced.filter((s) => s.id !== exact.id)];
      }

      // Otherwise drop any other selection in the same market group for this
      // game (you can't back two outcomes of the same market), then add.
      const group = marketGroup(input.market);
      const kept = unplaced.filter(
        (s) => !(s.gameId === input.gameId && marketGroup(s.market) === group),
      );
      const next: BetSelection = {
        ...input,
        id: uuid(),
        placedAt: null,
        status: 'pending',
        wager: input.wager || DEFAULT_WAGER,
      };
      return [...placedBets, ...kept, next];
    });
  }, []);

  const removeSelection = useCallback((id: string) => {
    setSelections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateWager = useCallback((id: string, amount: number) => {
    setSelections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, wager: amount } : s)),
    );
  }, []);

  const isSelected = useCallback(
    (gameId: string, market: BetMarket, target: BetTarget) =>
      selections.some(
        (s) =>
          s.placedAt === null &&
          s.gameId === gameId &&
          s.market === market &&
          sameTarget(s.target, target),
      ),
    [selections],
  );

  const clearSlip = useCallback(() => {
    setSelections((prev) => prev.filter((s) => s.placedAt !== null));
  }, []);

  const toggleParlay = useCallback(() => setParlayMode((p) => !p), []);

  const parlayDecimalOdds = useMemo(
    () => (pending.length > 0 ? parlayDecimal(pending.map((s) => s.decimalOdds)) : 0),
    [pending],
  );
  const parlayAmericanOdds = useMemo(
    () => decimalToAmerican(parlayDecimalOdds),
    [parlayDecimalOdds],
  );

  const totalStake = useMemo(
    () =>
      parlayMode
        ? parlayWager
        : pending.reduce((sum, s) => sum + (s.wager || 0), 0),
    [parlayMode, parlayWager, pending],
  );

  const placeBets = useCallback((): BetSelection[] => {
    const now = new Date();
    let newlyPlaced: BetSelection[] = [];

    setSelections((prev) => {
      const unplaced = prev.filter((s) => s.placedAt === null);
      const placedBets = prev.filter((s) => s.placedAt !== null);
      if (unplaced.length === 0) return prev;

      if (parlayMode && unplaced.length >= 2) {
        const combinedDecimal = parlayDecimal(unplaced.map((s) => s.decimalOdds));
        const parlay: BetSelection = {
          id: uuid(),
          gameId: `parlay-${now.getTime()}`,
          gameLabel: `${unplaced.length}-Leg Parlay`,
          market: unplaced[0].market,
          selectionLabel: unplaced
            .map((s) => s.selectionLabel)
            .join('  •  '),
          americanOdds: decimalToAmerican(combinedDecimal),
          decimalOdds: combinedDecimal,
          wager: parlayWager,
          placedAt: now,
          status: 'pending',
          gameUrl: unplaced[0].gameUrl,
          target: {},
          isParlay: true,
          legs: unplaced.map((s) => ({ ...s })),
        };
        newlyPlaced = [parlay];
        return [...placedBets, parlay];
      }

      // Single mode: place each pending selection as its own bet.
      newlyPlaced = unplaced.map((s) => ({ ...s, placedAt: now, status: 'pending' as const }));
      return [...placedBets, ...newlyPlaced];
    });

    return newlyPlaced;
  }, [parlayMode, parlayWager]);

  const updateStatus = useCallback((id: string, status: BetStatus) => {
    setSelections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s)),
    );
  }, []);

  return {
    selections,
    pending,
    placed,
    addSelection,
    removeSelection,
    updateWager,
    isSelected,
    clearSlip,
    parlayMode,
    toggleParlay,
    parlayWager,
    setParlayWager,
    parlayDecimalOdds,
    parlayAmericanOdds,
    totalStake,
    placeBets,
    updateStatus,
  };
}
