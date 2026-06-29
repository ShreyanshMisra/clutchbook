import { Circle, ExternalLink, Radio } from 'lucide-react';
import { useSpectate } from '../../hooks/useSpectate';
import type { SpectatePlayer } from '../../types';

interface SpectatorPanelProps {
  username: string | null;
  open: boolean;
}

const clock = (s: number | null | undefined): string => {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

/** Pairs SAN plies into numbered moves: ["e4","e5","Nf3"] → "1. e4 e5  2. Nf3". */
function movePairs(moves: string[]): { no: number; white: string; black?: string }[] {
  const out: { no: number; white: string; black?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    out.push({ no: i / 2 + 1, white: moves[i], black: moves[i + 1] });
  }
  return out;
}

export function SpectatorPanel({ username, open }: SpectatorPanelProps) {
  const { state, loading, error } = useSpectate(username, open);

  if (!open) return null;

  if (error) {
    return <div className="surface" style={{ padding: '10px 12px', fontSize: '0.78rem', color: 'var(--crimson)' }}>{error}</div>;
  }
  if (!state && loading) {
    return <div className="skeleton" style={{ height: 120 }} />;
  }
  if (!state || !state.available) {
    return (
      <div className="surface" style={{ padding: '10px 12px', fontSize: '0.78rem', color: 'var(--text-faint)' }}>
        {state?.message ?? 'No live game right now — start one on Lichess to watch it here.'}
      </div>
    );
  }

  const pairs = movePairs(state.moves);
  const result = state.finished
    ? state.winner
      ? `${state.winner === 'white' ? state.white?.name : state.black?.name} won`
      : 'Game drawn'
    : null;

  return (
    <div className="surface" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 uppercase-head" style={{ fontSize: '0.62rem', color: state.finished ? 'var(--text-faint)' : 'var(--pos)' }}>
          <Radio size={12} /> {state.finished ? 'Final' : 'Live'}{state.speed ? ` · ${state.speed}` : ''}
        </span>
        {state.url && (
          <a href={state.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-faint" style={{ fontSize: '0.72rem', textDecoration: 'none' }}>
            Open on Lichess <ExternalLink size={11} />
          </a>
        )}
      </div>

      <PlayerRow player={state.white} color="white" clockStr={clock(state.white_clock)} toMove={!state.finished && state.turn === 'white'} />
      <PlayerRow player={state.black} color="black" clockStr={clock(state.black_clock)} toMove={!state.finished && state.turn === 'black'} />

      {result && <div className="text-pos" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{result}</div>}

      <div>
        <div className="text-faint uppercase-head" style={{ fontSize: '0.58rem', marginBottom: 4 }}>
          Moves ({state.moves.length})
        </div>
        {pairs.length === 0 ? (
          <span className="text-faint" style={{ fontSize: '0.76rem' }}>No moves yet.</span>
        ) : (
          <div
            className="tabular"
            style={{ fontSize: '0.78rem', maxHeight: 120, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '2px 8px', lineHeight: 1.6 }}
          >
            {pairs.map((p) => (
              <span key={p.no} className="text-muted">
                <span className="text-faint">{p.no}.</span> {p.white}{p.black ? ` ${p.black}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerRow({ player, color, clockStr, toMove }: { player?: SpectatePlayer | null; color: 'white' | 'black'; clockStr: string; toMove: boolean }) {
  return (
    <div className="flex items-center justify-between" style={{ fontSize: '0.82rem' }}>
      <span className="flex items-center gap-2">
        <Circle size={10} fill={color === 'white' ? '#e8e8ea' : '#16171c'} color="var(--border)" />
        <span style={{ fontWeight: toMove ? 700 : 500 }}>{player?.name ?? '—'}</span>
        {player?.rating != null && <span className="text-faint">{player.rating}</span>}
        {toMove && <span className="text-pos" style={{ fontSize: '0.66rem' }}>to move</span>}
      </span>
      <span className="tabular text-muted">{clockStr}</span>
    </div>
  );
}
