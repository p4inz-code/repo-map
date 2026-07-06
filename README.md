# repo-map

**Scan any codebase. Reveal its architecture, health score, technology stack, and actionable improvement suggestions — in one command.**

[![npm version](https://img.shields.io/npm/v/@p4inz-code/repo-map?color=blue&label=npm)](https://www.npmjs.com/package/@p4inz-code/repo-map)
[![CI](https://github.com/p4inz-code/repo-map/actions/workflows/ci.yml/badge.svg)](https://github.com/p4inz-code/repo-map/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

TypeScript · JavaScript · Python · Go · Rust · Java · C# · C++ — 80+ languages, frameworks, and tools detected automatically.

```bash
npm i -g @p4inz-code/repo-map
repo-map .
```

Zero configuration. One command. Full insight.

---

## Quick Start

```bash
npm i -g @p4inz-code/repo-map
cd your-project
repo-map .
```

Or run without installing:

```bash
npx @p4inz-code/repo-map .
```

**Requirements:** Node.js 18+. Zero native dependencies (only `commander` + `ignore`).

### The Dashboard

The default output answers: *What kind of project is this?*

```text
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

Four elements, one scan: **Classification** (what is it?), **Health** (0–100 score), **Metrics** (size), **Languages** (what it's built with).

---

## CLI Reference

| Command | Description |
|---------|-------------|
| `repo-map .` | Scan current directory |
| `repo-map /path/to/project` | Scan a specific path |
| `repo-map --stats` | Compact statistics view |
| `repo-map --suggest` | Improvement suggestions |
| `repo-map --interactive` | Launch interactive workspace |
| `repo-map --tree` | Show directory tree only |
| `repo-map --json` | JSON output (stable schema) |
| `repo-map -o report.md` | Write report to file |
| `repo-map --depth <n>` | Maximum directory depth |
| `repo-map --exclude <pattern>` | Exclude files (repeatable) |
| `repo-map --include <pattern>` | Include only matching files |
| `repo-map --no-ignore` | Ignore `.gitignore` rules |
| `repo-map --no-color` | Disable ANSI color output |

Run `repo-map --help` for full documentation.

---

## What's New in v2.2

- **Interactive workspace** — `--interactive` launches a navigable TUI with sidebar, repository tree, info panel, and keyboard shortcuts
- **Tree output** — `--tree` displays the directory tree on its own
- **Dashboard redesign** — Classification-first layout with health bar and 20-character label alignment
- **Suggestions screen** — `--suggest` command with prioritized recommendations (high/medium/low)
- **Health scoring** — 8-dimension assessment (documentation, testing, consistency, tooling) with composite 0–100 score
- **Project intelligence** — Automatic classification, maturity estimation, and technology detection
- **Architecture analysis** — Dependency graphs, coupling, cohesion, circular dependencies, layer violations, complexity scoring, and risk reports
- **Narrow terminal support** — Graceful degradation below 60 columns (text-only layout)
- **Color tokens** — 4 semantic colors across 16-color, 256-color, and TrueColor modes
- **Theme presets** — Default, monochrome, high-contrast, and minimal
- **862+ automated tests** — Coverage across all screens, animations, themes, and edge cases

---

## Interactive Workspace

```bash
repo-map . --interactive
```

Launches a navigable terminal UI after analysis completes. Explore your repository structure, inspect files, and browse analysis results using keyboard navigation.

```text
repo-map — Interactive Workspace                   v2.2.4
────────────────────────────────────────────────────────────
│ Overview        │ ▸ Help                            │  Details  │
│ Statistics      │                                   │  ──────── │
│ Suggestions     │   Keyboard Shortcuts              │           │
│ Repository Tree │                                   │  No repo  │
│ Help            │   General                         │  loaded   │
│                 │   Tab/Shift+Tab  Cycle focus      │           │
│                 │   ↑↓            Navigate items     │           │
│                 │   Enter          Select / toggle   │           │
│                 │   Space          Toggle collapse   │           │
│                 │   q              Quit workspace    │           │
│                 │                                   │           │
│                 │   Tree View                       │           │
│                 │   ←/→            Collapse/Expand   │           │
│                 │   Home/End        First/Last item  │           │
│                 │                                    │           │
├─────────────────┴────────────────────────────────────┴───────────┤
│ Overview · sidebar · 42f 12d 3l                                  │
├──────────────────────────────────────────────────────────────────┤
│ ↑↓ Navigate · Enter Select · Tab Focus · q Quit                 │
└──────────────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑↓` | Navigate items within focused region |
| `←→` | Collapse/expand tree node (tree view) |
| `Enter` | Select / toggle item |
| `Tab` / `Shift+Tab` | Cycle focus between regions |
| `Space` | Toggle panel collapse |
| `Home` / `End` | Jump to first/last item |
| `PgUp` / `PgDn` | Scroll one page |
| `q` | Quit workspace |
| `Ctrl+P` | Open command palette |
| `/` | Filter tree (tree view focused) |
| `?` | Open help view |

### Regions

The workspace is divided into four focusable regions:
- **Sidebar** — View selection (Overview, Statistics, Suggestions, Repository Tree, Help)
- **Tree** — Interactive file explorer with expand/collapse
- **Info Panel** — Contextual details about selected items
- **Footer** — Keyboard shortcut hints

### Command Palette

Press `Ctrl+P` to open the command palette for quick actions: navigate to views, focus regions, expand/collapse all, or quit.

---

## Example Outputs

### Stats (`repo-map --stats`)

```text
╭─ repo-map · my-project · stats ──────────────────────────────╮
│                                                               │
│  Files  42    Dirs  12    Size  15.3 KB    Depth  4            │
│  Avg files/dir  3.5                                            │
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

### Suggestions (`repo-map --suggest`)

```text
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

### JSON (`repo-map --json`)

```json
{
  "schemaVersion": "1.0.0",
  "cliVersion": "2.2.4",
  "projectName": "my-project",
  "stats": {
    "totalFiles": 42,
    "totalDirectories": 12,
    "totalSize": 15360,
    "maxDepth": 4
  },
  "technologies": [
    { "name": "TypeScript", "category": "language", "count": 30, "evidence": "Found 30 files (.ts, .tsx)" }
  ],
  "intelligence": {
    "classification": { "category": "CLI Tool", "confidence": 87 },
    "maturity": { "level": "Active Development", "confidence": 72 },
    "health": { "overall": 65, "maxOverall": 100 }
  }
}
```

---

## Architecture Analysis

When run against a codebase with source files, repo-map performs deep architecture analysis:

| Metric | Description |
|--------|-------------|
| **Architecture Patterns** | Detects layered, MVC, hexagonal, feature-based, event-driven |
| **Dependency Graph** | Maps internal module dependencies, identifies central/hub/leaf modules |
| **Circular Dependencies** | DFS-based cycle detection with severity and remediation |
| **Architecture Smells** | God modules, large utility folders, feature leakage, nesting |
| **File Complexity** | Calculated from size, import/export count, function count |
| **Coupling** | Average incoming/outgoing dependencies per module |
| **Cohesion** | Intra-directory vs inter-directory import ratios |
| **Layer Violations** | Cross-layer dependency violations |
| **Quality Score** | Composite 0–100 across coupling, cohesion, layering, organization |
| **Risk Report** | Technical debt, maintainability, scalability, onboarding risk |
| **Refactor Suggestions** | Actionable recommendations with impact/effort estimates |

See [docs/architecture.md](docs/architecture.md) for full details.

---

## Technology Detection

### Languages (30+)
TypeScript, JavaScript, Python, Java, Kotlin, C, C++, C#, Rust, Go, PHP, Ruby, Swift, Dart, HTML, CSS, SCSS, Less, SQL, Shell, PowerShell, YAML, TOML, JSON, Markdown, Vue, Svelte, Astro, Docker, Make, CMake, Elixir, Erlang, Haskell, Clojure, F#, Scala, R, Lua, Zig, Nim, Perl, Terraform, GraphQL, Prisma, Protocol Buffers, LaTeX, Solidity, INI, Batch, Environment Variables

### Frameworks (30+)
React, Next.js, Vue.js, Nuxt.js, Angular, Svelte, SvelteKit, Astro, Remix, Gatsby, Express, NestJS, Fastify, Hono, Koa, Socket.IO, Electron, Flask, Django, FastAPI, SQLAlchemy, Tornado, aiohttp, Rails, Sinatra, Laravel, Symfony, Spring Boot, Spring, Gin, Fiber, Axum, Actix, Rocket, Tailwind CSS, Bootstrap

### Tools (20+)
GitHub Actions, GitLab CI, Jenkins, Docker, Docker Compose, Vite, Webpack, Rollup, Parcel, npm, Yarn, pnpm, Turbo, Nx, ESLint, Prettier, Vitest, Jest, Cypress, Playwright, Storybook

---

## Performance

| Repository | Files | Time | Environment |
|-----------|-------|------|-------------|
| repo-map (itself) | ~200 | < 1s | Node 20, macOS M1 |
| Medium project | 5,000 | < 3s | Node 20, macOS M1 |
| Large monorepo | 50,000+ | < 15s | Node 20, macOS M1 |

Benchmarks on Apple M1 with Node.js 20. Results vary with hardware and filesystem.

Why repo-map is fast:
- **Single filesystem walk** — Metadata cached, never re-read
- **Binary detection** — Extension + null-byte heuristic, no full file reads
- **Large file skip** — Files over 50 MB excluded automatically
- **Shared cache** — File content cache shared across all analysis passes

---

## How It Works

```
CLI Args → Scan (1 walk) → Analyze (cached passes) → Format → Output
```

1. **Scan** — Walk the directory tree once, applying `.gitignore`, exclude, and include filters. Binary files, symlinks, and files over 50 MB handled gracefully.
2. **Analyze** — Run all analysis passes against cached metadata: technology detection, classification, maturity estimation, health scoring, architecture analysis. No file read twice.
3. **Format** — Output as Markdown audit report, stable JSON, or compact statistics.

---

## CI Integration

```bash
repo-map --json --no-color
```

Produces deterministic, machine-readable output. The JSON schema is versioned (`1.0.0`) and stable — fields may be added in minor versions but never removed or renamed without a major bump.

### Piped / Non-TTY Output

repo-map disables animations and color when stdout is not a terminal. Same input always produces identical output.

### .gitignore Handling

Defaults to respecting `.gitignore`. Use `--no-ignore` to include all files. Binary files are excluded via extension and content-based heuristics.

---

## Error Recovery

repo-map handles these conditions without crashing:
- Permission denied — skipped with warning
- Broken symlinks — detected and skipped
- Invalid encoding — non-UTF-8 detected via null-byte check
- Large files (> 50 MB) — skipped to prevent OOM
- Malformed JSON in config files — parsed with graceful fallback
- SIGINT — graceful interruption (press Ctrl+C twice to force exit)

---

## Who It's For

- **Individual developers** — Understand a new codebase in seconds
- **Open-source contributors** — Find where to start before opening a PR
- **Engineering teams** — Run architecture audits and track health over time
- **AI-assisted development** — Feed structured JSON to LLMs and coding agents
- **Technical writers** — Generate documentation scaffolding from real project structure

---

## Contributing

```bash
git clone https://github.com/p4inz-code/repo-map.git
cd repo-map
npm install
npm test
```

Standards:
- **862+ automated tests** — all must pass before merge
- **Strict TypeScript** — no `any`, full type safety
- **ESM-first** — native ES modules with `.js` extensions
- **Product Identity spec** — [docs/design/PRODUCT_IDENTITY_V2.2.md](docs/design/PRODUCT_IDENTITY_V2.2.md) governs all UI changes

Run `npx tsx scripts/analyze-self.ts` to scan repo-map with itself.

---

## FAQ

**Does it work with monorepos?** Yes. Run at the monorepo root or target a specific package.

**Does it modify my code?** Never. Strictly read-only. No files are created, deleted, or modified.

**What about private repos?** Scans your local filesystem only. No network requests. Nothing leaves your machine.

**Is the JSON output stable?** Yes. Versioned schema (`1.0.0`). Fields may be added but never removed without a major version.

**How does this compare to `tree` or `cloc`?** `tree` shows structure. `cloc` counts lines. repo-map shows structure, tech stack, health scores, architecture analysis, and improvement suggestions — all in one command.

---

## Screenshots

> Screenshots and animated GIFs of the interactive workspace and CLI output will be added here once visual assets are available.

In the meantime, run `repo-map .` to see the dashboard, `repo-map . --stats` for statistics, and `repo-map . --interactive` for the interactive workspace.

---

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgements

- [Commander.js](https://github.com/tj/commander.js) — CLI framework
- [ignore](https://github.com/kaelzhang/node-ignore) — .gitignore support
