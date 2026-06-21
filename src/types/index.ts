// Mirrors the backend Pydantic schemas (api/_lib/schemas.py), plus a few
// client-only view types. Contests and the wallet live in localStorage in the
// demo; their shapes match what the production DB will store.

export type TabKey =
  | 'h2h'
  | 'solo'
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

// ---- Algorithmic Solo Challenges (pooled tournaments) ----
// Mirrors api/_lib/schemas.py. Prize comes from the entrants' pool, never the
// house; clearers of a qualifying standard split the pool minus rake.

export type SoloGame =
  | 'rocketleague.psyonix'
  | 'clashroyale.supercell'
  | 'chess.lichess';

export type MetricKind =
  | 'rl_aerial_accuracy_pct'
  | 'rl_match_score'
  | 'cr_crown_tower_damage'
  | 'chess_accuracy_pct';

export type Comparator = 'gte' | 'lte';

export interface MetricTarget {
  metric: MetricKind;
  comparator: Comparator;
  threshold: number;
  secondary_metric?: string | null;
  secondary_comparator?: Comparator | null;
  secondary_threshold?: number | null;
}

export type SoloEntryStatus =
  | 'LOCKED'
  | 'CLEARED'
  | 'MISSED'
  | 'REFUNDED'
  | 'BLOCKED_REGION';

export type SoloPoolStatus = 'OPEN' | 'SETTLED' | 'CANCELED';

export interface SoloEntry {
  player_id: string;
  state: string;
  status: SoloEntryStatus;
  cleared?: boolean | null;
  payout: number;
  detail?: string | null;
}

export interface SoloPool {
  id: string;
  game: SoloGame;
  metric_target: MetricTarget;
  entry_fee: number;
  rake_pct: number;
  min_entrants: number;
  entrants: SoloEntry[];
  pool: number;
  rake: number;
  prize_pool: number;
  status: SoloPoolStatus;
  created_at: number | null;
  resolved_at: number | null;
}

export interface TelemetrySample {
  game: SoloGame;
  metrics: Record<string, number>;
}

export interface SoloLobbyResponse {
  pools: SoloPool[];
}

// ---- Toasts (client-only) ----

export type ToastVariant = 'info' | 'success' | 'win' | 'loss';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}
