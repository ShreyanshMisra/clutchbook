import { Link2, MapPin, Medal, RefreshCw } from 'lucide-react';
import type { SkillProfile, ToastVariant, Tournament } from '../../types';
import type { UseWallet } from '../../hooks/useWallet';
import type { useTournaments } from '../../hooks/useTournaments';
import { TournamentCard } from '../Tournament/TournamentCard';
import { GameTabs } from '../Catalog/GameTabs';
import { formatCurrency } from '../../utils/format';
import { gameById } from '../../utils/games';
import { ALLOWED_STATES } from '../../utils/states';

interface TournamentsProps {
  profile: SkillProfile | null;
  wallet: UseWallet;
  tournaments: ReturnType<typeof useTournaments>;
  residenceState: string | null;
  setResidence: (s: string) => void;
  selectedGame: string;
  selectGame: (id: string) => void;
  gameOrder: string[];
  onGoLink: () => void;
  pushToast: (t: { variant: ToastVariant; title: string; description?: string }) => void;
}

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
  gap: 14,
};

export function Tournaments({ profile, wallet, tournaments, residenceState, setResidence, selectedGame, selectGame, gameOrder, onGoLink, pushToast }: TournamentsProps) {
  const username = profile?.username ?? null;
  const gameName = gameById(selectedGame)?.name ?? 'this game';
  const lobbyForGame = tournaments.lobby.filter((t) => t.game === selectedGame);
  const mineForGame = tournaments.mine.filter((t) => t.game === selectedGame);

  const handleJoin = async (t: Tournament) => {
    if (!wallet.canJoin(t.entry_fee)) {
      pushToast({ variant: 'loss', title: 'Cannot enter', description: 'Insufficient balance or daily loss limit reached.' });
      return;
    }
    try {
      await tournaments.join(t);
      wallet.escrowEntry(t.entry_fee);
      pushToast({ variant: 'success', title: 'Entered tournament', description: `${formatCurrency(t.entry_fee)} escrowed into ${t.name}. Play, then settle.` });
    } catch (err) {
      pushToast({ variant: 'loss', title: 'Could not enter', description: (err as Error).message });
    }
  };

  const handleSettle = async (t: Tournament) => {
    try {
      const settled = await tournaments.settle(t.id);
      const mine = settled.entrants.find((e) => e.player_id === username);
      const payout = mine?.payout ?? 0;
      wallet.applySettlement({ entry: t.entry_fee, payout, isLoss: payout < t.entry_fee });
      if (mine?.status === 'PAID') {
        pushToast({ variant: 'win', title: `Finished #${mine.rank}!`, description: `Won ${formatCurrency(payout)} from the pool (+${formatCurrency(payout - t.entry_fee)}).` });
      } else if (mine?.status === 'REFUNDED' || settled.status === 'CANCELED') {
        pushToast({ variant: 'info', title: 'Tournament refunded', description: `${formatCurrency(payout)} entry returned.` });
      } else {
        pushToast({ variant: 'loss', title: `Finished #${mine?.rank ?? '—'}`, description: `Out of the money — ${formatCurrency(t.entry_fee)} entry went to the prizes.` });
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
          <div className="state-icon"><Medal size={22} /></div>
          <span className="text-muted">Link your account to enter tournaments.</span>
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
            <span className="text-faint" style={{ fontSize: '0.78rem' }}>Set your region to enter tournaments:</span>
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

      {/* My tournaments */}
      {mineForGame.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginBottom: 12 }}>Your tournaments</h3>
          <div style={GRID}>
            {mineForGame.map((t) => (
              <TournamentCard key={t.id} tournament={t} username={username} mode="mine" onSettle={handleSettle} />
            ))}
          </div>
        </>
      )}

      {/* Open tournaments */}
      <div className="flex items-center justify-between" style={{ margin: '28px 0 12px' }}>
        <div>
          <h3 className="section-title">Open tournaments</h3>
          <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
            Many players, one pool — finish near the top to take a prize share, minus rake. No house.
          </p>
        </div>
        <button type="button" className="btn btn-ghost" style={{ gap: 8, fontSize: '0.82rem' }} onClick={tournaments.refresh}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {tournaments.error && (
        <div className="state-panel" style={{ marginBottom: 14 }}>
          <span className="text-crimson">{tournaments.error}</span>
          <button type="button" className="btn" onClick={tournaments.refresh}>Retry</button>
        </div>
      )}

      {tournaments.loading && tournaments.lobby.length === 0 ? (
        <div style={GRID}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 260 }} />)}
        </div>
      ) : lobbyForGame.length === 0 && !tournaments.error ? (
        <div className="state-panel">
          <div className="state-icon"><Medal size={22} /></div>
          <span className="text-muted">No open {gameName} tournaments right now — check back soon.</span>
        </div>
      ) : (
        <div style={GRID}>
          {lobbyForGame.map((t) => (
            <TournamentCard
              key={t.id}
              tournament={t}
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
      <h2 className="section-title">Tournaments</h2>
      <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
        Multi-entrant skill tournaments. Everyone stakes an equal entry into one pool, plays their
        game, and the top finishers split the pool minus a fixed rake.
      </p>
    </div>
  );
}
