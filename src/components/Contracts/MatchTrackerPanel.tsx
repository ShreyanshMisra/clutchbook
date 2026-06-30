import { ExternalLink, Radio } from 'lucide-react';
import { useTrack } from '../../hooks/useTrack';

interface MatchTrackerPanelProps {
  game: string;
  username: string | null;
  open: boolean;
}

/** Compact tracker for the player's current / most-recent CS2 or Dota match. */
export function MatchTrackerPanel({ game, username, open }: MatchTrackerPanelProps) {
  const { state, loading, error } = useTrack(game, username, open);

  if (!open) return null;
  if (error) {
    return <div className="surface" style={{ padding: '10px 12px', fontSize: '0.78rem', color: 'var(--crimson)' }}>{error}</div>;
  }
  if (!state && loading) {
    return <div className="skeleton" style={{ height: 110 }} />;
  }
  if (!state || !state.available) {
    return (
      <div className="surface" style={{ padding: '10px 12px', fontSize: '0.78rem', color: 'var(--text-faint)' }}>
        {state?.message ?? 'No match to track right now.'}
      </div>
    );
  }

  const live = state.status === 'Live';
  const resultColor = state.result === 'won' ? 'var(--pos)' : state.result === 'lost' ? 'var(--crimson)' : 'var(--text)';

  return (
    <div className="surface" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 uppercase-head" style={{ fontSize: '0.62rem', color: live ? 'var(--pos)' : 'var(--text-faint)' }}>
          <Radio size={12} /> {state.status ?? 'Match'}
        </span>
        {state.url && (
          <a href={state.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-faint" style={{ fontSize: '0.72rem', textDecoration: 'none' }}>
            Open match <ExternalLink size={11} />
          </a>
        )}
      </div>

      <div>
        <div className="font-head" style={{ fontSize: '1.25rem', fontWeight: 700, color: resultColor, lineHeight: 1.1 }}>
          {state.headline}
        </div>
        {state.subtitle && <div className="text-faint" style={{ fontSize: '0.78rem', marginTop: 2 }}>{state.subtitle}</div>}
      </div>

      {state.stats.length > 0 && (
        <div className="flex flex-wrap" style={{ gap: '6px 18px' }}>
          {state.stats.map((s) => (
            <div key={s.label}>
              <div className="text-faint uppercase-head" style={{ fontSize: '0.58rem' }}>{s.label}</div>
              <div className="font-head tabular" style={{ fontSize: '0.92rem', fontWeight: 600 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
