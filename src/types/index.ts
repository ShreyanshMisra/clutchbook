// Mirrors the backend Pydantic schemas (api/_lib/schemas.py), plus a few
// client-only view types. Contracts and the wallet live in localStorage in the
// demo; their shapes match what the production DB will store.

export type OddsFormat = 'decimal' | 'american';

export type TabKey =
  | 'catalog'
  | 'builder'
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

export type ObjectiveKind =
  | 'win_game'
  | 'win_under_moves'
  | 'win_series'
  | 'performance_line';

export type PerfMetric = 'win_rate' | 'avg_moves';

export interface Objective {
  kind: ObjectiveKind;
  games: number;
  moves?: number | null;
  series_wins?: number | null;
  metric?: PerfMetric | null;
  side?: 'over' | 'under' | null;
  line?: number | null;
}

// ---- Pricing ----

export interface Line {
  decimal: number;
  american: number;
  implied_prob: number;
  fair_decimal: number;
  fair_prob: number;
  house_edge_pct: number;
}

// ---- Contracts ----

export type ContractState =
  | 'OFFERED'
  | 'ACTIVE'
  | 'RESOLVING'
  | 'SETTLED'
  | 'EXPIRED';

export type ContractOutcome = 'won' | 'lost' | 'refunded';

export interface ContractDraft {
  game: string;
  speed: Speed;
  format: string;
  objective: Objective;
  window_hours: number;
  stake: number;
}

export interface Contract {
  id: string;
  game: string;
  speed: Speed;
  format: string;
  title: string;
  objective: Objective;
  window_hours: number;
  line: Line;
  stake: number;
  projected_payout: number;
  state: ContractState;
  activated_at: number | null; // epoch ms
  resolved_at: number | null; // epoch ms
  qualifying_game_ids: string[];
  progress: string | null;
  outcome: ContractOutcome | null;
}

export interface CatalogResponse {
  profile: SkillProfile;
  contracts: Contract[];
}

export interface SettleResult {
  id: string;
  state: ContractState;
  outcome: ContractOutcome | null;
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
