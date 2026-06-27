# CLI Design System — repo-map v2.1

> Single source of truth for all terminal UI decisions.
> Every component, screen, and animation derives from this specification.
> No UI code shall be written that contradicts this document.

---

## 1. Design Philosophy

repo-map is a **professional analysis tool** used by developers in CI pipelines, code reviews, onboarding, and architecture audits.

The CLI experience must reflect the same rigor as the analysis engine.

### Core Values

| Value | Meaning |
|-------|---------|
| **Premium** | Every pixel (character) is intentional. No visual noise. |
| **Calm** | The interface recedes. Data is the focus. |
| **Minimal** | If it doesn't serve the user's goal, remove it. |
| **Trustworthy** | Never imply certainty when data is uncertain. |
| **Responsive** | Feedback within 100ms. Always show progress. |
| **Professional** | Suitable for screenshots in documentation, presentations, and CI logs. |

### Anti-Values (Never)

- **Never** use emoji as decoration or status indicators
- **Never** use ASCII art or decorative flourishes
- **Never** animate purely for delight — all animation communicates state
- **Never** print celebratory messages ("Awesome!", "Great job!")
- **Never** use random/varied output — deterministic output builds trust

### References

The following tools embody the quality standard we match or exceed:

- **FreeBuff** — Terminal UI polish, calm information density
- **Bun** — Clean error messages, fast feedback, no noise
- **GitHub CLI (`gh`)** — Professional help output, consistent structure
- **Vercel CLI** — Minimal progress indicators, premium feel
- **Warp** — Terminal experience design
- **LazyGit** — Information-dense but navigable TUI patterns

---

## 2. Visual Identity

### Character Grid

The terminal is a grid of character cells. Everything we render occupies cells in this grid.

- **No overlap**: Two UI elements never occupy the same cell
- **No partial cells**: Every element aligns to the character grid
- **No variable-width characters**: All symbols used are monospace-friendly

### Layout Principles

- **Content width**: `min(terminal.columns - 4, 100)` — content never spans the full terminal width on wide displays (reduces eye travel)
- **Margins**: 2-character left margin on each line of content (except box borders)
- **Vertical rhythm**: 1 blank line between related sections, 2 blank lines between major sections
- **No right-column overhang**: All lines are either truncated or wrapped to content width

### Information Hierarchy

```
1. Status indicators       (spinner, progress bar)
2. Summary metrics         (file counts, time elapsed)
3. Primary content         (stats, classification, health score)
4. Secondary content       (details, breakdowns)
5. Tertiary content        (hints, suggestions for next action)
```

Each level is visually distinct through: position (top to bottom), color (accent → normal → dim), and density.

---

## 3. Color Palette

### Semantic Colors

| Token | ANSI 16 | ANSI 256 | Hex (TrueColor) | Usage |
|-------|---------|----------|-----------------|-------|
| `primary` | Bold Cyan (96) | 51 | `#00d4ff` | Accent, active states, brand |
| `success` | Bold Green (92) | 82 | `#00ff5e` | Completed actions, positive signals |
| `warning` | Bold Yellow (93) | 226 | `#ffff00` | Medium severity, non-blocking issues |
| `error` | Bold Red (91) | 196 | `#ff0000` | Errors, failures, high severity |
| `info` | Bold Blue (94) | 39 | `#00afff` | Informational, neutral status |
| `dim` | Dim (2) | 242 | `#6c6c6c` | Secondary content, metadata |
| `muted` | Default | 236 | `#303030` | Borders, separators, decorative |
| `text` | Default (0) | 15 | `#ffffff` | Primary body text |
| `bg` | — | 235 | `#262626` | Background accent (box fill) |

### Color Mode Detection

```typescript
type ColorMode = 'none' | '16' | '256' | 'truecolor';
```

Detection order:
1. `NO_COLOR` env var → `'none'`
2. `--no-color` CLI flag → `'none'`
3. `FORCE_COLOR` env var → forces highest mode
4. `COLORTERM=truecolor` → `'truecolor'`
5. `TERM` contains `256` → `'256'`
6. Platform is Windows Terminal (`WT_SESSION`) → `'truecolor'`
7. Fallback → `'16'`

### Fallback Rules

