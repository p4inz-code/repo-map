/**
 * Export types for the Terminal Ecosystem.
 *
 * Export operations are first-class workflows with proper
 * lifecycle states, error handling, and user feedback.
 */

// ─── Export Format ──────────────────────────────────────────────────

export type ExportFormat = 'json' | 'markdown' | 'svg' | 'html' | 'txt';

// ─── Export Stage ───────────────────────────────────────────────────

export type ExportStage = 'idle' | 'preparing' | 'rendering' | 'writing' | 'complete' | 'error';

// ─── Export Workflow ────────────────────────────────────────────────

export interface ExportWorkflow {
  /** Unique export ID. */
  readonly id: string;
  /** Export format. */
  readonly format: ExportFormat;
  /** Output file path. */
  readonly outputPath: string;
  /** Current stage. */
  stage: ExportStage;
  /** Progress within the current stage (0 to 1). */
  progress: number;
  /** Overall progress (0 to 1). */
  overallProgress: number;
  /** Error message if failed. */
  error: string | null;
  /** Timestamps for each stage. */
  readonly timestamps: {
    started: number | null;
    preparing: number | null;
    rendering: number | null;
    writing: number | null;
    completed: number | null;
  };
  /** Output size in bytes (after completion). */
  outputSize: number | null;
}

// ─── Export Config ──────────────────────────────────────────────────

export interface ExportConfig {
  /** Output format. */
  format: ExportFormat;
  /** Output path (optional, auto-generated if not provided). */
  outputPath?: string;
  /** Whether to include architecture data. */
  includeArchitecture?: boolean;
  /** Whether to include intelligence data. */
  includeIntelligence?: boolean;
  /** Whether to include dependency data. */
  includeDependencies?: boolean;
  /** Whether to minify output (JSON only). */
  minify?: boolean;
  /** Custom file name (without extension). */
  fileName?: string;
}

// ─── Export Type Labels ─────────────────────────────────────────────

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  json: 'JSON',
  markdown: 'Markdown',
  svg: 'SVG Diagram',
  html: 'HTML Report',
  txt: 'Plain Text',
};

export const EXPORT_STAGE_LABELS: Record<ExportStage, string> = {
  idle: 'Ready',
  preparing: 'Preparing data…',
  rendering: 'Rendering output…',
  writing: 'Writing to disk…',
  complete: '✓ Export complete',
  error: '✗ Export failed',
};

export const EXPORT_STAGE_ESTIMATED_MS: Record<ExportStage, number> = {
  idle: 0,
  preparing: 50,
  rendering: 200,
  writing: 100,
  complete: 0,
  error: 0,
};
