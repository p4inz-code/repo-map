# repo-map v2.2.0 — Product Identity & CLI UX Architecture

> Final design specification.
> This document is the single source of truth for all visual decisions.
> Every future UI change must conform to this specification before merge.
> The goal: a CLI that feels premium, intentional, and instantly recognizable
> through consistency, restraint, speed, and excellent information architecture.

---

## 0. The CLI Laws

These are immutable engineering rules. Not suggestions. Not guidelines.
Every contributor must follow them before merging any UI change.
If a law conflicts with a preference, the law wins.

```
 LAW  1  ONE SCREEN, ONE PURPOSE
         Every screen answers exactly one question.
         If a screen answers two questions, split it.

 LAW  2  PRIMARY FOCAL POINT
         Every screen has exactly one element the eye goes to first.
         Within one second, the user knows where to look.

 LAW  3  MUSCLE MEMORY
         Layouts, spacing, ordering, labels, and animations
         never change between runs. Predictable is premium.

 LAW  4  ALIVE THEN STILL
         Motion exists only during progress.
         When the work is done, the screen is completely still.

 LAW  5  DENSITY FOLLOWS INTENT
         Each command shows exactly the information its purpose requires.
         Never mix layers. Overview ≠ Metrics ≠ Architecture.

 LAW  6  EARN YOUR SPACE
         Every visual component must earn its place.
         If removing it makes the screen clearer, remove it.

 LAW  7  COMPLETION FEEL
         Every command ends with a feeling of completion.
         The final screen is a report, not raw terminal output.

 LAW  8  RECOGNIZABLE WITHOUT A LOGO
         The visual language is consistent enough that a screenshot
         is identifiable as repo-map without reading the name.

 LAW  9  CONSISTENCY OVER CREATIVITY
         Consistency builds trust. Every new screen must match
         existing patterns. Novelty for its own sake is forbidden.

 LAW 10  FIRST FIVE SECONDS
         The default command optimizes for the first five seconds.
         Users decide if a CLI is good almost immediately.

 LAW 11  INSTANT ACKNOWLEDGMENT
         The first visible output appears within 100ms of execution.
         A blank terminal for even 200ms destroys trust.

 LAW 12  SINGLE-LINE PROGRESS
         Progress indicators are one line. One spinner. One status.
         Multi-line spinners waste vertical space and add noise.

 LAW 13  DETERMINISTIC OUTPUT
         Same input produces identical output. Always.
         No timestamps, no random variation, no environment leaks.

 LAW 14  COLOR MEANS COLOR
         Green = success. Red = error. Cyan = brand. Yellow = warning.
         No other color exists in the default palette.
         Gray (dim) handles all secondary content.

 LAW 15  NO CELEBRATION
         No emoji. No exclamation marks. No "Done! ✨".
         The result IS the completion signal.

 LAW 16  CONTENT WIDTH CAP
         Content never exceeds 100 characters regardless of terminal width.
         Eye travel is the enemy of readability.

 LAW 17  GRACEFUL DEGRADATION
         Narrow terminals lose elegance, never information.
         Piped output loses animation and color, never structure.

 LAW 18  ACCESSIBLE BY DEFAULT
         Every screen is readable without color and without Unicode.
         Color and Unicode enhance; they never carry information alone.

 LAW 19  ERRORS ARE CALM
         Error messages explain what went wrong and how to fix it.
         No stack traces. No debugging info. No panic.

 LAW 20  THE DEFAULT IS THE PRODUCT
         repo-map with no flags IS the product experience.
         Flags add depth. They never fix the default.
```

---

## 1. CLI Identity

### What repo-map Is

A lens. It scans a repository and reveals its structure.
It does not generate, deploy, scaffold, or monitor.
It shows you what you already have — and makes it visible.

### The Identity Test

If someone sees a screenshot of repo-map output and cannot identify
it as repo-map without reading the text, the visual identity has failed.
The identity is carried by:

