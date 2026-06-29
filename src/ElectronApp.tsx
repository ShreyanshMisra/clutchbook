import { useEffect, useState } from 'react';
import { ContractOverlay } from './components/Overlay/ContractOverlay';
import { getWagerForGame } from './getWagerForGame';
import type { GameTarget } from './types/overlay';

export function ElectronApp() {
  const [target, setTarget] = useState<GameTarget | null>(null);

  // Force the page background transparent so the game shows through the window.
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = 'html,body,#root{background:transparent!important}';
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Subscribe to game focus / blur events from the main process.
  useEffect(() => {
    const api = window.overlay;
    if (!api) {
      console.warn('[ElectronApp] window.overlay not found — preload may not have run.');
      return;
    }
    api.onGameFocus((t) => setTarget(t));
    api.onGameBlur(() => setTarget(null));
  }, []);

  // Click-through is now managed by onMouseEnter / onMouseLeave on the
  // ContractOverlay anchor div, so no mousemove handler is needed here.

  const content = getWagerForGame(target?.process ?? '');

  return (
    <ContractOverlay
      mode="desktop"
      target={target}
      content={content}
      onOpenContract={() => window.overlay?.openContract()}
    />
  );
}
