/**
 * Shared animation types for the repo-map CLI animation system.
 *
 * The Animation interface is the contract between the AnimationManager
 * and all concrete animation implementations (spinner, progress bar,
 * ETA timer, etc.).
 */

/**
 * A single rendered frame produced by an Animation.
 *
 * @property lines    - The content lines to display (pre-ANSI, plain text).
 * @property position - Where to render: 'inline' (same line, overwrite with \\r)
 *                      or 'status-line' (dedicated line for status area).
 */
export interface AnimationFrame {
  lines: string[];
  position: 'inline' | 'status-line';
}

/**
 * Animation interface — every animation type must implement this.
 *
 * - `type`: A human-readable identifier for debugging.
 * - `tick(dt)`: Called by the AnimationManager on each timer tick.
 *   Receives `dt` (milliseconds since last tick). Returns an
 *   AnimationFrame if the visual state changed, or `null` if no
 *   update is needed (frame coalescing).
 * - `dispose()`: Called when the AnimationManager stops. Clean up
 *   any internal state (timers are managed by the manager, not here).
 */
export interface Animation {
  readonly type: string;
  tick(dt: number): AnimationFrame | null;
  dispose(): void;
}
