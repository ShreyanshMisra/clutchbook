import { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import type { Contract, SkillProfile } from '../../types';
import { ContestCard } from '../Contracts/ContestCard';
import { GameTabs } from '../Catalog/GameTabs';
import { PreviewContracts } from '../Catalog/PreviewContracts';
import { Builder } from './Builder';
import { GAMES } from '../../utils/games';

interface LobbyProps {
  profile: SkillProfile | null;
  lobby: Contract[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  canJoin: (entry: number) => boolean;
  onJoin: (contest: Contract) => void;
  onGoLink: () => void;
}

const CHESS = 'chess.lichess';

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
  gap: 14,
};

export function Lobby({
  profile, lobby, loading, error, refresh, canJoin, onJoin, onGoLink,
}: LobbyProps) {
  const chessLinked = !!profile;
  const linkedIds = chessLinked ? [CHESS] : [];
  const [selected, setSelected] = useState<string>(chessLinked ? CHESS : GAMES[0].id);

  return (
    <div className="fade-in">
      <GameTabs selected={selected} onSelect={setSelected} linked={linkedIds} />

      {selected === CHESS ? (
        chessLinked && profile ? (
          <ChessLobby
            profile={profile}
            lobby={lobby}
            loading={loading}
            error={error}
            refresh={refresh}
            canJoin={canJoin}
            onJoin={onJoin}
          />
        ) : (
          <PreviewContracts gameId={CHESS} mode="link" onLink={onGoLink} />
        )
      ) : (
        <PreviewContracts gameId={selected} mode="soon" />
      )}
    </div>
  );
}

interface ChessLobbyProps {
  profile: SkillProfile;
  lobby: Contract[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  canJoin: (entry: number) => boolean;
  onJoin: (contest: Contract) => void;
}

function ChessLobby({ profile, lobby, loading, error, refresh, canJoin, onJoin }: ChessLobbyProps) {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h2 className="section-title">Post a match</h2>
        <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
          Pick a format, objective, and entry — we match you with a player in your
          rating band. Play on Lichess and the pot settles automatically against
          your verified result.
        </p>
      </div>

      <Builder profile={profile} canJoin={canJoin} onJoin={onJoin} />

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
          <span className="text-muted">No open matches right now — post your own above.</span>
        </div>
      ) : (
        <div style={GRID}>
          {lobby.map((c) => (
            <ContestCard
              key={c.id}
              contest={c}
              canJoin={canJoin}
              onJoin={onJoin}
            />
          ))}
        </div>
      )}
    </>
  );
}