1. The `╭─ repo-map · {name}` box title format
2. The 20-character label column alignment
3. The 24-character health bar
4. The single-line metrics pattern
5. The calm, dim metadata styling

None of these require a logo. All of them are structural.

### Voice

| Voice | Character | Example |
|-------|-----------|---------|
| System | Neutral, present-tense | `Scanning my-project...` |
| Result | Authoritative, structured | `CLI Tool` / `65/100` |
| Error | Calm, specific, actionable | `Path does not exist: /foo` |

**Never:** Celebration, apology, vagueness, decoration.

---

## 2. The Five Commands

> Information density scales with intent.
> Each command shows exactly what its purpose requires.
> Never mix layers.

| Command | Purpose | Shows |
|---------|---------|-------|
| `repo-map [path]` | Overview | What is this repository? |
| `repo-map [path] --stats` | Metrics | What are the numbers? |
| `repo-map [path] --suggest` | Improvements | What should I fix? |
| `repo-map [path] --json` | Everything | Full structured data |
| `repo-map [path] -o file` | Export | Write report to file |

Each command is a **layer**. The layers never mix.

```
Layer 0:  repo-map .           → Identity + Health + Size + Composition
Layer 1:  repo-map --stats     → Layer 0 + Detailed Metrics + Elapsed
Layer 2:  repo-map --suggest   → Strengths + Suggestions + Priorities
Layer 3:  repo-map --json      → Everything, structured
```

### Why Separate `--stats` and `--suggest`?

These serve different intents:

- `--stats` answers "what are the numbers?" — quantitative
- `--suggest` answers "what should I do?" — qualitative

Mixing them in the default dashboard forces the user to parse
information they didn't ask for. Separation respects intent.

### The Default Command (`repo-map .`)

This IS the product. It must be perfect in the first five seconds.

**Single purpose:** Answer "What is this repository?"

**Primary focal point:** The classification line. The eye goes there first.

```
╭─ repo-map · my-project ───────────────────────────────────────╮
│                                                                │
│  Classification    CLI Tool                              87%   │  ← FOCAL POINT
│  Maturity          Active Development                          │
│  Health            ██████████████████░░░░░░░░  65/100           │
│                                                                │
│  Files  42    Dirs  12    Size  15.3 KB    Depth  4             │
│                                                                │
│  TypeScript  30 files (71%)                                     │
│  JavaScript   8 files (19%)                                     │
│  JSON         4 files (10%)                                     │
│                                                                │
╰────────────────────────────────────────────────────────────────╯
```

**Eye path (within 1 second):**

```
1. Classification line (bold label, clear value, right-aligned %)  ← user knows WHAT
2. Health bar (visual, immediate)                                   ← user knows HOW
3. Metrics line (compact, scannable)                                ← user knows SIZE
4. Language list (clean, right-aligned numbers)                     ← user knows COMPOSITION
```

**What the default does NOT show:**
- Strengths → `--suggest`
- Suggestions → `--suggest`
- Elapsed time → `--stats`
- Architecture → `--json`
- Dependencies → `--json`
- Import analysis → `--json`
- Refactoring → `--json`
- Risk report → `--json`

The default is a **summary**. The report exists. It is not the default.

### Why These Decisions Survive the Gate Questions

**Classification first (not metrics first):**
- Q1: Reduces cognitive load by establishing context immediately
- Q2: "CLI Tool" is more useful than "42 files" as the first fact
- Q3: Experts scan identity first, numbers second
- Q4: Cannot remove — it is the answer to the primary question

**Health as a bar (not just a number):**
- Q1: Bar is understood in 50ms, number requires interpretation
- Q2: Bar communicates score faster than text
- Q3: Daily users appreciate visual scanning over reading
- Q4: Cannot remove — health is the second most important fact

**No language bars (just text):**
- Q1: Bars for 3-5 similar-count items are visually noisy
- Q2: Clean text with right-aligned numbers scans faster
- Q3: Experienced developers read "30 files (71%)" faster than interpret bars
- Q4: Removed bars — the screen is clearer without them

