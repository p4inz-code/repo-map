/**
 * Animation types for the V3 Runtime Animation Scheduler.
 *
 * Defines the contract for all animation types with support for:
 * - Start / Pause / Resume / Cancel / Reverse
 * - Duration, easing, progress tracking
 * - Complete callback
 * - Looping
 * - Interpolation (number-based)
 * - Frame callbacks with interpolated values
 */

import type { EasingFn } from './easing.js';

// ─── Animation States ─────────────────────────────────────────────

/**
 * The lifecycle state of an animation.
 */
export type AnimationState =
  | 'pending'   // Created, not yet started
  | 'running'   // Actively progressing
  | 'paused'    // Temporarily stopped, can be resumed
  | 'completed' // Finished naturally
  | 'cancelled';// Cancelled before completion

// ─── Animation Direction ──────────────────────────────────────────

/**
 * Playback direction of an animation.
 */
export type AnimationDirection = 'forward' | 'reverse';

// ─── Animation Definition ─────────────────────────────────────────

/**
 * A single animation instance.
 *
 * Animations interpolate a numeric value from `from` to `to` over
 * the specified `duration` using the given `easing` function.
 */
export interface AnimationDef {
  /** Unique animation identifier. */
  readonly id: string;

  /** Duration in milliseconds. */
  readonly duration: number;

  /** Easing function (default: linear). */
  readonly easing: EasingFn;

  /** Start value. */
  from: number;

  /** End value. */
  to: number;

  /** Whether this animation should loop indefinitely. */
  readonly loop: boolean;

  /** Delay in milliseconds before the animation starts. */
  readonly delay: number;

  /** Callback when the animation completes (naturally or cancelled). */
  readonly onComplete: (() => void) | null;

  /**
   * Callback on each tick with the current interpolated value and progress.
   * @param value - The current interpolated value (between from and to).
   * @param progress - Normalized progress (0..1).
   */
  readonly onTick: ((value: number, progress: number) => void) | null;

  // ── Runtime state (mutable, updated by scheduler) ─────────────

  /** Current progress (0..1). */
  progress: number;

  /** Current state. */
  state: AnimationState;

  /** Current direction. */
  direction: AnimationDirection;
}

// ─── Animation Scheduler Options ──────────────────────────────────

/**
 * Configuration for the AnimationScheduler.
 */
export interface AnimationSchedulerOptions {
  /** Target frame interval in ms (default: 16 ≈ 60fps). */
  targetFrameIntervalMs?: number;
  /** Whether to start the scheduler immediately upon construction. */
  autoStart?: boolean;
}

// ─── Scheduler Stats ──────────────────────────────────────────────

/**
 * Runtime statistics for the animation scheduler.
 */
export interface SchedulerStats {
  /** Total animations processed since scheduler start. */
  readonly totalAnimationsCreated: number;
  /** Total animations completed. */
  readonly totalAnimationsCompleted: number;
  /** Total animations cancelled. */
  readonly totalAnimationsCancelled: number;
  /** Currently running animations. */
  readonly activeCount: number;
  /** Currently paused animations. */
  readonly pausedCount: number;
  /** Number of frames processed. */
  readonly framesProcessed: number;
  /** Average frame time in ms. */
  readonly avgFrameTimeMs: number;
  /** Whether the scheduler is actively running. */
  readonly isRunning: boolean;
}

// ─── Interpolation Helpers ────────────────────────────────────────

/**
 * Interpolate between two numbers using an easing function.
 * Pure function — deterministic and reusable.
 */
export function interpolate(
  from: number,
  to: number,
  progress: number,
  easing: EasingFn,
): number {
  const eased = easing(progress);
  return from + (to - from) * eased;
}

/**
 * Reverse the direction of an animation definition.
 * Returns a new AnimationDef with from/to swapped and reverse direction.
 */
export function reverseAnimation(def: AnimationDef): AnimationDef {
  return {
    ...def,
    from: def.to,
    to: def.from,
    progress: 0,
    state: 'pending',
    direction: def.direction === 'forward' ? 'reverse' : 'forward',
  };
}
