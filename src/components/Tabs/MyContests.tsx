import { Bot, Receipt, Users } from 'lucide-react';
import type { Contract } from '../../types';
import { Badge } from '../UI/Badge';
import { formatCurrency } from '../../utils/format';
import { outcomeBadge } from '../../utils/contractText';
import { computeOpponentRecords } from '../../utils/playerStats';

interface MyContestsProps {
  settled: Contract[];
}

/** Net profit/loss a settled contest realized. */
function pnl(c: Contract): number {
  if (c.outcome === 'won') return c.prize - c.entry;
  if (c.outcome === 'lost') return -c.entry;
  return 0; // refunded
}

export function MyContests({ settled }: MyContestsProps) {
  const totalPnl = settled.reduce((sum, c) => sum + pnl(c), 0);
  const wins = settled.filter((c) => c.outcome === 'won').length;
  const graded = settled.filter((c) => c.outcome !== 'refunded').length;
  const winRate = graded > 0 ? Math.round((wins / graded) * 100) : 0;
  const opponents = computeOpponentRecords(settled);

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="section-title">My Contests</h2>
          <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
            Settled and canceled head-to-head matches with receipts.
          </p>
        </div>
        {settled.length > 0 && (
          <div className="flex items-center gap-4">
            <Stat label="Record" value={`${wins}/${graded}`} />
            <Stat label="Win rate" value={`${winRate}%`} />
            <Stat
              label="Net P&L"
              value={`${totalPnl >= 0 ? '+' : ''}${formatCurrency(totalPnl)}`}
              color={totalPnl >= 0 ? 'var(--pos)' : 'var(--crimson)'}
            />
          </div>
        )}
      </div>

      {opponents.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 className="section-title flex items-center gap-2" style={{ marginBottom: 10 }}>
            <Users size={15} /> Head-to-head by opponent
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', gap: 12 }}>
            {opponents.map((o) => (
              <div key={o.name} className="surface-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-head" style={{ fontWeight: 600 }}>
                    {o.isBot && <Bot size={12} />}{o.name}
                  </span>
                  <span className="text-faint tabular" style={{ fontSize: '0.74rem' }}>{o.rating}</span>
                </div>
                <div className="flex items-center justify-between" style={{ fontSize: '0.8rem' }}>
                  <span className="text-faint">Record <span className="text-muted tabular">{o.wins}-{o.losses}</span></span>
                  <span className="tabular" style={{ fontWeight: 700, color: o.net > 0 ? 'var(--pos)' : o.net < 0 ? 'var(--crimson)' : 'var(--text-muted)' }}>
                    {o.net > 0 ? '+' : ''}{formatCurrency(o.net)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {settled.length === 0 ? (
        <div className="state-panel">
          <div className="state-icon"><Receipt size={22} /></div>
          <span className="text-muted">No settled matches yet.</span>
        </div>
      ) : (
        <div className="surface" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Opponent</th>
                <th>Outcome</th>
                <th style={{ textAlign: 'right' }}>Entry</th>
                <th style={{ textAlign: 'right' }}>P&amp;L</th>
                <th style={{ textAlign: 'right' }}>Settled</th>
              </tr>
            </thead>
            <tbody>
              {settled
                .slice()
                .sort((a, b) => (b.resolved_at ?? 0) - (a.resolved_at ?? 0))
                .map((c) => {
                  const p = pnl(c);
                  const badge = outcomeBadge(c);
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="font-head" style={{ fontWeight: 600 }}>{c.title}</div>
                        <span className="text-faint" style={{ fontSize: '0.74rem' }}>{c.format}</span>
                      </td>
                      <td className="text-muted" style={{ fontSize: '0.82rem' }}>
                        {c.opponent.display_name} · {c.opponent.rating}
                      </td>
                      <td><Badge variant={badge.variant}>{badge.label}</Badge></td>
                      <td className="num" style={{ textAlign: 'right' }}>{formatCurrency(c.entry)}</td>
                      <td
                        className="num"
                        style={{ textAlign: 'right', color: p > 0 ? 'var(--pos)' : p < 0 ? 'var(--crimson)' : 'var(--text-muted)' }}
                      >
                        {p > 0 ? '+' : ''}{formatCurrency(p)}
                      </td>
                      <td className="num text-faint" style={{ textAlign: 'right' }}>
                        {c.resolved_at ? new Date(c.resolved_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div className="text-faint uppercase-head" style={{ fontSize: '0.6rem' }}>{label}</div>
      <div className="font-head tabular" style={{ fontSize: '1.15rem', fontWeight: 700, color: color ?? 'var(--text)' }}>
        {value}
      </div>
    </div>
  );
}