- `'none'`: All color functions return empty strings. No ANSI escapes emitted.
- `'16'`: Use ANSI 16 codes only (bold/bright variants for emphasis).
- `'256'`: Use 8-bit ANSI 256 codes for closer-to-design colors.
- `'truecolor'`: Use 24-bit RGB codes for exact color fidelity.

---

## 4. Typography

### Font

We do not control the terminal font. However, we assume:

- **Monospace font** with consistent character width
- **ASCII + common Unicode** support (U+2500–257F box drawing, U+2190–21FF arrows, U+2580–259F block elements)
- **No ligatures** — each character is one cell wide

### Text Styles

| Style | ANSI Code | Usage |
|-------|-----------|-------|
| Normal | None | Body content |
| Bold | `\x1b[1m` | Labels, section headers, key values |
| Dim | `\x1b[2m` | Metadata, secondary info, hints |
| Bold+Color | Combined | Status indicators, important values |

### Weights & Emphasis

- **Section headers**: Bold + primary color
- **Labels**: Bold, default color
- **Values**: Normal weight, default color
- **Metadata**: Dim
- **Errors**: Bold + error color
- **Success**: Bold + success color

### Wrapping Rules

- Words are never broken (no mid-word hyphenation)
- If a word exceeds content width, it is truncated with `…` appended
- Wrapping only occurs at word boundaries (space-separated)
- Paths and code identifiers are treated as single "words" for truncation

---

## 5. Icon System

### Symbol Set

We use a curated Unicode symbol set. No emoji. No decorative ASCII art.

| Token | Unicode | Fallback (ASCII) | Semantics |
|-------|---------|------------------|-----------|
| `check` | `✓` (U+2713) | `[ok]` | Success, completed |
| `cross` | `✗` (U+2717) | `[!]` | Error, failure |
| `warning` | `⚠` (U+26A0) | `[!]` | Warning, attention needed |
| `arrow` | `→` (U+2192) | `->` | Progression, direction |
| `bullet` | `·` (U+00B7) | `*` | List item (secondary) |
| `pointer` | `▸` (U+25B8) | `>` | List item (primary) |
| `ellipsis` | `…` (U+2026) | `...` | Truncation, continuation |
| `arrowUp` | `↑` (U+2191) | `^` | Increase, positive trend |
| `arrowDown` | `↓` (U+2193) | `v` | Decrease, negative trend |
| `separator` | `─` (U+2500) | `-` | Horizontal divider |

### Box-Drawing Characters

| Token | Unicode | Fallback (ASCII) | Usage |
|-------|---------|------------------|-------|
| `tl_round` | `╭` (U+256D) | `+` | Top-left corner (rounded) |
| `tr_round` | `╮` (U+256E) | `+` | Top-right corner (rounded) |
| `bl_round` | `╰` (U+2570) | `+` | Bottom-left corner (rounded) |
| `br_round` | `╯` (U+256F) | `+` | Bottom-right corner (rounded) |
| `tl_single` | `┌` (U+250C) | `+` | Top-left corner (single) |
| `tr_single` | `┐` (U+2510) | `+` | Top-right corner (single) |
| `bl_single` | `└` (U+2514) | `+` | Bottom-left corner (single) |
| `br_single` | `┘` (U+2518) | `+` | Bottom-right corner (single) |
| `h` | `─` (U+2500) | `-` | Horizontal line |
| `v` | `│` (U+2502) | `\|` | Vertical line |

### Progress Characters

| Token | Unicode | Fallback (ASCII) | Usage |
|-------|---------|------------------|-------|
| `filled` | `█` (U+2588) | `#` | Filled progress bar segment |
| `empty` | `░` (U+2591) | `.` | Empty progress bar segment |

### Unicode Fallback

Unicode support is detected by platform and terminal:

- **Windows CMD** (no `WT_SESSION`): Use ASCII fallbacks
- **CI/Pipe** (not a TTY): Use ASCII fallbacks
- **All other terminals**: Full Unicode

---

## 6. Border Styles

### Style Definitions

| Style | Corners | Horizontal | Vertical | Usage |
|-------|---------|------------|----------|-------|
| `round` | `╭╮╰╯` | `─` | `│` | Default — completion screen, errors |
| `single` | `┌┐└┘` | `─` | `│` | Fallback when round unavailable |
| `none` | — | — | — | Narrow terminals, inline content |

### Box Padding

