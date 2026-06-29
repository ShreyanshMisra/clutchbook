# Clutchbook — Technical Implementation Reference

> The product overview lives in [`overview.md`](./overview.md). This document is
> for engineers. It describes what's built, how the pieces connect, and why
> certain decisions were made the way they were. Skip any section you already
> know.

---

## Stack

| Thing | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (layout utilities) + CSS variables (design tokens) |
| Animation | Framer Motion |
| Desktop overlay | Electron |
| OS window detection | `get-windows` (ESM-only npm package) |
| Icons | Lucide React |
| Charts | Recharts |
| Build (web) | `vite` |
| Build (electron) | `vite-plugin-electron/simple` via a second Vite config |
| Cross-platform env vars | `cross-env` |

---

## Entry points

`src/main.tsx` reads the URL query string and picks which React root to mount:

```
?electron=1  →  ElectronApp   transparent overlay renderer
?overlay     →  OverlayDemo   fake game backdrop for isolated widget testing
(nothing)    →  App           full web app
```

All three share one Vite dev server on port 5173 and the same `index.css`.
There is no separate bundler config for the overlay demo — it's just a route.

---

## How to run

```bash
# Web app only (no Electron)
npm run dev

# Electron overlay, mock game detector (no game required)
npm run electron:dev:mock
# hotkeys: Ctrl+Alt+F = focus, Ctrl+Alt+B = blur, Ctrl+Alt+1/2 = bounds, Ctrl+Alt+M = second monitor

# Electron overlay, real detector (launch a borderless windowed game)
npm run electron:dev
```

---

## Project layout

```
/src
  App.tsx                   Web app root — owns top-level state, wires hooks
  main.tsx                  Entry; routes to App / ElectronApp / OverlayDemo
  ElectronApp.tsx           Overlay renderer root
  getWagerForGame.ts        Seam: process name → ContractContent (currently returns demo data)
  electron.d.ts             Window augmentation — declares window.overlay for TS
  types/
    index.ts                Domain types (Contract, SkillProfile, Line, Objective…)
    overlay.ts              GameTarget + ContractContent (shared between /src and /electron)
  hooks/
    useWallet.ts            Play-money wallet (available / pending / locked buckets)
    useContracts.ts         Catalog fetch, activation, settlement polling
    useProfile.ts           Lichess account link / unlink
    useToasts.ts            Toast notification queue
  utils/
    oddsFormatter.ts        formatCurrency, formatMultiplier, formatLine, potentialPayout
    contractText.ts         objectiveDetail(), windowLabel() — human-readable objective strings
    games.ts                GAMES constant — game metadata, supported formats, color themes
    sampleContracts.ts      Static demo contracts (shown before a real account is linked)
    apiClient.ts            Thin fetch wrapper for the FastAPI backend
    storage.ts              localStorage get/set with JSON round-trip
  components/
    Layout/                 Header, Sidebar
    Tabs/                   One component per nav tab
    Catalog/                GameTabs, PreviewContracts
    Contracts/              ContractCard (catalog), ActiveContractCard (active)
    Onboarding/             Landing (the pre-auth brand wall)
    UI/                     Badge, Skeleton, Sparkline, Toast
    Overlay/
      ContractOverlay.tsx   The tab↔card widget — works in web and desktop modes
      OverlayDemo.tsx       Fake game backdrop for isolated widget testing

/electron
  main.ts                   BrowserWindow setup, IPC handlers, detector wiring
  preload.ts                contextBridge — exposes window.overlay to the renderer
  detector/
    types.ts                GameDetector interface + GameTarget type definitions
    polling.ts              PollingDetector — calls get-windows every 750ms
    mock.ts                 MockDetector — globalShortcut hotkeys, zero OS calls
    index.ts                Factory: OVERLAY_MOCK=1 → MockDetector, else PollingDetector

/docs
  overview.md               Product overview (what Clutchbook is, compliance, monetization)
  roadmap.md                Build milestones and success criteria
  IMPLEMENTATION.md         This file
```

---

## Web app

### App.tsx

Thin coordinator. Owns `activeTab`, `oddsFormat` (american/decimal toggle),
and `started` (mock auth gate). The actual content lives in tab components;
`App` just picks which one to render and routes cross-cutting concerns (wallet
balance, toast callbacks, settlement events) to them.

`oddsFormat` is passed as a prop rather than Context. Context is a footgun for
something this simple — prop threading is fine when the tree is one level deep.

`started` is a boolean in localStorage. When false, the user sees `<Landing />`
with a Start button. Clicking it sets `started=true`. There is no real session;
this is demo-mode scaffolding.

