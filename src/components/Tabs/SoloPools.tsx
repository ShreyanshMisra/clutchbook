import { Link2, MapPin, RefreshCw, Trophy } from 'lucide-react';
import type { SkillProfile, SoloPool, ToastVariant } from '../../types';
import type { UseWallet } from '../../hooks/useWallet';
import type { useSoloPools } from '../../hooks/useSoloPools';
import { SoloPoolCard } from '../Solo/SoloPoolCard';
import { formatCurrency } from '../../utils/format';
import { ALLOWED_STATES } from '../../utils/states';

interface SoloPoolsProps {
  profile: SkillProfile | null;
  wallet: UseWallet;
  solo: ReturnType<typeof useSoloPools>;
  residenceState: string | null;
  setResidence: (s: string) => void;
  onGoLink: () => void;
  pushToast: (t: { variant: ToastVariant; title: string; description?: string }) => void;
}

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
  gap: 14,
};

export function SoloPools({ profile, wallet, solo, residenceState, setResidence, onGoLink, pushToast }: SoloPoolsProps) {
  const username = profile?.username ?? null;

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
      if (mineEntry?.status === 'CLEARED') {
        pushToast({ variant: 'win', title: 'Standard cleared!', description: `Won ${formatCurrency(payout)} from the pool (+${formatCurrency(payout - pool.entry_fee)}).` });
      } else if (mineEntry?.status === 'REFUNDED' || settled.status === 'CANCELED') {
        pushToast({ variant: 'info', title: 'Pool refunded', description: `${formatCurrency(payout)} entry returned.` });
      } else {
        pushToast({ variant: 'loss', title: 'Missed the standard', description: `${formatCurrency(pool.entry_fee)} entry went to the pool.` });
      }
    } catch (err) {
      pushToast({ variant: 'loss', title: 'Settlement failed', description: (err as Error).message });
    }
  };

  if (!profile) {
    return (
      <div className="fade-in">
        <Header />
        <div className="state-panel">
          <div className="state-icon"><Trophy size={22} /></div>
          <span className="text-muted">Link your account to enter solo pools.</span>
          <button type="button" className="btn btn-primary" style={{ gap: 8 }} onClick={onGoLink}>
            <Link2 size={15} /> Link account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <Header />

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
      {solo.mine.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginBottom: 12 }}>Your pools</h3>
          <div style={GRID}>
            {solo.mine.map((p) => (
              <SoloPoolCard key={p.id} pool={p} username={username} mode="mine" onSettle={handleSettle} />
            ))}
          </div>
        </>
      )}

      {/* Open pools */}
      <div className="flex items-center justify-between" style={{ margin: '28px 0 12px' }}>
        <div>
          <h3 className="section-title">Open pools</h3>
          <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
            Pooled tournaments — clear the standard, split the pool minus rake. No house.
          </p>
        </div>
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
      ) : solo.lobby.length === 0 && !solo.error ? (
        <div className="state-panel">
          <div className="state-icon"><Trophy size={22} /></div>
          <span className="text-muted">No open pools right now — check back soon.</span>
        </div>
      ) : (
        <div style={GRID}>
          {solo.lobby.map((p) => (
            <SoloPoolCard
              key={p.id}
              pool={p}
              username={username}
              mode="open"
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
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 className="section-title">Solo Pools</h2>
      <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
        Compete on your own verified performance against a skill standard. The prize comes from
        the entrants' pool — clearers split it minus a fixed rake.
      </p>
    </div>
  );
}
