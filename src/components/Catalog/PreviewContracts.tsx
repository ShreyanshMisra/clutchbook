import { Link2, Lock } from 'lucide-react';
import { gameById } from '../../utils/games';
import { SAMPLE_CONTRACTS, type SampleContract } from '../../utils/sampleContracts';
import { formatCurrency } from '../../utils/format';

interface PreviewContractsProps {
  gameId: string;
  /** A live-but-not-yet-linked game (chess) gets a blurred grid behind a
   *  "Link account" CTA; coming-soon games show their sample contracts in
   *  full behind a "Coming soon" banner. */
  mode: 'link' | 'soon';
  onLink?: () => void;
}

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
  gap: 14,
};

/** A single illustrative match idea. `locked` swaps the Join button for a
 *  "Coming soon" chip so the card reads as a preview, not something joinable. */
function PreviewCard({ sample, tag, locked }: { sample: SampleContract; tag: string; locked: boolean }) {
  return (
    <div className="surface-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="flex items-center justify-between">
        <span className="badge badge-phase">{tag}</span>
        <span className="font-head" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--lime)' }}>
          {formatCurrency(sample.prize)}
        </span>
      </div>
      <div className="font-head" style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.15 }}>{sample.title}</div>
      <p className="text-muted" style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>{sample.detail}</p>
      <span className="text-faint" style={{ fontSize: '0.72rem' }}>
        {formatCurrency(sample.entry)} entry · winner takes the pot
      </span>
      {locked ? (
        <div
          className="btn"
          style={{ width: '100%', justifyContent: 'center', gap: 8, padding: '10px', cursor: 'default' }}
        >
          <Lock size={13} /> Coming soon
        </div>
      ) : (
        <div className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>Join match</div>
      )}
    </div>
  );
}

/** Illustrative contract ideas shown for a game you can't build yet. */
export function PreviewContracts({ gameId, mode, onLink }: PreviewContractsProps) {
  const game = gameById(gameId);
  const tag = game?.tag ?? 'Skill';
  const samples = SAMPLE_CONTRACTS[gameId] ?? [];

  // Coming-soon games: keep the contracts fully readable so players can see
  // what's on the way; a banner makes the "not yet" status clear.
  if (mode === 'soon') {
    return (
      <div className="fade-in">
        <div className="preview-banner">
          <span className="soon-pill"><Lock size={12} /> Coming soon</span>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.86rem' }}>
            {game?.name} isn't live yet. A preview of what's coming.
          </p>
        </div>
        <div style={GRID}>
          {samples.map((s) => (
            <PreviewCard key={s.title} sample={s} tag={tag} locked />
          ))}
        </div>
      </div>
    );
  }

  // Live-but-unlinked game: an in-flow banner with a Link CTA, then the sample
  // contracts as locked previews. No absolute overlay (it must not cover the
  // game-filter bar above it).
  return (
    <div className="fade-in">
      <div className="preview-banner">
        <span className="soon-pill"><Lock size={12} /> Not linked</span>
        <p className="text-muted" style={{ margin: 0, fontSize: '0.86rem' }}>
          Link your {game?.name} account to build and price real contracts.
        </p>
        <button type="button" className="btn btn-primary" style={{ gap: 8, marginLeft: 'auto' }} onClick={onLink}>
          <Link2 size={15} /> Link account
        </button>
      </div>
      <div style={GRID}>
        {samples.map((s) => (
          <PreviewCard key={s.title} sample={s} tag={tag} locked />
        ))}
      </div>
    </div>
  );
}
