import { Link2, MapPin, RefreshCw, Trophy } from 'lucide-react';
import type { SettlementResult, SkillProfile, SoloPool, ToastVariant } from '../../types';
import type { UseWallet } from '../../hooks/useWallet';
import type { useSoloPools } from '../../hooks/useSoloPools';
import { SoloPoolCard } from '../Solo/SoloPoolCard';
import { GameTabs } from '../Catalog/GameTabs';
import { PageHeader } from '../Layout/PageHeader';
import { EmptyState } from '../UI/EmptyState';
import { formatCurrency } from '../../utils/format';
import { standardLabel } from '../../utils/soloText';
import { gameById } from '../../utils/games';
import { ALLOWED_STATES } from '../../utils/states';

interface SoloPoolsProps {
  profile: SkillProfile | null;
  wallet: UseWallet;
  solo: ReturnType<typeof useSoloPools>;
  residenceState: string | null;
  setResidence: (s: string) => void;
  selectedGame: string;
  selectGame: (id: string) => void;
  gameOrder: string[];
  winRateByGame: Record<string, number>;
  onGoLink: () => void;
  pushToast: (t: { variant: ToastVariant; title: string; description?: string }) => void;
  showSettlement: (r: SettlementResult) => void;
}

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
  gap: 14,
};

export function SoloPools({ profile, wallet, solo, residenceState, setResidence, selectedGame, selectGame, gameOrder, winRateByGame, onGoLink, pushToast, showSettlement }: SoloPoolsProps) {
  const username = profile?.username ?? null;
  const gameName = gameById(selectedGame)?.name ?? 'this game';
  const lobbyForGame = solo.lobby.filter((p) => p.game === selectedGame);
  const mineForGame = solo.mine.filter((p) => p.game === selectedGame);

  const handleJoin = async (pool: SoloPool) => {
    if (!wallet.canJoin(pool.entry_fee)) {
      pushToast({ variant: 'loss', title: 'Cannot enter', description: 'Insufficient balance or daily loss limit reached.' });
      return;
    }
    try {
      await solo.join(pool);
      wallet.escrowEntry(pool.entry_fee);
      pushToast({ variant: 'success', title: 'Entered pool', description: `${formatCurrency(pool.entry_fee)} escrowed. Play, then submit your result.` });
    } catch (err) {
      pushToast({ variant: 'loss', title: 'Could not enter', description: (err as Error).message });
    }
  };

  const handleSettle = async (pool: SoloPool, cleared: boolean) => {
    try {
      const settled = await solo.settle(pool.id, cleared);
      const mineEntry = settled.entrants.find((e) => e.player_id === username);
      const payout = mineEntry?.payout ?? 0;
      wallet.applySettlement({ entry: pool.entry_fee, payout, isLoss: payout < pool.entry_fee });
      const refunded = mineEntry?.status === 'REFUNDED' || settled.status === 'CANCELED';
      showSettlement({
        outcome: refunded ? 'refunded' : mineEntry?.status === 'CLEARED' ? 'won' : 'lost',
        payout,
        entry: pool.entry_fee,
        reason: refunded
          ? 'The pool was refunded (under-subscribed or no clearers).'
          : mineEntry?.status === 'CLEARED'
            ? `You cleared the standard (${standardLabel(pool.metric_target)}) and split the pool.`
            : `You missed the standard — your entry funded the clearers' prize.`,
      });
    } catch (err) {
      pushToast({ variant: 'loss', title: 'Settlement failed', description: (err as Error).message });
    }
  };

  if (!profile) {
    return (
      <div>
        <Header />
        <EmptyState
          icon={Trophy}
          message="Link an account to enter solo pools."
          action={
            <button type="button" className="btn btn-primary" style={{ gap: 8 }} onClick={onGoLink}>
              <Link2 size={15} /> Link account
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <Header />

      <GameTabs order={gameOrder} selected={selectedGame} onSelect={selectGame} />

      {/* Region (geo-fence) — needed for the entry geo-check. */}
      <div className="surface flex items-center gap-3 flex-wrap" style={{ padding: '10px 14px', marginBottom: 16 }}>
        <span className="flex items-center gap-2 text-muted" style={{ fontSize: '0.8rem' }}>
          <MapPin size={14} /> Region
        </span>
        {residenceState ? (
          <span className="text-pos" style={{ fontSize: '0.84rem' }}>{residenceState}</span>
        ) : (
          <>
            <span className="text-faint" style={{ fontSize: '0.78rem' }}>Set your region to enter pools:</span>
            <select
              className="input"
              defaultValue=""
              onChange={(e) => e.target.value && setResidence(e.target.value)}
              style={{ maxWidth: 220 }}
            >
              <option value="" disabled>Select your state</option>
              {ALLOWED_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}
      </div>

      {/* My pools */}
      {mineForGame.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginBottom: 12 }}>Your pools</h3>
          <div style={GRID}>
            {mineForGame.map((p) => (
              <SoloPoolCard key={p.id} pool={p} username={username} mode="mine" onSettle={handleSettle} />
            ))}
          </div>
        </>
      )}

      {/* Open pools */}
      <div className="flex items-center justify-between" style={{ margin: '28px 0 12px' }}>
        <h3 className="section-title">Open pools</h3>
        <button type="button" className="btn btn-ghost" style={{ gap: 8, fontSize: '0.82rem' }} onClick={solo.refresh}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {solo.error && (
        <div className="state-panel" style={{ marginBottom: 14 }}>
          <span className="text-crimson">{solo.error}</span>
          <button type="button" className="btn" onClick={solo.refresh}>Retry</button>
        </div>
      )}

      {solo.loading && solo.lobby.length === 0 ? (
        <div style={GRID}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 240 }} />)}
        </div>
      ) : lobbyForGame.length === 0 && !solo.error ? (
        <EmptyState icon={Trophy} message={`No open ${gameName} pools yet.`} />
      ) : (
        <div style={GRID}>
          {lobbyForGame.map((p) => (
            <SoloPoolCard
              key={p.id}
              pool={p}
              username={username}
              mode="open"
              userWinRate={winRateByGame[p.game] ?? null}
              canJoin={residenceState ? wallet.canJoin : () => false}
              onJoin={handleJoin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Header() {
  return <PageHeader title="Solo Pools" subtitle="Clear the skill standard to split the pool, minus rake." />;
}
