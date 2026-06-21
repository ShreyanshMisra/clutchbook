import type { GameTarget } from './types/overlay';

interface OverlayBridge {
  onGameFocus(cb: (target: GameTarget) => void): void;
  onGameBlur(cb: () => void): void;
  setClickThrough(through: boolean): void;
  openContract(): void;
}

declare global {
  interface Window {
    overlay?: OverlayBridge;
  }
}

export {};