**No strengths/suggestions in default:**
- Q1: Adding them would answer "what should I do?" — a different question
- Q2: Mixing identity and improvement suggestions confuses the focal point
- Q4: Removed — the dashboard is cleaner and more focused

**No elapsed time in default:**
- Q1: Elapsed time is metadata about the tool, not the repository
- Q4: Removed — the dashboard is cleaner

---

## 3. Screen Specifications

### 3.1 Dashboard (`repo-map .`)

**Purpose:** Answer "What is this repository?"
**Focal point:** Classification line
**Line budget:** 12 lines inside box (including breathing)
**Eye path:** Classification → Health → Metrics → Languages

```
╭─ repo-map · my-project ───────────────────────────────────────╮
│                                                                │
│  Classification    CLI Tool                              87%   │
│  Maturity          Active Development                          │
│  Health            ██████████████████░░░░░░░░  65/100           │
│                                                                │
│  Files  42    Dirs  12    Size  15.3 KB    Depth  4             │
│                                                                │
│  TypeScript  30 files (71%)                                     │
│  JavaScript   8 files (19%)                                     │
│  JSON         4 files (10%)                                     │
│                                                                │
╰────────────────────────────────────────────────────────────────╯
```

**Layout rules:**
- Classification, Maturity, Health: 20-char label column (bold), value, optional right-aligned suffix (dim)
- Metrics: single horizontal line, 3-space gaps between pairs
- Languages: name (left), count + percentage (right-aligned after 2-space gap)
- 1 blank line after top border (breathing)
- 1 blank line before bottom border (breathing)
- 1 blank line between sections inside box

### 3.2 Stats (`repo-map --stats`)

**Purpose:** Answer "What are the numbers?"
**Focal point:** Metrics line
**Line budget:** 16 lines inside box

```
╭─ repo-map · my-project · stats ──────────────────────────────╮
│                                                               │
│  Files  42    Dirs  12    Size  15.3 KB                       │
│  Depth  4    Avg files/dir  3.5                               │
│                                                               │
│  Languages                                                    │
│  TypeScript    30 files  (71.4%)                               │
│  JavaScript     8 files  (19.0%)                               │
│  JSON           4 files  ( 9.5%)                               │
│                                                               │
│  Largest file  src/app.ts (2.5 KB)                             │
│  Largest dir   src/components (15 files)                       │
│                                                               │
│  Completed in 1.2s                                            │
│                                                               │
╰───────────────────────────────────────────────────────────────╯
```

**Layout rules:**
- Same label-value alignment as dashboard
- Section headers ("Languages") bold, no indent
- Elapsed time at bottom, dim
- 1 blank line between sections

### 3.3 Suggest (`repo-map --suggest`)

**Purpose:** Answer "What should I fix?"
**Focal point:** High-priority suggestions
**Line budget:** 20 lines inside box

```
╭─ repo-map · my-project · suggestions ────────────────────────╮
│                                                               │
│  Strengths                                                    │
│  ✓ Clean project structure with clear separation              │
│  ✓ Comprehensive test coverage                                │
│  ✓ Consistent coding style                                    │
│                                                               │
│  Suggestions                                                  │
│  ✗ Add CI/CD pipeline for automated testing                   │
│  ! Upgrade outdated dependencies (3 high-severity)            │
│  · Consider adding API documentation                          │
│                                                               │
╰───────────────────────────────────────────────────────────────╯
```

**Layout rules:**
- Strengths: ✓ in green, text default
- High priority: ✗ in red, text default
- Medium priority: ! in yellow, text default
- Low priority: · in dim, text default
- Section headers ("Strengths", "Suggestions") bold

### 3.4 Error (`repo-map /bad`)

**Purpose:** Answer "What went wrong and how do I fix it?"
**Focal point:** Error title (red)
**Line budget:** 8 lines inside box

