import { Menu } from 'lucide-react';
import type { OddsFormat } from '../../types';
import { formatCurrency } from '../../utils/oddsFormatter';

interface HeaderProps {
  oddsFormat: OddsFormat;
  setOddsFormat: (f: OddsFormat) => void;
  displayAvailable: number;
  pending: number;
  balanceAnimating: boolean;
  username: string | null;
  onOpenNav: () => void;
}

export function Header({
  oddsFormat,
  setOddsFormat,
  displayAvailable,
  pending,
  balanceAnimating,
  username,
  onOpenNav,
}: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between gap-3"
      style={{
        height: 64,
        padding: '0 16px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,11,15,0.85)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div className="flex items-center gap-3">
        {username && (
          <button
            type="button"
            className="btn-ghost btn lg:hidden"
            style={{ padding: 8 }}
            onClick={onOpenNav}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="flex items-center gap-2">
          <span aria-hidden style={{ color: 'var(--lime)', fontFamily: 'var(--font-head)', fontSize: '1.5rem', lineHeight: 1 }}>
            ⟁
          </span>
          <span className="brand-name uppercase-head" style={{ fontWeight: 700, fontSize: '1.35rem', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
            money <span className="text-lime">match</span>
          </span>
          <span className="badge demo-badge" style={{ marginLeft: 4, color: 'var(--text-muted)', fontSize: '0.6rem' }}>
            Demo
          </span>
        </div>
      </div>

      {username && (
        <div className="flex items-center gap-3">
          {/* Line format toggle (multiplier / American) */}
          <div
            className="odds-toggle flex items-center"
            role="group"
            aria-label="Odds format"
            style={{ border: '1px solid var(--border-strong)', borderRadius: 999, padding: 2 }}
          >
            {(['decimal', 'american'] as OddsFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setOddsFormat(f)}
                className="chip"
                style={{
                  border: 'none',
                  background: oddsFormat === f ? 'var(--lime-dim)' : 'transparent',
                  color: oddsFormat === f ? 'var(--lime)' : 'var(--text-muted)',
                }}
                aria-pressed={oddsFormat === f}
              >
                {f === 'decimal' ? '1.85×' : '+120'}
              </button>
            ))}
          </div>

          {/* Available balance */}
          <div className="flex flex-col items-end" style={{ borderLeft: '1px solid var(--border)', paddingLeft: 14 }}>
            <span className="text-faint uppercase-head" style={{ fontSize: '0.6rem' }}>
              Available{pending > 0 ? ` · ${formatCurrency(pending)} pending` : ''}
            </span>
            <span
              key={balanceAnimating ? 'anim' : 'idle'}
              className={`font-head tabular ${balanceAnimating ? 'balance-pop' : ''}`}
              style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--lime)', lineHeight: 1 }}
            >
              {formatCurrency(displayAvailable)}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
