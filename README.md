# repo-map

**Professional-grade repository analysis** — scan any codebase, detect technologies, analyze architecture, and generate comprehensive audit reports in Markdown or JSON.

Ideal for documentation, onboarding, CI pipelines, and architecture reviews.

```bash
npx @p4inz-code/repo-map .
```

---

## Features

- **30+ language detection** — TypeScript, Python, Rust, Go, Java, and more
- **30+ framework detection** — React, Next.js, Django, Spring Boot, and more
- **20+ tool detection** — Docker, Vite, ESLint, GitHub Actions, and more
- **Full architecture analysis** — Dependency graphs, coupling, cohesion, circular deps, layer violations, complexity scoring
- **Project intelligence** — Classification, maturity estimation, health scoring, build pipeline analysis
- **Professional audit reports** — Markdown or JSON output with dynamic section numbering
- **Large repository support** — Efficient scanning with binary detection, symlink handling, and 50 MB file cap
- **CI-ready** — Stable JSON schema with versioned output
- **Fast** — Shared file content cache eliminates duplicate I/O across the analysis pipeline

---

## Installation

```bash
# Install globally
npm install -g @p4inz-code/repo-map

# Or run directly
npx @p4inz-code/repo-map [path]
```

**Requirements:** Node.js 18+.

---

## Usage

```bash
# Scan current directory
repo-map

# Scan specific path
repo-map /path/to/project

# JSON output (stable schema, CI-friendly)
repo-map --json

# Quick statistics
repo-map --stats

# Statistics as JSON
repo-map --stats --json

# Limit directory depth
repo-map --depth 3

# Write to file
repo-map -o architecture.md

# Include only specific files
repo-map --include "src/**"

# Exclude files by pattern
repo-map --exclude "*.test.ts" --exclude dist

# Respect .gitignore (default), or disable it
repo-map --no-ignore

# Disable ANSI color output
repo-map --no-color
```

---

## CLI Options

| Option | Description |
|--------|-------------|
| `[path]` | Path to repository to scan (default: `.`) |
| `--json` | Output in JSON format with versioned schema |
| `-o, --output <file>` | Write output to file instead of stdout |
| `--depth <number>` | Maximum directory depth (default: unlimited) |
| `--stats` | Show compact repository statistics |
| `--exclude <pattern>` | Exclude files matching pattern (repeatable) |
| `--include <pattern>` | Only include files matching pattern (repeatable) |
| `--no-ignore` | Do not respect `.gitignore` rules |
| `--no-color` | Disable ANSI color escape codes |
| `-V, --version` | Show version number |
| `-h, --help` | Show help |

---

## Output Formats

### Markdown (default)

Generates a professional repository audit report with:

- **Repository Audit Report** — Project name, generation timestamp, CLI version
- **Project Classification** — Determined category with confidence score and evidence
- **Technology Stack** — Sorted table of languages, frameworks, and tools with detection evidence
- **Project Maturity** — Estimated maturity level (Prototype → Enterprise Grade) with factor breakdown
- **Codebase Health Score** — 8-category health assessment with visual score bars and deductions
- **Repository Statistics** — Files, directories, size, depth, largest directory/file
- **Project Structure** — Unicode directory tree with box-drawing characters
- **Entry Points** — CLI entries, library entries, application entry points
- **Directory Roles** — Classified role for each top-level directory
- **Build Pipeline** — Detected build systems, package managers, bundlers, test frameworks, CI
- **Dependencies** — Dependency group analysis with unused and outdated warnings
- **Architecture Insights** — Observations about codebase organization and patterns
- **Project Strengths** — Positive attributes with supporting evidence
- **Improvement Suggestions** — Prioritized actionable recommendations
- **Architecture Intelligence** — Patterns, dependency graph, circular deps, smells, complexity, coupling/cohesion, layer violations, quality score, risk report, refactor suggestions

### JSON (`--json`)