```
╭─ Error ──────────────────────────────────────────────────────╮
│                                                               │
│  ✗ Path does not exist: /nonexistent                          │
│                                                               │
│  Provide a valid path to a directory,                         │
│  or run 'repo-map .' for the current one.                     │
│                                                               │
╰───────────────────────────────────────────────────────────────╯
```

**Layout rules:**
- Title: bold + error color
- Message: default weight, wrapped to content width
- Suggestion: dim, wrapped
- No brand prefix (errors are not product moments)

### 3.5 Help (`repo-map --help`)

**Purpose:** Answer "What can I do?"
**Focal point:** USAGE line
**Line budget:** 24 lines (no box)

```
repo-map — Professional repository analysis    v2.2.0

  Scan any codebase, detect technologies, and
  generate comprehensive architecture reports.

USAGE

  $ repo-map [path] [options]

ARGUMENTS

  [path]      Path to the repository to scan  [default: .]

OPTIONS

  --json                JSON output (stable schema)
  -o, --output <file>   Write output to file
  --depth <number>      Maximum directory depth
  --stats               Compact repository summary
  --suggest             Improvement suggestions
  --exclude <pattern>   Exclude files (repeatable)
  --include <pattern>   Only include matching files
  --no-ignore           Do not respect .gitignore
  --no-color            Disable ANSI color output

EXAMPLES

  $ repo-map .                      Scan current directory
  $ repo-map --json -o report.json  Generate JSON report
  $ repo-map --stats --exclude dist Quick stats with filter

  → codebuff.com/docs   Full documentation
```

**Layout rules:**
- No box (free-form layout)
- Section headers (USAGE, ARGUMENTS, OPTIONS, EXAMPLES) bold
- Version right-aligned, dim
- 2-space indent for all content
- Arrow (`→`) for documentation link

### 3.6 Narrow Terminal (< 60 columns)

All screens degrade to text-only mode. No boxes. No bars.
Information is preserved. Elegance is sacrificed. This is acceptable.

```
repo-map · my-project

Classification: CLI Tool (87%)
Maturity: Active Development
Health: 65/100

Files: 42  Dirs: 12  Size: 15.3 KB  Depth: 4

TypeScript  30 files (71%)
JavaScript   8 files (19%)
JSON         4 files (10%)
```

---

## 4. Visual Language

### The Grid

Terminal is a character grid. Every element occupies cells.
No overlap. No partial cells. No variable-width characters.

### Content Width

| Rule | Value | Why |
|------|-------|-----|
| Max content width | 100 characters | Comfortable reading width |
| Left margin | 2 characters | Breathing room from edge |
| Right margin | 2 characters | Symmetry |
| Box internal padding | 1 character each side | Content doesn't touch borders |

On terminals wider than 124 columns, content is centered.

### Vertical Rhythm

```
Between sections inside box:    1 blank line
After top border (inside):      1 blank line (breathing)
Before bottom border (inside):  1 blank line (breathing)
After box (outside):            1 blank line (only if output follows)
```

No double blank lines. The box border provides separation.
Single blank lines create rhythm without wasting space.

### Box Width

```
boxWidth = min(contentWidth + 2, terminalColumns)
```

Always 2 characters narrower than the terminal.
Equal 1-character margins on each side.

### The Brand Format

```
╭─ repo-map · {name} ───────────────────────────────╮
```

- Always `repo-map · {name}`
- Stats: `repo-map · {name} · stats`
- Suggest: `repo-map · {name} · suggestions`
- Error: `Error` (no brand prefix)
- This format IS the visual identity

---

## 5. Component System

### Design System Principle

Every component is part of a reusable system.
Not isolated screens. Not one-off compositions.

### Primitives

| Primitive | Purpose | Contract |
|-----------|---------|----------|
| `renderBox()` | Bordered panel | `string[] → string[]` |
| `renderDivider()` | Horizontal rule | `options → string` |
| `renderTable()` | Column-aligned data | `columns + rows → string[]` |
| `renderList()` | Marked items | `items + style → string[]` |
| `renderGroup()` | Labeled section | `title + items → string[]` |
| `wrap()` | Word-wrap | `text + width → string[]` |
| `truncate()` | Truncate with `…` | `text + maxLen → string` |
| `padRight()` / `padLeft()` | Alignment | `text + len → string` |

