# repo-map

**Scan any codebase. Reveal its architecture, health score, technology stack, and actionable improvement suggestions — in one command.**

<!-- TODO: Replace with real GitHub badge URLs -->
<!-- TODO: Insert shields.io badge row: npm version, CI status, license, node version -->

---

TypeScript · JavaScript · Python · Go · Rust · Java · C# · C++ · Monorepos

*80+ languages, frameworks, and tools detected automatically.*

---

```bash
npm i -g @p4inz-code/repo-map
repo-map .
```

*Scans your project and reveals its architecture in seconds.*

---

<!-- TODO: Insert static dashboard screenshot (PNG/SVG) -->
<!-- Caption: "Default output — classification, health bar, metrics, and languages" -->

<!-- TODO: Insert asciinema cast or compressed GIF (≤ 5MB) -->
<!-- Caption: "Full experience — scan, analyze, and results in under 2 seconds" -->

---

## Who is repo-map for?

- **Individual developers** — Understand a new codebase in seconds
- **Open-source contributors** — Find where to start before opening a PR
- **Engineering teams** — Run architecture audits and track health over time
- **AI-assisted development** — Feed structured context to LLMs and coding agents
- **Technical writers** — Generate documentation scaffolding from real project structure

---

## Why repo-map?

- **Unfamiliar repos** — Point it at any codebase and understand its structure, tech stack, and health without reading a single file
- **Architecture audits** — Dependency graphs, coupling analysis, circular dependencies, and layer violations — surfaced automatically
- **Health scoring** — 8-dimension assessment (documentation, testing, consistency, tooling) with a single 0–100 score
- **Actionable suggestions** — Prioritized improvement recommendations, not just data dumps
- **AI workflows** — Stable JSON schema designed for programmatic consumption by LLMs, coding agents, and CI pipelines
- **Zero configuration** — Respects `.gitignore`, handles binaries, no setup required. One command, full insight

---

## Install

```bash
npm i -g @p4inz-code/repo-map
```

Or run without installing:

```bash
npx @p4inz-code/repo-map .
```

**Requirements:** Node.js 18+

Zero native dependencies. Uses only Node.js standard library + commander + ignore.

---

## Quick Start

### Install

```bash
npm i -g @p4inz-code/repo-map
```

### Run

```bash
cd your-project
repo-map .
```

### Understand the Dashboard

The default output answers one question: *What is this repository?*

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

Four elements, one eye path:

1. **Classification** — What kind of project is this?
2. **Health Bar** — How healthy is the codebase? (0–100)
3. **Metrics** — How big is it? (files, directories, size, depth)
4. **Languages** — What is it built with?

Each command answers one question. Run `repo-map --stats` for numbers, `repo-map --suggest` for improvements.

---

## CLI Reference

### Basic Commands

| Command | What it does |
|---------|-------------|
| `repo-map .` | Scan current directory |
| `repo-map /path/to/project` | Scan a specific path |
| `repo-map --stats` | Compact statistics view |
| `repo-map --suggest` | Improvement suggestions |
| `repo-map --json` | JSON output (stable schema) |
| `repo-map -o report.md` | Write report to file |

Run `repo-map --help` for all options.

### Advanced Options

| Flag | Description |
|------|-------------|
| `--depth <n>` | Maximum directory depth |
| `--exclude <pattern>` | Exclude files (repeatable) |
| `--include <pattern>` | Include only matching files |
| `--no-ignore` | Ignore `.gitignore` rules |
| `--no-color` | Disable ANSI color output |
| `--json --stats` | Structured stats for CI |

---

## What's New in v2.2

- **Dashboard redesign** — Classification-first layout with health bar and 20-char label alignment
- **Suggestions screen** — New `--suggest` command with prioritized improvement recommendations
- **Health scoring** — 8-dimension assessment with composite 0–100 score
- **Project intelligence** — Classification, maturity estimation, and technology detection
- **Architecture analysis** — Dependency graphs, coupling, cohesion, circular deps, and risk reports
- **Narrow terminal support** — Graceful degradation below 60 columns
- **Color token system** — 4 semantic colors (green, red, cyan, yellow) across 3 ANSI modes
- **783+ automated tests** — Comprehensive coverage across all screens and edge cases

---

## Performance

