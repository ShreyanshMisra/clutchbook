// Mirrors the backend Pydantic schemas, plus client-only bet-slip types.

export type OddsFormat = 'american' | 'decimal';

export type TabKey = 'live' | 'upcoming' | 'mybets' | 'leaderboard';

export type TimeFilter = 'all' | 'bullet' | 'blitz' | 'rapid' | 'classical';

export type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'classical';

export type GamePhase = 'Opening' | 'Middlegame' | 'Endgame';

export interface PlayerOdds {
  american: number;
  decimal: number;
  implied_prob: number;
}

export interface MatchWinnerMarket {
  player_a: PlayerOdds; // white
  player_b: PlayerOdds; // black
}

export interface TotalMovesMarket {
  line: number;
  over_american: number;
  under_american: number;
  over_decimal: number;
  under_decimal: number;
}

export interface OutcomeOdds {
  american: number;
  decimal: number;
}

export interface ResultTypeMarket {
  checkmate: OutcomeOdds;
  resignation: OutcomeOdds;
  draw: OutcomeOdds;
}

export interface MatchMarkets {
  match_winner: MatchWinnerMarket;
  total_moves: TotalMovesMarket;
  result_type: ResultTypeMarket;
}

export interface LiveGame {
  game_id: string;
  game_url: string;
  time_control: TimeControl;
  speed: string;
  player_white: string;
  player_black: string;
  rating_white: number | null;
  rating_black: number | null;
  move_count: number | null;
  phase: GamePhase;
  status: string;
  markets: MatchMarkets;
}

export interface GameResult {
  game_id: string;
  status: string;
  winner: 'white' | 'black' | null;
  finished: boolean;
  move_count: number | null;
}

// ---- Bet slip (client-only) ----

export type BetMarket =
  | 'match_winner'
  | 'total_moves_over'
  | 'total_moves_under'
  | 'result_checkmate'
  | 'result_resignation'
  | 'result_draw';

export type BetStatus = 'pending' | 'won' | 'lost';

// Which concrete side of a market the user backed — used at settlement time.
export interface BetTarget {
  // For match_winner: the color the user backed.
  side?: 'white' | 'black';
  // For total_moves_*: the line, so we can compare against final move count.
  line?: number;
  // For result_*: the result outcome backed.
  result?: 'checkmate' | 'resignation' | 'draw';
}

export interface BetSelection {
  id: string; // uuid generated client-side
  gameId: string;
  gameLabel: string; // e.g. "Magnus vs Hikaru"
  market: BetMarket;
  selectionLabel: string; // e.g. "Magnus to win", "Over 44.5 moves"
  americanOdds: number;
  decimalOdds: number;
  wager: number;
  placedAt: Date | null; // null = in slip, Date = placed
  status: BetStatus;
  gameUrl: string;
  target: BetTarget;
  // Set on a placed parlay bet; holds the individual legs for settlement.
  isParlay?: boolean;
  legs?: BetSelection[];
}

export type ToastVariant = 'info' | 'success' | 'win' | 'loss';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}
