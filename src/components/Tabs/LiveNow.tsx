import { AlertTriangle, RefreshCw, Radio } from 'lucide-react';
import type { BetMarket, BetTarget, LiveGame, OddsFormat, TimeFilter } from '../../types';
import type { SelectionInput } from '../../hooks/useBetSlip';
import { MatchCard } from '../Matches/MatchCard';
import { ComingSoon } from '../Matches/ComingSoon';
import { MatchCardSkeleton } from '../UI/Skeleton';

interface LiveNowProps {
  games: LiveGame[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  filter: TimeFilter;
  format: OddsFormat;
  addSelection: (input: SelectionInput) => void;
  isSelected: (gameId: string, market: BetMarket, target: BetTarget) => boolean;
}

const gridStyle = { gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' } as const;

export function LiveNow({
  games,
  loading,
  error,
  refetch,
  filter,
  format,
  addSelection,
  isSelected,
}: LiveNowProps) {
  const visible = filter === 'all' ? games : games.filter((g) => g.time_control === filter);

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="section-title" style={{ fontSize: '1.4rem' }}>Live Now</h2>
          <p className="text-muted" style={{ fontSize: '0.86rem' }}>
            Real-time chess markets from Lichess TV.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" style={{ padding: '8px 10px' }} onClick={refetch} aria-label="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3" style={gridStyle}>
          {Array.from({ length: 4 }).map((_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="state-panel">
          <span className="state-icon" style={{ color: 'var(--crimson)' }}>
            <AlertTriangle size={24} />
          </span>
          <h3 className="font-head" style={{ fontSize: '1.1rem' }}>Couldn't load live games</h3>
          <p className="text-muted" style={{ fontSize: '0.88rem', maxWidth: 360 }}>{error}</p>
          <button type="button" className="btn btn-primary" style={{ padding: '8px 18px', marginTop: 4 }} onClick={refetch}>
            <RefreshCw size={14} style={{ marginRight: 6 }} /> Retry
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="state-panel">
          <span className="state-icon">
            <Radio size={24} />
          </span>
          <h3 className="font-head" style={{ fontSize: '1.1rem' }}>
            {games.length === 0 ? 'No live games right now' : `No live ${filter} games`}
          </h3>
          <p className="text-muted" style={{ fontSize: '0.88rem', maxWidth: 380 }}>
            {games.length === 0
              ? 'Lichess TV has no standard games live at the moment. Markets will appear here automatically when play resumes.'
              : 'Try a different time control filter — other games are live now.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3" style={gridStyle}>
          {visible.map((game) => (
            <MatchCard
              key={game.game_id}
              game={game}
              format={format}
              addSelection={addSelection}
              isSelected={isSelected}
            />
          ))}
        </div>
      )}

      <ComingSoon />
    </div>
  );
}
