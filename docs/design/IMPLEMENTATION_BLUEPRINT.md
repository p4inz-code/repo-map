# Implementation Blueprint — repo-map v2.1 CLI

> Frozen architecture. Execution plan. Single source of truth for all implementation work.
> Do not redesign. Do not introduce new abstractions unless a genuine implementation blocker is discovered.

---

## 0. Dependency Graph

```
PHASE 2 ──────────────────────────────────────────────────────────
  src/ui/utils/ansi.ts
  src/ui/theme/symbols.ts       src/ui/theme/colors.ts
       │                              │
       └──────▶ src/ui/theme/index.ts ◀──────┘
                        │
PHASE 3 ────────────────┘
  src/ui/layout/width.ts ───── depends on: none (pure Node.js)

PHASE 4 ────────────────┘                PHASE 5 ──────┘
  src/ui/primitives/text.ts        src/ui/animation/types.ts
         │                                │
PHASE 6 ─┴───────────────────────────────┘
  src/ui/primitives/divider.ts
  src/ui/primitives/box.ts
  src/ui/primitives/table.ts
  src/ui/primitives/list.ts
  src/ui/primitives/group.ts

PHASE 7 ──────────────────────────────────────────────────────────
  src/ui/renderer.ts ─────────────────── depends on: theme, ansi, width

PHASE 8 ──────────────────────────────────────────────────────────
  src/ui/animation/spinner.ts
  src/ui/animation/progress-bar.ts
  src/ui/animation/eta.ts
  src/ui/animation/index.ts (AnimationManager)

PHASE 9 ──────────────────────────────────────────────────────────
  src/ui/screens/scanning.ts
  src/ui/screens/analyzing.ts

PHASE 10 ─────────────────────────────────────────────────────────
  src/ui/screens/completion.ts

PHASE 11 ─────────────────────────────────────────────────────────
  src/ui/screens/error.ts
  src/ui/screens/stats.ts
  src/ui/screens/help.ts

PHASE 12 ─────────────────────────────────────────────────────────
  src/ui/index.ts (UISession orchestrator)
  src/index.ts (modify — replace raw writes with UISession)
  src/bin.ts (modify — replace raw error writes)

PHASE 13 ─────────────────────────────────────────────────────────
  tests/ui/ (all test files)
  Final polish
```

**No circular dependencies.** Direction is always: Theme → Primitives → Renderer → Screens → Orchestrator.

---

## 1. Phase Breakdown

### Phase 1: Design System Document

**Status:** COMPLETE (`docs/design/CLI_DESIGN_SYSTEM.md` written)

---

### Phase 2: Theme System

**Goal:** Implement the theme layer — the only place where colors, symbols, borders, and text styles are defined.

**Files created:**
| File | LOC | Purpose |
|------|-----|---------|
| `src/ui/theme/colors.ts` | 55 | Color token → ANSI code, color mode detection, fallback logic |
| `src/ui/theme/symbols.ts` | 35 | Symbol token → character with ASCII fallback |
| `src/ui/theme/borders.ts` | 30 | Border style → character set (round/single/none) |
| `src/ui/theme/presets/default.ts` | 25 | Default theme values (full color, Unicode, round borders) |
| `src/ui/theme/presets/monochrome.ts` | 20 | Monochrome theme (no color, Unicode, round borders) |
| `src/ui/theme/presets/high-contrast.ts` | 25 | High contrast theme (bold text, bg fill) |
| `src/ui/theme/presets/minimal.ts` | 20 | Minimal theme (no color, ASCII, single borders) |
| `src/ui/theme/index.ts` | 45 | Theme interface, `resolveTheme()`, `getTheme()` |

**Files modified:** None (new code only)

**Dependencies:** None from the project. Uses only `process.env.NO_COLOR` and `process.platform`.

**Public APIs introduced:**
```typescript
// resolveTheme(options) → Theme
// getTheme() → Theme (cached)

interface Theme {
  name: string;
  color(token: ColorToken, mode?: ColorMode): string;
  style(text: string, style: TextStyle): string;
  symbol(token: SymbolToken): string;
  border(style: BorderStyle): BorderChars;
  colors: Record<ColorToken, string>;
  symbols: Record<SymbolToken, string>;
  borders: Record<BorderStyle, BorderChars>;
}

type ColorToken = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'dim' | 'muted' | 'text' | 'bg' | 'heading' | 'code' | 'link' | 'border';
type ColorMode = 'none' | '16' | '256' | 'truecolor';
type SymbolToken = 'check' | 'cross' | 'warning' | 'arrow' | 'bullet' | 'pointer' | 'ellipsis';
type BorderStyle = 'round' | 'single' | 'none';
type TextStyle = { bold?: boolean; dim?: boolean; color?: ColorToken };
```

**Tests to write:** `tests/ui/theme/colors.test.ts`, `tests/ui/theme/symbols.test.ts`, `tests/ui/theme/index.test.ts`
- Every ColorToken produces non-empty string in all 4 color modes
- Every SymbolToken produces expected character
- `NO_COLOR` env var forces mode 'none'
- ASCII fallback produces expected characters
- `resolveTheme({ color: false })` returns monochrome
- `style(text, {})` returns text unmodified

**Definition of Done:**
- `npm run build` compiles without errors
- All theme tests pass
- `resolveTheme()` returns correct theme for all option combinations

**Estimated LOC:** 255

---

### Phase 3: ANSI Utilities

**Goal:** Implement the ANSI escape sequence helpers — the only place where raw escape codes are produced.

**Files created:**
| File | LOC | Purpose |
|------|-----|---------|
| `src/ui/utils/ansi.ts` | 60 | Cursor control, line clearing, screen management helpers |

**Files modified:** None

**Dependencies:** None

**Public APIs introduced:**
```typescript
// Cursor control
function cursorUp(lines: number): string;
function cursorHide(): string;
function cursorShow(): string;
function savePosition(): string;
function restorePosition(): string;

// Line operations
function clearLine(): string;
function clearScreen(): string;
function carriageReturn(): string;

// Detection
function isTTY(): boolean;
function isWindowsLegacy(): boolean;  // CMD, not Windows Terminal

// Stripping (for width calculations)
function stripAnsi(text: string): string;
```

**What it must NOT know about:** Theme, colors, symbols, layout, any business logic. Pure string functions only.

**Tests to write:** `tests/ui/utils/ansi.test.ts`
- Every function returns a string starting with `\x1b[` or `\r`
- `stripAnsi()` removes known ANSI sequences
- `stripAnsi()` preserves non-ANSI text unchanged
- `isWindowsLegacy()` returns appropriate value per platform (use `process.platform` mocking)

**Definition of Done:**
- All ANSI helpers emit syntactically valid escape sequences
- `stripAnsi()` passes round-trip tests
- TypeScript compiles cleanly