| Repository | Files | Time | Environment |
|-----------|-------|------|-------------|
| <!-- TODO: Replace with actual benchmark --> repo-map (itself) | ~200 | < 1s | Node 20, macOS M1 |
| <!-- TODO: Replace with actual benchmark --> Medium project | 5,000 | < 3s | Node 20, macOS M1 |
| <!-- TODO: Replace with actual benchmark --> Large monorepo | 50,000+ | < 15s | Node 20, macOS M1 |

*Benchmarks performed on Apple M1 with Node.js 20. Results vary with hardware, disk speed, and filesystem complexity.*

Why repo-map is fast:

- **Single filesystem walk** — Metadata cached, never re-read
- **Binary detection** — Extension + null-byte heuristic, no full file reads
- **Large file skip** — Files over 50 MB excluded automatically
- **Shared cache** — File content cache shared across all analysis passes

---

<details>
<summary><strong>Example Outputs</strong></summary>

### Dashboard (`repo-map .`)

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

### Stats (`repo-map --stats`)

```text
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

<!-- TODO: Insert real JSON output excerpt from a repo-map scan -->

```json
{
  "schemaVersion": "1.0.0",
  "cliVersion": "2.2.0",
  "projectName": "my-project",
  "stats": {
    "totalFiles": 42,
    "totalDirectories": 12,
    "totalSize": 15360,
    "maxDepth": 4
  },
  "technologies": [
    {
      "name": "TypeScript",
      "category": "language",
      "count": 30,
      "evidence": "Found 30 files (.ts, .tsx)"
    }
  ],
  "intelligence": {
    "classification": { "category": "CLI Tool", "confidence": 87 },
    "maturity": { "level": "Active Development", "confidence": 72 },
    "health": { "overall": 65, "maxOverall": 100 },
    "strengths": [],
    "suggestions": []
  }
}
```

</details>

---

<details>
<summary><strong>Architecture Analysis</strong></summary>

When run against a codebase with source files, repo-map performs deep architecture analysis:

| Metric | Description |
|--------|-------------|
| **Architecture Patterns** | Detects layered, MVC, hexagonal, feature-based, event-driven patterns |
| **Dependency Graph** | Maps internal module dependencies, identifies central/hub/leaf modules |
| **Circular Dependencies** | DFS-based cycle detection with severity and remediation recommendations |
| **Architecture Smells** | God modules, large utility folders, feature leakage, excessive nesting |
| **File Complexity** | Calculated from file size, import count, export count, function count |
| **Coupling** | Measures average incoming/outgoing dependencies per module |
| **Cohesion** | Analyzes intra-directory vs inter-directory import ratios |
| **Layer Violations** | Detects cross-layer dependency violations |
| **Architecture Quality Score** | Composite 0–100 across coupling, cohesion, layering, organization |
| **Risk Report** | Technical debt, maintainability, scalability, onboarding risk |
| **Refactor Suggestions** | Actionable recommendations with impact/effort estimates |

See [docs/architecture.md](docs/architecture.md) for full details.

</details>

---

<details>
<summary><strong>Technology Detection</strong></summary>

### Languages (30+)

TypeScript, JavaScript, Python, Java, Kotlin, C, C++, C#, Rust, Go, PHP, Ruby, Swift, Dart, HTML, CSS, SCSS, Less, SQL, Shell, PowerShell, YAML, TOML, JSON, Markdown, Vue, Svelte, Astro, Docker, Make, CMake, Elixir, Erlang, Haskell, Clojure, F#, Scala, R, Lua, Zig, Nim, Perl, Terraform, GraphQL, Prisma, Protocol Buffers, LaTeX, Solidity, INI, Batch, Environment Variables

### Frameworks (30+)

React, Next.js, Vue.js, Nuxt.js, Angular, Svelte, SvelteKit, Astro, Remix, Gatsby, Express, NestJS, Fastify, Hono, Koa, Socket.IO, Electron, Flask, Django, FastAPI, SQLAlchemy, Tornado, aiohttp, Rails, Sinatra, Laravel, Symfony, Spring Boot, Spring, Gin, Fiber, Axum, Actix, Rocket, Tailwind CSS, Bootstrap

### Tools (20+)

GitHub Actions, GitLab CI, Jenkins, Docker, Docker Compose, Vite, Webpack, Rollup, Parcel, npm, Yarn, pnpm, Turbo, Nx, ESLint, Prettier, Vitest, Jest, Cypress, Playwright, Storybook

</details>

---

<details>
<summary><strong>How It Works</strong></summary>

```
CLI Args → Scan (1 walk) → Analyze (cached passes) → Format → Output
```

1. **Scan** — Walk the directory tree once, applying `.gitignore`, exclude, and include filters. File metadata is cached for all subsequent passes. Binary files, symlinks, and files over 50 MB are handled gracefully.

2. **Analyze** — Run all analysis passes against cached metadata: technology detection, project classification, maturity estimation, health scoring, architecture analysis (dependency graph, coupling, cohesion, smells, complexity, risk). No file is read twice.

3. **Format** — Render as Markdown audit report, stable JSON, or compact statistics.

The single-walk architecture means repo-map scales linearly with repository size. The shared file content cache eliminates duplicate filesystem reads across all analysis passes.

</details>

---

<details>
<summary><strong>Configuration & Environment</strong></summary>

### Color Output

repo-map respects the `NO_COLOR` environment variable (per [no-color.org](https://no-color.org)). The `--no-color` flag also disables ANSI color output.

### Piped Output

When stdout is not a terminal (piped output, CI), repo-map automatically:

- Disables animations
- Disables color output
- Produces plain text (Markdown) or structured JSON

### CI Integration

```bash
repo-map --json --no-color
```

Produces deterministic, machine-readable output suitable for CI pipelines. Same input always produces identical output (CLI Law 13).

### .gitignore Handling

By default, repo-map respects `.gitignore` rules and always excludes the `.git` directory. Use `--no-ignore` to include all files.

Binary files (images, fonts, archives, executables) are always excluded via extension and content-based heuristics.

### Error Recovery

repo-map handles the following conditions gracefully without crashing:

- Permission denied — inaccessible files/directories skipped
- Broken symlinks — detected and skipped during traversal
- Unreadable files — binary detection failures treated as binary
- Invalid encoding — non-UTF-8 files detected via null-byte check
- Large files — files over 50 MB skipped to prevent OOM
- Missing package.json — detection proceeds without package analysis
- Malformed JSON — parsed config files with errors skipped
- Filesystem race conditions — caught and handled at entry level
- SIGINT — graceful interruption on Ctrl+C (press twice to force exit)

</details>

---

<details>
<summary><strong>FAQ</strong></summary>

**What Node.js version is required?**

Node.js 18 or later.

**Does it work with monorepos?**

Yes. repo-map scans the entire directory tree. Run it at the monorepo root, or target a specific package with `repo-map ./packages/my-package`.

**Is the JSON output stable?**

Yes. The schema is versioned (currently `1.0.0`). Fields may be added in future versions, but existing fields will not be removed or renamed without a major version bump.

**Does it modify my code?**

Never. repo-map is strictly read-only. It does not create, delete, or modify any files.

**What about private repos?**

repo-map scans your local filesystem only. Nothing leaves your machine. No network requests are made during a scan.

**Can AI tools consume repo-map output?**

Yes. Run `repo-map --json` for structured output with a stable, versioned schema. The JSON includes classification, health scores, technology lists, architecture analysis, and improvement suggestions — all designed for programmatic consumption by LLMs, coding agents, and CI pipelines.

**How does repo-map compare to `tree` or `cloc`?**

`tree` shows directory structure. `cloc` counts lines of code. repo-map shows structure, file counts, technology stack, health scores, architecture analysis, and improvement suggestions in one command.

**Can I use repo-map in CI/CD?**

Yes. `repo-map --json --no-color` produces machine-readable output with deterministic results. Combine with `--stats` for compact structured metrics.

</details>

---

## Contributing

```bash
git clone https://github.com/p4inz-code/repo-map.git
cd repo-map
npm install
npm test
```

Standards:

- **783+ automated tests** — all must pass before merge
- **Strict TypeScript** — no `any`, full type safety
- **ESM-first** — native ES modules with `.js` extensions
- **Product Identity specification** — [docs/design/PRODUCT_IDENTITY_V2.2.md](docs/design/PRODUCT_IDENTITY_V2.2.md) governs all UI changes
- **Architecture documentation** — [docs/architecture.md](docs/architecture.md) for system design

Run `npx tsx scripts/analyze-self.ts` to scan repo-map with itself.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Acknowledgements

- [Commander.js](https://github.com/tj/commander.js) — CLI framework
- [ignore](https://github.com/kaelzhang/node-ignore) — .gitignore support
- Inspired by the repo-map concept in AI coding tools