### v2.2 Patterns

Inline functions within screen modules. NOT separate modules.
Extracted to shared utilities only when used in 2+ screens.

| Pattern | Used in | Purpose |
|---------|---------|---------|
| `renderBar()` | completion, stats | 24-char proportional bar with label |
| `renderMetricLine()` | completion, stats | Horizontal key-value pairs |
| `renderLabelValue()` | completion, stats | 20-char label + value + suffix |

### `renderBar()` Contract

```
Input:  value (0-100), maxValue (usually 100), width (default 24), label
Output: "████████████████░░░░░░░░  65/100"
```

- Characters: `█` (filled) and `░` (empty)
- Width: 24 characters (fixed)
- Label: right-aligned after bar, dim

### `renderMetricLine()` Contract

```
Input:  [{ label: "Files", value: "42" }, { label: "Dirs", value: "12" }, ...]
Output: "Files  42    Dirs  12    Size  15.3 KB    Depth  4"
```

- Labels: bold
- Values: default weight
- 3 spaces between pairs
- No trailing whitespace

### `renderLabelValue()` Contract

```
Input:  label ("Classification"), value ("CLI Tool"), suffix ("87%")
Output: "Classification    CLI Tool                              87%"
```

- Label: padRight to 20 chars, bold
- Value: fills remaining space
- Suffix: padLeft to 6 chars, dim

---

## 6. Typography

### Hierarchy

```
Level 1:  Product name       bold + primary     "repo-map"
Level 2:  Section titles     bold               "Languages"
Level 3:  Labels             bold               "Classification"
Level 4:  Values             default            "CLI Tool"
Level 5:  Metadata           dim                "v2.2.0"
Level 6:  Suffixes           dim                "(71%)"
```

### Rules

1. Bold: labels and titles only. Never body text.
2. Dim: metadata, timestamps, suffixes, version numbers.
3. Color: green=success, red=error, cyan=brand, yellow=warning. Nothing else.
4. No underlines except links in `--help`.
5. No italic. Terminals don't reliably support it.
6. No reverse video. Too aggressive.

### The Alignment Contract

Every label-value pair follows the same 20-char pattern:

```
  Classification    CLI Tool                              87%
  Maturity          Active Development
  Health            ██████████████████░░░░░░░░  65/100
  ←── 20 chars ───→ ←── value ─────────────────→ ←suffix→
```

This alignment is the single most important typographic decision.
It creates a visual column that the eye scans automatically.
It must be consistent across all screens.

---

## 7. Animation Language

### Philosophy

> The CLI is alive while working, completely still when finished.
> Motion only exists during progress.

### The Three-Phase Contract

```
Phase 1:  ACKNOWLEDGE     Synchronous first frame        0ms
Phase 2:  WORK            Spinner with context            variable
Phase 3:  COMPLETE        Instant render, then still     single frame
```

### Phase 1: Acknowledge (0ms, synchronous)

```
0ms:  cursorHide()
      "⠋ Scanning my-project..." written to stderr
```

The first frame is synchronous. No waiting for interval tick.
This is a trust decision, not an animation decision.

### Phase 2: Work (continuous, single line)

**Scanning:**
```
⠋ Scanning my-project...
```

**Analyzing:**
```
⠙ Analyzing...
```

One line. One spinner. One status. Always.
The spinner character cycles. The text stays constant.
Changing text during a phase would be decorative, not informative.

**On completion:** Spinner replaced in-place with:
```
✓ Scanned my-project — 42 files, 12 directories
✓ Done in 0.8s
```

Green checkmark. No "Done!" text. The checkmark says everything.

### Phase 3: Complete (instant, then still)

