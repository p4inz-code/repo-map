# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-01-01

### Added

- **Dashboard redesign** — Classification-first layout with health bar and 20-character label column alignment
- **Suggestions screen** — New `--suggest` command with prioritized improvement recommendations (high/medium/low)
- **Health scoring** — 8-dimension codebase health assessment with composite 0-100 score
- **Project intelligence** — Automatic classification, maturity estimation, and technology detection
- **Architecture analysis** — Dependency graphs, coupling, cohesion, circular dependency detection, layer violations, complexity scoring, and risk reports
- **Narrow terminal support** — Graceful degradation below 60 columns (text-only layout, information preserved)
- **Color token system** — 4 semantic colors (green, red, cyan, yellow) across 16-color, 256-color, and TrueColor modes
- **Theme presets** — Default, monochrome, high-contrast, and minimal themes
- **Animation system** — Single-timer animation manager with frame coalescing, spinner, progress bar, and ETA components
- **Renderer architecture** — Semantic TextStyle tokens, buildUpdate for in-place frame rendering, buildClear for cleanup
- **Box primitive** — Bordered content panels with optional titles and configurable padding
- **Table, list, group, divider primitives** — Reusable layout components for screen composition
- **Word wrapping and truncation** — CJK-aware text utilities for terminal-safe output
- **Width detection** — Terminal width detection with narrow/normal/wide breakpoints and forced override for testing
- **Suggest flag** — `--suggest` option added to CLI argument parser
- **Stats elapsed time** — Elapsed time now displayed in stats screen
- **783+ automated tests** — Comprehensive coverage across all screens, animations, theme presets, and edge cases

### Changed

- **Default command output** — Removed strengths/suggestions and elapsed time from default dashboard (moved to dedicated commands)
- **Error screen** — Removed title field; error message is now the focal point with cross symbol
- **Help screen** — Added `--suggest` option, split into narrow and wide terminal layouts
- **Completion screen** — Replaced flat text layout with structured dashboard (classification, maturity, health bar, metrics, languages)
- **Stats screen** — Added section headers, largest file/directory display, and elapsed time
- **Box title format** — Standardized to `repo-map · {name}` with optional suffixes (`· stats`, `· suggestions`)

### Fixed

- Dashboard 12-line content budget enforcement with language truncation at 3 languages
- Suggestion priority sorting (high before medium before low)
- Dead `renderBar()` function removed from completion screen
- Unused `elapsed` parameter removed from `UISession.renderCompletion()` interface

## [2.1.0] - 2025-01-01

### Added

- Technology detection for 80+ languages, frameworks, and tools
- Project classification with confidence scoring
- Maturity estimation
- Codebase health scoring
- Architecture pattern detection
- Dependency graph analysis
- Circular dependency detection
- Coupling and cohesion analysis
- Layer violation detection
- File complexity scoring
- Risk report generation
- Refactoring suggestions
- Markdown audit report generation
- JSON output with versioned schema
- Statistics output mode
- `.gitignore` support
- Binary file detection
- Large file handling (50 MB cap)
- Graceful error recovery
- SIGINT handling
- CI/CD workflow with multi-node testing

## [1.0.0] - 2025-01-01

### Added

- Initial release
- Directory tree generation
- Basic technology detection
- Markdown output format
