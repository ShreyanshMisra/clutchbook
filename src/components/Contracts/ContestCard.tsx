import { useState } from 'react';
import { Bot, Info, Swords, Users } from 'lucide-react';
import type { Contract } from '../../types';
import { Badge } from '../UI/Badge';
import { formatCurrency } from '../../utils/format';
import { objectiveDetail, matchQualityTone, windowLabel } from '../../utils/contractText';

interface ContestCardProps {
  contest: Contract;
  canJoin: (entry: number) => boolean;
  onJoin: (contest: Contract) => void;
}

/**
 * A single OPEN head-to-head contest. Clicking "Join" reveals the match
 * confirmation (opponent, pot, prize, rake) — the confirmation handshake from
 * roadmap §1.4 — and confirming escrows the entry.
 */
export function ContestCard({ contest, canJoin, onJoin }: ContestCardProps) {
  const [confirming, setConfirming] = useState(false);
  const { opponent, bracket } = contest;
  const allowed = canJoin(contest.entry);

  return (
    <div className="surface-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={contest.speed}>{contest.speed}</Badge>
          <span className="text-faint uppercase-head" style={{ fontSize: '0.66rem' }}>
            {windowLabel(contest.window_hours)} window
          </span>
        </div>
        <div className="font-head" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--lime)', lineHeight: 1 }}>
          {formatCurrency(contest.prize)}
        </div>
      </div>

      {/* Objective */}
      <div>
        <h3 className="font-head" style={{ fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.15 }}>
          {contest.title}
        </h3>
        <p className="text-muted" style={{ fontSize: '0.84rem', marginTop: 4, lineHeight: 1.4 }}>
          {objectiveDetail(contest.objective)}
        </p>
      </div>

      {/* Opponent + matchmaking quality */}
      <div
        className="flex items-center justify-between gap-2"
        style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 0' }}
      >
        <span className="flex items-center gap-2 text-muted" style={{ fontSize: '0.8rem' }}>
          {opponent.is_bot ? <Bot size={14} /> : <Users size={14} />}
          {opponent.display_name} · {opponent.rating}
        </span>
        <span
          className="uppercase-head"
          style={{ fontSize: '0.62rem', fontWeight: 600, color: matchQualityTone(bracket.match_quality) }}
        >
          {bracket.label}
        </span>
      </div>

      {/* Pot / entry / rake disclosure (required on every contest) */}
      <div className="flex items-center justify-between" style={{ fontSize: '0.82rem' }}>
        <span className="text-faint">
          Entry <span className="text-muted tabular">{formatCurrency(contest.entry)}</span>
        </span>
        <span className="text-faint">
          Pot <span className="text-muted tabular">{formatCurrency(contest.pot)}</span>
        </span>
      </div>
      <div className="flex items-center gap-2 text-faint" style={{ fontSize: '0.72rem' }}>
        <Info size={13} style={{ flexShrink: 0 }} />
        <span>
          Win to take {formatCurrency(contest.prize)} ·{' '}
          <span className="text-muted">{Math.round(contest.rake_pct * 100)}% rake</span> ({formatCurrency(contest.rake)})
        </span>
      </div>

      {/* Join → confirm handshake */}
      {confirming ? (
        <div className="flex flex-col gap-2">
          <span className="text-muted" style={{ fontSize: '0.78rem' }}>
            Match found vs <span className="text-pos">{opponent.display_name}</span>. Confirm to escrow{' '}
            {formatCurrency(contest.entry)}.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!allowed}
              style={{ flex: 1, justifyContent: 'center', gap: 8, padding: '11px' }}
              onClick={() => onJoin(contest)}
            >
              <Swords size={16} /> Confirm match
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
              Decline
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          disabled={!allowed}
          style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '11px' }}
          onClick={() => setConfirming(true)}
        >
          <Swords size={16} /> Join match
        </button>
      )}
    </div>
  );
}
