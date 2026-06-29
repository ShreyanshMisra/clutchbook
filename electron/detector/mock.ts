import { globalShortcut, screen } from 'electron';
import type { GameDetector, GameTarget, FocusCallback, BlurCallback } from './types.js';

export class MockDetector implements GameDetector {
  private readonly ls = {
    focus: [] as FocusCallback[],
    move:  [] as FocusCallback[],
    blur:  [] as BlurCallback[],
  };
  private isFocused = false;

  on(event: 'focus' | 'move', cb: FocusCallback): void;
  on(event: 'blur', cb: BlurCallback): void;
  on(event: string, cb: FocusCallback | BlurCallback): void {
    if (event === 'focus') this.ls.focus.push(cb as FocusCallback);
    else if (event === 'move')  this.ls.move.push(cb as FocusCallback);
    else if (event === 'blur')  this.ls.blur.push(cb as BlurCallback);
  }

  start(): void {
    const primary = screen.getPrimaryDisplay();

    const reg = (accel: string, fn: () => void) => {
      const ok = globalShortcut.register(accel, fn);
      if (!ok) console.warn(`[MockDetector] Could not register ${accel}`);
    };

    // Ctrl+Alt+F  focus on primary display bounds
    reg('CommandOrControl+Alt+F', () => {
      this.simulateFocus({
        process: 'FAKE.exe',
        title: 'FAKE GAME',
        bounds: primary.bounds,
        displayId: primary.id,
      });
    });

    // Ctrl+Alt+B  blur
    reg('CommandOrControl+Alt+B', () => this.simulateBlur());

    // Ctrl+Alt+1  force 1920×1080 at display origin
    reg('CommandOrControl+Alt+1', () => {
      this.simulateFocus({
        process: 'FAKE.exe',
        title: 'FAKE GAME 1080p',
        bounds: { x: primary.bounds.x, y: primary.bounds.y, width: 1920, height: 1080 },
        displayId: primary.id,
      });
    });

    // Ctrl+Alt+2  force 2560×1440
    reg('CommandOrControl+Alt+2', () => {
      this.simulateFocus({
        process: 'FAKE.exe',
        title: 'FAKE GAME 1440p',
        bounds: { x: primary.bounds.x, y: primary.bounds.y, width: 2560, height: 1440 },
        displayId: primary.id,
      });
    });

    // Ctrl+Alt+M  move to secondary monitor (or same primary if only one display)
    reg('CommandOrControl+Alt+M', () => {
      const displays = screen.getAllDisplays();
      const secondary = displays.find(d => d.id !== primary.id) ?? primary;
      this.simulateMove({
        process: 'FAKE.exe',
        title: 'FAKE GAME (secondary)',
        bounds: secondary.bounds,
        displayId: secondary.id,
      });
    });

    console.log('\n[MockDetector] Hotkeys active:');
    console.log('  Ctrl+Alt+F  – simulate game focus (primary display)');
    console.log('  Ctrl+Alt+B  – simulate game blur');
    console.log('  Ctrl+Alt+1  – simulate 1920×1080');
    console.log('  Ctrl+Alt+2  – simulate 2560×1440');
    console.log('  Ctrl+Alt+M  – move to secondary monitor\n');
  }

  stop(): void {
    globalShortcut.unregisterAll();
  }

  simulateFocus(target: GameTarget): void {
    console.log(`[MockDetector] focus → ${target.process} ${JSON.stringify(target.bounds)}`);
    this.isFocused = true;
    this.ls.focus.forEach(cb => cb(target));
  }

  simulateBlur(): void {
    if (!this.isFocused) return;
    console.log('[MockDetector] blur');
    this.isFocused = false;
    this.ls.blur.forEach(cb => cb());
  }

  simulateMove(target: GameTarget): void {
    console.log(`[MockDetector] move → ${JSON.stringify(target.bounds)}`);
    this.ls.move.forEach(cb => cb(target));
  }
}