**Estimated LOC:** 60

---

### Phase 4: Layout Utilities

**Goal:** Implement terminal width detection, content width calculation, and space distribution.

**Files created:**
| File | LOC | Purpose |
|------|-----|---------|
| `src/ui/layout/width.ts` | 65 | Terminal width detection, forced width (testing), column scaling, breakpoint detection |

**Files modified:** None

**Dependencies:** `ansi.ts` (for `isTTY()`), `node:tty`

**Public APIs introduced:**
```typescript
interface WidthInfo {
  columns: number;       // Total terminal columns
  contentWidth: number;  // Usable width (columns - margins)
  isNarrow: boolean;     // < 60 cols
  isWide: boolean;       // >= 120 cols
  breakpoint: 'compact' | 'normal' | 'wide';
}

function getTerminalWidth(): WidthInfo;
function setForcedWidth(width: number | null): void;  // For testing
function scaleColumns(available: number, counts: number[], minWidths: number[]): number[];
function breakpoint(columns: number): WidthInfo['breakpoint'];
```

**What it must NOT know about:** Theme, screens, animations, ANSI codes beyond `isTTY()`, analysis data.

**Tests to write:** `tests/ui/layout/width.test.ts`
- `getTerminalWidth()` returns valid numbers when TTY
- `getTerminalWidth()` returns fallback (80) when not TTY
- `setForcedWidth(50)` overrides detected width
- `setForcedWidth(null)` restores detection
- `scaleColumns()` distributes fairly across counts
- `scaleColumns()` respects minimum widths
- `breakpoint()` returns correct value for each range
- CJK-aware: Ensure width functions don't assume 1 char = 1 cell

**Definition of Done:**
- Width detection works in TTY and non-TTY environments
- Forced width mode enables deterministic testing
- Column scaling is fair (no column starved)
- All existing tests still pass

**Estimated LOC:** 65

---

### Phase 5: Animation Types

**Goal:** Define the Animation interface and AnimationManager — the single timer controller for all animations.

**Files created:**
| File | LOC | Purpose |
|------|-----|---------|
| `src/ui/animation/types.ts` | 25 | `Animation` interface, `AnimationFrame` type |
| `src/ui/animation/index.ts` | 95 | `AnimationManager` class — single setInterval, lifecycle, registration |

**Files modified:** None

**Dependencies:** `ansi.ts`, `layout/width.ts`

**Public APIs introduced:**
```typescript
interface AnimationFrame {
  lines: string[];       // Content to render (pre-ANSId)
  position: 'inline' | 'status-line';  // Where to render
}

interface Animation {
  readonly type: string;
  tick(dt: number): AnimationFrame | null;  // null = no change
  dispose(): void;
}

class AnimationManager {
  constructor(options?: { interval?: number; enabled?: boolean });
  
  register(animation: Animation): void;
  unregister(animation: Animation): void;
  
  start(onFrame: (frame: AnimationFrame) => void): void;
  stop(): void;
  pause(): void;
  resume(): void;
  
  get running(): boolean;
  get frameCount(): number;
}
```

**Helper types (internal to AnimationManager):**
```
- Timer reference (ReturnType<typeof setInterval>)
- Registered animation list
- Next frame callback reference
- Frame coalescing state (skip redraw when no animation changed)
```

**What it must NOT know about:** Theme, screen state, business logic. Only manages timer + frame delivery.

**Tests to write:** `tests/ui/animation/index.test.ts`
- Manager starts and stops correctly
- `tick()` is called at configured interval (use fake timers)
- `null` frames are not delivered to callback
- `dispose()` is called on all animations when stopped
- `pause()` stops tick delivery, `resume()` resumes
- `enabled: false` never starts the timer
- Register/unregister adds/removes animations dynamically
- Frame coalescing works (no duplicate frames delivered)

**Definition of Done:**
- Single timer drives all animations
- No memory leaks after `stop()` (animations disposed)
- Frame coalescing prevents unnecessary redraws
- All tests pass with fake timers

**Estimated LOC:** 120

---

### Phase 6: UI Primitives

**Goal:** Build all reusable UI primitives. These are pure functions that produce `string[]` (pre-ANSI lines).

**Files created:**
| File | LOC | Purpose |
|------|-----|---------|
| `src/ui/primitives/text.ts` | 95 | `style()`, `wrap()`, `truncate()`, `padLeft()`, `padRight()`, `stripAnsi()` (re-export) |
| `src/ui/primitives/divider.ts` | 30 | `renderDivider()` — horizontal rule with optional label |
| `src/ui/primitives/box.ts` | 70 | `renderBox()` — bordered content panel |
| `src/ui/primitives/table.ts` | 85 | `renderTable()` — column-aligned table |
| `src/ui/primitives/list.ts` | 35 | `renderList()` — bulleted/ordered list |
| `src/ui/primitives/group.ts` | 30 | `renderGroup()` — labeled content group (e.g., "Languages" section) |
| `src/ui/primitives/index.ts` | 10 | Re-exports all primitives |

**Files modified:** None

**Dependencies:** `theme/index.ts`, `layout/width.ts`

**Public APIs introduced:**

```typescript
// text.ts
function style(text: string, theme: Theme, style?: TextStyle): string;
function wrap(text: string, width: number): string[];
function truncate(text: string, maxLen: number): string;
function padLeft(text: string, len: number): string;
function padRight(text: string, len: number): string;

// divider.ts
interface DividerOptions { char?: string; label?: string; width?: number; }
function renderDivider(options?: DividerOptions): string;

// box.ts
interface BoxOptions { title?: string; width?: number; padding?: number; borderStyle?: BorderStyle; }
function renderBox(content: string[], options?: BoxOptions): string[];

// table.ts
interface TableColumn { header: string; align?: 'left' | 'right'; width?: number; minWidth?: number; }
interface TableOptions { columns: TableColumn[]; rows: string[][]; width?: number; compact?: boolean; }
function renderTable(options: TableOptions): string[];

// list.ts
type ListStyle = 'bullet' | 'pointer' | 'ordered' | 'none';
interface ListOptions { items: string[]; style?: ListStyle; indent?: number; }
function renderList(items: string[], style?: ListStyle): string[];

// group.ts
interface GroupOptions { title: string; items: string[]; indent?: number; }
function renderGroup(title: string, items: string[]): string[];
```

**What primitives must NOT know about:**
- ANSI escape codes (they receive a `Theme` object and use `theme.style()`)
- Terminal width (they receive width as a parameter)
- Screen state, analysis data, business logic
- Animation state, cursor positioning