- Internal padding: **1 character** (left and right)
- Minimum box width: **20 characters** (content + borders + padding)
- Maximum box width: **content width** (determined by layout engine)

### Divider Rules

- Full-width horizontal rule: `contentWidth` repetitions of `─`
- With centered label: `─ label ─` with remaining width filled on both sides
- Minimum label gap: 3 characters on each side

---

## 7. Spacing Scale

All spacing is defined in character cells (vertical lines / horizontal columns).

| Token | Value | Usage |
|-------|-------|-------|
| `none` | 0 | Adjacent elements with no gap |
| `xs` | 1 | Between rows in a compact table |
| `sm` | 1 | Between related items in a group |
| `md` | 1 | Between paragraphs / sections |
| `lg` | 2 | Between major sections |
| `xl` | 2 | Before and after box borders |

### Padding Rules

- **Left margin**: 2 spaces on all content lines (except box border lines)
- **Internal box padding**: 1 space on each side of content
- **Table cell padding**: 1 space on each side of content, minimum
- **Column gap**: 2 spaces between columns

### Width Behavior

| Terminal Width | Behavior |
|---------------|----------|
| `< 40` cols | No boxes (border=none). Single column. No side-by-side. |
| `40–79` cols | Compact boxes. Reduced padding (0 internal). Table columns scale to fit. |
| `80–119` cols | Default boxes. Standard padding. Full table layout. |
| `>= 120` cols | Full-width boxes. Generous padding. Maximum content width capped at 100 cols. |

---

## 8. Animation Principles

### When to Animate

| Scenario | Animation | Rationale |
|----------|-----------|-----------|
| Scanning | Spinner + "Scanning project..." | User waits — feedback required |
| Analyzing | Spinner + "Analyzing..." | No deterministic progress available |
| Progress known | Progress bar | Shows completion percentage |
| Indeterminate wait | Pulse/ellipsis | Shows activity without false precision |
| Completion | Instant render | No animation on final output — it's data, not a reveal |

### When NOT to Animate

- **Final output** — never fade-in, slide, or reveal results
- **Error messages** — rendered instantly, no transitions
- **Help text** — static content rendered immediately
- **During pipe/CI** — all animations disabled

### Frame Rates

| Context | Interval | Rationale |
|---------|----------|-----------|
| Default | 80ms (12.5 FPS) | Smooth enough for visual feedback, low CPU |
| Narrow terminal | 100ms (10 FPS) | Reduces visual noise on limited space |
| Windows (non-WT) | 120ms (~8 FPS) | Console I/O is slower on legacy Windows |
| CI/Pipe | ∞ (static) | No TTY — no animation possible |

### Graceful Degradation

1. If `NO_COLOR` is set → no color, no animation
2. If not a TTY → no animation, plain text
3. If narrow terminal → fewer spinner frames, slower rate
4. If no Unicode support → ASCII fallback characters

---

## 9. Accessibility

### `--no-color`

- All `--no-color` outputs must be readable and well-structured without color
- Layout, spacing, and hierarchy remain identical
- Symbols and borders remain (color is a layer on top, not the only signal)

### Narrow Terminals

- Minimum supported width: **30 columns**
- Below 30 columns: Warning message suggesting wider terminal
- 30–50 columns: Compact mode — reduced padding, no boxes, stacked layout
- Content is never lost due to width — text wraps or truncates with `…`

### Screen Readers

- No images or non-text content
- All information conveyed through text structure (headers, spacing, grouping)
- ANSI codes do not interfere with screen reader output in modern terminals

### Color Independence

- No information is conveyed through color alone
- All colored text includes structural context (prefix labels, grouping, whitespace)

---

## 10. Component Examples

### Example 1: Completion Screen (80-col terminal)

```
╭─ repo-map · my-project ─────────────────────────────╮
│                                                      │
│  Files: 42   Dirs: 12   Size: 15.3 KB   Depth: 4    │
│                                                      │
│  Classification:  CLI Tool (87%)                     │
│  Maturity:        Active Development                 │
│  Health Score:    65/100                             │
│                                                      │
│  Languages                                           │
│  TypeScript    30 files  (71.4%)                     │
│  JavaScript     8 files  (19.0%)                     │
│  JSON           4 files  ( 9.5%)                     │
│                                                      │
│  ✓ 5 strengths identified                            │
│  ✓ 3 improvement suggestions (2 high priority)       │
│                                                      │
│  Completed in 1.2s                                   │
│                                                      │
╰────────────────────────────────────────────────────────╯

Output written to architecture.md
```

