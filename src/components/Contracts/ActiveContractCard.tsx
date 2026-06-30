import { useState } from 'react';
import { Bot, Clock, ExternalLink, Eye, EyeOff, Swords } from 'lucide-react';
import type { Contract } from '../../types';
import { Badge } from '../UI/Badge';
import { SpectatorPanel } from './SpectatorPanel';
import { MatchTrackerPanel } from './MatchTrackerPanel';
import { formatCurrency } from '../../utils/format';
import { objectiveDetail, outcomeBadge, timeLeftLabel } from '../../utils/contractText';

// Games with a live match tracker (CS2/Dota: summary; chess uses the board panel).
const TRACKABLE = new Set(['chess.lichess', 'cs2.faceit', 'dota2.opendota']);

interface ActiveContractCardProps {
  contract: Contract;
  now: number;
  username: string | null;
}

// Deep links to start a qualifying game. Chess pairs on Lichess; other titles
// fall back to their own client (added as those games go live).
const CHESS_PLAY_URL: Record<string, string> = {
  bullet: 'https://lichess.org/?time=1+0#hook',
  blitz: 'https://lichess.org/?time=5+0#hook',
  rapid: 'https://lichess.org/?time=10+0#hook',
  classical: 'https://lichess.org/?time=30+0#hook',
};

export function ActiveContractCard({ contract, now, username }: ActiveContractCardProps) {
  const [watching, setWatching] = useState(false);
  const badge = outcomeBadge(contract);
  const isChess = contract.game === 'chess.lichess';
  const playUrl = isChess ? (CHESS_PLAY_URL[contract.speed] ?? 'https://lichess.org') : null;
  const { opponent } = contract;
  // The account this contract settles against (per-game), for live tracking.
  const watchAccount = contract.account_id ?? username;
  const canWatch = TRACKABLE.has(contract.game) && !!watchAccount;

  return (
    <div className="surface-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={contract.speed}>{contract.speed}</Badge>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <span className="text-faint flex items-center gap-1" style={{ fontSize: '0.72rem' }}>
          <Clock size={12} />
          {contract.matched_at != null
            ? timeLeftLabel(contract.matched_at, contract.window_hours, now)
            : ''}
        </span>
      </div>

      <div>
        <h3 className="font-head" style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.15 }}>
          {contract.title}
        </h3>
        <p className="text-muted flex items-center gap-2" style={{ fontSize: '0.82rem', marginTop: 3 }}>
          {opponent.is_bot && <Bot size={13} />}
          vs {opponent.display_name} · {opponent.rating}
        </p>
      </div>

      <p className="text-faint" style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
        {objectiveDetail(contract.objective, opponent.display_name)}
      </p>

      {contract.progress && (
        <div
          className="surface"
          style={{ padding: '8px 10px', fontSize: '0.82rem', color: 'var(--text-muted)' }}
        >
          {contract.progress}
        </div>
      )}

      <div className="flex items-center justify-between" style={{ fontSize: '0.82rem' }}>
        <span className="text-faint">
          Entry <span className="text-muted tabular">{formatCurrency(contract.entry)}</span>
        </span>
        <span className="text-faint">
          Win to take <span className="text-pos tabular">{formatCurrency(contract.prize)}</span>
        </span>
      </div>

      {playUrl ? (
        <a
          href={playUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '10px', textDecoration: 'none' }}
        >
          <Swords size={15} /> Go play <ExternalLink size={13} />
        </a>
      ) : (
        <div className="btn" style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '10px', cursor: 'default' }}>
          <Swords size={15} /> Play a qualifying game
        </div>
      )}

      {canWatch && (
        <>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '8px', fontSize: '0.8rem' }}
            onClick={() => setWatching((w) => !w)}
          >
            {watching ? <><EyeOff size={14} /> Hide live game</> : <><Eye size={14} /> Watch live game</>}
          </button>
          {isChess ? (
            <SpectatorPanel username={watchAccount} open={watching} />
          ) : (
            <MatchTrackerPanel game={contract.game} username={watchAccount} open={watching} />
          )}
        </>
      )}
    </div>
  );
}