### Types (`src/types/index.ts`)

Mirrors the FastAPI Pydantic schemas. Key ones:

**`Contract`** — the core object. Carries `state` (`OFFERED → ACTIVE →
RESOLVING → SETTLED | EXPIRED`), a `line`, an `objective`, and
`qualifying_game_ids` (populated post-resolution when the backend matches
games played against the contract window).

**`Line`** — the pricing bundle per contract: `decimal`, `american`,
`implied_prob`, `fair_decimal`, `fair_prob`, `house_edge_pct`. The fair values
exist specifically so every card can show the "fair value Xx · house edge Y%"
disclosure. This is required by the product (see `overview.md §10.4`).

**`Objective`** — structured representation of what the contract asks the player
to do. The renderer calls `contractText.ts` to turn it into a human sentence.

**`SkillProfile`** — what comes back after linking a chess account: rating per
time control, win rate, total games, account age. Drives the personalized line
generation on the backend.

### Hooks

**`useWallet`** — three-bucket play-money wallet. `available` (spendable),
`pending` (staked and in flight), `locked` (reserved — not currently written to,
exists for future daily-limit enforcement). State persists to localStorage.
`commitStake` moves available → pending. `applySettlement` releases pending and
credits the payout. `canActivate(stake)` checks both available balance and the
daily loss cap (default $200). The displayed balance animates via a
`requestAnimationFrame` lerp loop — purely cosmetic.

**`useContracts`** — manages three lists: `catalog` (offered, fetched from
API), `active` (user-activated), `settled` (resolved history). Runs a
`setInterval` every 10 seconds for each active contract, hitting `/settle` on
the backend to check if it resolved. Fires `onSettle(result)` when it does,
which the App routes to wallet settlement and a toast.

**`useProfile`** — manages the Lichess account link. `link(username)` calls
the backend and returns a `SkillProfile`. `unlink()` clears it. No OAuth flow
in Phase 1 demo; username-only claim. Both operations reflect immediately in
local state.

### Odds formatting (`utils/oddsFormatter.ts`)

`formatCurrency` uses `Intl.NumberFormat` with `style: 'currency'`. Never
hand-roll currency strings. `formatLine` picks american or decimal based on the
user's toggle. `potentialPayout(stake, decimal)` is `stake * decimal` — the
only math in the frontend; everything else comes from the backend.

### Design tokens

All tokens live in `:root` in `index.css`. Tailwind handles layout; tokens
handle colour, typography, surface. Key tokens:

```
--bg          #0a0b0f   page background
--surface     #13151c   card / panel surface
--lime        #a3e635   brand / CTA
--pos         #34d399   financial positive (win / payout) — intentionally distinct from lime
--crimson     #ff4d4d   financial negative / LIVE indicator
--text-muted  #9aa1b4
--font-head   Barlow Condensed
--font-body   DM Sans
```

Lime is identity and interactive affordances. Emerald green (`--pos`) is
financial outcomes. They're close enough to look related but distinct enough to
mean different things. Do not use lime for "you won."

### Sample contracts (`utils/sampleContracts.ts`)

Static demo data shown before the user links an account. `PreviewContracts`
renders these with a blur-and-CTA overlay. They're shaped exactly like real
`Contract` objects so no conditional rendering is needed in the card component.

---

## Overlay widget (`src/components/Overlay/ContractOverlay.tsx`)

The tab↔card widget. Renders in both web and Electron contexts unchanged.

### Props

```ts
interface ContractOverlayProps {
  target:          GameTarget | null;   // null = no game detected → renders nothing
  content:         ContractContent;     // what to show in the expanded card
  mode?:           'web' | 'desktop';   // desktop mode enables drag region + click-through IPC
  onOpenContract?: () => void;          // called when the CTA button is clicked
}
```

`target` drives existence. When null, the component returns null. In Electron
mode, main already hid the window at this point — the renderer just cleans up
local state.

### State

One boolean: `expanded`. Collapsed by default. Tab click → expanded. X click →
collapsed. That's the entire state machine.

### Layout — the important decision

The tab and card are in separate `AnimatePresence` blocks. Each has its own
`position: absolute; top: 50%; y: '-50%'` — centering themselves against the
full-screen root div, not against each other.

The earlier approach used a shared anchor div with `transform: translateY(-50%)`.
When the div's height changed from ~80px (tab) to ~420px (card), the browser
recomputed the anchor's position and the whole thing jumped. The fix is to
never share an anchor across elements with different heights.

`y: '-50%'` must be a Framer Motion motion value (in the `style` prop), not a
CSS string in `initial`/`animate`. Framer composes its own `transform` string;
if you put `translateY(-50%)` in a CSS property separately, they compete and
produce garbage.

