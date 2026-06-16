import { useCallback, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import type { Contract, OddsFormat, SettleResult, TabKey } from './types';
import { useProfile } from './hooks/useProfile';
import { useWallet } from './hooks/useWallet';
import { useToasts } from './hooks/useToasts';
import { useContracts } from './hooks/useContracts';
import { formatCurrency } from './utils/oddsFormatter';

import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { Toaster } from './components/UI/Toast';
import { LinkAccount } from './components/Onboarding/LinkAccount';
import { Catalog } from './components/Tabs/Catalog';
import { Builder } from './components/Tabs/Builder';
import { ActiveContracts } from './components/Tabs/ActiveContracts';
import { MyContracts } from './components/Tabs/MyContracts';
import { Profile } from './components/Tabs/Profile';
import { ResponsibleGaming } from './components/Tabs/ResponsibleGaming';

const HEADER_H = 64;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('catalog');
  const [oddsFormat, setOddsFormat] = useState<OddsFormat>('decimal');
  const [navOpen, setNavOpen] = useState(false);

  const { profile, linking, error, link, unlink } = useProfile();
  const wallet = useWallet();
  const { toasts, pushToast, dismissToast } = useToasts();

  // Settlement callback: credit the wallet + receipt toast, exactly once.
  const onSettle = useCallback(
    (contract: Contract, result: SettleResult) => {
      wallet.applySettlement({
        stake: contract.stake,
        payout: result.payout,
        isLoss: result.outcome === 'lost',
      });
      if (result.outcome === 'won') {
        pushToast({
          variant: 'win',
          title: 'Contract won!',
          description: `${contract.title} — +${formatCurrency(result.payout - contract.stake)}`,
        });
      } else if (result.outcome === 'lost') {
        pushToast({
          variant: 'loss',
          title: 'Contract lost',
          description: `${contract.title} — ${formatCurrency(contract.stake)} stake`,
        });
      } else {
        pushToast({
          variant: 'info',
          title: 'Contract expired',
          description: `${contract.title} — stake refunded`,
        });
      }
    },
    [wallet, pushToast],
  );

  const contracts = useContracts({ username: profile?.username ?? null, onSettle });

  const handleActivate = useCallback(
    (offered: Contract, stake: number) => {
      if (stake < 1 || stake > 100) {
        pushToast({ variant: 'loss', title: 'Invalid stake', description: 'Stake must be $1–$100.' });
        return;
      }
      if (stake > wallet.available) {
        pushToast({ variant: 'loss', title: 'Insufficient balance', description: 'Lower your stake or reset the demo.' });
        return;
      }
      if (!wallet.canActivate(stake)) {
        pushToast({ variant: 'loss', title: 'Daily loss limit reached', description: 'Adjust it under Responsible Gaming.' });
        return;
      }
      contracts.activate(offered, stake);
      wallet.commitStake(stake);
      pushToast({
        variant: 'success',
        title: 'Contract activated',
        description: `${offered.title} — ${formatCurrency(stake)} staked. Go play on Lichess!`,
      });
      setActiveTab('active');
    },
    [contracts, wallet, pushToast],
  );

  const handleReset = useCallback(() => {
    contracts.resetAll();
    wallet.reset();
    pushToast({ variant: 'info', title: 'Demo reset', description: 'Wallet restored to $1,000 and contracts cleared.' });
  }, [contracts, wallet, pushToast]);

  const toast = useCallback(
    (title: string, description?: string) => pushToast({ variant: 'info', title, description }),
    [pushToast],
  );

  // Onboarding gate.
  if (!profile) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <LinkAccount onLink={link} linking={linking} error={error} />
        <Toaster toasts={toasts} onDismiss={dismissToast} />
        <Analytics />
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'catalog':
        return (
          <Catalog
            catalog={contracts.catalog}
            loading={contracts.catalogLoading}
            error={contracts.catalogError}
            format={oddsFormat}
            refresh={contracts.refreshCatalog}
            canActivate={wallet.canActivate}
            onActivate={handleActivate}
          />
        );
      case 'builder':
        return (
          <Builder
            profile={profile}
            format={oddsFormat}
            canActivate={wallet.canActivate}
            onActivate={handleActivate}
          />
        );
      case 'active':
        return <ActiveContracts active={contracts.active} />;
      case 'history':
        return <MyContracts settled={contracts.settled} />;
      case 'profile':
        return <Profile profile={profile} wallet={wallet} onUnlink={unlink} />;
      case 'responsible':
        return <ResponsibleGaming wallet={wallet} onToast={toast} />;
    }
  };

  const sidebarProps = {
    activeTab,
    setActiveTab,
    activeCount: contracts.active.length,
    username: profile.username,
    onReset: handleReset,
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header
        oddsFormat={oddsFormat}
        setOddsFormat={setOddsFormat}
        displayAvailable={wallet.displayAvailable}
        pending={wallet.pending}
        balanceAnimating={wallet.animating}
        username={profile.username}
        onOpenNav={() => setNavOpen(true)}
      />

      <div className="flex" style={{ alignItems: 'flex-start' }}>
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
          <Sidebar {...sidebarProps} />
        </aside>

        <main className="flex-1 app-main" style={{ minWidth: 0 }}>
          {renderTab()}
        </main>
      </div>

      {navOpen && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setNavOpen(false)} />
          <div
            className="fade-in"
            style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, maxWidth: '85vw', background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
          >
            <Sidebar {...sidebarProps} onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      )}

      <Toaster toasts={toasts} onDismiss={dismissToast} />
      <Analytics />
    </div>
  );
}