**Tests to write:** 6 test files:
- `tests/ui/primitives/text.test.ts` — wrapping at boundaries, truncation, padding, style application
- `tests/ui/primitives/divider.test.ts` — full width, with label, custom char
- `tests/ui/primitives/box.test.ts` — round/single/none borders, with title, narrow width, empty content
- `tests/ui/primitives/table.test.ts` — column alignment, width scaling, compact mode, single row, empty rows
- `tests/ui/primitives/list.test.ts` — all 4 styles, empty list, nested indentation
- `tests/ui/primitives/group.test.ts` — empty group, single item, multiple items

**Definition of Done:**
- Every primitive returns `string[]` with correct visual structure
- All width parameters are respected (no overflow)
- `style()` uses theme, never hardcodes ANSI
- All existing tests pass

**Estimated LOC:** 325 (primitives) + 180 (tests) = 505

---

### Phase 7: Renderer

**Goal:** Implement the central renderer — the only module that applies ANSI codes and manages terminal output.

**Files created:**
| File | LOC | Purpose |
|------|-----|---------|
| `src/ui/renderer.ts` | 100 | Renderer class — frame composition, ANSI application, cursor management, output |

**Files modified:** None

**Dependencies:** `theme/index.ts`, `utils/ansi.ts`, `layout/width.ts`

**Public APIs introduced:**
```typescript
class Renderer {
  constructor(theme: Theme, width: WidthInfo);
  
  // Render an array of pre-styled lines to the terminal
  render(lines: string[]): void;
  
  // Update the last-rendered frame (position cursor, overwrite)
  update(lines: string[]): void;
  
  // Clear the last-rendered region
  clear(): void;
  
  // Register a line range as the "animation area"
  setAnimationArea(startLine: number, endLine: number): void;
  
  // Apply ANSI styling to a raw line based on theme
  styleLine(segments: { text: string; style?: TextStyle }[]): string;
  
  // Wrap content inside a box (delegates to box primitive)
  wrapInBox(content: string[], options?: BoxOptions): string[];
  
  get width(): WidthInfo;
  get theme(): Theme;
}
```

**Internal helpers:**
- `lastFrameLength: number` — tracks how many lines were last rendered (for `update()` cursor-up calculation)
- `animationArea: [number, number]` — line range for animation updates
- `resolveStyle(style: TextStyle): string` — text → ANSI prefix + suffix

**What it must NOT know about:**
- Analysis data, business logic
- Screen state
- Animation timer details
- Analysis data types

**Tests to write:** `tests/ui/renderer.test.ts`
- `render()` writes to stdout via spy
- `update()` emits cursor-up sequences + new lines
- `clear()` emits correct number of clear-line sequences
- `styleLine()` resolves tokens via theme
- `setAnimationArea()` tracks correct line range
- Empty input produces no output
- Very wide content is truncated to contentWidth

**Definition of Done:**
- Renderer is the only module that calls `process.stdout.write()`
- `update()` correctly overwrites previous content
- All styling goes through theme (no hardcoded ANSI)
- Tests verify stdout content via spy

**Estimated LOC:** 100

---

### Phase 8: Animation Implementations

**Goal:** Build the concrete animation types used during scanning and analyzing phases.

**Files created:**
| File | LOC | Purpose |
|------|-----|---------|
| `src/ui/animation/spinner.ts` | 55 | Frame-based spinner with configurable frames and interval |
| `src/ui/animation/progress-bar.ts` | 50 | Deterministic progress bar with percentage |
| `src/ui/animation/eta.ts` | 35 | ETA timer — elapsed/duration display |

**Files modified:** None (animations register with the Manager from Phase 5)

**Dependencies:** `animation/types.ts`, `theme/index.ts`, `primitives/text.ts`

**Public APIs introduced:**
```typescript
// spinner.ts
interface SpinnerOptions { text?: string; frames?: string[]; interval?: number; }
class SpinnerAnimation implements Animation {
  constructor(text: string, options?: SpinnerOptions);
  tick(dt: number): AnimationFrame;
  update(text: string): void;
  dispose(): void;
}

// progress-bar.ts
interface ProgressBarOptions { width?: number; label?: string; showPercent?: boolean; }
class ProgressBarAnimation implements Animation {
  constructor(options?: ProgressBarOptions);
  tick(dt: number): AnimationFrame | null;  // null when unchanged
  setProgress(percent: number): void;
  dispose(): void;
}

// eta.ts
class EtaAnimation implements Animation {
  constructor(label?: string);
  tick(dt: number): AnimationFrame | null;  // emits once per second
  dispose(): void;
}
```

**What animations must NOT know about:**
- The Manager (they are registered with it, not aware of it)
- Other animations
- Screen state
- Terminal width directly (use width passed via theme/layout)

**Tests to write:** 3 test files:
- `tests/ui/animation/spinner.test.ts` — frame advancement, wrapping, text update, dispose cleanup
- `tests/ui/animation/progress-bar.test.ts` — percentage rendering, 0% and 100% edges, null when unchanged
- `tests/ui/animation/eta.test.ts` — time formatting, ~1 second throttle, 0 elapsed

**Definition of Done:**
- All 3 animations implement the Animation interface
- ProgressBar returns `null` when percentage hasn't changed
- Spinner wraps around to first frame after last
- ETA emits a frame at most once per second

**Estimated LOC:** 140

---

### Phase 9: Progress Pipeline Screens

**Goal:** Implement the scanning and analyzing phase screens — the first visible output when running repo-map.

**Files created:**
| File | LOC | Purpose |
|------|-----|---------|
| `src/ui/screens/scanning.ts` | 55 | Scanning phase: spinner + "Scanning project..." + stats on completion |
| `src/ui/screens/analyzing.ts` | 40 | Analyzing phase: spinner + "Analyzing..." + elapsed on completion |

**Files modified:** None

**Dependencies:** `renderer.ts`, `animation/index.ts`, `animation/spinner.ts`, `primitives/text.ts`

**Public APIs introduced:**
```typescript
// scanning.ts
interface ScanPhaseOptions { projectName: string; }
function renderScanPhase(
  renderer: Renderer,
  manager: AnimationManager,
  options: ScanPhaseOptions
): Promise<{ files: number; dirs: number }>;

// analyzing.ts
function renderAnalyzePhase(
  renderer: Renderer,
  manager: AnimationManager
): Promise<number>;  // Returns elapsed seconds
```

**What screens must NOT know about:**
- Analysis data internals (they receive already-processed values)
- Low-level ANSI (they use Renderer and AnimationManager)
- File system I/O
- The analysis pipeline

**Tests to write:** `tests/ui/screens/scanning.test.ts`, `tests/ui/screens/analyzing.test.ts`
- Screen renders initial spinner line
- Screen renders completion stats line
- Manager is started/stopped correctly
- Output is written via renderer (verify via spy)

**Definition of Done:**
- Scanning screen shows spinner + project name
- After scan completes: "✓ Scanned my-project — 42 files, 12 directories"
- Analyzing screen shows spinner + "Analyzing..."
- After analysis completes: "✓ Done in X.Xs"
- Both screens properly start/stop the AnimationManager

