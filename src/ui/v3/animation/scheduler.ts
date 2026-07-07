/**
 * AnimationScheduler V3 — enhanced frame-based animation scheduler.
 *
 * Manages concurrent animations with full lifecycle support:
 * - start / pause / resume / cancel / reverse
 * - duration, easing, progress tracking
 * - complete callback
 * - looping
 * - frame callbacks with interpolated values
 *
 * # Architecture
 * ```
 * AnimationScheduler
 *   ├── Active Animations (Map<string, AnimationDef>)
 *   ├── Frame Loop (setInterval-driven, configurable interval)
 *   ├── Performance Tracking (frame time, stats)
 *   └── Easing Registry (delegates to easing.ts)
 * ```
 *
 * # Scheduling Model
 * - Multiple animations run concurrently within the same frame loop.
 * - Each animation advances independently based on delta time.
 * - Animations can be paused individually or as a group.
 * - The scheduler fires a frame callback after advancing animations.
 *
 * # Frame Timing
 * - Configurable target frame interval (default 16ms ≈ 60fps).
 * - Tracks cumulative elapsed time for accurate duration progression.
 * - Reports running/queued/paused counts for debugging.
 *
 * # Determinism
 * - All animation state is contained within the scheduler.
 * - No external time sources are used (all timing from performance.now()).
 * - Progress is strictly linear and frame-rate independent.
 *
 * @example
 * ```ts
 * const scheduler = new AnimationScheduler();
 * scheduler.start(() => renderer.requestFullRedraw());
 *
 * const anim = scheduler.animate({
 *   id: 'fade-in',
 *   duration: 300,
 *   easing: Easings.easeOutCubic,
 *   from: 0,
 *   to: 1,
 *   onTick: (value) => overlay.setOpacity(value),
 *   onComplete: () => console.log('done'),
 * });
 * ```
 */

import type {
  AnimationDef,
  AnimationSchedulerOptions,
  AnimationState,
  AnimationDirection,
  SchedulerStats,
} from './types.js';
import { linear } from './easing.js';

// ─── Constants ─────────────────────────────────────────────────────

const DEFAULT_FRAME_INTERVAL_MS = 16; // ≈60fps

// ─── AnimationScheduler ───────────────────────────────────────────

export class AnimationScheduler {
  /** Currently tracked animations by ID. */
  private readonly _active: Map<string, AnimationDef> = new Map();

  /** Timer handle for the frame loop. */
  private _timer: ReturnType<typeof setInterval> | null = null;

  /** Whether the scheduler is running. */
  private _running: boolean = false;

  /** Target frame interval in ms. */
  private readonly _targetIntervalMs: number;

  /** Callback fired after each tick when animations are active. */
  private _frameCallback: (() => void) | null = null;

  /** Last tick timestamp (performance.now()). */
  private _lastTickTime: number = 0;

  /** Total cumulative elapsed time for timing accuracy. */
  private _cumulativeElapsed: number = 0;

  // Stats counters
  private _totalAnimationsCreated: number = 0;
  private _totalAnimationsCompleted: number = 0;
  private _totalAnimationsCancelled: number = 0;
  private _framesProcessed: number = 0;
  private _totalFrameTimeMs: number = 0;

  // ── Construction ──────────────────────────────────────────────────

