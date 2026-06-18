import { Link2, Lock } from 'lucide-react';
import { gameById } from '../../utils/games';
import { SAMPLE_CONTRACTS } from '../../utils/sampleContracts';

interface PreviewContractsProps {
  gameId: string;
  /** A live-but-not-yet-linked game (chess) gets a "Link account" CTA;
   *  coming-soon games get a "Coming soon" lock. */
  mode: 'link' | 'soon';
  onLink?: () => void;
}

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
  gap: 14,
};

/** Blurred, illustrative contract ideas shown for a game you can't build yet. */
export function PreviewContracts({ gameId, mode, onLink }: PreviewContractsProps) {
  const game = gameById(gameId);
  const samples = SAMPLE_CONTRACTS[gameId] ?? [];

  return (
    <div className="preview-wrap">
      <div className="blur-content" style={GRID} aria-hidden>
        {samples.map((s) => (
          <div key={s.title} className="surface-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="flex items-center justify-between">
              <span className="badge badge-phase">{game?.tag ?? 'Skill'}</span>
              <span className="font-head" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--lime)' }}>
                {s.multiplier.toFixed(2)}×
              </span>
            </div>
            <div className="font-head" style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.15 }}>{s.title}</div>
            <p className="text-muted" style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>{s.detail}</p>
            <div className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>Activate</div>
          </div>
        ))}
      </div>

      <div className="preview-overlay">
        {mode === 'link' ? (
          <>
            <span className="soon-pill" style={{ marginBottom: 12 }}><Lock size={12} /> Not linked</span>
            <p className="text-muted" style={{ marginBottom: 14, textAlign: 'center', maxWidth: 320 }}>
              Link your {game?.name} account to build and price real contracts.
            </p>
            <button type="button" className="btn btn-primary" style={{ gap: 8 }} onClick={onLink}>
              <Link2 size={15} /> Link account
            </button>
          </>
        ) : (
          <>
            <span className="soon-pill" style={{ marginBottom: 12 }}><Lock size={12} /> Coming soon</span>
            <p className="text-muted" style={{ textAlign: 'center', maxWidth: 320 }}>
              {game?.name} contracts are on the way. Here's a taste of what you'll be able to build.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