**Estimated LOC:** 95

---

### Phase 10: Completion Screen

**Goal:** Implement the final results screen — the premium CLI experience.

**Files created:**
| File | LOC | Purpose |
|------|-----|---------|
| `src/ui/screens/completion.ts` | 95 | Completion screen: boxed summary, key metrics, tech breakdown |

**Files modified:** None

**Dependencies:** `renderer.ts`, `primitives/*.ts`, `layout/width.ts`, `formatters/stats.ts` (reuse `formatSize`)

**Public APIs introduced:**
```typescript
interface CompletionOptions {
  projectName: string;
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  maxDepth: number;
  classification: string;
  classificationConfidence: number;
  maturity: string;
  healthScore: number;
  technologies: { name: string; category: string; count?: number }[];
  strengthsCount: number;
  suggestionsCount: number;
  highPriorityCount: number;
  elapsed: number;
  outputPath?: string;
}

function renderCompletion(
  options: CompletionOptions,
  renderer: Renderer,
  width: WidthInfo
): void;
```

**What it must NOT know about:**
- Animation manager (completion is static)
- Analysis pipeline details
- Raw ANSI escape codes

**Tests to write:** `tests/ui/screens/completion.test.ts`
- Renders box with title
- Shows all key metrics
- Language breakdown renders correctly
- Output path displayed when provided
- Empty technologies list handled gracefully
- Narrow terminal produces no-box layout
- All strengths/suggestions counted correctly

**Definition of Done:**
- Completion screen renders a professional summary
- All data renders correctly (verified via snapshot)
- Narrow terminals produce readable output
- Empty state (no files) renders without crashing

**Estimated LOC:** 95

---

### Phase 11: Error, Stats, Help Screens

**Goal:** Implement error presentation, stats summary, and the redesigned help screen.

**Files created:**
| File | LOC | Purpose |
|------|-----|---------|
| `src/ui/screens/error.ts` | 50 | Error screen: boxed error with title, message, suggestion |
| `src/ui/screens/stats.ts` | 65 | Stats summary screen: compact statistics with language breakdown |
| `src/ui/screens/help.ts` | 85 | Help screen: redesigned --help output |

**Files modified:** None

**Dependencies:** `renderer.ts`, `primitives/*.ts`, `layout/width.ts`

**Public APIs introduced:**
```typescript
// error.ts
interface ErrorOptions {
  title: string;
  message: string;
  suggestion?: string;
  fatal: boolean;
}
function renderError(options: ErrorOptions, renderer: Renderer): void;

// stats.ts
interface StatsOptions {
  projectName: string;
  totalFiles: number;
  totalDirectories: number;
  totalSize: string;
  maxDepth: number;
  languages: { name: string; count: number; percentage: number }[];
  largestFile?: { path: string; size: string };
  largestDir?: { path: string; files: number };
  avgFilesPerDir: number;
}
function renderStats(options: StatsOptions, renderer: Renderer): void;

// help.ts
function renderHelp(renderer: Renderer, version: string): void;
```

**What screens must NOT know about:**
- Animation manager (all 3 screens are static)
- Analysis pipeline
- File system I/O

**Tests to write:** 3 test files:
- `tests/ui/screens/error.test.ts` — renders box with error styling, non-fatal vs fatal, long message wrapping, suggestion display
- `tests/ui/screens/stats.test.ts` — all stats displayed, language breakdown, narrow terminal, no language data
- `tests/ui/screens/help.test.ts` — version displayed, all option groups present, EXAMPLES section

**Definition of Done:**
- Error screen renders calm, actionable error messages
- Stats screen matches or exceeds current `--stats` output quality
- Help screen fully replaces commander's default output
- All screens handle narrow terminals gracefully

**Estimated LOC:** 200

---

### Phase 12: CLI Integration

**Goal:** Wire the UI system into the existing CLI pipeline. Replace raw `process.stderr.write()` calls with UISession.

**Files created:**
| File | LOC | Purpose |
|------|-----|---------|
| `src/ui/index.ts` | 75 | `UISession` — top-level orchestrator wrapping Renderer + AnimationManager + Screens |

**Files modified:**
| File | LOC Changed | Purpose |
|------|-------------|---------|
| `src/index.ts` | ~30 lines replaced | Replace raw writes with `ui.startScanning(...)`, `ui.finishScanning(...)`, etc. |
| `src/bin.ts` | ~15 lines replaced | Replace raw error writes with `renderError()` |

**Dependencies:** Everything in `src/ui/`

**Public APIs introduced:**
```typescript
// src/ui/index.ts
interface UISessionOptions {
  color: boolean;
  terminalWidth?: number;
  noAnimation?: boolean;
}

interface UISession {
  // Progress phases
  startScanning(projectName: string): void;
  finishScanning(files: number, dirs: number): void;
  startAnalyzing(): void;
  finishAnalyzing(elapsed: number): void;
  
  // Output
  renderCompletion(analysis: Analysis, elapsed: number, outputPath?: string): void;
  renderStats(analysis: Analysis): void;
  renderHelp(): void;
  
  // Error
  reportError(title: string, message: string, suggestion?: string): void;
  
  // Lifecycle
  close(): void;  // Cleanup: stop animations, restore cursor
}

function createUISession(options: UISessionOptions): UISession;
```

**Integration points in `src/index.ts`:**
```typescript
// BEFORE (v2.0):
process.stderr.write(`Scanning ${projectLabel}... `);
const scanResult = await scanDirectory(...);
process.stderr.write(`${scanResult.stats.totalFiles} files, ...\n`);

// AFTER (v2.1):
const ui = createUISession({ color: options.color });
try {
  ui.startScanning(projectLabel);
  const scanResult = await scanDirectory(...);
  ui.finishScanning(scanResult.stats.totalFiles, scanResult.stats.totalDirectories);
  
  ui.startAnalyzing();
  const analysis = await analyze(...);
  ui.finishAnalyzing(elapsed);
  
  // ... format output ...
  ui.renderCompletion(analysis, elapsed, options.output);
} finally {
  ui.close();
}
```

**Integration points in `src/bin.ts`:**
```typescript
// BEFORE (v2.0):
process.stderr.write(`Error: ${message}\n`);
process.exit(1);

// AFTER (v2.1):
import { createUISession } from './ui/index.js';
const ui = createUISession({ color: process.env.NO_COLOR !== '1' });
ui.reportError('Path Error', message, 'Provide a valid path or run \'repo-map .\'');
ui.close();
```