`AnimatePresence` has no `mode` prop — simultaneous exit/enter cross-fade. The
`mode="wait"` approach (exit then enter) introduced a ~300ms gap where neither
element existed. The cross-fade has no gap.

### Click-through in desktop mode

Default state: `setIgnoreMouseEvents(true, { forward: true })` — clicks pass
through to the game, but mouse-move events still reach the renderer because of
`forward: true`.

Both the tab and the expanded card have `onMouseEnter` / `onMouseLeave` handlers:

```ts
onMouseEnter={() => window.overlay?.setClickThrough(false)}
onMouseLeave={() => window.overlay?.setClickThrough(true)}
```

These IPC calls arrive well before any click, so there's no race condition. The
earlier `elementFromPoint` approach (checked on every mousemove) had a race:
click could arrive before main processed the "enable clicks" IPC message.
Enter/leave events don't have this problem.

### `-webkit-app-region` gotcha

The card header has `-webkit-app-region: drag` in desktop mode so the user can
drag the overlay around. Any element inside a drag region is silently
non-functional in Electron — the window manager eats the pointer events before
they reach the DOM. The close button (and any future interactive element in the
header) must explicitly set `-webkit-app-region: no-drag`.

### Animation

One spring constant shared by all transitions:
```ts
const SPRING = { type: 'spring', stiffness: 320, damping: 28, mass: 0.8 }
```

Symmetric feel on enter and exit because they use the same config.

The live dot animates both `opacity` and `scale`:
```ts
animate={{ opacity: [1, 0.2, 1], scale: [1, 0.75, 1] }}
```
Opacity-only looked too flat.

---

## Electron overlay

### Architecture

```
OS foreground-window API
        │  (polled every 750ms)
        ▼
  GameDetector (interface)
  PollingDetector or MockDetector
        │
        │  'focus' / 'move' / 'blur' events
        ▼
  electron/main.ts
        │  setBounds  →  overlay window repositions to cover the game
        │  showInactive / hide
        │  IPC send → renderer
        ▼
  transparent BrowserWindow
        │
        ▼
  React → ElectronApp → ContractOverlay
```

The overlay is a sibling OS window sitting above the game. It is never injected
into the game process. The game must be in borderless windowed mode; exclusive
fullscreen occupies a dedicated GPU plane that no OS overlay window can sit above.

### The BrowserWindow

```ts
new BrowserWindow({
  transparent: true,
  backgroundColor: '#00000000',   // must accompany transparent: true to force compositing
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  focusable: false,               // clicks don't pull focus from the game
  hasShadow: false,
  show: false,
  ...screen.getPrimaryDisplay().bounds,
  webPreferences: {
    preload: path.join(__dirname, 'preload.mjs'),
    contextIsolation: true,
    nodeIntegration: false,
  },
})
win.setAlwaysOnTop(true, 'screen-saver')           // above fullscreen apps
win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
win.setIgnoreMouseEvents(true, { forward: true })  // click-through by default
```

`backgroundColor: '#00000000'` is required in addition to `transparent: true`.
Without it, the compositor may paint a solid black background behind the
renderer, which is why an earlier version showed a black screen.

`showInactive()` is used when a game is detected — it makes the window visible
without stealing keyboard focus from the game. `show()` would focus the overlay.

`focusable: false` prevents clicks on the overlay from activating it. Side
effect: the window can never receive keyboard events. Fine for now. If a text
input is ever added to the overlay, this will need to change.

### IPC channels

| Channel | Direction | What it carries |
|---|---|---|
| `game:focus` | main → renderer | `GameTarget` (process, title, bounds, displayId) |
| `game:blur` | main → renderer | nothing |
| `overlay:clickThrough` | renderer → main | `boolean` — enable/disable click-through |
| `overlay:openContract` | renderer → main | nothing — main opens the browser |

`contextBridge` in `preload.ts` wraps these as `window.overlay.*`. The renderer
has no access to `ipcRenderer` or Node.js directly.

### `preload.ts`

```ts
contextBridge.exposeInMainWorld('overlay', {
  onGameFocus: (cb) => ipcRenderer.on('game:focus', (_, target) => cb(target)),
  onGameBlur:  (cb) => ipcRenderer.on('game:blur', () => cb()),
  setClickThrough: (through: boolean) => ipcRenderer.send('overlay:clickThrough', through),
  openContract: () => ipcRenderer.send('overlay:openContract'),
});
```

`window.overlay` is typed in `src/electron.d.ts` so the renderer gets
autocomplete and type checking without importing from the `electron/` directory
(which would pull Node.js types into the browser bundle).

