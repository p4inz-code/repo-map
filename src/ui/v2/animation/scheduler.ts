/**
 * AnimationScheduler — the frame-based animation scheduler for the v2 engine.
 *
 * Manages concurrent animations, easing, queued sequences, and frame timing.
 * Designed to be the single animation driver, replacing the v1 AnimationManager.
 *
 * # Architecture
 * ```
 * AnimationScheduler
 *   ├── Active Animations (currently running)
 *   ├── Queue (pending animations, run after current)
 *   ├── Frame Loop (setInterval-based, ~60fps)
 *   └── Easing Functions (pre-defined + custom)
 * ```
 *
 * # Scheduling Model
 * - Animations can run concurrently (same frame, different values).
 * - Queued animations start after previous ones complete.
 * - Each animation has a configurable easing function.
 * - Frame callback delivers the current animation state.
 *
 * # Frame Timing
 * - Uses setInterval at ~60fps (16ms interval).
 * - Each tick: advance all running animations, check queue, deliver frame.
 * - Frame coalescing: if no animation is running, skip the callback.
 *
 * # Rules
 * - Do NOT animate yet (Phase 1 is infrastructure only).
 * - The scheduler IS the infrastructure that future animations use.
 * - Animation definitions are data — they do not call render() directly.
 * - The scheduler calls onTick callbacks which trigger dirty state.
 *
 * @example
 * ```ts
 * const scheduler = new AnimationScheduler();
 * scheduler.start((frame) => {
 *   renderer.requestFullRedraw();
 * });
 *
 * scheduler.animate({
 *   id: 'fade-overlay',
 *   type: 'opacity',
 *   duration: 300,
 *   from: 0, to: 1,
 *   easing: Easings.easeOut,
 *   onTick: (value) => overlay.setOpacity(value),
 * });
 * ```
 */

import type { AnimationDef, QueuedAnimation, AnimationState, SchedulerStats } from './types.js';
import { Easings } from '../types.js';

// ─── Constants ─────────────────────────────────────────────────────

/** Target frame interval (16ms ≈ 60fps). */
const FRAME_INTERVAL_MS = 16;

// ─── AnimationScheduler ───────────────────────────────────────────

export class AnimationScheduler {
  /** Currently running animations by ID. */
  private _active: Map<string, AnimationDef> = new Map();

  /** Queued animations (FIFO). */
  private _queue: QueuedAnimation[] = [];

  /** Timer handle. */
  private _timer: ReturnType<typeof setInterval> | null = null;

  /** Whether the scheduler is running. */
  private _running: boolean = false;

  /** Callback for frame delivery. */
  private _frameCallback: (() => void) | null = null;

  /** Performance tracking. */
  private _frameCount: number = 0;
  private _totalFrameTime: number = 0;
  private _lastTickTime: number = 0;

  // ── Lifecycle ──────────────────────────────────────────────────

  /**
   * Start the animation scheduler.
   *
   * @param onFrame - Callback fired on each frame when animations are running.
   */
  start(onFrame?: () => void): void {
    if (this._running) return;

    this._running = true;
    this._lastTickTime = performance.now();

    if (onFrame) {
      this._frameCallback = onFrame;
    }

    this._timer = setInterval(() => this._tick(), FRAME_INTERVAL_MS);
  }

  /**
   * Stop the scheduler. Cancels all active and queued animations.
   */
  stop(): void {
    this._running = false;

    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }

