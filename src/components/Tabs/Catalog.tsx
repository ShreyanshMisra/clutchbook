import { RefreshCw, Sparkles } from 'lucide-react';
import type { Contract, OddsFormat } from '../../types';
import { ContractCard } from '../Contracts/ContractCard';
import { ComingSoon } from '../Catalog/ComingSoon';

interface CatalogProps {
  catalog: Contract[];
  loading: boolean;
  error: string | null;
  format: OddsFormat;
  refresh: () => void;
  canActivate: (stake: number) => boolean;
  onActivate: (contract: Contract, stake: number) => void;
}

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
  gap: 14,
};

export function Catalog({ catalog, loading, error, format, refresh, canActivate, onActivate }: CatalogProps) {
  return (
    <div className="fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="section-title">Your Catalog</h2>
          <p className="text-faint" style={{ fontSize: '0.82rem', marginTop: 2 }}>
            Personalized skill contracts, priced from your verified Lichess stats.
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
          <span className="text-muted">No contracts available right now.</span>
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

      <ComingSoon />
    </div>
  );
}
