/**
 * EtaAnimation — elapsed time display.
 *
 * Shows the elapsed time since the animation started, updating at
 * most once per second. Returns `null` from `tick()` when the time
 * display hasn't changed (frame coalescing).
 *
 * # Architecture Rules
 * - NO independent timers (uses AnimationManager's single interval).
 * - NO process.stdout writes.
 * - NO screen or layout logic.
 */

import type { Animation, AnimationFrame } from './types.js';

/** Minimum interval between frame updates in milliseconds. */
const THROTTLE_MS = 1000;

/**
 * Animation that displays elapsed time since construction.
 *
 * @example
 * ```ts
 * const eta = new EtaAnimation('Completed in');
 * // After ~5 seconds:
 * eta.tick(1000); // → { lines: ['Completed in 5.0s'], position: 'inline' }
 * ```
 */
export class EtaAnimation implements Animation {
  readonly type = 'eta';

  private _label: string;
  private _startTime: number;
  private _lastEmittedSecond: number = -1;
  private _disposed: boolean = false;

  /**
   * @param label - Optional label displayed before the elapsed time.
   *                Default: 'Done in'.
   */
  constructor(label: string = 'Done in') {
    this._label = label;
    this._startTime = Date.now();
  }

  /**
   * Called by the AnimationManager on each tick.
   *
   * Returns `null` when less than `THROTTLE_MS` has elapsed since
   * the last emitted frame (frame coalescing).
   *
   * @param _dt - Milliseconds since the last tick (unused).
   * @returns An AnimationFrame with the elapsed time, or `null` if
   *          throttled.
   */
  tick(_dt: number): AnimationFrame | null {
    if (this._disposed) return null;

    const elapsed = Date.now() - this._startTime;
    const currentSecond = Math.floor(elapsed / THROTTLE_MS);

    // Frame coalescing: skip if still within the same second
    if (currentSecond === this._lastEmittedSecond) return null;

    this._lastEmittedSecond = currentSecond;

    const seconds = (elapsed / 1000).toFixed(1);

    return {
      lines: [`${this._label} ${seconds}s`],
      position: 'inline',
    };
  }

  /**
   * Reset the elapsed time counter.
   */
  reset(): void {
    this._startTime = Date.now();
    this._lastEmittedSecond = -1;
  }

  /**
   * Clean up resources. After disposal, tick() returns null.
   */
  dispose(): void {
    this._disposed = true;
  }
}
