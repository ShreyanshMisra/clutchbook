import { Menu } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

interface HeaderProps {
  displayAvailable: number;
  escrow: number;
  balanceAnimating: boolean;
  onOpenNav: () => void;
}

export function Header({
  displayAvailable,
  escrow,
  balanceAnimating,
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
        <button
          type="button"
          className="btn-ghost btn lg:hidden"
          style={{ padding: 8 }}
          onClick={onOpenNav}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
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

      <div className="flex items-center gap-3">
        {/* Available balance */}
        <div className="flex flex-col items-end">
          <span className="text-faint uppercase-head" style={{ fontSize: '0.6rem' }}>
            Available{escrow > 0 ? ` · ${formatCurrency(escrow)} in escrow` : ''}
          </span>
          <span
            key={balanceAnimating ? 'anim' : 'idle'}
            className={`font-head tabular ${balanceAnimating ? 'balance-pop' : ''}`}
            style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--pos)', lineHeight: 1 }}
          >
            {formatCurrency(displayAvailable)}
          </span>
        </div>
      </div>
    </header>
  );
}