    // Cancel all animations
    for (const [, anim] of this._active) {
      this._setState(anim, 'cancelled');
    }
    this._active.clear();
    this._queue = [];
    this._frameCallback = null;
  }

  /**
   * Register a frame callback.
   */
  onFrame(callback: () => void): void {
    this._frameCallback = callback;
  }

  // ── Animation Registration ─────────────────────────────────────

  /**
   * Start a new animation immediately.
   *
   * @param def - Animation definition.
   * @returns The animation instance (mutable for early cancellation).
   */
  animate(def: AnimationDef): AnimationDef {
    const anim: AnimationDef = {
      ...def,
      progress: 0,
      state: 'pending',
      easing: def.easing ?? Easings.linear,
    };

    this._active.set(def.id, anim);

    // Apply delay if specified
    if (def.delay && def.delay > 0) {
      anim.state = 'pending';
      setTimeout(() => {
        if (anim.state === 'pending') {
          anim.state = 'running';
        }
      }, def.delay);
    } else {
      anim.state = 'running';
    }

    return anim;
  }

  /**
   * Queue an animation to run after the current one completes.
   *
   * @param queued - The queued animation definition.
   */
  queue(queued: QueuedAnimation): void {
    this._queue.push(queued);
  }

  /**
   * Cancel an animation by ID.
   *
   * @param id - Animation ID to cancel.
   */
  cancel(id: string): void {
    const anim = this._active.get(id);
    if (anim) {
      this._setState(anim, 'cancelled');
      this._active.delete(id);
    }
  }

  /**
   * Cancel all animations.
   */
  cancelAll(): void {
    for (const [, anim] of this._active) {
      this._setState(anim, 'cancelled');
    }
    this._active.clear();
    this._queue = [];
  }

  // ── Accessors ──────────────────────────────────────────────────

  /** Whether the scheduler is currently running. */
  get running(): boolean {
    return this._running;
  }

  /** Number of currently active (running) animations. */
  get activeCount(): number {
    let count = 0;
    for (const [, anim] of this._active) {
      if (anim.state === 'running') count++;
    }
    return count;
  }

  /** Number of queued animations. */
  get queuedCount(): number {
    return this._queue.length;
  }

  /** Get scheduler performance stats. */
  getStats(): SchedulerStats {
    return {
      totalAnimations: this._frameCount,
      running: this.activeCount,
      queued: this.queuedCount,
      frames: this._frameCount,
      avgFrameTime: this._frameCount > 0 ? this._totalFrameTime / this._frameCount : 0,
      active: this._running,
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

    if (this._active.size === 0 && this._queue.length === 0) {
      return; // No work to do
    }

    const tickStart = performance.now();

    // Advance all running animations
    let anyActive = false;
    for (const [_id, anim] of this._active) {
      // Skip non-running animations (pending/delayed ones too)
      if (anim.state !== 'running') continue;

      // Advance progress
      const increment = dt / anim.duration;
      anim.progress = Math.min(1, anim.progress + increment);

      // Interpolate value
      const easedProgress = anim.easing!(anim.progress);
      const currentValue = anim.from + (anim.to - anim.from) * easedProgress;

      // Fire tick callback
      anim.onTick?.(currentValue, anim.progress);

      // Check completion
      if (anim.progress >= 1) {
        if (anim.loop) {
          anim.progress = 0;
        } else {
          this._setState(anim, 'completed');
          anim.onComplete?.();
          this._active.delete(_id);
        }
      } else {
        anyActive = true;
      }
    }

    // Process queue: start next animation if nothing is running
    if (!anyActive && this._queue.length > 0) {
      const next = this._queue.shift()!;

      if (next.start === 'with') {
        // Start immediately
        this.animate(next.animation);
      } else if (next.start === 'after') {
        this.animate(next.animation);
      } else if (typeof next.start === 'object' && 'delay' in next.start) {
        this.animate({
          ...next.animation,
          delay: next.start.delay,
        });
      }
    }

    // Frame callback
    if (anyActive || this._active.size > 0) {
      this._frameCount++;
      this._totalFrameTime += performance.now() - tickStart;
      this._frameCallback?.();
    }
  }

  /** Set animation state and invalidate if changed. */
  private _setState(anim: AnimationDef, state: AnimationState): void {
    if (anim.state !== state) {
      anim.state = state;
    }
  }
}
