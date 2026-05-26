import { useState } from 'react';
import { Ticket } from 'lucide-react';
import type { OddsFormat, TabKey, TimeFilter } from './types';
import { useLichessGames } from './hooks/useLichessGames';
import { useBalance } from './hooks/useBalance';
import { useBetSlip } from './hooks/useBetSlip';
import { useToasts } from './hooks/useToasts';
import { useBetSettlement } from './hooks/useBetSettlement';
import { formatCurrency } from './utils/oddsFormatter';

import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { BetSlip } from './components/Layout/BetSlip';
import { Toaster } from './components/UI/Toast';
import { LiveNow } from './components/Tabs/LiveNow';
import { Upcoming } from './components/Tabs/Upcoming';
import { MyBets } from './components/Tabs/MyBets';
import { Leaderboard } from './components/Tabs/Leaderboard';

const HEADER_H = 64;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('live');
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>('american');
  const [filter, setFilter] = useState<TimeFilter>('all');
  const [navOpen, setNavOpen] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);

  const { games, loading, error, refetch } = useLichessGames();
  const balance = useBalance();
  const slip = useBetSlip();
  const { toasts, pushToast, dismissToast } = useToasts();

  const pendingPlaced = slip.placed.filter((b) => b.status === 'pending').length;

  useBetSettlement({
    placed: slip.placed,
    updateStatus: slip.updateStatus,
    credit: balance.credit,
    pushToast,
  });

  const handlePlace = () => {
    const newly = slip.placeBets();
    if (newly.length === 0) return;
    const stake = newly.reduce((sum, b) => sum + b.wager, 0);
    balance.deduct(stake);
    pushToast({
      variant: 'success',
      title: 'Bets Placed!',
      description: `${newly.length} bet${newly.length > 1 ? 's' : ''} • ${formatCurrency(stake)} staked`,
    });
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'live':
        return (
          <LiveNow
            games={games}
            loading={loading}
            error={error}
            refetch={refetch}
            filter={filter}
            format={oddsFormat}
            addSelection={slip.addSelection}
            isSelected={slip.isSelected}
          />
        );
      case 'upcoming':
        return <Upcoming />;
      case 'mybets':
        return <MyBets placed={slip.placed} format={oddsFormat} />;
      case 'leaderboard':
        return <Leaderboard placed={slip.placed} />;
    }
  };

  const betSlipProps = {
    pending: slip.pending,
    removeSelection: slip.removeSelection,
    updateWager: slip.updateWager,
    parlayMode: slip.parlayMode,
    toggleParlay: slip.toggleParlay,
    parlayWager: slip.parlayWager,
    setParlayWager: slip.setParlayWager,
    parlayDecimalOdds: slip.parlayDecimalOdds,
    parlayAmericanOdds: slip.parlayAmericanOdds,
    totalStake: slip.totalStake,
    balance: balance.balance,
    format: oddsFormat,
    onPlace: handlePlace,
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header
        oddsFormat={oddsFormat}
        setOddsFormat={setOddsFormat}
        displayBalance={balance.displayBalance}
        balanceAnimating={balance.animating}
        onOpenNav={() => setNavOpen(true)}
      />

      <div className="flex" style={{ alignItems: 'flex-start' }}>
        {/* Left sidebar (desktop) */}
        <aside
          className="hidden lg:block"
          style={{
            width: 248,
            flexShrink: 0,
            position: 'sticky',
            top: HEADER_H,
            height: `calc(100vh - ${HEADER_H}px)`,
            borderRight: '1px solid var(--border)',
          }}
        >
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            pendingBets={pendingPlaced}
            liveCount={games.length}
            filter={filter}
            setFilter={setFilter}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1" style={{ padding: 24, minWidth: 0 }}>
          {renderTab()}
        </main>

        {/* Right bet slip (desktop) */}
        <aside
          className="hidden lg:block"
          style={{
            width: 360,
            flexShrink: 0,
            position: 'sticky',
            top: HEADER_H,
            height: `calc(100vh - ${HEADER_H}px)`,
            padding: 16,
          }}
        >
          <BetSlip {...betSlipProps} />
        </aside>
      </div>

      {/* Mobile: floating bet slip button */}
      <button
        type="button"
        className="btn btn-primary lg:hidden"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 40,
          borderRadius: 999,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        }}
        onClick={() => setSlipOpen(true)}
        aria-label="Open bet slip"
      >
        <Ticket size={18} />
        Slip
        {slip.pending.length > 0 && (
          <span
            className="tabular"
            style={{ background: '#0a0b0f', color: 'var(--lime)', borderRadius: 999, padding: '0 7px', fontSize: '0.8rem' }}
          >
            {slip.pending.length}
          </span>
        )}
      </button>

      {/* Mobile: nav drawer */}
      {navOpen && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setNavOpen(false)} />
          <div
            className="fade-in"
            style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, maxWidth: '85vw', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
          >
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              pendingBets={pendingPlaced}
              liveCount={games.length}
              filter={filter}
              setFilter={setFilter}
              onNavigate={() => setNavOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile: bet slip bottom drawer */}
      {slipOpen && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setSlipOpen(false)} />
          <div
            className="fade-in"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '82vh', background: 'var(--surface)', borderTop: '1px solid var(--border)', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' }}
          >
            <BetSlip {...betSlipProps} onClose={() => setSlipOpen(false)} />
          </div>
        </div>
      )}

      <Toaster toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
