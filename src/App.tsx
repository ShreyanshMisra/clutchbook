import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import type { Contract, SettleResult, SkillProfile, TabKey } from './types';
import { useProfile } from './hooks/useProfile';
import { useWallet } from './hooks/useWallet';
import { useToasts } from './hooks/useToasts';
import { useContracts } from './hooks/useContracts';
import { useSoloPools } from './hooks/useSoloPools';
import { useTournaments } from './hooks/useTournaments';
import { useSettlement } from './hooks/useSettlement';
import { formatCurrency } from './utils/format';
import { GAMES } from './utils/games';
import { loadState, saveState } from './utils/storage';

import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { Toaster } from './components/UI/Toast';
import { SettlementModal } from './components/UI/SettlementModal';
import { Landing } from './components/Onboarding/Landing';
import { Lobby } from './components/Tabs/Lobby';
import { SoloPools } from './components/Tabs/SoloPools';
import { Tournaments } from './components/Tabs/Tournaments';
import { Leaderboard } from './components/Tabs/Leaderboard';
import { ActiveContracts } from './components/Tabs/ActiveContracts';
import { Profile } from './components/Tabs/Profile';
import { ResponsibleGaming } from './components/Tabs/ResponsibleGaming';

const HEADER_H = 64;
const STARTED_KEY = 'started';
const RESIDENCE_KEY = 'residence';
const GAME_SELECTED_KEY = 'game_selected';
const GAME_ORDER_KEY = 'game_order';
const ALL_GAME_IDS = GAMES.map((g) => g.id);