Stable, versioned JSON output suitable for programmatic consumption and CI pipelines.

**Schema version:** `1.0.0` (current)

```json
{
  "schemaVersion": "1.0.0",
  "cliVersion": "0.3.0",
  "generatedAt": "2026-06-26T12:00:00.000Z",
  "projectName": "my-project",
  "tree": "src/\n├── index.ts\n└── cli.ts\n",
  "stats": {
    "totalFiles": 42,
    "totalDirectories": 12,
    "totalSize": 15360,
    "scannedPath": "/path/to/project",
    "maxDepth": 4,
    "avgFilesPerDirectory": 3.5,
    "largestDirectory": "src/components",
    "largestDirectoryFiles": 15,
    "largestFile": "src/app.ts",
    "largestFileSize": 2560
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
    "classification": { "category": "Web Application", "confidence": 85, "evidence": [] },
    "maturity": { "level": "Active Development", "confidence": 72, "factors": [] },
    "health": { "overall": 65, "maxOverall": 100, "categories": [] },
    "entryPoints": [],
    "directoryRoles": [],
    "buildPipeline": { "buildSystem": [], "packageManager": [], "bundler": [], "compiler": [], "testFramework": [], "formatter": [], "linter": [], "ci": [], "releaseAutomation": [], "publishAutomation": [] },
    "dependencies": { "runtimeCount": 0, "devCount": 0, "totalCount": 0, "largestGroups": [], "possibleUnused": [], "outdatedWarnings": [] },
    "strengths": [],
    "suggestions": [],
    "insights": [],
    "architecture": { /* ... full architecture analysis ... */ }
  },
  "architecture": "# Repository Audit Report\n\n..."
}
```

### Stats (`--stats`)

Compact human-readable output suitable for terminal display:

```text
Files: 42  |  Dirs: 12  |  Size: 15.0 KB  |  Depth: 4

TypeScript                   30 files  (71.4%)
JavaScript                    8 files  (19.0%)
JSON                          4 files  ( 9.5%)

Largest file:     src/app.ts (2.5 KB)
Largest dir:      src/components (15 files)
Avg files/dir:    3.5
```

Combine with `--json` for CI-friendly structured stats output.

---

## Technology Detection

### Languages (30+)
TypeScript · JavaScript · Python · Java · Kotlin · C · C++ · C# · Rust · Go · PHP · Ruby · Swift · Dart · HTML · CSS · SCSS · Less · SQL · Shell · PowerShell · YAML · TOML · JSON · Markdown · Vue · Svelte · Astro · Docker · Make · CMake · Elixir · Erlang · Haskell · Clojure · F# · Scala · R · Lua · Zig · Nim · Perl · Terraform · GraphQL · Prisma · Protocol Buffers · LaTeX · Solidity · INI · Batch · Environment Variables

### Frameworks (30+)
React · Next.js · Vue.js · Nuxt.js · Angular · Svelte · SvelteKit · Astro · Remix · Gatsby · Express · NestJS · Fastify · Hono · Koa · Socket.IO · Electron · Flask · Django · FastAPI · SQLAlchemy · Tornado · aiohttp · Rails · Sinatra · Laravel · Symfony · Spring Boot · Spring · Gin · Fiber · Axum · Actix · Rocket · Tailwind CSS · Bootstrap

### Tools (20+)
GitHub Actions · GitLab CI · Jenkins · Docker · Docker Compose · Vite · Webpack · Rollup · Parcel · npm · Yarn · pnpm · Turbo · Nx · ESLint · Prettier · Vitest · Jest · Cypress · Playwright · Storybook

---

## Architecture Analysis

When run against a codebase with source files, repo-map performs deep architecture analysis:

