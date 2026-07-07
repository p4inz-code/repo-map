/**
 * UISessionV2 — v2 implementation of the UISession interface.
 *
 * Provides the same `createUISession(...)` API as the v1 implementation
 * but powered entirely by the v2 engine (AppShellV2, LayerRenderer,
 * LayoutEngine, ThemeV2, FocusManager, ResizeManager, AnimationScheduler).
 *
 * This is the migration bridge: the backend (src/index.ts) continues
 * to call the same `createUISession()` function with the same interface.
 *
 * # Migration
 * - `createUISession({ color: true })` → returns v2 session
 * - `startScanning()`, `finishScanning()` → v2 powered
 * - `startAnalyzing()`, `finishAnalyzing()` → v2 powered
 * - `renderCompletion()` → v2 powered
 * - `reportError()` → v2 powered
 * - `runInteractiveWorkspace()` → v2 powered
 * - `close()` → v2 cleanup
 */

import { AppShellV2 } from './shell.js';
import type { Analysis } from '../../types.js';
import type { TreeNodeData } from '../state/types.js';
import type { UISessionOptions, ScanProgressCallback, UISession } from '../index.js';

// ─── UISessionV2 Implementation ────────────────────────────────────

class UISessionV2Impl implements UISession {
  private _shell: AppShellV2;
  private _projectName: string = '';

  constructor(options: UISessionOptions) {
    this._shell = new AppShellV2();
    this._shell.initialize();

    // Apply color option
    if (!options.color) {
      process.env.NO_COLOR = '1';
    }
  }

  // ── Progress phases ────────────────────────────────────────────

  startScanning(projectName: string): ScanProgressCallback {
    this._projectName = projectName;
    this._shell.startScanning(projectName);

    return (progress: { files: number; dirs: number }) => {
      this._shell.updateScanProgress(progress.files, progress.dirs);
    };
  }

  finishScanning(files: number, dirs: number): void {
    this._shell.finishScanning(files, dirs);
  }

  startAnalyzing(): void {
    this._shell.startAnalyzing();
  }

  finishAnalyzing(elapsed: number): void {
    this._shell.finishAnalyzing(elapsed);
  }

  // ── Output screens ─────────────────────────────────────────────

  renderCompletion(analysis: Analysis, outputPath?: string): void {
    this._shell.renderCompletion(analysis, outputPath);
  }

  renderStats(analysis: Analysis, _elapsed: number): void {
    // Navigate to results which shows stats
    this._shell.setAnalysisData(analysis);
    this._shell.screens.navigate('results');
  }

  renderSuggest(_analysis: Analysis): void {
    // Navigate to results which includes suggestions
    this._shell.screens.navigate('results');
  }

  renderHelp(): void {
    this._shell.renderHelp();
  }

  // ── Interactive workspace ───────────────────────────────────────

  runInteractiveWorkspace(): Promise<void> | undefined {
    this._shell.start();
    this._shell.screens.navigate('dashboard');
    return new Promise((resolve) => {
      // The shell handles input routing — resolve when the user quits
      const checkInterval = setInterval(() => {
        if (this._shell['_destroyed']) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  setAnalysisData(analysis: Analysis): void {
    this._shell.setAnalysisData(analysis);
  }

  setTreeData(data: TreeNodeData): void {
    this._shell.setTreeData(data);
  }

  // ── Error ──────────────────────────────────────────────────────

  reportError(message: string, suggestion?: string): void {
    this._shell.reportError(message, suggestion);
    this._shell.start();
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  close(): void {
    this._shell.destroy();
    process.stderr.write('\x1b[?25h'); // Ensure cursor is visible
  }
}

// ─── Factory ──────────────────────────────────────────────────────

/**
 * Create a v2-powered UISession.
 * Same interface as the v1 createUISession().
 */
export function createUISessionV2(options: UISessionOptions): UISession {
  return new UISessionV2Impl(options);
}
