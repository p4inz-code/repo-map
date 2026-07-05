# Architecture

## Overview

repo-map is a CLI tool that scans a repository and generates architecture documentation. It detects technologies, builds directory trees, and produces Markdown or JSON output.

## Project Structure

```
src/
├── index.ts              # CLI entrypoint and pipeline orchestrator
├── bin.ts                # CLI binary entry (shebang, error handling)
├── cli.ts                # Command-line argument parsing (commander)
├── types.ts              # Core type definitions
├── utils.ts              # Shared utility functions
├── file-cache.ts         # LRU file content cache (200 MB max)
├── batch.ts              # Bounded concurrency batch processor
├── scanner/              # Filesystem scanning subsystem
│   ├── index.ts          # scanDirectory() orchestrator
│   ├── file-walker.ts    # Recursive directory traversal
│   └── ignore.ts         # .gitignore filter support
├── analyzer/             # Analysis subsystem
│   ├── index.ts          # analyze() orchestrator
│   ├── tree.ts           # ASCII directory tree generator
│   ├── architecture.ts   # Markdown architecture generator
│   └── detectors/        # Technology detection subsystem
│       ├── index.ts      # Default registry setup
│       ├── types.ts      # Detector interface
│       ├── registry.ts   # DetectorRegistry class
│       ├── language-detector.ts
│       ├── framework-detector.ts
│       └── tool-detector.ts
├── formatters/           # Output formatters
│   ├── json.ts           # JSON serializer
│   ├── markdown.ts       # Markdown renderer
│   └── stats.ts          # Compact statistics output
├── intelligence/         # Project intelligence engine
│   ├── index.ts          # runIntelligence() orchestrator
│   ├── project-classifier.ts
│   ├── maturity-estimator.ts
│   ├── health-scorer.ts
│   ├── entry-point-detector.ts
│   ├── directory-role-classifier.ts
│   ├── build-pipeline-analyzer.ts
│   ├── dependency-analyzer.ts
│   ├── strengths-generator.ts
│   ├── suggestions-generator.ts
│   └── insights-generator.ts
├── architecture/         # Deep architecture analysis
│   ├── index.ts          # runArchitectureAnalysis() orchestrator
│   ├── import-parser.ts
│   ├── dependency-graph.ts
│   ├── pattern-detector.ts
│   ├── circular-deps.ts
│   ├── smells.ts
│   ├── import-analysis.ts
│   ├── module-analysis.ts
│   ├── coupling.ts
│   ├── cohesion.ts
│   ├── layer-violations.ts
│   ├── complexity.ts
│   ├── risk-report.ts
│   ├── dep-tree.ts
│   ├── arch-score.ts
│   └── refactor-suggestions.ts
└── ui/                   # Terminal UI system
    ├── index.ts          # UISession orchestrator
    ├── renderer.ts       # Frame renderer and ANSI conversion
    ├── animation/        # Animation system
    ├── layout/           # Terminal width detection
    ├── primitives/       # Box, table, list, text, divider, group
    ├── screens/          # Scanning, analyzing, completion, stats, suggest, error, help
    ├── theme/            # Color, symbol, border themes and presets
    └── utils/            # ANSI escape sequence utilities
```

## Data Flow

```
CLI Args (argv)
    │
    ▼
parseCliArgs() → CliOptions
    │
    ▼
scanDirectory() → ScanResult
    │
    ▼
analyze() → Analysis
    │
    ├──▶ generateTree() → string
    │
    ├──▶ detectAll() → Technology[]
    │       │
    │       ├──▶ LanguageDetector
    │       ├──▶ FrameworkDetector
    │       └──▶ ToolDetector
    │
    └──▶ generateArchitecture() → string
    │
    ▼
formatJson() / formatMarkdown()
    │
    ▼
Output (stdout or file)
```

## Key Interfaces

### FileEntry

```typescript
interface FileEntry {
  path: string;           // Absolute path
  relativePath: string;   // Path relative to root
  size: number;           // File size in bytes
  isDirectory: boolean;   // Directory flag
}
```

### Analysis

```typescript
interface Analysis {
  schemaVersion: string;
  projectName: string;
  generatedAt: string;
  cliVersion: string;
  stats: {
    totalFiles: number;
    totalDirectories: number;
    totalSize: number;
    scannedPath: string;
  };
  technologies: Technology[];
  tree: string;           // ASCII tree
  architecture: string;   // Markdown output
}
```

## Technology Detection

The detector subsystem uses a registry pattern with deduplication:

1. **LanguageDetector** - Matches file extensions to programming languages
2. **FrameworkDetector** - Detects frameworks from config files and dependencies
3. **ToolDetector** - Identifies development tools and CI systems

Detectors run in registration order. The first detector to report a technology name wins.

## Design Principles

- **Pure functions** - Core logic has no side effects beyond filesystem reads
- **No scope expansion** - Each module has a single responsibility
- **Type safety** - Strict TypeScript with no `any` types
- **ESM-first** - Native ES modules with `.js` extensions in imports
- **Minimal dependencies** - Only `commander` and `ignore`

## Testing

- Unit tests for each detector, animation, primitive, and screen
- Integration tests for scanner, analyzer, and formatter pipeline
- End-to-end tests for the full pipeline
- 783 tests total, all passing
