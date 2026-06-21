import path from 'path';
import { screen } from 'electron';
import type { GameDetector, GameTarget, FocusCallback, BlurCallback } from './types.js';

// Always treat these as games regardless of coverage.
const ALLOW = new Set([
  'robloxplayerbeta.exe',
  'cs2.exe',
  'valorant-win64-shipping.exe',
  'dota2.exe',
  'leagueoflegends.exe',
  'fortniteclient-win64-shipping.exe',
  // macOS bundle names (lowercase)
  'robloxplayer',
  'riot client',
]);

// Never treat these as games even if they fill the screen.
const DENY = new Set([
  'chrome.exe', 'msedge.exe', 'firefox.exe', 'brave.exe', 'opera.exe',
  'explorer.exe', 'dwm.exe', 'searchhost.exe', 'shellexperiencehost.exe',
  'startmenuexperiencehost.exe', 'taskmgr.exe', 'code.exe', 'cursor.exe',
  'devenv.exe', 'slack.exe', 'discord.exe', 'electron.exe', 'node.exe',
  // macOS
  'finder', 'safari', 'google chrome', 'firefox', 'arc',
  'visual studio code', 'cursor', 'slack', 'discord', 'windowserver',
]);

const POLL_MS = 750;
const COVERAGE_THRESHOLD = 0.85;

type ActiveWindowFn = () => Promise<Awaited<ReturnType<typeof import('get-windows')['activeWindow']>>>;

export class PollingDetector implements GameDetector {
  private readonly ls = {
    focus: [] as FocusCallback[],
    move:  [] as FocusCallback[],
    blur:  [] as BlurCallback[],
  };
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastExe: string | null = null;
  private lastBoundsKey: string | null = null;
  private activeWindowFn: ActiveWindowFn | null = null;
  private selfExe: string;

  constructor() {
    this.selfExe = path.basename(process.execPath).toLowerCase();
  }

  on(event: 'focus' | 'move', cb: FocusCallback): void;
  on(event: 'blur', cb: BlurCallback): void;
  on(event: string, cb: FocusCallback | BlurCallback): void {
    if (event === 'focus') this.ls.focus.push(cb as FocusCallback);
    else if (event === 'move')  this.ls.move.push(cb as FocusCallback);
    else if (event === 'blur')  this.ls.blur.push(cb as BlurCallback);
  }

  start(): void {
    void this.poll();
    this.timer = setInterval(() => void this.poll(), POLL_MS);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  // Lazy-load get-windows (ESM-only) via dynamic import — safe from CJS context.
  private async getActiveWindowFn(): Promise<ActiveWindowFn> {
    if (!this.activeWindowFn) {
      const m = await import('get-windows');
      this.activeWindowFn = m.activeWindow as ActiveWindowFn;
    }
    return this.activeWindowFn;
  }

  private async poll(): Promise<void> {
    let win: Awaited<ReturnType<ActiveWindowFn>>;
    try {
      const fn = await this.getActiveWindowFn();
      win = await fn();
    } catch {
      return;
    }

    if (!win) { this.handleBlur(); return; }

    const exe = path.basename(win.owner.path).toLowerCase();

    // Skip our own Electron process.
    if (exe === this.selfExe) { this.handleBlur(); return; }

    const wb = win.bounds;
    const display =
      screen.getDisplayMatching({ x: wb.x, y: wb.y, width: wb.width, height: wb.height }) ??
      screen.getPrimaryDisplay();

    if (!this.classify(exe, wb, display)) { this.handleBlur(); return; }

    const sf = process.platform === 'win32' ? display.scaleFactor : 1;
    const logBounds = {
      x: Math.round(wb.x / sf),
      y: Math.round(wb.y / sf),
      width:  Math.round(wb.width  / sf),
      height: Math.round(wb.height / sf),
    };
    const boundsKey = `${logBounds.x},${logBounds.y},${logBounds.width},${logBounds.height}`;

    const target: GameTarget = {
      process:   exe,
      title:     win.title,
      bounds:    logBounds,
      displayId: display.id,
    };

    if (this.lastExe !== exe) {
      this.lastExe = exe;
      this.lastBoundsKey = boundsKey;
      this.ls.focus.forEach(cb => cb(target));
    } else if (this.lastBoundsKey !== boundsKey) {
      this.lastBoundsKey = boundsKey;
      this.ls.move.forEach(cb => cb(target));
    }
  }

  private handleBlur(): void {
    if (this.lastExe !== null) {
      this.lastExe = null;
      this.lastBoundsKey = null;
      this.ls.blur.forEach(cb => cb());
    }
  }

  private classify(
    exe: string,
    bounds: { width: number; height: number },
    display: Electron.Display,
  ): boolean {
    if (DENY.has(exe)) return false;
    if (ALLOW.has(exe)) return true;
    const area = display.bounds.width * display.bounds.height;
    if (area === 0) return false;
    return (bounds.width * bounds.height) / area >= COVERAGE_THRESHOLD;
  }
}