### Example 2: Error Screen

```
╭─ Error ────────────────────────────────────────────╮
│                                                     │
│  ✗ Path does not exist: /invalid/path               │
│                                                     │
│  Provide a valid path to a directory to scan, or     │
│  run 'repo-map .' to scan the current directory.    │
│                                                     │
╰───────────────────────────────────────────────────────╯
```

### Example 3: Stats Output

```
╭─ repo-map · stats ─────────────────────────────────╮
│                                                     │
│  Files: 42   Dirs: 12   Size: 15.3 KB               │
│  Depth: 4                                           │
│                                                     │
│  TypeScript             30 files  (71.4%)            │
│  JavaScript              8 files  (19.0%)            │
│  JSON                    4 files  ( 9.5%)            │
│                                                     │
│  Largest file:   src/app.ts (2.5 KB)                 │
│  Largest dir:    src/components (15 files)           │
│  Avg files/dir:  3.5                                 │
│                                                     │
╰───────────────────────────────────────────────────────╯
```

### Example 4: Help Screen

```
repo-map — Professional repository analysis           v2.1.0

  Scan any codebase, detect technologies, and generate
  comprehensive architecture reports.

USAGE

  $ repo-map [path] [options]

ARGUMENTS

  [path]      Path to the repository to scan       [default: .]

OPTIONS

  --json                JSON output (stable schema)
  -o, --output <file>   Write to file
  --depth <number>      Maximum directory depth
  --stats               Compact summary
  --exclude <pattern>   Exclude files (repeatable)
  --include <pattern>   Only include matching files
  --no-color            Disable ANSI colors

EXAMPLES

  $ repo-map .                         Scan current directory
  $ repo-map --json -o report.json     Generate JSON report
  $ repo-map --stats --exclude dist    Quick stats with filter

  → codebuff.com/docs   Full documentation
```

### Example 5: Scanning Phase

```
⠋ Scanning my-project...      (updating in place via \r)
✓ Scanned my-project — 42 files, 12 directories
```

### Example 6: Analyzing Phase

```
⠙ Analyzing...                 (updating in place via \r)
✓ Done in 0.8s.
```

---

## 11. Rendering Pipeline Specification

### Architecture

```
┌──────────┐    IR (Line[])    ┌──────────┐   Frame (StyledLine[])   ┌──────────┐   string[]   ┌──────────┐
│  Screen   │ ──────────────▶ │  Layout   │ ──────────────────────▶ │ Renderer │ ──────────▶ │ Terminal │
└──────────┘                  └──────────┘                          └──────────┘             └──────────┘
     │                              │                                    │
     │ Pure data                    │ Width calculations                  │ ANSI application
     │ (Analysis)                   │ Wrapping / padding                 │ Theme integration
     │ Theme + Layout               │ Alignment                          │ Color resolution
```

### Intermediate Representation (IR)

```typescript
interface Line {
  segments: Segment[];
}

interface Segment {
  text: string;
  style: TextStyle;       // Semantic style (not raw ANSI)
}

interface TextStyle {
  bold?: boolean;
  dim?: boolean;
  color?: ColorToken;     // 'primary' | 'success' | 'error' | etc.
}
```

The IR is:
- **Platform-independent** — no ANSI codes, no terminal assumptions
- **Testable** — simple array of typed objects
- **Composable** — screens return `Line[]`, which can be concatenated

### Layout Stage

Takes IR + `WidthInfo` and produces a **positioned frame**:

```typescript
interface Frame {
  lines: StyledLine[];
}

interface StyledLine {
  segments: StyledSegment[];
  width: number;          // Actual rendered width (for alignment)
}

interface StyledSegment {
  text: string;
  style: TextStyle;
}
```

Layout handles:
- Left margin insertion (2 spaces)
- Text wrapping and truncation
- Box border generation
- Column alignment in tables
- Box padding

### Renderer Stage

Takes `Frame` + `Theme` and produces the final string output:

```typescript
function renderFrame(frame: Frame, theme: Theme): string[]
```