export default function App() {
  const [started, setStarted] = useState<boolean>(() => loadState<boolean>(STARTED_KEY, false));
  const [activeTab, setActiveTab] = useState<TabKey>('h2h');
  const [navOpen, setNavOpen] = useState(false);
  const [residence, setResidenceState] = useState<string | null>(() =>
    loadState<string | null>(RESIDENCE_KEY, null),
  );

  const { profile, linking, error, link, unlink } = useProfile();
  const faceit = useProfile({ storageKey: 'faceit_profile', game: 'cs2.faceit' });
  const dota = useProfile({ storageKey: 'dota_profile', game: 'dota2.opendota' });
  const wallet = useWallet();
  const { toasts, pushToast, dismissToast } = useToasts();
  const settlement = useSettlement();

  const setResidence = useCallback((s: string) => {
    setResidenceState(s);
    saveState(RESIDENCE_KEY, s);
  }, []);

  const solo = useSoloPools({ username: profile?.username ?? null, residenceState: residence });
  const tournaments = useTournaments({ username: profile?.username ?? null, residenceState: residence });

  // Shared game filter: which game we're browsing, and the tab order (most
  // recently selected / linked first). Both persist and hold across pages.
  const [selectedGame, setSelectedGame] = useState<string>(() =>
    loadState<string>(GAME_SELECTED_KEY, ALL_GAME_IDS[0]),
  );
  const [gameOrder, setGameOrder] = useState<string[]>(() => {
    const saved = loadState<string[]>(GAME_ORDER_KEY, ALL_GAME_IDS);
    // Keep in sync with the catalog if games were added/removed since.
    const known = saved.filter((id) => ALL_GAME_IDS.includes(id));
    return [...known, ...ALL_GAME_IDS.filter((id) => !known.includes(id))];
  });

  const bumpGame = useCallback((id: string) => {
    setGameOrder((prev) => {
      const next = [id, ...prev.filter((g) => g !== id)];
      saveState(GAME_ORDER_KEY, next);
      return next;
    });
  }, []);

  const selectGame = useCallback((id: string) => {
    setSelectedGame(id);
    saveState(GAME_SELECTED_KEY, id);
    bumpGame(id);
  }, [bumpGame]);

  // Linking a game bumps it to the front of the order too.
  const linkedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const linkedNow: Record<string, boolean> = {
      'chess.lichess': !!profile,
      'cs2.faceit': !!faceit.profile,
      'dota2.opendota': !!dota.profile,
    };
    for (const [id, isLinked] of Object.entries(linkedNow)) {
      if (isLinked && !linkedRef.current.has(id)) {
        linkedRef.current.add(id);
        bumpGame(id);
      } else if (!isLinked) {
        linkedRef.current.delete(id);
      }
    }
  }, [profile, faceit.profile, dota.profile, bumpGame]);

  // Settlement callback: release escrow, credit the winner, show the popup.
  const onSettle = useCallback(
    (contract: Contract, result: SettleResult) => {
      wallet.applySettlement({
        entry: contract.entry,
        payout: result.payout,
        isLoss: result.outcome === 'lost',
      });
      const opp = contract.opponent.display_name;
      settlement.show({
        outcome: result.outcome === 'won' ? 'won' : result.outcome === 'lost' ? 'lost' : 'refunded',
        payout: result.payout,
        entry: contract.entry,
        title: contract.title,
        reason:
          result.outcome === 'won' ? `You beat ${opp}.`
            : result.outcome === 'lost' ? `${opp} won the match.`
              : 'No qualifying game in the window — your entry was refunded.',
      });
    },
    [wallet, settlement],
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
      setActiveTab('profile');
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
            profilesByGame={{
              'chess.lichess': profile,
              'cs2.faceit': faceit.profile,
              'dota2.opendota': dota.profile,
            }}
            selectedGame={selectedGame}
            selectGame={selectGame}
            gameOrder={gameOrder}
            canJoin={wallet.canJoin}
            onJoin={handleJoin}
            onGoLink={() => setActiveTab('profile')}
            wallet={wallet}
            pushToast={pushToast}
            showSettlement={settlement.show}
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
            selectedGame={selectedGame}
            selectGame={selectGame}
            gameOrder={gameOrder}
            winRateByGame={winRateByGame}
            onGoLink={() => setActiveTab('profile')}
            pushToast={pushToast}
            showSettlement={settlement.show}
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
            selectedGame={selectedGame}
            selectGame={selectGame}
            gameOrder={gameOrder}
            winRateByGame={winRateByGame}
            onGoLink={() => setActiveTab('profile')}
            pushToast={pushToast}
            showSettlement={settlement.show}
          />
        );
      case 'leaderboard':
        return (
          <Leaderboard
            profile={profile}
            settledContracts={contracts.settled}
            tournaments={tournaments.mine}
            soloPools={solo.mine}
            onGoLink={() => setActiveTab('profile')}
          />
        );
      case 'active':
        return <ActiveContracts active={contracts.active} username={profile?.username ?? null} />;
      case 'profile':
        return (
          <Profile
            profile={profile}
            wallet={wallet}
            linkers={{
              'chess.lichess': { profile, link, unlink, linking, error },
              'cs2.faceit': faceit,
              'dota2.opendota': dota,
            }}
            settled={contracts.settled}
          />
        );
      case 'responsible':
        return <ResponsibleGaming wallet={wallet} onToast={toast} />;
    }
  };

  const sidebarProps = {
    activeTab,
    setActiveTab,
    activeCount: contracts.active.length,
    onReset: handleReset,
  };

  const linkedAccounts = [profile, faceit.profile, dota.profile]
    .filter((p): p is SkillProfile => !!p)
    .map((p) => ({ game: p.game ?? 'chess.lichess', name: p.display_name, avatar: p.avatar_url }));

  // Win rate per linked game (0..1) — powers the AI recommendation on cards.
  const winRateByGame: Record<string, number> = {};
  if (profile) winRateByGame['chess.lichess'] = profile.win_rate;
  if (faceit.profile) winRateByGame['cs2.faceit'] = faceit.profile.win_rate;
  if (dota.profile) winRateByGame['dota2.opendota'] = dota.profile.win_rate;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header
        displayAvailable={wallet.displayAvailable}
        escrow={wallet.escrow}
        balanceAnimating={wallet.animating}
        accounts={linkedAccounts}
        onManageAccounts={() => setActiveTab('profile')}
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
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {renderTab()}
          </motion.div>
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
      <SettlementModal result={settlement.result} onClose={settlement.dismiss} />
      <Analytics />
    </div>
  );
}
