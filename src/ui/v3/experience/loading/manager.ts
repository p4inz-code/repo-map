/**
 * LoadingManager — manages informative loading states for the V3 Experience Engine.
 *
 * Every expensive operation gets an informative loading state with:
 * - Title and description of what's happening
 * - Progress indicator (percentage or indeterminate)
 * - Status message (e.g., "Processing file 42/100")
 * - Elapsed time tracking
 * - Completion/error tracking
 * - EventBus integration
 *
 * Never spinner-only. Always informative.
 */

import type { EventBus } from '../../event-bus/bus.js';
import type { LoadingOperation, LoadingState } from './types.js';
import { getLoadingTitle, getLoadingDescription } from './types.js';

// ─── LoadingManager ───────────────────────────────────────────────

export class LoadingManager {
  private readonly _eventBus: EventBus;

  /** Current loading state (null if not loading). */
  private _current: LoadingState | null = null;

  /** Start timestamp for the current operation. */
  private _startTime: number = 0;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  /**
   * Start a loading operation.
   *
   * @param operation - The operation being performed.
   * @param metadata  - Optional operation-specific metadata.
   */
  startOperation(operation: LoadingOperation, metadata?: Record<string, unknown>): void {
    this._startTime = Date.now();

    this._current = {
      operation,
      title: getLoadingTitle(operation),
      description: getLoadingDescription(operation),
      progress: -1,
      statusMessage: 'Starting...',
      estimatedRemainingMs: -1,
      elapsedMs: 0,
      completed: false,
      errored: false,
      metadata: metadata ?? {},
    };
  }

  /**
   * Update the current loading operation's progress.
   *
   * @param progress      - Progress percentage (0..100, -1 if indeterminate).
   * @param statusMessage - Current status message.
   * @param metadata      - Optional metadata updates.
   */
  updateProgress(
    progress: number,
    statusMessage?: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this._current) return;

    this._current.progress = progress;
    this._current.elapsedMs = Date.now() - this._startTime;

    if (statusMessage) {
      this._current.statusMessage = statusMessage;
    }

    if (metadata) {
      this._current.metadata = { ...this._current.metadata, ...metadata };
    }
  }

  /**
   * Complete the current loading operation successfully.
   *
   * @param statusMessage - Optional final status message.
   */
  completeOperation(statusMessage?: string): void {
    if (!this._current) return;

    this._current.completed = true;
    this._current.progress = 100;
    this._current.statusMessage = statusMessage ?? 'Complete';
    this._current.elapsedMs = Date.now() - this._startTime;
  }

  /**
   * Fail the current loading operation with an error.
   *
   * @param errorMessage - Description of the error.
   */
  failOperation(errorMessage: string): void {
    if (!this._current) return;

    this._current.errored = true;
    this._current.completed = true;
    this._current.errorMessage = errorMessage;
    this._current.statusMessage = 'Failed';
    this._current.elapsedMs = Date.now() - this._startTime;
  }

  /**
   * Reset the loading manager to idle state.
   */
  reset(): void {
    this._current = null;
    this._startTime = 0;
  }

  // ── Accessors ─────────────────────────────────────────────────

  /**
   * Get the current loading state (null if not loading).
   */
  get current(): LoadingState | null {
    if (!this._current) return null;

    // Update elapsed time
    this._current.elapsedMs = Date.now() - this._startTime;

    return this._current;
  }

  /**
   * Whether any loading operation is in progress.
   */
  get isLoading(): boolean {
    return this._current !== null && !this._current.completed && !this._current.errored;
  }

  /**
   * Whether the loading operation has completed.
   */
  get isComplete(): boolean {
    return this._current?.completed ?? false;
  }

  /**
   * Get the elapsed time in ms since the operation started.
   */
  get elapsedMs(): number {
    return this._current ? Date.now() - this._startTime : 0;
  }

  /**
   * Get the formatted elapsed time string.
   */
  getElapsedString(): string {
    const ms = this.elapsedMs;
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }
}