  constructor(options?: AnimationSchedulerOptions) {
    this._targetIntervalMs = options?.targetFrameIntervalMs ?? DEFAULT_FRAME_INTERVAL_MS;

    if (options?.autoStart) {
      this.start();
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  /**
   * Start the animation frame loop.
   *
   * @param onFrame - Optional callback fired on each frame tick.
   */
  start(onFrame?: () => void): void {
    if (this._running) return;

    this._running = true;
    this._lastTickTime = performance.now();
    this._cumulativeElapsed = 0;

    if (onFrame) {
      this._frameCallback = onFrame;
    }

    this._timer = setInterval(() => this._tick(), this._targetIntervalMs);
  }

  /**
   * Stop the scheduler. Cancels all active animations.
   */
  stop(): void {
    this._running = false;

    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }

    // Cancel all active animations
    for (const [id] of this._active) {
      this.cancel(id);
    }
    this._active.clear();
    this._frameCallback = null;
  }

  /**
   * Register or replace the frame callback.
   */
  onFrame(callback: () => void): void {
    this._frameCallback = callback;
  }

  // ── Animation Registration ─────────────────────────────────────

  /**
   * Create and start a new animation immediately.
   *
   * @param def - Partial animation definition (id, duration, from, to required).
   * @returns The fully initialized AnimationDef (mutable for early cancellation).
   */
  animate(def: Partial<AnimationDef> & { id: string; duration: number; from: number; to: number }): AnimationDef {
    const anim: AnimationDef = {
      id: def.id,
      duration: def.duration,
      easing: def.easing ?? linear,
      from: def.from,
      to: def.to,
      loop: def.loop ?? false,
      delay: def.delay ?? 0,
      onComplete: def.onComplete ?? null,
      onTick: def.onTick ?? null,
      progress: 0,
      state: 'pending' as AnimationState,
      direction: def.direction ?? 'forward' as AnimationDirection,
    };

    this._active.set(def.id, anim);
    this._totalAnimationsCreated++;

    // Handle delay
    if (anim.delay > 0) {
      anim.state = 'pending';
      setTimeout(() => {
        if (anim.state === 'pending') {
          anim.state = 'running';
        }
      }, anim.delay);
    } else {
      anim.state = 'running';
    }

    return anim;
  }

  /**
   * Cancel an animation by ID.
   * Calls onComplete (with completed=false) if provided.
   *
   * @param id - Animation ID to cancel.
   * @returns Whether an animation was found and cancelled.
   */
  cancel(id: string): boolean {
    const anim = this._active.get(id);
    if (!anim) return false;

    if (anim.state === 'running' || anim.state === 'paused') {
      anim.state = 'cancelled';
      anim.onComplete?.();
      this._totalAnimationsCancelled++;
    }

    this._active.delete(id);
    return true;
  }

  /**
   * Cancel all running animations.
   */
  cancelAll(): void {
    for (const [id] of this._active) {
      this.cancel(id);
    }
  }

  /**
   * Pause a specific animation by ID.
   *
   * @param id - Animation ID to pause.
   * @returns Whether the animation was found and paused.
   */
  pause(id: string): boolean {
    const anim = this._active.get(id);
    if (!anim || anim.state !== 'running') return false;

    anim.state = 'paused';
    return true;
  }

  /**
   * Resume a paused animation by ID.
   *
   * @param id - Animation ID to resume.
   * @returns Whether the animation was found and resumed.
   */
  resume(id: string): boolean {
    const anim = this._active.get(id);
    if (!anim || anim.state !== 'paused') return false;

    anim.state = 'running';
    return true;
  }

  /**
   * Pause all running animations.
   */
  pauseAll(): void {
    for (const [id] of this._active) {
      this.pause(id);
    }
  }

  /**
   * Resume all paused animations.
   */
  resumeAll(): void {
    for (const [id] of this._active) {
      this.resume(id);
    }
  }

  /**
   * Reverse an animation: swap from/to and reset progress.
   *
   * @param id - Animation ID to reverse.
   * @returns Whether the animation was found and reversed.
   */
  reverse(id: string): boolean {
    const anim = this._active.get(id);
    if (!anim) return false;

    const temp = anim.from;
    anim.from = anim.to;
    anim.to = temp;
    anim.progress = 0;
    anim.direction = anim.direction === 'forward' ? 'reverse' : 'forward';

    if (anim.state === 'completed' || anim.state === 'pending') {
      anim.state = 'running';
    }

    return true;
  }

  /**
   * Check if an animation exists and is running.
   */
  isRunning(id: string): boolean {
    const anim = this._active.get(id);
    return anim?.state === 'running';
  }

  /**
   * Check if an animation exists and is paused.
   */
  isPaused(id: string): boolean {
    const anim = this._active.get(id);
    return anim?.state === 'paused';
  }

  // ── Accessors ──────────────────────────────────────────────────

  /** Whether the scheduler is running. */
  get isActive(): boolean {
    return this._running;
  }

  /** Number of currently running animations. */
  get activeCount(): number {
    let count = 0;
    for (const [, anim] of this._active) {
      if (anim.state === 'running') count++;
    }
    return count;
  }

  /** Number of currently paused animations. */
  get pausedCount(): number {
    let count = 0;
    for (const [, anim] of this._active) {
      if (anim.state === 'paused') count++;
    }
    return count;
  }

  /** Total animations tracked. */
  get totalCount(): number {
    return this._active.size;
  }

  /** Get scheduler performance stats. */
  getStats(): SchedulerStats {
    return {
      totalAnimationsCreated: this._totalAnimationsCreated,
      totalAnimationsCompleted: this._totalAnimationsCompleted,
      totalAnimationsCancelled: this._totalAnimationsCancelled,
      activeCount: this.activeCount,
      pausedCount: this.pausedCount,
      framesProcessed: this._framesProcessed,
      avgFrameTimeMs:
        this._framesProcessed > 0
          ? this._totalFrameTimeMs / this._framesProcessed
          : 0,
      isRunning: this._running,
    };
  }

  // ── Internal ───────────────────────────────────────────────────

  /**
   * Main tick function called on each frame interval.
   */
  private _tick(): void {
    if (!this._running) return;

    const now = performance.now();
    const dt = now - this._lastTickTime;
    this._lastTickTime = now;
    this._cumulativeElapsed += dt;

    if (this._active.size === 0) {
      return; // No animations to process
    }

    let anyRunning = false;
    const tickStart = performance.now();

    // Process each animation
    for (const [id, anim] of this._active) {
      if (anim.state !== 'running') continue;

      // Advance progress (delta time / total duration)
      const increment = dt / anim.duration;
      anim.progress = Math.min(1, anim.progress + increment);

      // Compute interpolated value
      const easedProgress = anim.easing(anim.progress);
      const currentValue = anim.from + (anim.to - anim.from) * easedProgress;

      // Fire tick callback
      anim.onTick?.(currentValue, anim.progress);

      // Check completion
      if (anim.progress >= 1) {
        if (anim.loop) {
          anim.progress = 0; // Reset for next loop iteration
          anyRunning = true;
        } else {
          anim.state = 'completed';
          anim.onComplete?.();
          this._totalAnimationsCompleted++;
          this._active.delete(id);
        }
      } else {
        anyRunning = true;
      }
    }

    // Frame callback (only if something was running)
    if (anyRunning || this._active.size > 0) {
      this._framesProcessed++;
      this._totalFrameTimeMs += performance.now() - tickStart;
      this._frameCallback?.();
    }
  }
}
