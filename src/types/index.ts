// Mirrors the backend Pydantic schemas (api/_lib/schemas.py), plus a few
// client-only view types. Contests and the wallet live in localStorage in the
// demo; their shapes match what the production DB will store.

export type TabKey =
  | 'lobby'
  | 'link'
  | 'active'
  | 'history'
  | 'profile'
  | 'responsible';

export type Speed = 'bullet' | 'blitz' | 'rapid' | 'classical';
export type LinkMethod = 'oauth' | 'username';

// ---- Identity / profile ----

export interface FormatStat {
  speed: Speed;
  rating: number;
  games: number;
  provisional: boolean;
}

export interface SkillProfile {
  username: string;
  display_name: string;
  url: string;
  link_method: LinkMethod;
  account_age_days: number | null;
  win_rate: number;
  draw_rate: number;
  total_games: number;
  formats: FormatStat[];
  primary_speed: Speed;
}

// ---- Objectives ----

export type ObjectiveKind = 'win_h2h' | 'win_under_moves';

export interface Objective {
  kind: ObjectiveKind;
  moves?: number | null;
}

// ---- Matchmaking ----

export interface Bracket {
  your_rating: number;
  band_low: number;
  band_high: number;
  match_quality: number; // 0..1, 1.0 == dead-even
  label: string;
}

export interface Opponent {
  username: string;
  display_name: string;
  rating: number;
  is_bot: boolean;
}

// ---- Contests ----

export type ContractState =
  | 'OPEN'
  | 'MATCHED'
  | 'ACTIVE'
  | 'RESOLVING'
  | 'SETTLED'
  | 'CANCELED';

export type ContractOutcome = 'won' | 'lost' | 'refunded';
export type Winner = 'you' | 'opponent';

export interface ContractDraft {
  game: string;
  speed: Speed;
  format: string;
  objective: Objective;
  window_hours: number;
  entry: number;
}

export interface Contract {
  id: string;
  game: string;
  speed: Speed;
  format: string;
  title: string;
  objective: Objective;
  window_hours: number;

  // Money (escrow + rake).
  entry: number;
  entrants: number;
  rake_pct: number;
  pot: number;
  prize: number;
  rake: number;

  // Matchmaking.
  bracket: Bracket;
  opponent: Opponent;

  state: ContractState;
  matched_at: number | null; // epoch ms
  resolved_at: number | null; // epoch ms
  qualifying_game_ids: string[];
  progress: string | null;
  winner: Winner | null;
  outcome: ContractOutcome | null;
}

export interface LobbyResponse {
  profile: SkillProfile;
  contests: Contract[];
}

export interface SettleResult {
  id: string;
  state: ContractState;
  outcome: ContractOutcome | null;
  winner: Winner | null;
  qualifying_game_ids: string[];
  progress: string | null;
  resolved_at: number | null;
  payout: number;
}

export interface SettleResponse {
  results: SettleResult[];
}

// ---- Toasts (client-only) ----

export type ToastVariant = 'info' | 'success' | 'win' | 'loss';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}
