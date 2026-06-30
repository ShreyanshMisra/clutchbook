import { Menu, Plus } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { gameById } from '../../utils/games';

export interface LinkedAccount {
  game: string;
  name: string;
  avatar?: string | null;
}

interface HeaderProps {
  displayAvailable: number;
  escrow: number;
  balanceAnimating: boolean;
  accounts: LinkedAccount[];
  onManageAccounts: () => void;
  onOpenNav: () => void;
}

export function Header({
  displayAvailable,
  escrow,
  balanceAnimating,
  accounts,
  onManageAccounts,
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
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Linked accounts (game-agnostic) — desktop only */}
        <button
          type="button"
          className="hidden lg:flex items-center gap-2 btn-ghost"
          style={{ padding: '5px 8px', borderRadius: 999 }}
          onClick={onManageAccounts}
          aria-label="Manage linked accounts"
        >
          {accounts.length === 0 ? (
            <span className="flex items-center gap-1 text-faint" style={{ fontSize: '0.8rem' }}>
              <Plus size={14} /> Link account
            </span>
          ) : (
            accounts.map((a) => <AccountChip key={a.game} account={a} />)
          )}
        </button>

        <div style={{ width: 1, height: 26, background: 'var(--border)' }} className="hidden lg:block" />

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

function AccountChip({ account }: { account: LinkedAccount }) {
  const game = gameById(account.game);
  const Icon = game?.icon;
  return (
    <span className="flex items-center gap-1" title={`${game?.name ?? account.game}: ${account.name}`}>
      {account.avatar ? (
        <img
          src={account.avatar}
          alt=""
          style={{ width: 20, height: 20, borderRadius: 6, objectFit: 'cover' }}
        />
      ) : (
        <span className="game-tile" style={{ background: game?.gradient, width: 20, height: 20, borderRadius: 6 }}>
          {Icon && <Icon size={11} strokeWidth={2.4} color="#0a0b0f" />}
        </span>
      )}
      <span className="text-muted" style={{ fontSize: '0.8rem', maxWidth: 96, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {account.name}
      </span>
    </span>
  );
}
