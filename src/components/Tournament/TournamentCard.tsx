import { useState } from 'react';
import { Bot, Crown, GitFork, Medal, Play, Trophy, Users } from 'lucide-react';
import type { BracketMatch, Tournament } from '../../types';
import { GameCard, GameTile, CardEyebrow, CardStats, RakeNote } from '../UI/GameCard';
import { formatCurrency } from '../../utils/format';
import { formatLabel, formatScore, prizeSplitLabel, rankingLabel, roundName } from '../../utils/tournamentText';
import { gameById } from '../../utils/games';

interface TournamentCardProps {
  tournament: Tournament;
  username: string | null;
  /** 'open' = joinable from the lobby; 'mine' = the player has entered. */
  mode: 'open' | 'mine';
  canJoin?: (entry: number) => boolean;
  onJoin?: (t: Tournament) => void;
  onSettle?: (t: Tournament) => void;
}

const RANK_TONE = (rank: number | null | undefined, paid: boolean): string =>
  rank === 1 ? 'var(--pos)' : paid ? 'var(--text)' : 'var(--text-muted)';

export function TournamentCard({ tournament: t, username, mode, canJoin, onJoin, onSettle }: TournamentCardProps) {
  const [confirming, setConfirming] = useState(false);
  const game = gameById(t.game);
  const entrants = t.entrants.length;
  const netPool = t.pool * (1 - t.rake_pct);
  const allowed = canJoin ? canJoin(t.entry_fee) : true;
  const mine = username ? t.entrants.find((e) => e.player_id === username) : undefined;
  const isBracket = t.format === 'single_elim';

  // Final standings (settled): rank order, top 6 shown.
  const standings = [...t.entrants]
    .filter((e) => e.rank != null)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .slice(0, 6);

  return (
    <GameCard>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GameTile gameId={t.game} />
          <div>
            <div className="font-head" style={{ fontWeight: 600, lineHeight: 1.1 }}>{t.name}</div>
            <div className="text-faint" style={{ fontSize: '0.7rem' }}>{game?.name ?? t.game}</div>
          </div>
        </div>
        <span className="flex items-center gap-1 text-faint" style={{ fontSize: '0.74rem' }}>
          <Users size={12} /> {entrants}/{t.max_entrants}
        </span>
      </div>

      {/* Format / ranking standard + prize split */}
      <div>
        <CardEyebrow>{isBracket ? 'Format' : 'Ranked by'}</CardEyebrow>
        <div className="font-head flex items-center gap-1" style={{ fontSize: '1.02rem', fontWeight: 600, lineHeight: 1.2, marginTop: 2 }}>
          {isBracket ? (
            <><GitFork size={15} /> {formatLabel(t.format)}</>
          ) : (
            <>{rankingLabel(t.ranking_metric)} {t.higher_is_better ? '(highest wins)' : '(lowest wins)'}</>
          )}
        </div>
        <div className="flex items-center gap-1 text-faint" style={{ fontSize: '0.72rem', marginTop: 4 }}>
          <Medal size={12} /> {prizeSplitLabel(t.prize_split)}
          {isBracket && ' · draws rematch'}
        </div>
      </div>

      {/* Pool economics + rake disclosure */}
      <CardStats stats={[
        { label: 'Entry', value: t.entry_fee },
        { label: 'Pool', value: t.pool },
        { label: 'Prizes', value: netPool, tone: 'var(--lime)' },
      ]} />
      <RakeNote>
        Top finishers split the pool ·{' '}
        <span className="text-muted">{Math.round(t.rake_pct * 100)}% rake</span>
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
              onClick={() => onJoin?.(t)}
            >
              <Trophy size={16} /> Confirm · escrow {formatCurrency(t.entry_fee)}
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
            <Trophy size={16} /> Enter tournament
          </button>
        )
      ) : t.status === 'OPEN' ? (
        // Entered, not yet settled — demo: simulate the whole field's runs.
        <div className="flex flex-col gap-2">
          <span className="text-faint" style={{ fontSize: '0.72rem' }}>
            Run the tournament — every entrant's verified result is ranked and the top finishers paid.
          </span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '11px' }}
            onClick={() => onSettle?.(t)}
          >
            <Play size={15} /> Play &amp; settle tournament
          </button>
        </div>
      ) : (
        // Settled / canceled — final standings + the player's outcome.
        <div className="surface" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="flex items-center justify-between">
            <span className="uppercase-head" style={{ fontSize: '0.66rem', fontWeight: 700, color: RANK_TONE(mine?.rank, mine?.status === 'PAID') }}>
              {t.status === 'CANCELED'
                ? 'Canceled · refunded'
                : mine
                  ? mine.status === 'REFUNDED'
                    ? 'Refunded'
                    : `You finished #${mine.rank}`
                  : 'Settled'}
            </span>
            <span className="font-head tabular" style={{ fontWeight: 700, color: (mine?.payout ?? 0) >= t.entry_fee ? 'var(--pos)' : 'var(--text-muted)' }}>
              {(mine?.payout ?? 0) > 0 ? `+${formatCurrency(mine?.payout ?? 0)}` : formatCurrency(0)}
            </span>
          </div>

          {standings.length > 0 && (
            <div className="flex flex-col gap-1" style={{ marginTop: 2 }}>
              {standings.map((e) => {
                const you = e.player_id === username;
                return (
                  <div key={e.player_id} className="flex items-center justify-between" style={{ fontSize: '0.72rem' }}>
                    <span className="flex items-center gap-1" style={{ color: you ? 'var(--text)' : 'var(--text-faint)' }}>
                      {e.rank === 1 ? <Crown size={11} color="var(--pos)" /> : <span className="tabular" style={{ width: 14, textAlign: 'right' }}>{e.rank}</span>}
                      {e.player_id.startsWith('bot_') && <Bot size={10} />}
                      {you ? 'You' : e.player_id.replace(/^bot_/, '')}
                      {!isBracket && e.score != null && <span className="text-faint">· {formatScore(t.ranking_metric, e.score)}</span>}
                    </span>
                    <span className="tabular" style={{ color: e.status === 'PAID' ? 'var(--pos)' : 'var(--text-faint)' }}>
                      {e.payout > 0 ? `+${formatCurrency(e.payout)}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {isBracket && t.rounds.length > 0 && <Bracket rounds={t.rounds} username={username} />}

          <span className="text-faint" style={{ fontSize: '0.7rem', marginTop: 2 }}>
            {t.entrants.filter((e) => e.status === 'PAID').length} paid · rake {formatCurrency(t.rake)} · pool {formatCurrency(t.pool)}
          </span>
        </div>
      )}
    </GameCard>
  );
}

const handle = (id: string | null | undefined, username: string | null): string => {
  if (!id) return '—';
  if (id === username) return 'You';
  return id.replace(/^bot_/, '');
};

/** Compact played-out single-elimination bracket, round by round. */
function Bracket({ rounds, username }: { rounds: BracketMatch[][]; username: string | null }) {
  return (
    <div className="flex flex-col gap-2" style={{ marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
      {rounds.map((matches, r) => (
        <div key={r} className="flex flex-col gap-1">
          <div className="text-faint uppercase-head" style={{ fontSize: '0.58rem' }}>{roundName(r, rounds.length)}</div>
          {matches.map((m) => {
            const youIn = m.player_a === username || m.player_b === username;
            return (
              <div
                key={m.slot}
                className="flex items-center justify-between"
                style={{ fontSize: '0.7rem', color: youIn ? 'var(--text)' : 'var(--text-faint)' }}
              >
                <span className="flex items-center gap-1" style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: m.winner === m.player_a ? 700 : 400, color: m.winner === m.player_a ? 'var(--pos)' : undefined }}>
                    {handle(m.player_a, username)}
                  </span>
                  <span className="text-faint">vs</span>
                  <span style={{ fontWeight: m.winner === m.player_b ? 700 : 400, color: m.winner === m.player_b ? 'var(--pos)' : undefined }}>
                    {handle(m.player_b, username)}
                  </span>
                </span>
                {m.detail && <span className="text-faint" style={{ flexShrink: 0 }}>{m.detail}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