The renderer:
- Resolves `TextStyle` tokens to ANSI escape sequences via the theme
- Joins segments on each line, applying ANSI open/close
- Appends `\x1b[0m` reset at end of each styled segment
- Returns raw strings ready for `process.stdout.write()`

---

## 12. Animation Manager Specification

### Architecture

```
┌─────────────────────┐
│  AnimationManager   │
│                     │
│  ┌───────┐          │
│  │ Timer │ (single) │
│  └──┬────┘          │
│     │ tick()        │
│  ┌──▼───────────┐   │
│  │  Animations  │   │
│  │ ┌──────────┐ │   │
│  │ │ Spinner  │ │   │
│  │ │ Progress │ │   │
│  │ │ ETA      │ │   │
│  │ │ Counters │ │   │
│  │ │ Status   │ │   │
│  │ └──────────┘ │   │
│  └──────────────┘   │
└─────────────────────┘
```

### API

```typescript
interface Animation {
  type: string;
  tick(dt: number): Frame | null;   // Return null if no update needed
  dispose(): void;
}

class AnimationManager {
  constructor(options: { interval?: number; enabled: boolean });
  
  register(animation: Animation): void;
  unregister(animation: Animation): void;
  
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  
  get currentFrame(): Frame | null;  // Most recent frame from any animation
}
```

### Key Behaviors

- **Single `setInterval`**: All animations share one timer at the configured interval
- **No independent timers**: Individual animations never call `setTimeout` or `setInterval`
- **`dt` delta-time**: Each `tick()` receives milliseconds since last tick for time-based animations
- **Frame coalescing**: If an animation hasn't changed since last tick, it returns `null` — the manager skips the redraw
- **Lifecycle**: `register()` / `unregister()` for dynamic add/remove during scanning phases
- **Cleanup**: `stop()` clears the timer and calls `dispose()` on all registered animations
- **CI behavior**: When `enabled: false`, the manager never starts the timer — animations return static frames on demand

### Animation Types

| Type | State | tick() behavior |
|------|-------|-----------------|
| **Spinner** | Current frame index | Advances index, returns spinner char + text |
| **Progress** | Current percentage | Returns bar if percentage changed, null otherwise |
| **ETA** | Start time, elapsed | Returns time string every ~1s |
| **Counters** | Counter values | Returns updated counter string when values change |
| **Status** | Current status text | Returns text when status is updated externally |

---

## 13. Theme System Specification

### Interface

```typescript
interface Theme {
  name: string;
  
  // Color resolvers
  color: (token: ColorToken, mode?: ColorMode) => string;
  
  // Styled text helpers
  style: (text: string, style: TextStyle) => string;
  
  // Symbol resolvers
  symbol: (token: SymbolToken) => string;
  
  // Border resolvers
  border: (style: BorderStyle) => BorderChars;
  
  // Pre-computed values
  colors: Record<ColorToken, string>;     // Resolved for current mode
  symbols: Record<SymbolToken, string>;    // Resolved for current unicode support
  borders: Record<BorderStyle, BorderChars>;
}

type ColorToken = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'dim' | 'muted' | 'text' | 'bg';
type SymbolToken = 'check' | 'cross' | 'warning' | 'arrow' | 'bullet' | 'pointer' | 'ellipsis' | 'arrowUp' | 'arrowDown' | 'separator' | 'filled' | 'empty';
type BorderStyle = 'round' | 'single' | 'none';

interface BorderChars {
  tl: string; tr: string; bl: string; br: string;
  h: string; v: string;
}
```

### Theme Presets

| Preset | Description |
|--------|-------------|
| **Default** | Full color, Unicode symbols, rounded borders |
| **Monochrome** | No color (all `color()` returns empty string), Unicode symbols, rounded borders |
| **High Contrast** | Bold text, increased spacing, `bg` color for boxes |
| **Minimal** | No color, ASCII symbols, single-line borders, minimal spacing |

### Resolution

```typescript
function resolveTheme(options: { color: boolean; unicode: boolean }): Theme {
  if (!options.color && !options.unicode) return themes.minimal;
  if (!options.color) return themes.monochrome;
  if (/* high contrast requested */) return themes.highContrast;
  return themes.default;
}
```

---

## 14. ANSI Encapsulation Rules

### Forbidden Patterns

