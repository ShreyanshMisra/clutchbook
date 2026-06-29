import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import type { Contract, SkillProfile } from '../../types';
import { ContestCard } from '../Contracts/ContestCard';
import { GameTabs } from '../Catalog/GameTabs';
import { PreviewContracts } from '../Catalog/PreviewContracts';
import { Builder } from './Builder';
import { GAMES } from '../../utils/games';
import { fetchLobby } from '../../utils/apiClient';

interface LobbyProps {
  profile: SkillProfile | null;
  faceitProfile: SkillProfile | null;
  lobby: Contract[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  canJoin: (entry: number) => boolean;
  onJoin: (contest: Contract) => void;
  onGoLink: () => void;
}

const CHESS = 'chess.lichess';
const CS2 = 'cs2.faceit';

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
  gap: 14,
};

export function Lobby({
  profile, faceitProfile, lobby, loading, error, refresh, canJoin, onJoin, onGoLink,
}: LobbyProps) {
  const chessLinked = !!profile;
  const cs2Linked = !!faceitProfile;
  const linkedIds = [chessLinked ? CHESS : null, cs2Linked ? CS2 : null].filter(Boolean) as string[];
  const [selected, setSelected] = useState<string>(chessLinked ? CHESS : cs2Linked ? CS2 : GAMES[0].id);

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
      ) : selected === CS2 ? (
        cs2Linked && faceitProfile ? (
          <CS2Lobby profile={faceitProfile} canJoin={canJoin} onJoin={onJoin} />
        ) : (
          <PreviewContracts gameId={CS2} mode="link" onLink={onGoLink} />
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

      <OpenMatches
        lobby={lobby}
        loading={loading}
        error={error}
        refresh={refresh}
        canJoin={canJoin}
        onJoin={onJoin}
      />
    </>
  );
}

interface CS2LobbyProps {
  profile: SkillProfile;
  canJoin: (entry: number) => boolean;
  onJoin: (contest: Contract) => void;
}

/** CS2 head-to-head: open matches fetched live for the linked FaceIt account. */
function CS2Lobby({ profile, canJoin, onJoin }: CS2LobbyProps) {
  const [lobby, setLobby] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchLobby(profile.username, CS2)
      .then((res) => setLobby(res.contests))
      .catch((err: Error) => setError(err.message || 'Failed to load matches'))
      .finally(() => setLoading(false));
  }, [profile.username]);

  useEffect(refresh, [refresh]);

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h2 className="section-title">Counter-Strike 2 — head-to-head</h2>
        <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
          Matched in your FaceIt elo band. Join one, play your next CS2 match, and the pot
          settles automatically against your verified FaceIt result.
        </p>
      </div>
      <OpenMatches lobby={lobby} loading={loading} error={error} refresh={refresh} canJoin={canJoin} onJoin={onJoin} />
    </>
  );
}

interface OpenMatchesProps {
  lobby: Contract[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  canJoin: (entry: number) => boolean;
  onJoin: (contest: Contract) => void;
}

function OpenMatches({ lobby, loading, error, refresh, canJoin, onJoin }: OpenMatchesProps) {
  return (
    <>
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
          <span className="text-muted">No open matches right now — check back soon.</span>
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