### `ElectronApp.tsx`

```ts
export function ElectronApp() {
  const [target, setTarget] = useState<GameTarget | null>(null);

  // Inject transparent background — the global index.css sets --bg:#0a0b0f;
  // this overrides it so the game shows through the window.
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = 'html,body,#root{background:transparent!important}';
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    const api = window.overlay;
    if (!api) return;
    api.onGameFocus((t) => setTarget(t));
    api.onGameBlur(() => setTarget(null));
  }, []);

  return (
    <ContractOverlay mode="desktop" target={target}
      content={getWagerForGame(target?.process ?? '')}
      onOpenContract={() => window.overlay?.openContract()} />
  );
}
```

The background injection is done in a useEffect rather than a CSS file because
the overlay renderer and the web app share the same `index.css`. The web app
needs `--bg: #0a0b0f`; the overlay needs transparency. Injecting the style at
runtime on the `?electron=1` route is the cleanest way to avoid a build-time
split.

---

## Game detection

### Interface (`electron/detector/types.ts`)

```ts
export interface GameTarget {
  process:  string;
  title:    string;
  bounds:   { x: number; y: number; width: number; height: number };
  displayId: number;
}
export interface GameDetector {
  start(): void;
  stop():  void;
  on(event: 'focus' | 'move', cb: (target: GameTarget) => void): void;
  on(event: 'blur',           cb: () => void): void;
}
```

### PollingDetector (`electron/detector/polling.ts`)

Calls `get-windows`' `activeWindow()` every 750ms. Classification runs in order:

1. Skip if the foreground process is our own Electron binary.
2. If exe name is in the **DENY list** → not a game. Stop.
3. If exe name is in the **ALLOW list** → game. Done.
4. Otherwise: compute `(window area) / (display area)`. If ≥ 85% → game.

DENY list includes browsers (Chrome, Edge, Firefox, Brave), common desktop apps
(Explorer, DWM, Slack, Discord, VS Code, Cursor, DevEnv), and Electron/Node
itself. This list stops the overlay triggering on a maximized browser.

ALLOW list includes the known game executables: `cs2.exe`, `valorant-win64-
shipping.exe`, `dota2.exe`, `leagueoflegends.exe`, `fortniteclient-win64-
shipping.exe`, `robloxplayerbeta.exe` (+ macOS equivalents). If a game isn't
in ALLOW and isn't in DENY, the 85% heuristic catches it as long as it runs
borderless fullscreen.

**DPI fix (Windows):** `get-windows` returns bounds in physical pixels. Electron's
`setBounds` takes logical pixels. The detector divides `x`, `y`, `width`,
`height` by `display.scaleFactor` before emitting the `GameTarget`. Without
this, the overlay is positioned at double the correct coordinates on hi-DPI
displays.

**ESM lazy load:** `get-windows` is ESM-only. The main process bundle is CJS
(output of `vite-plugin-electron`). The package is listed as external in the
Vite config so it stays unresolved in the bundle, and the detector loads it via
dynamic `import()` on the first poll call. The result is cached. CJS can
`import()` ESM; it just can't `require()` it.

### MockDetector (`electron/detector/mock.ts`)

Registers Electron `globalShortcut` hotkeys. Fires the same events the real
detector would. Zero OS calls; no game required. Used with
`npm run electron:dev:mock`.

| Hotkey | Effect |
|---|---|
| Ctrl+Alt+F | Focus: simulates game at primary display bounds |
| Ctrl+Alt+B | Blur |
| Ctrl+Alt+1 | Simulate 1920×1080 at display origin |
| Ctrl+Alt+2 | Simulate 2560×1440 at display origin |
| Ctrl+Alt+M | Move to secondary monitor (falls back to primary if one display) |

### Factory (`electron/detector/index.ts`)

```ts
export function createDetector(): GameDetector {
  if (process.env.OVERLAY_MOCK === '1') return new MockDetector();
  return new PollingDetector();
}
```

### Content seam (`src/getWagerForGame.ts`)

```ts
export function getWagerForGame(process: string): ContractContent {
  return DEMO_CONTENT; // TODO: branch by process name
}
```

This is the only file that needs to change when per-game contracts are wired up.
Eventually this will call the backend. For now it returns a static demo contract.
`windowEndsAt` in the demo data is `Date.now() + 12m34s` computed at module
load time — it counts down correctly until you've had the app open for 12
minutes.

---

## Build system

### Vite configs

There are two Vite configs:

- `vite.config.ts` (or implicit default) — web app only. Standard Vite + React.
- `vite.electron.config.ts` — web app + Electron main + preload.

