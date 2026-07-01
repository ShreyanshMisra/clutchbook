import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import type { Contract, SettlementResult, SkillProfile, ToastVariant } from '../../types';
import type { UseWallet } from '../../hooks/useWallet';
import { ContestCard } from '../Contracts/ContestCard';
import { FindOpponent } from '../Contracts/FindOpponent';
import { GameTabs } from '../Catalog/GameTabs';
import { EmptyState } from '../UI/EmptyState';
import { PreviewContracts } from '../Catalog/PreviewContracts';
import { Builder } from './Builder';
import { gameById } from '../../utils/games';
import { fetchLobby } from '../../utils/apiClient';

interface LobbyProps {
  /** Linked profiles per game id (chess, cs2, dota); null when not linked. */
  profilesByGame: Record<string, SkillProfile | null>;
  selectedGame: string;
  selectGame: (id: string) => void;
  gameOrder: string[];
  canJoin: (entry: number) => boolean;
  onJoin: (contest: Contract) => void;
  onGoLink: () => void;
  wallet: UseWallet;
  pushToast: (t: { variant: ToastVariant; title: string; description?: string }) => void;
  showSettlement: (r: SettlementResult) => void;
}

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
  gap: 14,
};

// Per-game lobby heading shown above the creator + open matches.
const HEADINGS: Record<string, string> = {
  'chess.lichess': 'Set a format and entry. Win your next rated game to take the pot.',
  'cs2.faceit': 'Set an entry. Win your next CS2 match to take the pot.',
  'dota2.opendota': 'Set an entry. Win your next Dota 2 match to take the pot.',
};

export function Lobby({
  profilesByGame, selectedGame, selectGame, gameOrder, canJoin, onJoin, onGoLink, wallet, pushToast, showSettlement,
}: LobbyProps) {
  const linkedIds = Object.keys(profilesByGame).filter((id) => profilesByGame[id]);
  const profile = profilesByGame[selectedGame] ?? null;
  const meta = gameById(selectedGame);

  return (
    <div>
      <GameTabs order={gameOrder} selected={selectedGame} onSelect={selectGame} linked={linkedIds} />

      {profile ? (
        <GameLobby game={selectedGame} profile={profile} canJoin={canJoin} onJoin={onJoin} wallet={wallet} pushToast={pushToast} showSettlement={showSettlement} />
      ) : meta?.live ? (
        <PreviewContracts gameId={selectedGame} mode="link" onLink={onGoLink} />
      ) : (
        <PreviewContracts gameId={selectedGame} mode="soon" />
      )}
    </div>
  );
}

interface GameLobbyProps {
  game: string;
  profile: SkillProfile;
  canJoin: (entry: number) => boolean;
  onJoin: (contest: Contract) => void;
  wallet: UseWallet;
  pushToast: (t: { variant: ToastVariant; title: string; description?: string }) => void;
  showSettlement: (r: SettlementResult) => void;
}

/** A game's head-to-head lobby: real matchmaking, the wager creator, and open (bot) matches. */
function GameLobby({ game, profile, canJoin, onJoin, wallet, pushToast, showSettlement }: GameLobbyProps) {
  const [lobby, setLobby] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchLobby(profile.username, game)
      .then((res) => setLobby(res.contests))
      .catch((err: Error) => setError(err.message || 'Failed to load matches'))
      .finally(() => setLoading(false));
  }, [profile.username, game]);

  useEffect(refresh, [refresh]);

  const meta = gameById(game);

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h2 className="section-title">{meta?.name ?? ''} head-to-head</h2>
        <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
          {HEADINGS[game] ?? 'Set an entry. Win your match to take the pot.'}
        </p>
      </div>

      <FindOpponent game={game} profile={profile} wallet={wallet} pushToast={pushToast} showSettlement={showSettlement} />

      <div style={{ margin: '28px 0 12px' }}>
        <h3 className="section-title">Or create a custom match</h3>
        <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
          Set your own terms against a bracketed practice opponent.
        </p>
      </div>

      <Builder game={game} profile={profile} canJoin={canJoin} onJoin={onJoin} />

      <div className="flex items-center justify-between" style={{ margin: '32px 0 16px' }}>
        <h2 className="section-title">Open matches</h2>
        <button type="button" className="btn btn-ghost" style={{ gap: 8, fontSize: '0.82rem' }} onClick={refresh}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {error && (
        <div className="state-panel" style={{ marginBottom: 14 }}>
          <span className="text-crimson">{error}</span>
          <button type="button" className="btn" onClick={refresh}>Retry</button>
        </div>
      )}

      {loading && lobby.length === 0 ? (
        <div style={GRID}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 280 }} />
          ))}
        </div>
      ) : lobby.length === 0 && !error ? (
        <EmptyState icon={Sparkles} message="No open matches yet. Create one above." />
      ) : (
        <div style={GRID}>
          {lobby.map((c) => (
            <ContestCard key={c.id} contest={c} canJoin={canJoin} onJoin={onJoin} />
          ))}
        </div>
      )}
    </>
  );
}
