import { contextBridge, ipcRenderer } from 'electron';
import type { GameTarget } from './detector/types.js';

contextBridge.exposeInMainWorld('overlay', {
  onGameFocus: (cb: (target: GameTarget) => void) =>
    ipcRenderer.on('game:focus', (_e, target: GameTarget) => cb(target)),

  onGameBlur: (cb: () => void) =>
    ipcRenderer.on('game:blur', () => cb()),

  // Dynamically toggle click-through based on whether the cursor is over an
  // interactive element. Called on every mousemove from the renderer.
  setClickThrough: (through: boolean) =>
    ipcRenderer.send('overlay:clickThrough', through),

  openContract: () =>
    ipcRenderer.send('overlay:openContract'),
});
