/**
 * UISession — top-level UI orchestrator for the repo-map CLI.
 *
 * Wraps the Renderer, AnimationManager, App, and all screen functions
 * into a clean lifecycle API used by the CLI pipeline (src/index.ts).
 *
 * # Architecture
 * ```
 * UISession
 *   ├── App              (orchestrator)
 *   │   ├── Store        (state management)
 *   │   ├── InputManager (keyboard input)
 *   │   ├── ScreenManager (screen routing)
 *   │   └── Renderer     (ANSI output)
 *   ├── AnimationManager (spinner/progress animations)
 *   └── Screen modules   (scanning, analyzing, completion, etc.)
 * ```
 *
 * # Lifecycle
 * ```
 * createUISession({ color: true })
 *   .startScanning('my-project')     // Renders spinner
 *   .finishScanning(42, 12)          // "✓ Scanned my-project — 42 files..."
 *   .startAnalyzing()                // Renders spinner
 *   .finishAnalyzing(1.2)            // "✓ Done in 1.2s"
 *   .renderCompletion(analysis)      // Boxed summary
 *   .close()                         // Cleanup
 * ```
 *
 * # Architecture Rules
 * - Creates and owns the Renderer, AnimationManager, and App.
 * - Delegates to screen modules for all visual output.
 * - Does NOT know about analysis pipeline details.
 * - Does NOT write to stdout directly.
 */

import { Renderer } from './renderer.js';
import { AnimationManager } from './animation/index.js';
import { getTheme } from './theme/index.js';
import { getTerminalWidth } from './layout/width.js';
import { App, createApp } from './app.js';
import { renderScanPhase, completeScanPhase } from './screens/scanning.js';
import { renderAnalyzePhase, completeAnalyzePhase } from './screens/analyzing.js';
import { renderCompletion, type CompletionOptions } from './screens/completion.js';
import { renderStats, type StatsOptions } from './screens/stats.js';
import { renderSuggest, type SuggestOptions } from './screens/suggest.js';
import { renderHelp } from './screens/help.js';
import { renderError, type ErrorOptions } from './screens/error.js';
import { cursorShow } from './utils/ansi.js';
import { formatSize } from '../utils.js';
import { CLI_VERSION } from '../types.js';
import type { Analysis } from '../types.js';

// ─── Types ───────────────────────────────────────────────────────

export interface UISessionOptions {
  /** Whether color output is enabled. */
  color: boolean;
  /** If true, animations are disabled (useful for CI). */
  noAnimation?: boolean;
  /** Override terminal width (for testing). */
  terminalWidth?: number;
}

export type ScanProgressCallback = (progress: { files: number; dirs: number }) => void;

export interface UISession {
  // Progress phases
  startScanning(projectName: string): ScanProgressCallback;
  finishScanning(files: number, dirs: number): void;
  startAnalyzing(): void;
  finishAnalyzing(elapsed: number): void;

  // Output screens
  renderCompletion(analysis: Analysis, outputPath?: string): void;
  renderStats(analysis: Analysis, elapsed: number): void;
  renderSuggest(analysis: Analysis): void;
  renderHelp(): void;

  // Error
  reportError(message: string, suggestion?: string): void;

  // Lifecycle
  close(): void;
}

// ─── Implementation ──────────────────────────────────────────────

class UISessionImpl implements UISession {
  private _renderer: Renderer;
  private _manager: AnimationManager;
  private _app: App | null = null;
  private _projectName: string = '';

  constructor(options: UISessionOptions) {
    const theme = getTheme({ color: options.color });
    const width = options.terminalWidth !== undefined
      ? { columns: options.terminalWidth, contentWidth: Math.max(0, options.terminalWidth - 4), isNarrow: options.terminalWidth < 60, isWide: options.terminalWidth >= 120, breakpoint: (options.terminalWidth < 60 ? 'compact' : options.terminalWidth >= 120 ? 'wide' : 'normal') as 'compact' | 'normal' | 'wide' }
      : getTerminalWidth();
    this._renderer = new Renderer(theme, width);
    this._manager = new AnimationManager({
      enabled: !options.noAnimation,
    });

    // Initialize the App with the same renderer and width override
    this._app = createApp({
      color: options.color,
      terminalWidth: options.terminalWidth,
    });
  }

  // ── Progress phases ────────────────────────────────────────────

  startScanning(projectName: string): ScanProgressCallback {
    this._projectName = projectName;

    // Notify the App about state change
    this._app?.store.setState({ appMode: 'scanning' });

    const { updateProgress } = renderScanPhase(this._renderer, this._manager, { projectName });
    return updateProgress;
  }

