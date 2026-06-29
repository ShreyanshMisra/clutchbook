// Mirrors src/types/overlay.ts — kept separate so main-process code
// has no dependency on the renderer source tree.

export interface GameTarget {
  process: string;
  title: string;
  bounds: { x: number; y: number; width: number; height: number };
  displayId: number;
}

export type FocusCallback = (target: GameTarget) => void;
export type BlurCallback = () => void;

export interface GameDetector {
  start(): void;
  stop(): void;
  on(event: 'focus' | 'move', cb: FocusCallback): void;
  on(event: 'blur', cb: BlurCallback): void;
}
