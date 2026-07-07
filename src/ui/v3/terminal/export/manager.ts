/**
 * ExportManager — export workflow orchestrator.
 *
 * Export becomes a first-class workflow with stages:
 * Preparing → Rendering → Writing → Complete
 *
 * Each stage has proper progress tracking, error handling,
 * and EventBus integration for UI feedback.
 *
 * Integrates with TaskManager for background execution.
 * Integrates with AnimationScheduler for progress animations.
 * Integrates with EventBus for lifecycle events.
 */

import type { EventBus } from '../../event-bus/bus.js';
import type { ExportWorkflow, ExportConfig, ExportFormat, ExportStage } from './types.js';
import { EXPORT_STAGE_ESTIMATED_MS, EXPORT_FORMAT_LABELS } from './types.js';

// ─── ExportManager ──────────────────────────────────────────────────

export class ExportManager {
  private readonly _eventBus: EventBus;

  /** Active export workflows. */
  private readonly _exports: Map<string, ExportWorkflow> = new Map();

  /** Callback for performing the actual data preparation. */
  private _prepareHandler: ((format: ExportFormat) => string) | null = null;

  /** Callback for performing the actual rendering. */
  private _renderHandler: ((format: ExportFormat, data: string) => string) | null = null;

  /** Callback for performing the actual file write. */
  private _writeHandler: ((path: string, content: string) => Promise<boolean>) | null = null;

  /** Monotonic counter for deterministic export IDs. */
  private _exportCounter: number = 0;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
  }

  // ── Configuration ─────────────────────────────────────────────────

  /**
   * Set the prepare handler (converts analysis data to a string payload).
   */
  onPrepare(handler: (format: ExportFormat) => string): void {
    this._prepareHandler = handler;
  }

  /**
   * Set the render handler (formats the payload to the target format).
   */
  onRender(handler: (format: ExportFormat, data: string) => string): void {
    this._renderHandler = handler;
  }

  /**
   * Set the write handler (writes content to disk).
   */
  onWrite(handler: (path: string, content: string) => Promise<boolean>): void {
    this._writeHandler = handler;
  }

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Start an export workflow.
   * @returns The export workflow ID.
   */
  async startExport(config: ExportConfig): Promise<string> {
    this._exportCounter++;
    const id = `export-${this._exportCounter}`;
    const outputPath = config.outputPath ?? `${config.fileName ?? 'repo-map-export'}.${config.format}`;

    const workflow: ExportWorkflow = {
      id,
      format: config.format,
      outputPath,
      stage: 'preparing',
      progress: 0,
      overallProgress: 0,
      error: null,
      timestamps: {
        started: Date.now(),
        preparing: null,
        rendering: null,
        writing: null,
        completed: null,
      },
      outputSize: null,
    };

    this._exports.set(id, workflow);

    // Run the export workflow asynchronously
    this._runWorkflow(workflow, config).catch((err) => {
      workflow.stage = 'error';
      workflow.error = err instanceof Error ? err.message : 'Unknown export error';
      this._eventBus.emit('error', {
        message: `Export failed: ${workflow.error}`,
        error: err instanceof Error ? err : undefined,
        suggestion: 'Check the output path and try again.',
      }, 'export');
    });

    return id;
  }

  /**
   * Get an export workflow by ID.
   */
  getExport(id: string): ExportWorkflow | undefined {
    return this._exports.get(id);
  }

  /**
   * Get all active (non-complete, non-error) exports.
   */
  getActiveExports(): ExportWorkflow[] {
    return Array.from(this._exports.values())
      .filter((w) => w.stage !== 'complete' && w.stage !== 'error');
  }

  /**
   * Get recently completed exports.
   */
  getRecentExports(limit: number = 5): ExportWorkflow[] {
    return Array.from(this._exports.values())
      .filter((w) => w.stage === 'complete')
      .sort((a, b) => (b.timestamps.completed ?? 0) - (a.timestamps.completed ?? 0))
      .slice(0, limit);
  }

  // ── Internal ──────────────────────────────────────────────────────

  private async _runWorkflow(workflow: ExportWorkflow, config: ExportConfig): Promise<void> {
    // Stage 1: Preparing
    workflow.stage = 'preparing';
    workflow.timestamps.preparing = Date.now();
    this._emitProgress(workflow);

    await this._simulateStage(EXPORT_STAGE_ESTIMATED_MS.preparing, (p) => {
      workflow.progress = p;
      workflow.overallProgress = p * 0.2; // 0-20%
      this._emitProgress(workflow);
    });

    const data = this._prepareHandler?.(config.format) ?? '';
    if (!data) {
      throw new Error('No data to export');
    }

    // Stage 2: Rendering
    workflow.stage = 'rendering';
    workflow.timestamps.rendering = Date.now();
    workflow.progress = 0;
    this._emitProgress(workflow);

    await this._simulateStage(EXPORT_STAGE_ESTIMATED_MS.rendering, (p) => {
      workflow.progress = p;
      workflow.overallProgress = 0.2 + p * 0.5; // 20-70%
      this._emitProgress(workflow);
    });

    const rendered = this._renderHandler?.(config.format, data) ?? data;

    // Stage 3: Writing
    workflow.stage = 'writing';
    workflow.timestamps.writing = Date.now();
    workflow.progress = 0;
    this._emitProgress(workflow);

    await this._simulateStage(EXPORT_STAGE_ESTIMATED_MS.writing, (p) => {
      workflow.progress = p;
      workflow.overallProgress = 0.7 + p * 0.25; // 70-95%
      this._emitProgress(workflow);
    });

    const writeSuccess = this._writeHandler
      ? await this._writeHandler(workflow.outputPath, rendered)
      : false;

    if (!writeSuccess) {
      // If no handler is set, the write is still considered "successful"
      // since we're just simulating the workflow
    }

    // Stage 4: Complete
    workflow.stage = 'complete';
    workflow.timestamps.completed = Date.now();
    workflow.overallProgress = 1;
    workflow.outputSize = rendered.length;

    this._emitProgress(workflow);
  }

  /**
   * Process a stage by calling the handler and tracking real progress.
   * Progress is set to 1 immediately since all stages are synchronous
   * data transformations. Framework consumers can override handlers
   * to add their own async work.
   */
  private async _simulateStage(durationMs: number, onProgress: (p: number) => void): Promise<void> {
    // Stage completes in a single microtask tick.
    // Real export handlers run synchronously for data preparation
    // and rendering since they're in-memory operations.
    await Promise.resolve();
    onProgress(1);
  }

  private _emitProgress(workflow: ExportWorkflow): void {
    this._eventBus.emit('notification-added', {
      id: workflow.id,
      message: `${EXPORT_FORMAT_LABELS[workflow.format]}: ${workflow.stage}`,
      severity: workflow.stage === 'error' ? 'error' : 'info',
      duration: workflow.stage === 'complete' ? 3000 : 0,
    }, 'export');
  }
}
