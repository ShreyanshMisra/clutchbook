import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Bot, Link2, RefreshCw, Trophy } from 'lucide-react';
import type { Contract, LeaderboardEntry, SkillProfile, SoloPool, Tournament } from '../../types';
import { fetchLeaderboard } from '../../utils/apiClient';
import { computePlayerStats } from '../../utils/playerStats';
import { formatCurrency } from '../../utils/format';

interface LeaderboardProps {
  profile: SkillProfile | null;
  settledContracts: Contract[];
  tournaments: Tournament[];
  soloPools: SoloPool[];
  onGoLink: () => void;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const roiPct = (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n * 100)}%`;

export function Leaderboard({ profile, settledContracts, tournaments, soloPools, onGoLink }: LeaderboardProps) {
  const [bots, setBots] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    setError(null);
    fetchLeaderboard()
      .then((res) => setBots(res.entries))
      .catch((err: Error) => setError(err.message || 'Failed to load the leaderboard'))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  // Merge the signed-in user's own demo record into the seeded field, re-rank by
  // ROI (never raw $). The user only appears once they've played a graded contest.
  const rows = useMemo<LeaderboardEntry[]>(() => {
    const username = profile?.username ?? null;
    const me = computePlayerStats({ username, contracts: settledContracts, tournaments, soloPools });
    const merged: LeaderboardEntry[] = [...bots];
    if (username && me.contests > 0) {
      merged.push({
        player_id: username,
        display_name: profile?.display_name ?? username,
        is_bot: false,
        contests: me.contests,
        wins: me.wins,
        win_rate: me.winRate,
        staked: me.staked,
        net: me.net,
        roi: me.roi,
      });
    }
    return merged.sort((a, b) => b.roi - a.roi);
  }, [bots, profile, settledContracts, tournaments, soloPools]);

  const myId = profile?.username ?? null;

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="section-title">Leaderboard</h2>
          <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
            Ranked by ROI and record — not raw dollars won. Skill, not bankroll, tops the board.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" style={{ gap: 8, fontSize: '0.82rem' }} onClick={refresh}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {!profile && (
        <div className="state-panel" style={{ marginBottom: 14 }}>
          <div className="state-icon"><Link2 size={22} /></div>
          <span className="text-muted">Link your account and play a contest to join the board.</span>
          <button type="button" className="btn btn-primary" style={{ gap: 8 }} onClick={onGoLink}>
            <Link2 size={15} /> Link account
          </button>
        </div>
      )}

      {error && (
        <div className="state-panel" style={{ marginBottom: 14 }}>
          <span className="text-crimson">{error}</span>
          <button type="button" className="btn" onClick={refresh}>Retry</button>
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="skeleton" style={{ height: 320 }} />
      ) : (
        <div className="surface" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th>Player</th>
                <th style={{ textAlign: 'right' }}>Contests</th>
                <th style={{ textAlign: 'right' }}>Record</th>
                <th style={{ textAlign: 'right' }}>Win rate</th>
                <th style={{ textAlign: 'right' }}>ROI</th>
                <th style={{ textAlign: 'right' }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => {
                const you = e.player_id === myId && !e.is_bot;
                return (
                  <tr key={e.player_id} style={you ? { background: 'var(--surface-2, rgba(124,108,240,0.10))' } : undefined}>
                    <td className="num">
                      {i === 0 ? <Trophy size={15} color="var(--pos)" /> : i + 1}
                    </td>
                    <td>
                      <span className="flex items-center gap-1 font-head" style={{ fontWeight: you ? 700 : 600 }}>
                        {e.is_bot && <Bot size={12} />}
                        {you ? 'You' : e.display_name}
                      </span>
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>{e.contests}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{e.wins}-{e.contests - e.wins}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{pct(e.win_rate)}</td>
                    <td
                      className="num"
                      style={{ textAlign: 'right', fontWeight: 700, color: e.roi >= 0 ? 'var(--pos)' : 'var(--crimson)' }}
                    >
                      {roiPct(e.roi)}
                    </td>
                    <td className="num" style={{ textAlign: 'right', color: e.net >= 0 ? 'var(--pos)' : 'var(--crimson)' }}>
                      {e.net >= 0 ? '+' : ''}{formatCurrency(e.net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex items-center gap-2 text-faint" style={{ fontSize: '0.74rem', marginTop: 10 }}>
        <BarChart3 size={13} /> Standings update as your contests settle.
      </p>
    </div>
  );
}
