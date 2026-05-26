import { CalendarClock, Radio, Receipt, RotateCcw, Trophy, X } from 'lucide-react';
import type { TabKey, TimeFilter } from '../../types';

interface SidebarProps {
  activeTab: TabKey;
  setActiveTab: (t: TabKey) => void;
  pendingBets: number;
  liveCount: number;
  filter: TimeFilter;
  setFilter: (f: TimeFilter) => void;
  onReset: () => void; // restore $1,000 balance and clear all bets
  onNavigate?: () => void; // closes mobile drawer
}

const TABS: { key: TabKey; label: string; icon: typeof Radio }[] = [
  { key: 'live', label: 'Live Now', icon: Radio },
  { key: 'upcoming', label: 'Upcoming', icon: CalendarClock },
  { key: 'mybets', label: 'My Bets', icon: Receipt },
  { key: 'leaderboard', label: 'Leaderboard', icon: Trophy },
];

const FILTERS: { key: TimeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bullet', label: 'Bullet' },
  { key: 'blitz', label: 'Blitz' },
  { key: 'rapid', label: 'Rapid' },
  { key: 'classical', label: 'Classical' },
];

export function Sidebar({
  activeTab,
  setActiveTab,
  pendingBets,
  liveCount,
  filter,
  setFilter,
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
          <span className="uppercase-head text-muted" style={{ fontSize: '0.72rem' }}>
            Menu
          </span>
          <button type="button" className="btn btn-ghost" style={{ padding: 6 }} onClick={onNavigate} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const count = key === 'mybets' ? pendingBets : key === 'live' ? liveCount : 0;
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

      <div>
        <div className="uppercase-head text-muted" style={{ fontSize: '0.7rem', marginBottom: 10, paddingLeft: 4 }}>
          Time Control
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`chip ${filter === key ? 'is-active' : ''}`}
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2" style={{ marginTop: 'auto' }}>
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
        <div
          className="surface"
          style={{ padding: 12, fontSize: '0.76rem', lineHeight: 1.5, color: 'var(--text-faint)' }}
        >
          <strong className="text-muted">Demo mode.</strong> No real money. Markets are
          generated from live{' '}
          <a href="https://lichess.org/tv" target="_blank" rel="noreferrer" className="text-cyan" style={{ textDecoration: 'none' }}>
            Lichess
          </a>{' '}
          games for demonstration only.
        </div>
      </div>
    </nav>
  );
}
