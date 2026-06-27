/**
 * UISession — top-level UI orchestrator for the repo-map CLI.
 *
 * Wraps the Renderer, AnimationManager, and all screen functions into a
 * clean lifecycle API used by the CLI pipeline (src/index.ts).
 *
 * # Lifecycle
 * ```
 * createUISession({ color: true })
 *   .startScanning('my-project')     // Renders spinner
 *   .finishScanning(42, 12)          // "✓ Scanned my-project — 42 files..."
 *   .startAnalyzing()                // Renders spinner
 *   .finishAnalyzing(1.2)            // "✓ Done in 1.2s"
 *   .renderCompletion(analysis, 1.2) // Boxed summary
 *   .close()                         // Cleanup
 * ```
 *
 * # Architecture Rules
 * - Creates and owns the Renderer and AnimationManager.
 * - Delegates to screen modules for all visual output.
 * - Does NOT know about analysis pipeline details (receives Analysis objects).
 * - Does NOT write to stdout (returns void — output goes to stderr for UI).
 */

import { Renderer } from './renderer.js';
import { AnimationManager } from './animation/index.js';
import { getTheme } from './theme/index.js';
import { getTerminalWidth } from './layout/width.js';
import { renderScanPhase, completeScanPhase } from './screens/scanning.js';
import { renderAnalyzePhase, completeAnalyzePhase } from './screens/analyzing.js';
import { renderCompletion, type CompletionOptions } from './screens/completion.js';
import { renderStats, type StatsOptions } from './screens/stats.js';
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

export interface UISession {
  // Progress phases
  startScanning(projectName: string): void;
  finishScanning(files: number, dirs: number): void;
  startAnalyzing(): void;
  finishAnalyzing(elapsed: number): void;

  // Output screens
  renderCompletion(analysis: Analysis, elapsed: number, outputPath?: string): void;
  renderStats(analysis: Analysis): void;
  renderHelp(): void;

  // Error
  reportError(title: string, message: string, suggestion?: string): void;

  // Lifecycle
  close(): void;
}

// ─── Implementation ──────────────────────────────────────────────

class UISessionImpl implements UISession {
  private _renderer: Renderer;
  private _manager: AnimationManager;
  private _projectName: string = '';

  constructor(options: UISessionOptions) {
    const theme = getTheme({ color: options.color });
    const width = getTerminalWidth();
    this._renderer = new Renderer(theme, width);
    this._manager = new AnimationManager({
      enabled: !options.noAnimation,
    });
  }

  // ── Progress phases ────────────────────────────────────────────

  startScanning(projectName: string): void {
    this._projectName = projectName;
    renderScanPhase(this._renderer, this._manager, { projectName });
  }

  finishScanning(files: number, dirs: number): void {
    completeScanPhase(this._renderer, this._manager, files, dirs, this._projectName);
  }

  startAnalyzing(): void {
    renderAnalyzePhase(this._renderer, this._manager);
  }

  finishAnalyzing(elapsed: number): void {
    completeAnalyzePhase(this._renderer, this._manager, elapsed);
  }

  // ── Output screens ─────────────────────────────────────────────

  renderCompletion(analysis: Analysis, elapsed: number, outputPath?: string): void {
    const { stats, technologies, intelligence } = analysis;
    const { strengths, suggestions } = intelligence;
    const highPriorityCount = suggestions.filter((s) => s.priority === 'high').length;

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
      strengthsCount: strengths.length,
      suggestionsCount: suggestions.length,
      highPriorityCount,
      elapsed,
      outputPath,
    };

    renderCompletion(completionOptions, this._renderer, this._renderer.width);
  }

  renderStats(analysis: Analysis): void {
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
    };

    renderStats(statsOptions, this._renderer);
  }

  renderHelp(): void {
    renderHelp(this._renderer, CLI_VERSION);
  }

  // ── Error ──────────────────────────────────────────────────────

  reportError(title: string, message: string, suggestion?: string): void {
    const errorOptions: ErrorOptions = {
      title,
      message,
      suggestion,
      fatal: true,
    };
    renderError(errorOptions, this._renderer);
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  close(): void {
    this._manager.stop();
    process.stderr.write(cursorShow());
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
