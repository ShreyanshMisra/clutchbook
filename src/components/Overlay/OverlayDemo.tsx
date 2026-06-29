import { ContractOverlay } from './ContractOverlay';
import { getWagerForGame } from '../../getWagerForGame';
import type { GameTarget } from '../../types/overlay';

// Static mock target — simulates a game window covering the full viewport.
const MOCK_TARGET: GameTarget = {
  process:   'FAKE.exe',
  title:     'FAKE GAME',
  bounds:    { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
  displayId: 0,
};

const backdropStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0c0c0e',
  backgroundImage: `repeating-linear-gradient(
    14deg, transparent, transparent 28px,
    rgba(255,255,255,0.025) 28px, rgba(255,255,255,0.025) 29px
  )`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  position: 'relative',
};

export function OverlayDemo() {
  return (
    <div style={backdropStyle}>
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.12)', userSelect: 'none' }}>
        <p style={{ fontSize: 48, fontFamily: 'var(--font-head,system-ui)', letterSpacing: '0.04em' }}>
          ♟ Game in progress
        </p>
        <p style={{ fontSize: 14, marginTop: 8 }}>Click the LIVE tab on the right edge</p>
      </div>

      <ContractOverlay
        mode="web"
        target={MOCK_TARGET}
        content={getWagerForGame(MOCK_TARGET.process)}
        onOpenContract={() => alert('Opening contract…')}
      />
    </div>
  );
}
