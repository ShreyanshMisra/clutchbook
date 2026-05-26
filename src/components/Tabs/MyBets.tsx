import { Receipt } from 'lucide-react';
import type { BetSelection, OddsFormat } from '../../types';
import { Badge } from '../UI/Badge';
import { formatCurrency, formatOdds } from '../../utils/oddsFormatter';

interface MyBetsProps {
  placed: BetSelection[];
  format: OddsFormat;
}

const STATUS_LABEL = { pending: 'Pending', won: 'Won', lost: 'Lost' } as const;
const STATUS_ORDER = { pending: 0, won: 1, lost: 2 } as const;

export function MyBets({ placed, format }: MyBetsProps) {
  const sorted = [...placed].sort((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (s !== 0) return s;
    return (b.placedAt?.getTime() ?? 0) - (a.placedAt?.getTime() ?? 0);
  });

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ fontSize: '1.4rem' }}>My Bets</h2>
        <p className="text-muted" style={{ fontSize: '0.86rem' }}>
          Placed wagers settle automatically as games finish.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="state-panel">
          <span className="state-icon">
            <Receipt size={24} />
          </span>
          <h3 className="font-head" style={{ fontSize: '1.1rem' }}>No bets placed yet</h3>
          <p className="text-muted" style={{ fontSize: '0.88rem', maxWidth: 360 }}>
            Head to <span className="text-lime">Live Now</span> to get started.
          </p>
        </div>
      ) : (
        <div className="surface scroll-area">
          <table className="data-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Selection</th>
                <th>Odds</th>
                <th>Wager</th>
                <th>Potential Payout</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div className="font-head" style={{ fontWeight: 600 }}>{b.gameLabel}</div>
                    {b.isParlay && (
                      <div className="text-faint" style={{ fontSize: '0.72rem' }}>Parlay</div>
                    )}
                  </td>
                  <td style={{ maxWidth: 260 }}>
                    <span className="text-muted" style={{ fontSize: '0.86rem' }}>{b.selectionLabel}</span>
                  </td>
                  <td className="num text-lime" style={{ fontWeight: 600 }}>
                    {formatOdds(b.americanOdds, b.decimalOdds, format)}
                  </td>
                  <td className="num">{formatCurrency(b.wager)}</td>
                  <td className="num">{formatCurrency(b.wager * b.decimalOdds)}</td>
                  <td>
                    <Badge variant={b.status}>{STATUS_LABEL[b.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