  finishScanning(files: number, dirs: number): void {
    completeScanPhase(this._renderer, this._manager, files, dirs, this._projectName);
  }

  startAnalyzing(): void {
    // Notify the App about state change
    this._app?.store.setState({ appMode: 'analyzing' });

    renderAnalyzePhase(this._renderer, this._manager);
  }

  finishAnalyzing(elapsed: number): void {
    completeAnalyzePhase(this._renderer, this._manager, elapsed);

    // Notify the App about state change
    this._app?.store.setState({ appMode: 'displaying' });
  }

  // ── Output screens ─────────────────────────────────────────────

  renderCompletion(analysis: Analysis, outputPath?: string): void {
    const { stats, technologies, intelligence } = analysis;

    const completionOptions: CompletionOptions = {
      projectName: this._projectName,
      totalFiles: stats.totalFiles,
      totalDirectories: stats.totalDirectories,
      totalSize: stats.totalSize,
      maxDepth: stats.maxDepth,
      classification: intelligence.classification.category,
      classificationConfidence: intelligence.classification.confidence,
      maturity: intelligence.maturity.level,
      healthScore: intelligence.health.overall,
      technologies,
      outputPath,
    };

    renderCompletion(completionOptions, this._renderer, this._renderer.width);
  }

  renderStats(analysis: Analysis, elapsed: number): void {
    const { stats, technologies } = analysis;

    // Extract language data
    const languages = technologies
      .filter((t) => t.category === 'language' && t.count !== undefined)
      .map((t) => ({
        name: t.name,
        count: t.count!,
        percentage: stats.totalFiles > 0
          ? Math.round((t.count! / stats.totalFiles) * 1000) / 10
          : 0,
      }));

    // Build pre-formatted size string
    const totalSize = formatSize(stats.totalSize);

    const statsOptions: StatsOptions = {
      projectName: this._projectName,
      totalFiles: stats.totalFiles,
      totalDirectories: stats.totalDirectories,
      totalSize,
      maxDepth: stats.maxDepth,
      languages,
      largestFile: stats.largestFile
        ? { path: stats.largestFile, size: formatSize(stats.largestFileSize) }
        : undefined,
      largestDir: stats.largestDirectory
        ? { path: stats.largestDirectory, files: stats.largestDirectoryFiles }
        : undefined,
      avgFilesPerDir: stats.avgFilesPerDirectory,
      elapsed,
    };

    renderStats(statsOptions, this._renderer);
  }

  renderSuggest(analysis: Analysis): void {
    const { intelligence } = analysis;

    const suggestOptions: SuggestOptions = {
      projectName: this._projectName,
      strengths: intelligence.strengths.map((s) => ({ title: s.title })),
      suggestions: intelligence.suggestions.map((s) => ({
        title: s.title,
        priority: s.priority,
      })),
    };

    renderSuggest(suggestOptions, this._renderer);
  }

  renderHelp(): void {
    renderHelp(this._renderer, CLI_VERSION);
  }

  // ── Error ──────────────────────────────────────────────────────

  reportError(message: string, suggestion?: string): void {
    // Notify the App about state change
    this._app?.store.setState({ appMode: 'error' });

    const errorOptions: ErrorOptions = {
      message,
      suggestion,
    };
    renderError(errorOptions, this._renderer);
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  close(): void {
    this._manager.stop();
    this._app?.destroy();
    this._app = null;
    process.stderr.write(cursorShow());
  }

  // ── Interactive workspace ───────────────────────────────────────

  /**
   * Launch the interactive workspace after analysis completes.
   * This replaces the one-shot screen renders with a persistent
   * multi-region layout that the user can navigate.
   *
   * @returns A promise that resolves when the user exits the workspace.
   */
  runInteractiveWorkspace(): Promise<void> | undefined {
    if (!this._app) return undefined;
    return this._app.runWorkspace();
  }

  // ── App accessor ───────────────────────────────────────────────

  /**
   * Get the underlying App instance.
   * Accessible for advanced use cases (e.g., custom input handling).
   */
  get app(): App | null {
    return this._app;
  }

  /**
   * Get the underlying Renderer instance.
   */
  get renderer(): Renderer {
    return this._renderer;
  }
}

// ─── Factory ─────────────────────────────────────────────────────

/**
 * Create a new UISession for orchestrating the CLI UI lifecycle.
 *
 * @param options - Session configuration (color, animation, width).
 * @returns A UISession instance with all lifecycle methods.
 */
export function createUISession(options: UISessionOptions): UISession {
  return new UISessionImpl(options);
}
