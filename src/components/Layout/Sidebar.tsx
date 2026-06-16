import {
  Hammer,
  HeartHandshake,
  Hourglass,
  LayoutGrid,
  Receipt,
  RotateCcw,
  UserRound,
  X,
} from 'lucide-react';
import type { TabKey } from '../../types';

interface SidebarProps {
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;
  activeCount: number;
  username: string | null;
  onReset: () => void; // restore $1,000 wallet and clear contracts
  onNavigate?: () => void; // closes mobile drawer
}

const TABS: { key: TabKey; label: string; icon: typeof LayoutGrid }[] = [
  { key: 'catalog', label: 'Catalog', icon: LayoutGrid },
  { key: 'builder', label: 'Builder', icon: Hammer },
  { key: 'active', label: 'Active Contracts', icon: Hourglass },
  { key: 'history', label: 'My Contracts', icon: Receipt },
  { key: 'profile', label: 'Profile', icon: UserRound },
  { key: 'responsible', label: 'Responsible Gaming', icon: HeartHandshake },
];

export function Sidebar({
  activeTab,
  setActiveTab,
  activeCount,
  username,
  onReset,
  onNavigate,
}: SidebarProps) {
  const go = (t: TabKey) => {
    setActiveTab(t);
    onNavigate?.();
  };

  return (
    <nav className="flex flex-col gap-6" style={{ padding: 16, height: '100%' }}>
      {onNavigate && (
        <div className="flex items-center justify-between lg:hidden">
          <span className="uppercase-head text-muted" style={{ fontSize: '0.72rem' }}>Menu</span>
          <button type="button" className="btn btn-ghost" style={{ padding: 6 }} onClick={onNavigate} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const count = key === 'active' ? activeCount : 0;
          return (
            <button
              key={key}
              type="button"
              className={`nav-item ${activeTab === key ? 'is-active' : ''}`}
              onClick={() => go(key)}
              aria-current={activeTab === key ? 'page' : undefined}
            >
              <Icon size={18} />
              {label}
              {count > 0 && <span className="nav-count tabular">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2" style={{ marginTop: 'auto' }}>
        {username && (
          <div className="text-faint" style={{ fontSize: '0.74rem', paddingLeft: 4 }}>
            Linked as <span className="text-muted">{username}</span>
          </div>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          style={{ justifyContent: 'center', gap: 8, fontSize: '0.82rem' }}
          onClick={() => {
            onReset();
            onNavigate?.();
          }}
        >
          <RotateCcw size={15} /> Reset demo
        </button>
        <div className="surface" style={{ padding: 12, fontSize: '0.76rem', lineHeight: 1.5, color: 'var(--text-faint)' }}>
          <strong className="text-muted">Demo mode.</strong> Play money only.
          Contracts price from and settle against your real{' '}
          <a href="https://lichess.org" target="_blank" rel="noreferrer" className="text-cyan" style={{ textDecoration: 'none' }}>
            Lichess
          </a>{' '}
          games.
        </div>
      </div>
    </nav>
  );
}