```typescript
// ❌ FORBIDDEN — Direct ANSI in components
console.log('\x1b[32m✓ Done\x1b[0m');
process.stderr.write('\x1b[1mScanning...\x1b[0m');

// ❌ FORBIDDEN — ANSI string literals outside renderer
const RED = '\x1b[31m';

// ❌ FORBIDDEN — Conditional ANSI emission in screens
if (colorEnabled()) { output += '\x1b[32m'; }
```

### Allowed Patterns

```typescript
// ✅ ALLOWED — Via theme
const result = theme.style('✓ Done', { color: 'success' });
output += result;

// ✅ ALLOWED — Via renderer
const lines = renderer.renderFrame(frame, theme);
lines.forEach(line => process.stdout.write(line + '\n'));

// ✅ ALLOWED — Via AnimationManager (which uses renderer internally)
manager.register(new Spinner({ text: 'Scanning...' }));
manager.start();
```

### Boundary

The **only** modules that may emit ANSI escape sequences:

1. `src/ui/theme/colors.ts` — Defines ANSI code mappings
2. `src/ui/renderer.ts` — Applies ANSI codes to styled segments
3. `src/ui/utils/ansi.ts` — Raw escape sequence utilities (cursor, clear, etc.)

All other modules (screens, primitives, animations) work with **semantic tokens** only.

---

## 15. Testing Principles

### Test Types

| Type | What | How |
|------|------|-----|
| **Snapshot** | Screen output | Compare `Line[]` IR against expected structure |
| **Functional** | Primitive output | Assert specific lines contain expected content |
| **Edge case** | Narrow/wide terminals | `setForcedWidth(40)` and verify compact layout |
| **Color mode** | `--no-color` | Verify no ANSI codes in output |
| **Unicode** | ASCII fallback | `setUnicodeSupport(false)` and verify ASCII chars |
| **Animation** | Frame advancement | Verify `tick()` returns expected sequence |

### Testing Utilities

```typescript
// Force terminal width for deterministic tests
setForcedWidth(80);

// Force color mode
setColorMode('none');

// Force unicode support
setUnicodeSupport(false);

// Capture stdout/stderr
const stdout = captureStdout();
// ... run code ...
expect(stdout()).not.toContain('\x1b[');  // No ANSI in --no-color mode
```

---

## 16. File Structure (Refined)

```
src/ui/
├── index.ts                 # createUISession(options) → UISession
├── renderer.ts              # Frame → styled string[]
│
├── theme/
│   ├── index.ts             # Theme interface, resolveTheme()
│   ├── colors.ts            # Color token → ANSI code (all modes)
│   ├── symbols.ts           # Symbol token → character
│   ├── borders.ts           # Border style → characters
│   └── presets/
│       ├── default.ts       # Default theme preset
│       ├── monochrome.ts    # No-color theme preset
│       ├── high-contrast.ts # High contrast theme preset
│       └── minimal.ts       # Minimal theme preset
│
├── layout/
│   ├── index.ts             # LayoutEngine class
│   └── width.ts             # Terminal width detection & scaling
│
├── animation/
│   ├── index.ts             # AnimationManager class
│   ├── spinner.ts           # Spinner animation
│   ├── progress-bar.ts      # Deterministic progress bar
│   ├── eta.ts               # ETA timer animation
│   └── types.ts             # Animation interface
│
├── primitives/
│   ├── index.ts             # Re-exports
│   ├── box.ts               # Box/panel IR builder
│   ├── text.ts              # Text styling, wrapping, truncation
│   ├── table.ts             # Column table IR builder
│   ├── divider.ts           # Horizontal rule IR builder
│   └── tags.ts              # Badge/chip IR builder
│
├── screens/
│   ├── index.ts             # Re-exports
│   ├── scanning.ts          # Scanning phase screen
│   ├── analyzing.ts         # Analyzing phase screen
│   ├── completion.ts        # Results screen
│   ├── error.ts             # Error presentation screen
│   ├── help.ts              # Help screen
│   └── stats.ts             # Stats summary screen
│
└── utils/
    ├── index.ts             # Re-exports
    └── ansi.ts              # ANSI escape code helpers
```

---

*This document is the single source of truth for repo-map v2.1 CLI design decisions.
All UI code must conform to this specification.
All new screens, primitives, and animations must be documented here before implementation.*