**What `UISession` must NOT know about:**
- Analysis pipeline details (it orchestrates, doesn't compute)
- File system I/O
- Commander/CLI argument parsing

**Tests to write:** `tests/ui/index.test.ts`
- `createUISession()` returns a valid session with all methods
- `close()` stops animation manager
- Lifecycle methods call renderer correctly
- `renderCompletion()` passes analysis data to completion screen
- `reportError()` creates error screen with correct data

**Definition of Done:**
- `repo-map .` produces animation + completion screen
- `repo-map --stats` produces stats screen
- `repo-map --help` produces new help screen
- Errors display via error screen instead of raw stderr
- `repo-map --no-color` produces no ANSI output
- All existing v2.0 tests still pass
- TypeScript compiles cleanly

**Estimated LOC:** 75 (new) + ~45 (modified) = 120

---

### Phase 13: Tests + Polish

**Goal:** Complete test coverage, edge cases, cross-platform verification, and final optimization.

**Files created:**
All test files across prior phases. Here is the complete test inventory:

| Test File | Phase | Priority |
|-----------|-------|----------|
| `tests/ui/theme/colors.test.ts` | 2 | Critical |
| `tests/ui/theme/symbols.test.ts` | 2 | Critical |
| `tests/ui/theme/index.test.ts` | 2 | Critical |
| `tests/ui/utils/ansi.test.ts` | 3 | Critical |
| `tests/ui/layout/width.test.ts` | 4 | Critical |
| `tests/ui/animation/index.test.ts` | 5 | Critical |
| `tests/ui/animation/spinner.test.ts` | 8 | Important |
| `tests/ui/animation/progress-bar.test.ts` | 8 | Important |
| `tests/ui/animation/eta.test.ts` | 8 | Important |
| `tests/ui/primitives/text.test.ts` | 6 | Critical |
| `tests/ui/primitives/divider.test.ts` | 6 | Important |
| `tests/ui/primitives/box.test.ts` | 6 | Critical |
| `tests/ui/primitives/table.test.ts` | 6 | Critical |
| `tests/ui/primitives/list.test.ts` | 6 | Important |
| `tests/ui/primitives/group.test.ts` | 6 | Important |
| `tests/ui/renderer.test.ts` | 7 | Critical |
| `tests/ui/screens/scanning.test.ts` | 9 | Critical |
| `tests/ui/screens/analyzing.test.ts` | 9 | Critical |
| `tests/ui/screens/completion.test.ts` | 10 | Critical |
| `tests/ui/screens/error.test.ts` | 11 | Important |
| `tests/ui/screens/stats.test.ts` | 11 | Important |
| `tests/ui/screens/help.test.ts` | 11 | Important |
| `tests/ui/index.test.ts` | 12 | Critical |

**Estimated total test LOC:** ~600

**Final polish items:**
1. Verify `--no-color` produces zero ANSI sequences (grep for `\x1b`)
2. Run on Windows (CI) to verify fallback behavior
3. Run with `stdout` piped to file — verify no escape sequences leak
4. Run with `TERM=vt100` — verify graceful degradation
5. Benchmark: time 10 runs of `repo-map .` v2.0 vs v2.1 — ensure no regression
6. Verify SIGINT handling restores cursor (cursorShow()) on early exit

---

## 2. Exact File Implementation Order

The order is designed so that:
- Each file depends only on files created earlier in the order
- No phase requires rewriting a file from a previous phase
- Merge conflicts are minimized (each file is created once, modified at most once)

```
Phase 2:
  [1]  src/ui/theme/symbols.ts
  [2]  src/ui/theme/colors.ts
  [3]  src/ui/theme/borders.ts
  [4]  src/ui/theme/presets/default.ts
  [5]  src/ui/theme/presets/monochrome.ts
  [6]  src/ui/theme/presets/high-contrast.ts
  [7]  src/ui/theme/presets/minimal.ts
  [8]  src/ui/theme/index.ts

Phase 3:
  [9]  src/ui/utils/ansi.ts

Phase 4:
  [10] src/ui/layout/width.ts

Phase 5:
  [11] src/ui/animation/types.ts
  [12] src/ui/animation/index.ts

Phase 6:
  [13] src/ui/primitives/text.ts
  [14] src/ui/primitives/divider.ts
  [15] src/ui/primitives/box.ts
  [16] src/ui/primitives/table.ts
  [17] src/ui/primitives/list.ts
  [18] src/ui/primitives/group.ts
  [19] src/ui/primitives/index.ts

Phase 7:
  [20] src/ui/renderer.ts

Phase 8:
  [21] src/ui/animation/spinner.ts
  [22] src/ui/animation/progress-bar.ts
  [23] src/ui/animation/eta.ts

Phase 9:
  [24] src/ui/screens/scanning.ts
  [25] src/ui/screens/analyzing.ts

Phase 10:
  [26] src/ui/screens/completion.ts

Phase 11:
  [27] src/ui/screens/error.ts
  [28] src/ui/screens/stats.ts
  [29] src/ui/screens/help.ts

Phase 12:
  [30] src/ui/index.ts
  [31] src/index.ts (MODIFY)
  [32] src/bin.ts (MODIFY)

Phase 13:
  [33–55] tests/ui/**/*.test.ts (23 files)
```

**Total new files:** 30
**Total modified files:** 2 (`src/index.ts`, `src/bin.ts`)
**Total test files:** 23

---

## 3. Module Specification

### Module: `src/ui/theme/colors.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Map semantic ColorToken to ANSI escape code for the detected color mode. Detect color mode from env/args. |
| **Public API** | `detectColorMode(): ColorMode`, `resolveColor(token: ColorToken, mode: ColorMode): string` |
| **Internal helpers** | `ansi16(token): string`, `ansi256(token): string`, `truecolor(token): string` — each maps tokens to specific codes |
| **Must NOT know** | Symbols, borders, themes, layout, any business logic |
| **Tests** | Every token in every mode returns non-empty string. `NO_COLOR` produces empty strings. Unknown token produces empty string. |

### Module: `src/ui/theme/symbols.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Map SymbolToken to the correct character based on Unicode support. |
| **Public API** | `detectUnicodeSupport(): boolean`, `resolveSymbol(token: SymbolToken, unicode: boolean): string` |
| **Internal helpers** | `UNICODE_SYMBOLS: Record<SymbolToken, string>`, `ASCII_SYMBOLS: Record<SymbolToken, string>` |
| **Must NOT know** | Colors, themes, any terminal detection beyond Unicode |
| **Tests** | Every token returns expected character. ASCII fallback returns expected ASCII char. |

### Module: `src/ui/theme/borders.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Map BorderStyle to a set of border characters (corners, lines). |
| **Public API** | `resolveBorder(style: BorderStyle, unicode: boolean): BorderChars` |
| **Internal helpers** | Style definitions as data objects |
| **Must NOT know** | Colors, layout, any rendering logic |
| **Tests** | Every style returns 6 characters. `'none'` returns empty strings. Unicode vs ASCII fallback. |

### Module: `src/ui/theme/index.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Provide the Theme interface and `resolveTheme()` factory. Cache resolved theme. |
| **Public API** | `getTheme(options?: { color?: boolean; unicode?: boolean; highContrast?: boolean }): Theme` |
| **Internal helpers** | `THEME_PRESETS: Record<string, Theme>`, cached instance |
| **Must NOT know** | Screens, animations, primitives |
| **Tests** | `getTheme()` returns correct preset for each option combination. Style applies color correctly. Style with no style returns text unchanged. |

### Module: `src/ui/utils/ansi.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Produce ANSI escape sequences for cursor control and line management. Strip ANSI from strings. |
| **Public API** | `cursorUp()`, `cursorHide()`, `cursorShow()`, `clearLine()`, `clearScreen()`, `carriageReturn()`, `savePosition()`, `restorePosition()`, `stripAnsi()`, `isTTY()`, `isWindowsLegacy()` |
| **Internal helpers** | Windows-specific cursor workaround for ConPTY |
| **Must NOT know** | Theme, colors, symbols, layout, business logic |
| **Tests** | Return values start with `\x1b[` or `\r`. `stripAnsi()` removes known patterns. |

### Module: `src/ui/layout/width.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Detect terminal width, compute content width, distribute column space. |
| **Public API** | `getTerminalWidth()`, `setForcedWidth()`, `scaleColumns()`, `breakpoint()` |
| **Internal helpers** | `MARGIN = 2`, `MAX_CONTENT_WIDTH = 100`, `NARROW_BREAKPOINT = 60`, `WIDE_BREAKPOINT = 120` |
| **Must NOT know** | Theme, colors, any business logic |
| **Tests** | Valid widths, forced mode, column scaling fairness, breakpoint ranges |

### Module: `src/ui/animation/types.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Define shared types for the animation system. |
| **Public API** | `AnimationFrame`, `Animation` interface |
| **Internal helpers** | None — pure type definitions |
| **Must NOT know** | Any implementation details |
| **Tests** | Type-check only (no runtime tests needed for types) |

### Module: `src/ui/animation/index.ts` (AnimationManager)

| Property | Value |
|----------|-------|
| **Responsibility** | Single timer controller. Register/unregister animations. Deliver frames via callback. Frame coalescing. |
| **Public API** | `AnimationManager` class with `register()`, `unregister()`, `start()`, `stop()`, `pause()`, `resume()` |
| **Internal helpers** | `_tick()` — iterate animations, call tick(dt), collect non-null frames, deliver to callback |
| **Must NOT know** | Screen state, theme, renderer, what frames are used for |
| **Tests** | Timer lifecycle, frame delivery, coalescing, dispose on stop, pause/resume |

### Module: `src/ui/primitives/text.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Apply text styles via theme. Wrap text to width. Truncate with ellipsis. Pad/align text. |
| **Public API** | `style(text, theme, style?)`, `wrap(text, width)`, `truncate(text, maxLen)`, `padLeft(text, len)`, `padRight(text, len)` |
| **Internal helpers** | `ELLIPSIS = '…'` / `'...'` (ASCII fallback) |
| **Must NOT know** | Boxes, tables, lists, screens, animation |
| **Tests** | Wrapping at boundary, no mid-word break, truncation adds `…`, padding produces correct length |

### Module: `src/ui/primitives/divider.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Render a horizontal rule across content width. |
| **Public API** | `renderDivider(options?) → string` |
| **Internal helpers** | `char.repeat(width)` with label centering |
| **Must NOT know** | Any other primitives, screens, business logic |
| **Tests** | Full width, with label (label centered), custom char, zero width |

### Module: `src/ui/primitives/box.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Render a bordered panel around content. |
| **Public API** | `renderBox(content, options?) → string[]` |
| **Internal helpers** | `_renderTop(width, style, title)`, `_renderBottom(width, style)`, `_renderSide(content, width, padding)` |
| **Must NOT know** | Tables, lists, screens, analysis data |
| **Tests** | Round/single/none borders, with title, empty content, padding 0, narrow width truncation, content wider than box |

### Module: `src/ui/primitives/table.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Render aligned columns with headers and rows. |
| **Public API** | `renderTable(options) → string[]` |
| **Internal helpers** | `_calculateWidths(columns, available)`, `_renderHeader(columns, widths)`, `_renderRow(cells, widths)` |
| **Must NOT know** | Business logic, screens, animation |
| **Tests** | Column alignment, width scaling, compact mode, single row, empty rows, header only, narrow terminal truncation |

### Module: `src/ui/primitives/list.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Render bulleted, pointer, ordered, or plain lists. |
| **Public API** | `renderList(items, style?) → string[]` |
| **Internal helpers** | Bullet/pointer character selection, ordered numbering |
| **Must NOT know** | Any other primitives, screens |
| **Tests** | All 4 styles, empty list, single item, multiple items, nested display |

### Module: `src/ui/primitives/group.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Render a labeled section: header + indented content. |
| **Public API** | `renderGroup(title, items) → string[]` |
| **Internal helpers** | Header formatting, content indentation |
| **Must NOT know** | Any other primitives, screens |
| **Tests** | Empty group, single item, multiple items, long title |

### Module: `src/ui/renderer.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Render frames to terminal. Manage cursor for updates. Apply ANSI styling. Track rendered line count. |
| **Public API** | `Renderer` class with `render()`, `update()`, `clear()`, `setAnimationArea()`, `styleLine()`, `wrapInBox()` |
| **Internal helpers** | `_lastLineCount`, `_animationArea`, `_writeToStdout(lines)` |
| **Must NOT know** | Analysis data, screen state, animation timers |
| **Tests** | `render()` writes to stdout, `update()` emits cursor-up, `clear()` emits clear-line, `styleLine()` uses theme, empty input produces nothing |

### Module: `src/ui/screens/scanning.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Manage the scanning phase UI: spinner + project name → completion message. |
| **Public API** | `renderScanPhase(renderer, manager, { projectName })` |
| **Internal helpers** | Creates SpinnerAnimation, registers with manager, awaits scan completion, stops spinner, renders completion line |
| **Must NOT know** | Analysis pipeline, file system, other screens |
| **Tests** | Spinner starts, completion renders, manager is stopped |

### Module: `src/ui/screens/analyzing.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Manage the analyzing phase UI: spinner + "Analyzing..." → elapsed time. |
| **Public API** | `renderAnalyzePhase(renderer, manager)` |
| **Internal helpers** | Creates SpinnerAnimation, registers with manager, awaits analysis, renders elapsed |
| **Must NOT know** | Scanning phase, completion screen, analysis data details |
| **Tests** | Spinner starts, elapsed renders, manager is stopped |

### Module: `src/ui/screens/completion.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Render the final analysis results as a professional summary. |
| **Public API** | `renderCompletion(options, renderer, width)` |
| **Internal helpers** | Composes box + group + list + table primitives |
| **Must NOT know** | Animation, analysis pipeline, file system |
| **Tests** | Full output structure, narrow terminal, empty data, no output path |

### Module: `src/ui/screens/error.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Render user-facing errors in a calm, actionable format. |
| **Public API** | `renderError(options, renderer)` |
| **Internal helpers** | Composes box + list primitives |
| **Must NOT know** | Animation, analysis data, file system |
| **Tests** | Error box renders, suggestion displays, non-fatal vs fatal, long message wrapping |

### Module: `src/ui/screens/stats.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Render compact statistics with language breakdown. |
| **Public API** | `renderStats(options, renderer)` |
| **Internal helpers** | Language percentage calculation, column alignment |
| **Must NOT know** | Animation, other screens, analysis pipeline |
| **Tests** | All stats present, language breakdown, narrow terminal, no language data |

### Module: `src/ui/screens/help.ts`

| Property | Value |
|----------|-------|
| **Responsibility** | Render the redesigned --help output replacing commander's default. |
| **Public API** | `renderHelp(renderer, version)` |
| **Internal helpers** | Section definitions (USAGE, ARGUMENTS, OPTIONS, EXAMPLES) |
| **Must NOT know** | Animation, analysis data, other screens |
| **Tests** | All sections present, version displayed, option details render, examples render |

### Module: `src/ui/index.ts` (UISession)

| Property | Value |
|----------|-------|
| **Responsibility** | Top-level orchestrator. Creates Renderer + AnimationManager. Coordinates screen transitions. |
| **Public API** | `createUISession(options) → UISession` with `start/finishScanning()`, `start/finishAnalyzing()`, `renderCompletion()`, `renderStats()`, `renderHelp()`, `reportError()`, `close()` |
| **Internal helpers** | Creates Renderer, AnimationManager. Manages screen transition state. |
| **Must NOT know** | Analysis pipeline internals, file system, commander |
| **Tests** | Session creation, lifecycle methods, close cleanup, error reporting |

---

## 4. Implementation Risks & Mitigations

| Phase | Risk | Likelihood | Impact | Mitigation |
|-------|------|------------|--------|------------|
| 2 | Color mode detection wrong on uncommon terminals | Medium | Medium | Exhaustive TERM/COLORTERM detection. Fallback to `'16'` (safe). Test on Linux, macOS, Windows CI. |
| 3 | Cursor-up sequences fail on some terminals (wrong line count) | Low | Medium | `update()` tracks exact number of lines last printed. Always emit `\r` before new content as safety. |
| 4 | `process.stdout.columns` returns undefined (piped output) | High | Low | Width detection falls back to 80. Animation disabled when `!isTTY`. |
| 5 | Animation frame race condition during screen transition | Low | High | Manager's `stop()` is synchronous. `start()` is called only after `stop()` completes. Use `_tickLock` to prevent concurrent frame delivery. |
| 6 | Box width miscalculation with CJK characters | Medium | Medium | `text.ts` wrapping uses character iteration, not string length. CJK characters handled as 2-cell width. |
| 7 | `update()` flickers on slow terminals | Medium | Medium | `clearLine()` before re-render prevents ghost characters. Use `\r` instead of `cursorUp` when updating a single line. |
| 8 | Spinner frames jank on Windows CMD | High | Low | Detect Windows legacy terminal → 120ms interval, 4-frame spinner. `setInterval` drift is < 10ms. |
| 9 | Screen transition timing: animation still running when screen swaps | Low | High | `finishScanning()` awaits `manager.stop()` before proceeding. `startAnalyzing()` creates new spinner. |
| 10 | Completion screen with 0 files crashes | Low | Medium | All screens handle empty data gracefully. `renderGroup` with empty items returns empty array. |
| 11 | `--help` output differs from commander defaults (breaking scripts) | Medium | Medium | `program.helpInformation` override is well-documented. If needed, fall back to commander's default via `program.helpInformation(false)`. |
| 12 | Integration: race between stderr output and stdout output | Low | Low | All UI output goes to stderr (progress/errors). Analysis output goes to stdout. They never interleave because pipeline is sequential. |
| 13 | Existing tests fail due to stderr changes | Low | High | Existing tests mock `process.stderr.write` or capture output. E2E tests compare stdout, not stderr. Verify before merging. |

---

## 5. Milestones

Every milestone leaves the repository in a **working, releasable state** — `npm run build` succeeds and all existing tests pass.

| # | Milestone | Phase | State After |
|---|-----------|-------|-------------|
| M1 | **Theme system complete** | 2 | New files under `src/ui/theme/` exist but aren't imported by anything. Build passes. All tests pass. |
| M2 | **Utilities complete** | 3–5 | `ansi.ts`, `width.ts`, `animation/` exist but aren't connected. Build passes. All tests pass. |
| M3 | **Primitives complete** | 6 | All 6 primitives exist and are testable independently. Build passes. All tests pass. |
| M4 | **Renderer complete** | 7 | Renderer exists but isn't connected to CLI. Build passes. All tests pass. |
| M5 | **Animations complete** | 8 | All 3 animation types exist. AnimationManager works. Not connected to CLI. Build passes. |
| M6 | **Progress screens complete** | 9 | Scanning and analyzing screens exist. Build passes. All tests pass. |
| M7 | **Output screens complete** | 10–11 | Completion, error, stats, help screens exist. Build passes. All tests pass. |
| M8 | **CLI integration complete** | 12 | **v2.1 UI is live.** `repo-map` uses new UI. All existing tests pass. Build passes. |
| M9 | **Full test coverage** | 13 | All 23 test files passing. Cross-platform verified. Final benchmarks done. |
| **M10** | **v2.1 release candidate** | — | Tagged, benchmarked, documented. Ready for release. |

---

## 6. Final Execution Checklist

> When implementation begins, follow this checklist step by step.
> After each step, run `npm run build` and `npm test` to verify the repository remains in a working state.

### Phase 2 — Theme System (M1)

- [ ] Create `src/ui/theme/symbols.ts` — define UNICODE_SYMBOLS and ASCII_SYMBOLS
- [ ] Create `src/ui/theme/colors.ts` — detectColorMode(), resolveColor(), ANSI code tables
- [ ] Create `src/ui/theme/borders.ts` — resolveBorder(), BorderChars for round/single/none
- [ ] Create `src/ui/theme/presets/default.ts`
- [ ] Create `src/ui/theme/presets/monochrome.ts`
- [ ] Create `src/ui/theme/presets/high-contrast.ts`
- [ ] Create `src/ui/theme/presets/minimal.ts`
- [ ] Create `src/ui/theme/index.ts` — Theme interface, resolveTheme(), getTheme()
- [ ] Write `tests/ui/theme/colors.test.ts`
- [ ] Write `tests/ui/theme/symbols.test.ts`
- [ ] Write `tests/ui/theme/index.test.ts`
- [ ] **MILESTONE M1:** `npm run build` passes, `npm test` passes

### Phase 3 — ANSI Utilities (M2 part 1)

- [ ] Create `src/ui/utils/ansi.ts` — all cursor and line control functions
- [ ] Write `tests/ui/utils/ansi.test.ts`
- [ ] **Verify:** `npm run build` passes, `npm test` passes

### Phase 4 — Layout Utilities (M2 part 2)

- [ ] Create `src/ui/layout/width.ts` — getTerminalWidth(), setForcedWidth(), scaleColumns(), breakpoint()
- [ ] Write `tests/ui/layout/width.test.ts`
- [ ] **MILESTONE M2:** `npm run build` passes, `npm test` passes

### Phase 5 — Animation Types + Manager (M2 part 3)

- [ ] Create `src/ui/animation/types.ts` — AnimationFrame, Animation interface
- [ ] Create `src/ui/animation/index.ts` — AnimationManager class
- [ ] Write `tests/ui/animation/index.test.ts`
- [ ] **MILESTONE M2:** `npm run build` passes, `npm test` passes

### Phase 6 — UI Primitives (M3)

- [ ] Create `src/ui/primitives/text.ts`
- [ ] Create `src/ui/primitives/divider.ts`
- [ ] Create `src/ui/primitives/box.ts`
- [ ] Create `src/ui/primitives/table.ts`
- [ ] Create `src/ui/primitives/list.ts`
- [ ] Create `src/ui/primitives/group.ts`
- [ ] Create `src/ui/primitives/index.ts` (barrel export)
- [ ] Write `tests/ui/primitives/text.test.ts`
- [ ] Write `tests/ui/primitives/divider.test.ts`
- [ ] Write `tests/ui/primitives/box.test.ts`
- [ ] Write `tests/ui/primitives/table.test.ts`
- [ ] Write `tests/ui/primitives/list.test.ts`
- [ ] Write `tests/ui/primitives/group.test.ts`
- [ ] **MILESTONE M3:** `npm run build` passes, `npm test` passes

### Phase 7 — Renderer (M4)

- [ ] Create `src/ui/renderer.ts` — Renderer class
- [ ] Write `tests/ui/renderer.test.ts`
- [ ] **MILESTONE M4:** `npm run build` passes, `npm test` passes

### Phase 8 — Animation Implementations (M5)

- [ ] Create `src/ui/animation/spinner.ts`
- [ ] Create `src/ui/animation/progress-bar.ts`
- [ ] Create `src/ui/animation/eta.ts`
- [ ] Write `tests/ui/animation/spinner.test.ts`
- [ ] Write `tests/ui/animation/progress-bar.test.ts`
- [ ] Write `tests/ui/animation/eta.test.ts`
- [ ] **MILESTONE M5:** `npm run build` passes, `npm test` passes

### Phase 9 — Progress Pipeline (M6)

- [ ] Create `src/ui/screens/scanning.ts`
- [ ] Create `src/ui/screens/analyzing.ts`
- [ ] Write `tests/ui/screens/scanning.test.ts`
- [ ] Write `tests/ui/screens/analyzing.test.ts`
- [ ] **MILESTONE M6:** `npm run build` passes, `npm test` passes

### Phase 10 — Completion Screen (M7 part 1)

- [ ] Create `src/ui/screens/completion.ts`
- [ ] Write `tests/ui/screens/completion.test.ts`
- [ ] **Verify:** `npm run build` passes, `npm test` passes

### Phase 11 — Error, Stats, Help Screens (M7 part 2)

- [ ] Create `src/ui/screens/error.ts`
- [ ] Create `src/ui/screens/stats.ts`
- [ ] Create `src/ui/screens/help.ts`
- [ ] Write `tests/ui/screens/error.test.ts`
- [ ] Write `tests/ui/screens/stats.test.ts`
- [ ] Write `tests/ui/screens/help.test.ts`
- [ ] **MILESTONE M7:** `npm run build` passes, `npm test` passes

### Phase 12 — CLI Integration (M8)

- [ ] Create `src/ui/index.ts` — createUISession(), UISession class
- [ ] Modify `src/index.ts` — replace raw stderr writes with UISession calls
- [ ] Modify `src/bin.ts` — replace raw error writes with renderError()
- [ ] Write `tests/ui/index.test.ts`
- [ ] **Manual verification:** Run `npm run dev -- .` — verify scanning animation + completion screen
- [ ] **Manual verification:** Run `npm run dev -- . --no-color` — verify no ANSI codes
- [ ] **Manual verification:** Run `npm run dev -- --help` — verify new help screen
- [ ] **Manual verification:** Run `npm run dev -- /nonexistent` — verify error screen
- [ ] **MILESTONE M8:** `npm run build` passes, `npm test` passes. v2.1 UI is live.

### Phase 13 — Tests + Polish (M9)

- [ ] Verify all 23 test files are complete and passing
- [ ] Run `npm run build -- --noEmit` (type-only check) — verify no type errors
- [ ] Run `npm run lint` — verify no lint errors
- [ ] Verify `--no-color` produces zero ANSI sequences: `node dist/bin.js . --no-color | grep -c $'\x1b'` → 0
- [ ] Verify help output: `npm run dev -- --help | head -5` — shows new help screen
- [ ] Verify stats output: `npm run dev -- . --stats` — shows stats screen
- [ ] Verify SIGINT cleanup: Start scanning, press Ctrl+C — cursor is restored, no orphaned ANSI
- [ ] Benchmark: run 10× `node dist/bin.js . --json > /dev/null` — no regression vs v2.0
- [ ] **MILESTONE M9:** All tests pass, all manual verifications pass.

### Release (M10)

- [ ] Update `CLI_VERSION` in `src/types.ts` if needed
- [ ] Update `README.md` with any new CLI behavior
- [ ] Update `CHANGELOG.md`
- [ ] Tag release
- [ ] **MILESTONE M10:** v2.1 released.

---

## 7. Summary Statistics

| Metric | Value |
|--------|-------|
| New files (source) | 30 |
| Modified files (source) | 2 (`src/index.ts`, `src/bin.ts`) |
| New test files | 23 |
| Estimated total new LOC (source) | ~1,180 |
| Estimated total new LOC (tests) | ~600 |
| External dependencies | 0 |
| Milestones (working state) | 10 |
| Phases | 13 |
| Implementation order (steps) | 55 |
| Breaking changes to v2.0 API | 0 |

---

*This document is the single source of truth for v2.1 implementation.
Follow the checklist order. Do not skip milestones. Do not introduce unplanned abstractions.
When implementation begins, coding proceeds exactly according to this plan.*
