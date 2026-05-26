import type { BetSelection, BetStatus, GameResult } from '../types';

/**
 * Evaluate a single (non-parlay) selection against a game result.
 * Returns 'pending' until the game is finished.
 */
export function evaluateLeg(sel: BetSelection, result: GameResult): BetStatus {
  if (!result.finished) return 'pending';

  switch (sel.market) {
    case 'match_winner':
      return result.winner === sel.target.side ? 'won' : 'lost';

    case 'total_moves_over': {
      const line = sel.target.line ?? 0;
      const mc = result.move_count ?? 0;
      return mc > line ? 'won' : 'lost';
    }
    case 'total_moves_under': {
      const line = sel.target.line ?? 0;
      const mc = result.move_count ?? 0;
      return mc < line ? 'won' : 'lost';
    }

    case 'result_checkmate':
      return result.status === 'mate' ? 'won' : 'lost';
    case 'result_resignation':
      return result.status === 'resign' ? 'won' : 'lost';
    case 'result_draw':
      // Draw-like finishes carry no winner (draw agreement / stalemate).
      return result.winner === null &&
        (result.status === 'draw' || result.status === 'stalemate')
        ? 'won'
        : 'lost';

    default:
      return 'pending';
  }
}

/**
 * Evaluate a parlay (multi-leg) bet given results keyed by gameId.
 * Pending until every leg's game finishes; lost if any leg loses; won only
 * if all legs win.
 */
export function evaluateParlay(
  bet: BetSelection,
  resultsByGame: Map<string, GameResult>,
): BetStatus {
  const legs = bet.legs ?? [];
  if (legs.length === 0) return bet.status;

  let allWon = true;
  for (const leg of legs) {
    const result = resultsByGame.get(leg.gameId);
    if (!result) return 'pending'; // missing data -> still pending
    const legStatus = evaluateLeg(leg, result);
    if (legStatus === 'lost') return 'lost'; // one miss kills the parlay
    if (legStatus !== 'won') allWon = false;
  }
  return allWon ? 'won' : 'pending';
}
