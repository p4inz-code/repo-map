/**
 * AnimationManager — single timer controller for all animations.
 *
 * One shared `setInterval` drives every registered Animation.
 * Individual animations never create their own timers.
 *
 * # Architecture Rules
 * - NO independent intervals or timeouts inside animation implementations.
 * - NO `process.stdout` writes (frames delivered via callback).
 * - NO screen or layout logic.
 * - NO business logic (analysis data, file system, etc.).
 *
 * # Frame Coalescing
 * If no animation's `tick()` returns a frame, the manager skips the
 * redraw callback entirely — no unnecessary terminal writes.
 */

import { isTTY } from '../utils/ansi.js';
import type { Animation, AnimationFrame } from './types.js';

export type { Animation, AnimationFrame } from './types.js';

/**
 * Options for constructing an AnimationManager.
 */
export interface AnimationManagerOptions {
  /** Tick interval in milliseconds. Default: 80 (12.5 FPS). */
  interval?: number;
  /**
   * Whether animations are enabled at all.
   * Defaults to `isTTY()` — animations are disabled in pipelines.
   */
  enabled?: boolean;
}

/**
 * Manages a collection of Animation instances with a single shared timer.
 */
export class AnimationManager {
  private _interval: number;
  private _enabled: boolean;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _animations: Animation[] = [];
  private _onFrame: ((frame: AnimationFrame) => void) | null = null;
  private _frameCount: number = 0;
  private _paused: boolean = false;
  private _lastTickTime: number = 0;

  /**
   * @param options - Configuration for the manager.
   */
  constructor(options?: AnimationManagerOptions) {
    this._interval = options?.interval ?? 80;
    this._enabled = options?.enabled ?? isTTY();
  }

  // ── Accessors ──────────────────────────────────────────────────

  /** Whether the manager's timer is currently running. */
  get running(): boolean {
    return this._timer !== null;
  }

  /** Total number of frames delivered since the last `start()`. */
  get frameCount(): number {
    return this._frameCount;
  }

  /** The tick interval in milliseconds. */
  get interval(): number {
    return this._interval;
  }

  /** Whether animations are enabled (auto-detected from TTY by default). */
  get enabled(): boolean {
    return this._enabled;
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  /**
   * Register an animation to be ticked on each timer cycle.
   * Can be called before or after `start()`.
   */
  register(animation: Animation): void {
    this._animations.push(animation);
  }

  /**
   * Unregister an animation so it is no longer ticked.
   * Has no effect if the animation was not registered.
   */
  unregister(animation: Animation): void {
    const idx = this._animations.indexOf(animation);
    if (idx !== -1) {
      this._animations.splice(idx, 1);
    }
  }

  /**
   * Start the animation timer.
   *
   * @param onFrame - Callback invoked with the latest non-null
   *                  AnimationFrame on each tick where at least one
   *                  animation produced an update.
   *
   * Has no effect if:
   * - Animations are disabled (`enabled === false`)
   * - The timer is already running
   */
  start(onFrame: (frame: AnimationFrame) => void): void {
    if (!this._enabled) return;
    if (this._timer !== null) return; // already started

    this._onFrame = onFrame;
    this._paused = false;
    this._frameCount = 0;
    this._lastTickTime = 0;
    this._timer = setInterval(() => this._tick(), this._interval);
  }

  /**
   * Stop the animation timer, dispose all registered animations,
   * and clear the animation list.
   *
   * After `stop()` the manager returns to its initial state and can
   * be `start()`ed again with new animations.
   */
  stop(): void {
    this._clearTimer();

    // Dispose all animations
    for (const anim of this._animations) {
      try {
        anim.dispose();
      } catch {
        // Swallow dispose errors — animation cleanup should never
        // prevent the manager from stopping cleanly.
      }
    }

    this._animations = [];
    this._onFrame = null;
    this._paused = false;
    this._frameCount = 0;
    this._lastTickTime = 0;
  }

  /**
   * Pause frame delivery. The timer keeps running but no frames
   * are delivered until `resume()` is called.
   */
  pause(): void {
    this._paused = true;
  }

  /**
   * Resume frame delivery after a `pause()`.
   */
  resume(): void {
    this._paused = false;
  }

  // ── Internal ───────────────────────────────────────────────────

  /** Stop and clear the interval timer. */
  private _clearTimer(): void {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /** Called on each timer tick. Collects frames and delivers via callback. */
  private _tick(): void {
    if (this._paused || !this._onFrame) return;

    const now = Date.now();
    const dt = this._lastTickTime === 0 ? this._interval : now - this._lastTickTime;
    this._lastTickTime = now;

    let latestFrame: AnimationFrame | null = null;

    for (const anim of this._animations) {
      try {
        const frame = anim.tick(dt);
        if (frame !== null) {
          latestFrame = frame;
        }
      } catch {
        // Swallow tick errors — a misbehaving animation should
        // not break the entire frame loop.
      }
    }

    // Frame coalescing: only deliver if at least one animation updated
    if (latestFrame !== null) {
      this._frameCount++;
      this._onFrame(latestFrame);
    }
  }
}