The Electron config is async because `vite-plugin-electron/simple` returns
`Promise<Plugin[]>`:

```ts
export default defineConfig(async () => ({
  plugins: [react(), ...(await electron({
    main: {
      entry: 'electron/main.ts',
      vite: { build: { rollupOptions: { external: ['get-windows', 'electron'] } } }
    },
    preload: {
      input: 'electron/preload.ts',
      vite: { build: { rollupOptions: { external: ['electron'] } } }
    },
  }))],
  server: { port: 5173 },
}));
```

`get-windows` and `electron` are externalized — they live in `node_modules` at
runtime and must not be inlined into the bundle. `get-windows` is ESM-only and
would break if bundled into CJS. `electron` is a native Electron module that
can't be bundled anyway.

### TypeScript

Two tsconfig files:

- `tsconfig.json` — renderer. `module: ESNext`, `lib: DOM`.
- `tsconfig.electron.json` — main process. `module: ES2022`, `moduleResolution:
  bundler`. The electron/ directory must not include DOM types.

### `package.json` scripts

```json
"main": "dist-electron/main.js",
"dev": "vite",
"electron:dev": "vite --config vite.electron.config.ts",
"electron:dev:mock": "cross-env OVERLAY_MOCK=1 vite --config vite.electron.config.ts",
"electron:build": "vite build --config vite.electron.config.ts"
```

`cross-env` is required on Windows. `OVERLAY_MOCK=1` in a plain npm script
(`set OVERLAY_MOCK=1 && ...`) doesn't work cross-platform.

`"main": "dist-electron/main.js"` tells Electron where to find the built main
process entry. This must match the output path from the Vite build.

The preload is built as `preload.mjs` (not `.js`) because `"type": "module"` is
set in `package.json`. `main.ts` references `preload.mjs` explicitly.

---

## Known issues and trade-offs

**Exclusive fullscreen** — the overlay is a sibling OS window. Exclusive
fullscreen games get their own GPU plane; sibling windows can't sit above it.
Borderless windowed mode is a hard requirement. We don't detect exclusive
fullscreen and tell the user; we should.

**macOS Screen Recording permission** — `get-windows` needs it to read window
titles. Classification still works without titles (process name + bounds are
readable), but it's a degraded experience. We don't prompt for the permission
on startup yet.

**`focusable: false` blocks keyboard input** — the overlay window can never
receive keyboard events in its current configuration. This is intentional (don't
steal game focus) but means any future text input in the overlay needs a
rethink.

**Demo `windowEndsAt`** — computed once at module import. If you leave the app
running for 12+ minutes in demo mode, the countdown sits at 00:00. Not worth
fixing until real contract timestamps are wired in.

**`window.overlay` IPC listeners accumulate** — `ipcRenderer.on` in the
preload adds a listener every time `onGameFocus` / `onGameBlur` is called.
`ElectronApp` calls these once on mount, so in practice there's only one
listener each. But if `ElectronApp` were ever remounted without a page reload,
listeners would stack. Worth adding `ipcRenderer.removeAllListeners` cleanup if
the component tree gets more dynamic.

**DENY list maintenance** — the 85% heuristic only works when the user's
non-game windows are in DENY. If someone has an ultrawide monitor with a
maximized browser, the browser window might exceed 85% coverage. Current DENY
list covers the obvious culprits; it'll need updates as users report false
positives.

---

## Testing layers

There are four testing layers, in increasing cost:

| Layer | How | What it tests |
|---|---|---|
| 1 | `npm run dev` → `/?overlay` | Widget animations, click behaviour, layout — no Electron needed |
| 2 | `npm run electron:dev:mock` + hotkeys | Overlay window, IPC bridge, DPI handling, multi-monitor — no game needed |
| 3 | `npm run electron:dev` + real game | Full detection path: PollingDetector, game focus/blur, bounds tracking |
| 4 | `npm run electron:build` + built app | Production bundle, packaging, real install path |

Do layer 1 for any UI change. Do layer 2 after touching `main.ts`, `preload.ts`,
or `ContractOverlay` desktop behaviour. Do layer 3 when touching
`PollingDetector`. Do layer 4 before a release.

---

## What's not built yet

- Per-game contract content in `getWagerForGame` (returns demo data for every process)
- macOS Screen Recording permission prompt on startup
- Stake input in the overlay (currently user must open the full web app)
- Settlement feedback in the overlay (flash win/loss after a game resolves)
- Electron packaging (`electron-builder` config, code signing, auto-updater)
- Real backend API + settlement engine (currently mocked by `useContracts`)
- Phase 2 matched wagers (see `overview.md §4.3`)
