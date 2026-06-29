import { useCallback, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import type { Contract, SettleResult, TabKey } from './types';
import { useProfile } from './hooks/useProfile';
import { useWallet } from './hooks/useWallet';
import { useToasts } from './hooks/useToasts';
import { useContracts } from './hooks/useContracts';
import { useSoloPools } from './hooks/useSoloPools';
import { useTournaments } from './hooks/useTournaments';
import { formatCurrency } from './utils/format';
import { loadState, saveState } from './utils/storage';

import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { Toaster } from './components/UI/Toast';
import { Landing } from './components/Onboarding/Landing';
import { Lobby } from './components/Tabs/Lobby';
import { SoloPools } from './components/Tabs/SoloPools';
import { Tournaments } from './components/Tabs/Tournaments';
import { Leaderboard } from './components/Tabs/Leaderboard';
import { LinkAccounts } from './components/Tabs/LinkAccounts';
import { ActiveContracts } from './components/Tabs/ActiveContracts';
import { MyContests } from './components/Tabs/MyContests';
import { Profile } from './components/Tabs/Profile';
import { ResponsibleGaming } from './components/Tabs/ResponsibleGaming';

const HEADER_H = 64;
const STARTED_KEY = 'started';
const RESIDENCE_KEY = 'residence';

export default function App() {
  const [started, setStarted] = useState<boolean>(() => loadState<boolean>(STARTED_KEY, false));
  const [activeTab, setActiveTab] = useState<TabKey>('h2h');
  const [navOpen, setNavOpen] = useState(false);
  const [residence, setResidenceState] = useState<string | null>(() =>
    loadState<string | null>(RESIDENCE_KEY, null),
  );

  const { profile, linking, error, link, unlink } = useProfile();
  const faceit = useProfile({ storageKey: 'faceit_profile', game: 'cs2.faceit' });
  const wallet = useWallet();
  const { toasts, pushToast, dismissToast } = useToasts();

  const setResidence = useCallback((s: string) => {
    setResidenceState(s);
    saveState(RESIDENCE_KEY, s);
  }, []);

  const solo = useSoloPools({ username: profile?.username ?? null, residenceState: residence });
  const tournaments = useTournaments({ username: profile?.username ?? null, residenceState: residence });

  // Settlement callback: release escrow, credit the winner, receipt toast.
  const onSettle = useCallback(
    (contract: Contract, result: SettleResult) => {
      wallet.applySettlement({
        entry: contract.entry,
        payout: result.payout,
        isLoss: result.outcome === 'lost',
      });
      if (result.outcome === 'won') {
        pushToast({
          variant: 'win',
          title: 'Match won!',
          description: `${contract.title} vs ${contract.opponent.display_name} — +${formatCurrency(contract.prize - contract.entry)}`,
        });
      } else if (result.outcome === 'lost') {
        pushToast({
          variant: 'loss',
          title: 'Match lost',
          description: `${contract.title} vs ${contract.opponent.display_name} — ${formatCurrency(contract.entry)} entry`,
        });
      } else {
        pushToast({
          variant: 'info',
          title: 'Match canceled',
          description: `${contract.title} — entry refunded`,
        });
      }
    },
    [wallet, pushToast],
  );

  const contracts = useContracts({ username: profile?.username ?? null, onSettle });

  const handleJoin = useCallback(
    (contest: Contract) => {
      const entry = contest.entry;
      if (entry < 1 || entry > 100) {
        pushToast({ variant: 'loss', title: 'Invalid entry', description: 'Entry must be $1–$100.' });
        return;
      }
      if (entry > wallet.available) {
        pushToast({ variant: 'loss', title: 'Insufficient balance', description: 'Lower the entry or reset your balance.' });
        return;
      }
      if (!wallet.canJoin(entry)) {
        pushToast({ variant: 'loss', title: 'Daily loss limit reached', description: 'Adjust it under Responsible Gaming.' });
        return;
      }
      contracts.join(contest);
      wallet.escrowEntry(entry);
      pushToast({
        variant: 'success',
        title: 'Match confirmed',
        description: `${contest.title} vs ${contest.opponent.display_name} — ${formatCurrency(entry)} escrowed. Go play!`,
      });
      setActiveTab('active');
    },
    [contracts, wallet, pushToast],
  );

  const handleReset = useCallback(() => {
    contracts.resetAll();
    solo.reset();
    tournaments.reset();
    wallet.reset();
    pushToast({ variant: 'info', title: 'Balance reset', description: 'Balance restored to $1,000 and contests cleared.' });
  }, [contracts, solo, tournaments, wallet, pushToast]);

  const toast = useCallback(
    (title: string, description?: string) => pushToast({ variant: 'info', title, description }),
    [pushToast],
  );

  const handleStart = useCallback(
    (state: string) => {
      setResidence(state);
      setStarted(true);
      saveState(STARTED_KEY, true);
      setActiveTab('link');
    },
    [setResidence],
  );

  // Mock-auth gate: a brand wall + Start button, no real auth.
  if (!started) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Landing onStart={handleStart} />
        <Toaster toasts={toasts} onDismiss={dismissToast} />
        <Analytics />
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'h2h':
        return (
          <Lobby
            profile={profile}
            faceitProfile={faceit.profile}
            lobby={contracts.lobby}
            loading={contracts.lobbyLoading}
            error={contracts.lobbyError}
            refresh={contracts.refreshLobby}
            canJoin={wallet.canJoin}
            onJoin={handleJoin}
            onGoLink={() => setActiveTab('link')}
          />
        );
      case 'solo':
        return (
          <SoloPools
            profile={profile}
            wallet={wallet}
            solo={solo}
            residenceState={residence}
            setResidence={setResidence}
            onGoLink={() => setActiveTab('link')}
            pushToast={pushToast}
          />
        );
      case 'tournaments':
        return (
          <Tournaments
            profile={profile}
            wallet={wallet}
            tournaments={tournaments}
            residenceState={residence}
            setResidence={setResidence}
            onGoLink={() => setActiveTab('link')}
            pushToast={pushToast}
          />
        );
      case 'link':
        return (
          <LinkAccounts
            linkers={{
              'chess.lichess': { profile, link, unlink, linking, error },
              'cs2.faceit': faceit,
            }}
          />
        );
      case 'leaderboard':
        return (
          <Leaderboard
            profile={profile}
            settledContracts={contracts.settled}
            tournaments={tournaments.mine}
            soloPools={solo.mine}
            onGoLink={() => setActiveTab('link')}
          />
        );
      case 'active':
        return <ActiveContracts active={contracts.active} username={profile?.username ?? null} />;
      case 'history':
        return <MyContests settled={contracts.settled} />;
      case 'profile':
        return <Profile profile={profile} wallet={wallet} onGoLink={() => setActiveTab('link')} />;
      case 'responsible':
        return <ResponsibleGaming wallet={wallet} onToast={toast} />;
    }
  };

  const sidebarProps = {
    activeTab,
    setActiveTab,
    activeCount: contracts.active.length,
    username: profile?.username ?? null,
    onReset: handleReset,
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header
        displayAvailable={wallet.displayAvailable}
        escrow={wallet.escrow}
        balanceAnimating={wallet.animating}
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
