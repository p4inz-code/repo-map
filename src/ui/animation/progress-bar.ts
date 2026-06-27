/**
 * ProgressBarAnimation — deterministic progress bar with percentage display.
 *
 * Renders a visual bar like `[████████░░] 80%` that advances based on
 * externally-set progress values. Returns `null` from `tick()` when
 * the percentage hasn't changed (frame coalescing).
 *
 * # Architecture Rules
 * - NO independent timers (uses AnimationManager's single interval).
 * - NO process.stdout writes.
 * - NO screen or layout logic.
 */

import type { Animation, AnimationFrame } from './types.js';

const FILLED = '█';
const EMPTY = '░';
const DEFAULT_WIDTH = 20;

/**
 * Options for constructing a ProgressBarAnimation.
 */
export interface ProgressBarOptions {
  /** Width of the bar in character cells (not including brackets or percentage). Default: 20. */
  width?: number;
  /** Optional label displayed before the bar. */
  label?: string;
  /** Whether to show the percentage text after the bar. Default: true. */
  showPercent?: boolean;
}

/**
 * Animation that displays a deterministically updated progress bar.
 *
 * @example
 * ```ts
 * const bar = new ProgressBarAnimation({ label: 'Downloading' });
 * bar.setProgress(50);
 * bar.tick(80);
 * // → { lines: ['Downloading [██████████░░░░░░░░░░] 50%'], position: 'inline' }
 * ```
 */
export class ProgressBarAnimation implements Animation {
  readonly type = 'progress-bar';

  private _width: number;
  private _label: string;
  private _showPercent: boolean;
  private _progress: number = 0;
  private _lastRenderedProgress: number = -1;
  private _disposed: boolean = false;

  /**
   * @param options - Optional configuration.
   */
  constructor(options?: ProgressBarOptions) {
    this._width = options?.width ?? DEFAULT_WIDTH;
    this._label = options?.label ?? '';
    this._showPercent = options?.showPercent ?? true;
  }

  /**
   * Set the current progress percentage.
   *
   * @param percent - Progress value between 0 and 100.
   */
  setProgress(percent: number): void {
    this._progress = Math.max(0, Math.min(100, percent));
  }

  /**
   * Called by the AnimationManager on each tick.
   *
   * Returns `null` when the progress hasn't changed since the last
   * tick (frame coalescing).
   *
   * @param _dt - Milliseconds since the last tick (unused).
   * @returns An AnimationFrame with the bar, or `null` if unchanged.
   */
  tick(_dt: number): AnimationFrame | null {
    if (this._disposed) return null;

    // Frame coalescing: skip if progress hasn't changed
    if (this._progress === this._lastRenderedProgress) return null;

    this._lastRenderedProgress = this._progress;

    const filledCount = Math.round((this._progress / 100) * this._width);
    const emptyCount = this._width - filledCount;

    const bar = `${FILLED.repeat(filledCount)}${EMPTY.repeat(emptyCount)}`;
    const pct = this._showPercent ? ` ${Math.round(this._progress)}%` : '';
    const label = this._label ? `${this._label} ` : '';

    return {
      lines: [`${label}[${bar}]${pct}`],
      position: 'inline',
    };
  }

  /**
   * Clean up resources. After disposal, tick() returns null.
   */
  dispose(): void {
    this._disposed = true;
  }
}