**The dashboard renders in a single frame.**
No fade-in. No typewriter. No reveal.
After rendering, the screen is **completely still**.
No cursor blinking. No residual animation. Still.

**Why instant:** The analysis is done. The user wants the answer.
Any animation between "done" and "showing results" is wasted time.

### Timing Contract

| Context | Interval | FPS | Why |
|---------|----------|-----|-----|
| Default | 80ms | 12.5 | Smooth, low CPU |
| Narrow terminal | 100ms | 10 | Less visual noise |
| Windows legacy | 120ms | ~8 | Slower console I/O |
| No TTY | ∞ | 0 | No animation |

### Clean Transition Rule

Between phases, the transition is seamless:

1. Stop current animation (synchronous)
2. Clear animation area (cursor up + clear)
3. Write completion line
4. Start next phase

Steps 1-3 are synchronous. No frame of empty space.
The user sees: spinner → checkmark → spinner → checkmark → dashboard.

### Meaningful Progress (when available)

When scan provides deterministic file counts:
```
⠋ Scanning my-project... 42/42 files
```

Only show when counts are meaningful.
If total is unknown, use plain spinner.
Never show fake progress.

### Graceful Degradation

```
Full terminal      → Full animations, full colors, Unicode
Narrow terminal    → Slower spinner, ASCII fallback
Piped output       → No animations, no colors, plain text
CI environment     → No animations, no colors, plain text
```

---

## 8. Spacing System

All measurements in character cells. Every value justified.

### Horizontal

| Token | Value | Why |
|-------|-------|-----|
| `margin` | 2 cols | Minimum comfortable distance from edge |
| `box-padding` | 1 col each side | Content doesn't touch borders |
| `metric-gap` | 3 cols | Space between inline key-value pairs |
| `label-width` | 20 cols | Fits "Classification" (longest label) |
| `indent` | 2 cols | Subordinate items |
| `bar-width` | 24 chars | Enough for differentiation, compact enough |

### Vertical

| Token | Value | Why |
|-------|-------|-----|
| `section-gap` | 1 blank line | Separates sections inside box |
| `box-breathing` | 1 line top + bottom | Content doesn't crowd borders |
| `post-box-gap` | 1 blank line | Separates box from output below |

### Why Single Spacing

Double blank lines waste vertical space.
The box border already provides visual separation.
Inside the box, a single blank line creates rhythm.
Terminals are vertical-space-constrained — every line must earn its place.

---

## 9. Information Architecture

### The Single-Purpose Rule

| Screen | Purpose | Question |
|--------|---------|----------|
| Dashboard | Identify | "What is this?" |
| Stats | Quantify | "What are the numbers?" |
| Suggest | Improve | "What should I fix?" |
| Error | Explain | "What went wrong?" |
| Help | Guide | "What can I do?" |

### What Goes Where

| Information | Dashboard | Stats | Suggest | JSON |
|-------------|-----------|-------|---------|------|
| Classification | ✓ | — | — | ✓ |
| Maturity | ✓ | — | — | ✓ |
| Health score | ✓ (bar) | — | — | ✓ |
| File/dir counts | ✓ | ✓ | — | ✓ |
| Total size | ✓ | ✓ | — | ✓ |
| Max depth | ✓ | ✓ | — | ✓ |
| Languages | ✓ (list) | ✓ (detailed) | — | ✓ |
| Largest file/dir | — | ✓ | — | ✓ |
| Avg files/dir | — | ✓ | — | ✓ |
| Strengths | — | — | ✓ | ✓ |
| Suggestions | — | — | ✓ | ✓ |
| Elapsed time | — | ✓ | — | ✓ |
| Architecture | — | — | — | ✓ |
| Dependencies | — | — | — | ✓ |
| Refactoring | — | — | — | ✓ |
| Risk report | — | — | — | ✓ |

Every `—` is a deliberate omission.
Adding it would violate the single-purpose rule.

### The Output Budget

