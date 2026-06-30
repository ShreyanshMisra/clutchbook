import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import type { Contract, SkillProfile } from '../../types';
import { ContestCard } from '../Contracts/ContestCard';
import { GameTabs } from '../Catalog/GameTabs';
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
}

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
  gap: 14,
};

// Per-game lobby heading shown above the creator + open matches.
const HEADINGS: Record<string, string> = {
  'chess.lichess': 'Pick a format, objective, and entry — we match you in your rating band. Play on Lichess and the pot settles against your verified result.',
  'cs2.faceit': 'Matched in your FaceIt elo band. Set an entry, play your next CS2 match, and the pot settles against your verified FaceIt result.',
  'dota2.opendota': 'Matched in your MMR band. Set an entry, play your next Dota 2 match, and the pot settles against your verified OpenDota result.',
};

export function Lobby({
  profilesByGame, selectedGame, selectGame, gameOrder, canJoin, onJoin, onGoLink,
}: LobbyProps) {
  const linkedIds = Object.keys(profilesByGame).filter((id) => profilesByGame[id]);
  const profile = profilesByGame[selectedGame] ?? null;
  const meta = gameById(selectedGame);

  return (
    <div className="fade-in">
      <GameTabs order={gameOrder} selected={selectedGame} onSelect={selectGame} linked={linkedIds} />

      {profile ? (
        <GameLobby game={selectedGame} profile={profile} canJoin={canJoin} onJoin={onJoin} />
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
}

/** A game's head-to-head lobby: the wager creator + open matches to join. */
function GameLobby({ game, profile, canJoin, onJoin }: GameLobbyProps) {
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
        <h2 className="section-title">Create a {meta?.name ?? ''} match</h2>
        <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
          {HEADINGS[game] ?? 'Set an entry — the pot settles against your verified result.'}
        </p>
      </div>

      <Builder game={game} profile={profile} canJoin={canJoin} onJoin={onJoin} />

      <div className="flex items-center justify-between" style={{ margin: '32px 0 16px' }}>
        <div>
          <h2 className="section-title">Open matches</h2>
          <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
            Head-to-head contests in your bracket. Join one to escrow your entry.
          </p>
        </div>
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
        <div className="state-panel">
          <div className="state-icon"><Sparkles size={22} /></div>
          <span className="text-muted">No open matches right now — create one above.</span>
        </div>
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
