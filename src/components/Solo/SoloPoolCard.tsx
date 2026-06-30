import { useState } from 'react';
import { Bot, Check, Trophy, Users, X } from 'lucide-react';
import type { SoloPool } from '../../types';
import { GameCard, GameTile, CardEyebrow, CardStats, RakeNote } from '../UI/GameCard';
import { formatCurrency } from '../../utils/format';
import { standardLabel } from '../../utils/soloText';
import { gameById } from '../../utils/games';

interface SoloPoolCardProps {
  pool: SoloPool;
  username: string | null;
  /** 'open' = joinable from the lobby; 'mine' = the player has entered. */
  mode: 'open' | 'mine';
  canJoin?: (entry: number) => boolean;
  onJoin?: (pool: SoloPool) => void;
  onSettle?: (pool: SoloPool, cleared: boolean) => void;
}

const STATUS_TONE: Record<string, string> = {
  CLEARED: 'var(--pos)',
  MISSED: 'var(--crimson)',
  REFUNDED: 'var(--text-muted)',
};

export function SoloPoolCard({ pool, username, mode, canJoin, onJoin, onSettle }: SoloPoolCardProps) {
  const [confirming, setConfirming] = useState(false);
  const game = gameById(pool.game);
  const entrants = pool.entrants.length;
  // What the whole post-rake pool is worth right now (the prize is split among
  // clearers at settlement, so this is the maximum a sole clearer would take).
  const maxPrize = pool.pool * (1 - pool.rake_pct);
  const allowed = canJoin ? canJoin(pool.entry_fee) : true;
  const mine = username ? pool.entrants.find((e) => e.player_id === username) : undefined;

  return (
    <GameCard>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GameTile gameId={pool.game} />
          <span className="font-head" style={{ fontWeight: 600 }}>{game?.name ?? pool.game}</span>
        </div>
        <span className="flex items-center gap-1 text-faint" style={{ fontSize: '0.74rem' }}>
          <Users size={12} /> {entrants}
        </span>
      </div>

      {/* Qualifying standard */}
      <div>
        <CardEyebrow>Qualifying standard</CardEyebrow>
        <div className="font-head" style={{ fontSize: '1.02rem', fontWeight: 600, lineHeight: 1.2, marginTop: 2 }}>
          {standardLabel(pool.metric_target)}
        </div>
      </div>

      {/* Pool economics + rake disclosure */}
      <CardStats stats={[
        { label: 'Entry', value: pool.entry_fee },
        { label: 'Pool', value: pool.pool },
        { label: 'Up to', value: maxPrize, tone: 'var(--lime)' },
      ]} />
      <RakeNote>
        Clearers split the pool ·{' '}
        <span className="text-muted">{Math.round(pool.rake_pct * 100)}% rake</span>
      </RakeNote>

      {/* Actions / status */}
      {mode === 'open' ? (
        confirming ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!allowed}
              style={{ flex: 1, justifyContent: 'center', gap: 8, padding: '11px' }}
              onClick={() => onJoin?.(pool)}
            >
              <Trophy size={16} /> Confirm · escrow {formatCurrency(pool.entry_fee)}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!allowed}
            style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '11px' }}
            onClick={() => setConfirming(true)}
          >
            <Trophy size={16} /> Join pool
          </button>
        )
      ) : pool.status === 'OPEN' ? (
        // Entered, not yet settled — demo: simulate the player's match result.
        <div className="flex flex-col gap-2">
          <span className="text-faint" style={{ fontSize: '0.72rem' }}>
            Submit your verified result — other entrants resolve automatically.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center', gap: 6, padding: '10px' }}
              onClick={() => onSettle?.(pool, true)}
            >
              <Check size={15} /> I cleared it
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1, justifyContent: 'center', gap: 6, padding: '10px' }}
              onClick={() => onSettle?.(pool, false)}
            >
              <X size={15} /> I missed
            </button>
          </div>
        </div>
      ) : (
        // Settled / canceled — show the player's outcome.
        <div
          className="surface"
          style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}
        >
          <div className="flex items-center justify-between">
            <span className="uppercase-head" style={{ fontSize: '0.66rem', fontWeight: 700, color: STATUS_TONE[mine?.status ?? ''] ?? 'var(--text-muted)' }}>
              {pool.status === 'CANCELED' ? 'Canceled · refunded' : (mine?.status ?? 'Settled')}
            </span>
            <span className="font-head tabular" style={{ fontWeight: 700, color: (mine?.payout ?? 0) >= pool.entry_fee ? 'var(--pos)' : 'var(--text-muted)' }}>
              {(mine?.payout ?? 0) > 0 ? `+${formatCurrency(mine?.payout ?? 0)}` : formatCurrency(0)}
            </span>
          </div>
          <span className="text-faint" style={{ fontSize: '0.72rem' }}>
            {pool.entrants.filter((e) => e.status === 'CLEARED').length} cleared ·{' '}
            rake {formatCurrency(pool.rake)} · pool {formatCurrency(pool.pool)}
          </span>
          {mine?.detail && (
            <span className="flex items-center gap-1 text-faint" style={{ fontSize: '0.7rem' }}>
              {mine.player_id.startsWith('bot_') && <Bot size={11} />}{mine.detail}
            </span>
          )}
        </div>
      )}
    </GameCard>
  );
}
