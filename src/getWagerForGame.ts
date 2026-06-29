import type { ContractContent } from './types/overlay';

// Seam for per-game wager content. Currently returns the same demo contract
// for all games. To add per-game branching, switch on `process` and return
// the appropriate content (CS2 round-win contract, Valorant ace contract, etc.).
const DEMO_CONTENT: ContractContent = {
  game:          'Chess',
  format:        'Rated Blitz 5+0',
  objective:     'Win your next rated blitz game',
  stake:         25,
  line:          1.85,
  payout:        46.25,
  fairLine:      2.0,
  houseEdgePct:  7.5,
  windowEndsAt:  Date.now() + 12 * 60 * 1000 + 34 * 1000, // 12:34 from now
  balance:       342.50,
};

export function getWagerForGame(_process: string): ContractContent {
  // TODO: branch by process name once per-game content is ready.
  return DEMO_CONTENT;
}
