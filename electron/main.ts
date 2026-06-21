import { app, BrowserWindow, ipcMain, screen, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDetector } from './detector/index.js';
import type { GameTarget } from './detector/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== 'production';

let overlay: BrowserWindow | null = null;

function buildOverlay(): BrowserWindow {
  const win = new BrowserWindow({
    transparent: true,
    backgroundColor: '#00000000', // force composited transparency
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    show: false,
    // Start at full primary display; we resize on game focus.
    ...screen.getPrimaryDisplay().bounds,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Sit above all windows including fullscreen ones.
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Start click-through. `forward: true` still delivers mousemove to the
  // renderer so it can call setClickThrough(false) when the cursor enters
  // an interactive element (tab / card).
  win.setIgnoreMouseEvents(true, { forward: true });

  const url = isDev
    ? 'http://localhost:5173/?electron=1'
    : `file://${path.join(__dirname, '../dist/index.html')}?electron=1`;

  win.loadURL(url);

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  return win;
}

function applyGameBounds(target: GameTarget): void {
  if (!overlay) return;
  // target.bounds is already in logical pixels (PollingDetector handles DPI).
  overlay.setBounds({
    x:      target.bounds.x,
    y:      target.bounds.y,
    width:  target.bounds.width,
    height: target.bounds.height,
  });
}

app.whenReady().then(() => {
  overlay = buildOverlay();

  const detector = createDetector();

  detector.on('focus', (target) => {
    if (!overlay) return;
    applyGameBounds(target);
    overlay.showInactive(); // show WITHOUT stealing focus from the game
    overlay.webContents.send('game:focus', target);
    console.log(`[Main] game:focus → ${target.process}`);
  });

  detector.on('move', (target) => {
    if (!overlay) return;
    applyGameBounds(target);
    overlay.webContents.send('game:focus', target); // renderer re-renders with same target
    console.log(`[Main] game:move → ${JSON.stringify(target.bounds)}`);
  });

  detector.on('blur', () => {
    if (!overlay) return;
    overlay.hide();
    overlay.webContents.send('game:blur');
    console.log('[Main] game:blur');
  });

  // Renderer fires this on every mousemove with whether the cursor is over
  // an interactive element. Toggling per-move is fast; IPC overhead is ~0.1ms.
  ipcMain.on('overlay:clickThrough', (_e, through: boolean) => {
    if (!overlay) return;
    if (through) {
      overlay.setIgnoreMouseEvents(true, { forward: true });
    } else {
      overlay.setIgnoreMouseEvents(false);
    }
  });

  ipcMain.on('overlay:openContract', () => {
    // Open the Clutchbook web app in the default browser.
    // In production this will be the deployed URL; localhost for dev.
    const url = isDev ? 'http://localhost:5173' : 'https://clutchbook.app';
    void shell.openExternal(url);
    console.log(`[Main] openContract → ${url}`);
  });

  detector.start();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  overlay = null;
});
