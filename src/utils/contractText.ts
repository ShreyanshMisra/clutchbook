import type { Contract, Objective } from '../types';

/** One-line plain-English description of what the objective requires. */
export function objectiveDetail(o: Objective): string {
  switch (o.kind) {
    case 'win_game':
      return 'Win your next qualifying rated game.';
    case 'win_under_moves':
      return `Win your next rated game in under ${o.moves} moves.`;
    case 'win_series':
      return `Win at least ${o.series_wins} of your next ${o.games} rated games.`;
    case 'performance_line':
      if (o.metric === 'avg_moves') {
        return `Average game length ${o.side} ${o.line} moves across your next ${o.games} games.`;
      }
      return `Win rate ${o.side} ${Math.round((o.line ?? 0) * 100)}% across your next ${o.games} games.`;
    default:
      return '';
  }
}

export function windowLabel(hours: number): string {
  if (hours % 24 === 0) {
    const d = hours / 24;
    return `${d} day${d > 1 ? 's' : ''}`;
  }
  return `${hours}h`;
}

/** Remaining time on a contract window, e.g. "3h 12m left" / "Expired". */
export function timeLeftLabel(activatedAt: number, windowHours: number, now: number): string {
  const end = activatedAt + windowHours * 3_600_000;
  const ms = end - now;
  if (ms <= 0) return 'Window closed';
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export const speedVariant = (speed: string): string => speed;

export function outcomeBadge(c: Contract): { variant: string; label: string } {
  if (c.outcome === 'won') return { variant: 'won', label: 'Won' };
  if (c.outcome === 'lost') return { variant: 'lost', label: 'Lost' };
  if (c.outcome === 'refunded') return { variant: 'phase', label: 'Refunded' };
  if (c.state === 'RESOLVING') return { variant: 'pending', label: 'Resolving' };
  return { variant: 'pending', label: 'Active' };
}