| Metric | Description |
|--------|-------------|
| **Architecture Patterns** | Detects layered, MVC, hexagonal, feature-based, event-driven, and other patterns |
| **Dependency Graph** | Maps internal module dependencies, identifies central/hub/leaf/isolated modules |
| **Circular Dependencies** | DFS-based cycle detection with severity and remediation recommendations |
| **Architecture Smells** | God modules, large utility folders, feature leakage, excessive nesting, configuration sprawl |
| **File Complexity** | Calculated from file size, import count, export count, function count, and class count |
| **Coupling** | Measures average incoming/outgoing dependencies per module |
| **Cohesion** | Analyzes intra-directory vs inter-directory import ratios |
| **Layer Violations** | Detects cross-layer dependency violations (e.g., UI → infrastructure) |
| **Architecture Quality Score** | Composite score (0-100) across coupling, cohesion, layering, organization, separation, dependency graph |
| **Risk Report** | Technical debt, maintainability, scalability, onboarding, and release risk assessment |
| **Refactor Suggestions** | Actionable, prioritized recommendations with impact/effort estimates |

---

## Health Score Categories

The codebase health score assesses 8 dimensions, each scored 0-100:

1. **Documentation** — README, docs directory, changelog, contributing guide, Markdown files
2. **Testing** — Test files, test configuration, test frameworks
3. **Architecture** — Directory nesting depth, source organization, modularization
4. **Maintainability** — File distribution across directories, modularization ratio
5. **Consistency** — Linter and formatter configuration, TypeScript usage
6. **Project Structure** — Standard directory conventions, `.gitignore` presence
7. **Tooling** — Package manager, lock file, build config, CI, Docker
8. **Release Readiness** — License, README, changelog, versioning, CI/CD

---

## How It Works

```
CLI Args → Scan → Analyze → Format → Output
```

1. **Scan** — Walk the directory tree, applying `.gitignore`, exclude, and include filters. Binary files, symlinks, and files over 50 MB are handled gracefully.
2. **Analyze** — Detect technologies, classify project, estimate maturity, score health, analyze architecture (dependency graph, coupling, cohesion, smells, complexity, risk).
3. **Format** — Render as Markdown audit report, stable JSON, or compact statistics.

A shared file content cache eliminates duplicate filesystem reads across the analysis pipeline, improving performance on large repositories.

---

## Error Recovery

repo-map handles the following error conditions gracefully without crashing:

- **Permission denied** — Inaccessible files/directories are skipped
- **Broken symlinks** — Detected and skipped during traversal
- **Unreadable files** — Binary detection failures return as binary
- **Invalid encoding** — Non-UTF-8 files are detected via null-byte check
- **Extremely large files** — Files over 50 MB are skipped to prevent OOM
- **Missing package.json** — Detection proceeds without package analysis
- **Malformed JSON** — Parsed config files with errors are skipped
- **File system race conditions** — Caught and handled at the entry level
- **SIGINT** — Graceful interruption on Ctrl+C (press twice to force exit)

---

## Ignored Files

By default, repo-map respects `.gitignore` rules and always excludes the `.git` directory. Use `--no-ignore` to include all files.

Binary files (images, fonts, archives, executables, etc.) are always excluded. The detection uses both extension-based and content-based heuristics.

---

## Development

```bash
# Install dependencies
npm install

# Run tests (323+ tests)
npm test

# Run in development mode
npm run dev -- /path/to/project

# Build
npm run build

# Lint
npm run lint

# Run benchmark
npx tsx scripts/benchmark.ts

# Analyze repo-map itself
npx tsx scripts/analyze-self.ts
```

---

## Limitations

- **Import parsing** is best-effort and language-specific; dynamic imports, re-exports, and non-standard patterns may not be fully resolved
- **Dependency analysis** uses heuristics for detecting unused/outdated packages — not a guarantee
- **Architecture pattern detection** is directory-name-based and may not reflect actual runtime architecture
- **Complexity scoring** uses file-level heuristics (size, imports, exports) — not a substitute for human code review
- **Layer violations** only detect obvious cross-layer imports based on directory naming conventions

---

## License

MIT