| Screen | Max lines (inside box) | Rationale |
|--------|----------------------|-----------|
| Dashboard | 12 | 5-second scan |
| Stats | 16 | Quick numerical review |
| Suggest | 20 | Actionable list |
| Error | 8 | Immediate understanding |
| Help | 24 | Complete but scannable |

---

## 10. Screen Flows

### Default (`repo-map .`)

```
0ms      cursorHide(), first spinner frame
         "⠋ Scanning my-project..."

~500ms   "✓ Scanned my-project — 42 files, 12 directories"
         "⠙ Analyzing..."

~1.5s    "✓ Done in 0.8s"

         ╭─ repo-map · my-project ─────────────────────╮
         │                                              │
         │  [12-line dashboard]                         │
         │                                              │
         ╰──────────────────────────────────────────────╯

~1.6s    cursorShow()
         stdout: markdown/JSON output
EXIT
```

### Stats (`repo-map --stats`)

```
0ms      [same scan/analyze phases]

         ╭─ repo-map · my-project · stats ────────────╮
         │                                              │
         │  [16-line stats]                             │
         │                                              │
         ╰──────────────────────────────────────────────╯

EXIT
```

### Suggest (`repo-map --suggest`)

```
0ms      [same scan/analyze phases]

         ╭─ repo-map · my-project · suggestions ──────╮
         │                                              │
         │  [20-line suggestions]                       │
         │                                              │
         ╰──────────────────────────────────────────────╯

EXIT
```

### Error (`repo-map /bad`)

```
0ms      cursorHide()

~50ms    ╭─ Error ────────────────────────────────────╮
         │                                              │
         │  ✗ Path does not exist: /nonexistent         │
         │                                              │
         │  Provide a valid path to a directory,         │
         │  or run 'repo-map .' for the current one.     │
         │                                              │
         ╰──────────────────────────────────────────────╯

~60ms    cursorShow()
         process.exit(1)
```

### Help (`repo-map --help`)

```
0ms      [instant, no scanning]

         repo-map — Professional repository analysis    v2.2.0

           [24-line help]

EXIT
```

---

## 11. Benchmark: Premium CLI Comparison

Every screen must be at least as good as the benchmark.
If any screen feels busier, noisier, slower, or less readable, redesign it.

| Aspect | Benchmark (gh, Vercel, Bun) | repo-map target |
|--------|---------------------------|-----------------|
| First output | < 100ms | < 100ms |
| Default output lines | 10-20 | 12 inside box |
| Progress indicator | Single line | Single line |
| Box title | Brand + context | `repo-map · {name}` |
| Label alignment | Consistent | 20-char column |
| Color usage | Minimal, semantic | 4 colors only |
| Error presentation | Calm, actionable | Title + message + suggestion |
| Completion signal | Checkmark or result | Checkmark + instant dashboard |
| Narrow terminal | Degrades gracefully | Text-only, information preserved |
| Piped output | Plain text | Plain text, no ANSI |

---

## 12. Implementation Roadmap

### Phase A: Dashboard Core

| Step | Change | Files |
|------|--------|-------|
| A1 | Add `renderBar()` pattern | `completion.ts` |
| A2 | Add `renderMetricLine()` pattern | `completion.ts` |
| A3 | Add `renderLabelValue()` pattern | `completion.ts` |
| A4 | Reorder: classification/maturity/health first | `completion.ts` |
| A5 | Remove strengths/suggestions from default | `completion.ts` |
| A6 | Remove elapsed time from default | `completion.ts` |
| A7 | Add breathing whitespace | `completion.ts` |

### Phase B: Stats Screen

| Step | Change | Files |
|------|--------|-------|
| B1 | Add section headers | `stats.ts` |
| B2 | Reuse `renderLabelValue()` | `stats.ts` |
| B3 | Move elapsed time to stats | `stats.ts` |

### Phase C: Suggest Screen (new)

