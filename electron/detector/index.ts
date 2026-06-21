import type { GameDetector } from './types.js';
import { MockDetector } from './mock.js';
import { PollingDetector } from './polling.js';

export type { GameDetector, GameTarget, FocusCallback, BlurCallback } from './types.js';

export function createDetector(): GameDetector {
  if (process.env.OVERLAY_MOCK === '1') {
    console.log('[Detector] MockDetector selected (OVERLAY_MOCK=1)');
    return new MockDetector();
  }
  console.log('[Detector] PollingDetector selected');
  return new PollingDetector();
}
