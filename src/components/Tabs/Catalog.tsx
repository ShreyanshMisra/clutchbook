import { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import type { Contract, OddsFormat, SkillProfile } from '../../types';
import { ContractCard } from '../Contracts/ContractCard';
import { GameTabs } from '../Catalog/GameTabs';
import { PreviewContracts } from '../Catalog/PreviewContracts';
import { Builder } from './Builder';
import { GAMES } from '../../utils/games';

interface CatalogProps {
  profile: SkillProfile | null;
  catalog: Contract[];
  loading: boolean;
  error: string | null;
  format: OddsFormat;
  refresh: () => void;
  canActivate: (stake: number) => boolean;
  onActivate: (contract: Contract, stake: number) => void;
  onGoLink: () => void;
}

const CHESS = 'chess.lichess';

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
  gap: 14,
};

export function Catalog({
  profile, catalog, loading, error, format, refresh, canActivate, onActivate, onGoLink,
}: CatalogProps) {
  const chessLinked = !!profile;
  const linkedIds = chessLinked ? [CHESS] : [];
  // Default to the linked game if there is one, else the first title.
  const [selected, setSelected] = useState<string>(chessLinked ? CHESS : GAMES[0].id);

  return (
    <div className="fade-in">
      <GameTabs selected={selected} onSelect={setSelected} linked={linkedIds} />

      {selected === CHESS ? (
        chessLinked && profile ? (
          <ChessCatalog
            profile={profile}
            catalog={catalog}
            loading={loading}
            error={error}
            format={format}
            refresh={refresh}
            canActivate={canActivate}
            onActivate={onActivate}
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

interface ChessCatalogProps {
  profile: SkillProfile;
  catalog: Contract[];
  loading: boolean;
  error: string | null;
  format: OddsFormat;
  refresh: () => void;
  canActivate: (stake: number) => boolean;
  onActivate: (contract: Contract, stake: number) => void;
}

function ChessCatalog({ profile, catalog, loading, error, format, refresh, canActivate, onActivate }: ChessCatalogProps) {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h2 className="section-title">Build a Contract</h2>
        <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
          Pick your games and an objective — the house prices it instantly. Play, and it settles
          automatically against your verified results.
        </p>
      </div>

      <Builder profile={profile} format={format} canActivate={canActivate} onActivate={onActivate} />

      <div className="flex items-center justify-between" style={{ margin: '32px 0 16px' }}>
        <div>
          <h2 className="section-title">Suggested for you</h2>
          <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
            Personalized contracts, priced from your verified stats.
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

      {loading && catalog.length === 0 ? (
        <div style={GRID}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 260 }} />
          ))}
        </div>
      ) : catalog.length === 0 && !error ? (
        <div className="state-panel">
          <div className="state-icon"><Sparkles size={22} /></div>
          <span className="text-muted">No suggestions right now — build your own above.</span>
        </div>
      ) : (
        <div style={GRID}>
          {catalog.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              format={format}
              canActivate={canActivate}
              onActivate={onActivate}
            />
          ))}
        </div>
      )}
    </>
  );
}