| Step | Change | Files |
|------|--------|-------|
| C1 | Create suggest screen with strengths + suggestions | `suggest.ts` (new) |
| C2 | Add `--suggest` flag to CLI | `cli.ts`, `bin.ts` |
| C3 | Wire suggest into UISession | `ui/index.ts` |

### Phase D: Color Tokens

| Step | Change | Files |
|------|--------|-------|
| D1 | Add `bar-fill` token | `colors.ts` + presets |
| D2 | Add `bar-empty` token | `colors.ts` + presets |

### Phase E: Error & Help

| Step | Change | Files |
|------|--------|-------|
| E1 | Refine error hierarchy | `error.ts` |
| E2 | Add `--suggest` to help output | `help.ts` |

### Phase F: Testing

| Step | Change | Files |
|------|--------|-------|
| F1 | Update completion snapshot tests | `completion.test.ts` |
| F2 | Add bar rendering tests | `completion.test.ts` |
| F3 | Add alignment tests | `completion.test.ts` |
| F4 | Add breathing whitespace tests | `completion.test.ts` |
| F5 | Create suggest screen tests | `suggest.test.ts` |
| F6 | Verify narrow terminal adaptation | All screen tests |
| F7 | Verify `--no-color` mode | All screen tests |

### Phase G: Integration Verification

| Step | What to verify |
|------|---------------|
| G1 | `repo-map .` → dashboard (scan → analyze → dashboard) |
| G2 | `repo-map --stats` → stats |
| G3 | `repo-map --suggest` → suggestions |
| G4 | `repo-map --help` → help (instant) |
| G5 | `repo-map /bad` → error (instant) |
| G6 | `repo-map --no-color` → zero ANSI codes |
| G7 | Narrow terminal → readable text |
| G8 | Piped output → plain text |
| G9 | Muscle memory: same output on repeated runs |

---

## Appendix A: Color Tokens (v2.2)

| Token | ANSI 16 | ANSI 256 | TrueColor | Usage |
|-------|---------|----------|-----------|-------|
| `primary` | Bold Cyan (96) | 51 | `#00d4ff` | Brand, links, active |
| `success` | Bold Green (92) | 82 | `#00ff5e` | Checkmarks, completion |
| `warning` | Bold Yellow (93) | 226 | `#ffff00` | Medium priority |
| `error` | Bold Red (91) | 196 | `#ff0000` | Errors, high priority |
| `info` | Bold Blue (94) | 39 | `#00afff` | Informational |
| `dim` | Dim (2) | 242 | `#6c6c6c` | Metadata, suffixes |
| `muted` | Default | 236 | `#303030` | Borders, bar-empty |
| `text` | Default (0) | 15 | `#ffffff` | Body text, values |
| `heading` | Bold Cyan (96) | 51 | `#00d4ff` | Section headers |
| `bar-fill` | Bold Green (92) | 82 | `#00ff5e` | Filled bar segments |
| `bar-empty` | Default | 236 | `#303030` | Empty bar segments |

## Appendix B: Prohibited Elements

| Element | Why prohibited |
|---------|---------------|
| ASCII art logos | Decorative, not functional |
| Emoji | Breaks monospace grid, unprofessional |
| Color gradients | Unreliable across terminals |
| Blinking text | Distracting, accessibility issue |
| Background colors | Too aggressive |
| Double blank lines | Wastes vertical space |
| Multi-line spinners | Wastes vertical space |
| Underlines in body | Inconsistent rendering |
| Exclamation marks | Emotional, not professional |
| Celebratory messages | Violates LAW 15 |

**The complete visual vocabulary:**
- Rounded boxes (`╭╮╰╯`)
- Horizontal rules (`─`)
- Vertical borders (`│`)
- Block elements (`█░` for bars only)
- Symbols (`✓✗▸·→`)

Nothing else. This constraint IS the identity.

---

*This document is the definitive design specification for repo-map v2.2.0.*
*Every decision has survived the CLI Laws and the gate questions.*
*All implementation must conform to this specification.*
*No UI change may be merged without verifying compliance with the CLI Laws.*
