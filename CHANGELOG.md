# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-07-07

### Added

- **V3 Runtime Layer** — New deterministic frame pipeline (FrameBuilder → LayerComposer → DoubleBuffer → DiffEngine)
- **Command Palette (Ctrl+K)** — Raycast-inspired palette with fuzzy search, recent commands, pinned favorites
- **Incremental Search (Ctrl+F)** — Live filtering with match highlighting, scroll-to-result, history preservation
- **Smooth Scrolling** — PageUp/PageDown/Home/End with eased interpolation, scrollbar fade, edge shadows
- **Cinematic Startup Sequence** — Animated logo reveal, progressive workspace reveal, reduced-motion support
- **Context-Aware Keyboard Hints** — Dynamic status bar hints that update based on current screen, palette, and search state
- **Accessibility Manager** — Reduced motion mode (changes duration, not lifecycle), high contrast, no-color support
- **Overlay Manager** — Stack-based overlay system with focus routing, dismiss strategies, modal support
- **Sidebar Motion** — Gliding selection animation with eased transitions
- **MicroInteractions** — Cursor pulses, panel transitions, subtle animations
- **Animation Scheduler** — Enhanced frame-based scheduler with pause/resume/cancel/reverse
- **EventBus** — Strongly typed pub/sub event system for decoupled component communication
- **WorkspaceManager** — Centralized workspace state with observable changes
- **FocusTree** — Hierarchical focus system for keyboard navigation
- **TransitionManager** — Screen-to-screen transition orchestration
- **ExportManager** — Multi-format export workflow with progress tracking
- **TaskManager** — Background task orchestration with priority queuing
- **NotificationSystem** — Queued notifications with severity levels and auto-dismiss
- **LoadingManager** — Informative loading states with progress tracking

### Changed

- **Internal architecture** — Complete migration from V1/V2 render pipelines to V3 RuntimeManager
- **Keyboard bindings** — Ctrl+K opens palette, Ctrl+F opens search, PageUp/PageDown scroll smoothly
- **Version bumped to 3.0.0** — Major version reflecting complete runtime rewrite
- **CLI_VERSION synchronized** — All version strings now reference the canonical `CLI_VERSION` constant
- **870+ automated tests** — Expanded test coverage for new V3 systems

### Fixed

- PageUp/PageDown/Home/End now use ScrollingEngine instead of placeholder `markDirty()` calls
- Reduced motion no longer prevents startup lifecycle (only affects duration/easing)
- Startup reveal always executes regardless of accessibility settings
- Removed unused `renderSearchBar` import
- Fixed version string consistency across `about.ts`, `controller.ts`, and test assertions

### Documentation

- README updated with v3.0.0 features, screenshots, and CLI reference

## [2.2.2] - 2026-07-06

### Added

- **Interactive workspace** — New `--interactive` flag launches a navigable TUI with sidebar navigation, repository tree explorer, info panel, breadcrumbs, and keyboard shortcuts
- **Tree output** — New `--tree` flag displays the directory tree on its own

### Fixed

- CLI version now correctly reports `2.2.2` matching package.json (was hardcoded to `2.2.0`)

### Documentation

- README updated with interactive workspace documentation, keyboard shortcuts, and region descriptions
- Commander help updated with all options and examples including `--interactive`, `--tree`, and `--tree`

The interactive workspace was built across multiple past releases but not wired into the CLI. This release completes the integration.

## [2.2.0] - 2026-07-04

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
- **862+ automated tests** — Comprehensive coverage across all screens, animations, theme presets, and edge cases

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

## [2.1.0] - 2025-06-15

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

## [1.0.0] - 2025-03-01

### Added

- Initial release
- Directory tree generation
- Basic technology detection
- Markdown output format
