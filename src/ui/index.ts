/**
 * UISession — top-level UI orchestrator for the repo-map CLI.
 *
 * Wraps the V3 RuntimeManager pipeline into the UISession interface
 * used by the CLI pipeline (src/index.ts).
 *
 * This is the ONLY execution path for visual output.
 *
 * # Architecture
 * ```
 * createUISession()
 *   ↓
 * UISessionV3
 *   ↓
 * RuntimeManager
 *   ↓
 * Frame Pipeline → Terminal
 * ```
 *
 * # V3 Pipeline
 * ```
 * FrameContext → FrameBuilder → LayerComposer → DoubleBuffer → DiffEngine → Terminal
 * ```
 */

import { UISessionV3 } from './v3/session.js';
import type { Analysis } from '../types.js';
import type { TreeNodeData } from './state/types.js';

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

  // Interactive workspace
  runInteractiveWorkspace(): Promise<void> | undefined;
  setAnalysisData(analysis: Analysis): void;
  setTreeData(data: TreeNodeData): void;

  // Error
  reportError(message: string, suggestion?: string): void;

  // Lifecycle
  close(): void;
}

// ─── Factory ─────────────────────────────────────────────────────

/**
 * Create a new UISession backed by the V3 RuntimeManager pipeline.
 *
 * This is the single entry point for all CLI visual output.
 * There is no V1 or V2 engine fallback — only V3.
 *
 * @param options - Session configuration (color, terminal width).
 * @returns A UISession instance backed by RuntimeManager.
 */
export function createUISession(options: UISessionOptions): UISession {
  return new UISessionV3(options);
}
