import { useState } from 'react';
import { HeartHandshake, ShieldAlert } from 'lucide-react';
import type { UseWallet } from '../../hooks/useWallet';
import { formatCurrency } from '../../utils/format';

interface ResponsibleGamingProps {
  wallet: UseWallet;
  onToast: (title: string, description?: string) => void;
}

/**
 * Responsible-gaming surface (stubbed for the demo, roadmap §1.4). The daily
 * loss limit is real and enforced by the wallet; self-exclusion is a stub.
 */
export function ResponsibleGaming({ wallet, onToast }: ResponsibleGamingProps) {
  const [limit, setLimit] = useState(wallet.lossLimit);

  return (
    <div className="fade-in" style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 className="section-title">Responsible Gaming</h2>
        <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
          Set limits on your play. Limits lower instantly; raising them takes a
          24-hour cooldown (mocked in the demo).
        </p>
      </div>

      {/* Daily loss limit */}
      <div className="surface" style={{ padding: 18 }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
          <ShieldAlert size={16} style={{ color: 'var(--amber)' }} />
          <span className="font-head" style={{ fontWeight: 600 }}>Daily loss limit</span>
        </div>
        <p className="text-faint" style={{ fontSize: '0.78rem', marginBottom: 14 }}>
          You’ve lost {formatCurrency(wallet.lossToday)} today ·{' '}
          {formatCurrency(wallet.remainingLoss)} of your limit remaining.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={500}
            step={25}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--lime)' }}
          />
          <span className="font-head tabular" style={{ fontWeight: 700, width: 80, textAlign: 'right' }}>
            {formatCurrency(limit)}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 14, gap: 8 }}
          onClick={() => {
            wallet.setLossLimit(limit);
            onToast('Limit updated', `Daily loss limit set to ${formatCurrency(limit)}.`);
          }}
        >
          Save limit
        </button>
      </div>

      {/* Self-exclusion (stub) */}
      <div className="surface" style={{ padding: 18 }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
          <HeartHandshake size={16} style={{ color: 'var(--cyan)' }} />
          <span className="font-head" style={{ fontWeight: 600 }}>Self-exclusion</span>
        </div>
        <p className="text-faint" style={{ fontSize: '0.78rem', marginBottom: 14, lineHeight: 1.5 }}>
          Take a break. In production this locks your account for a chosen period
          (7-day minimum, up to permanent). Stubbed in the demo.
        </p>
        <button
          type="button"
          className="btn"
          onClick={() => onToast('Self-exclusion', 'This would start a cooling-off period in production.')}
        >
          Request self-exclusion
        </button>
      </div>
    </div>
  );
}
