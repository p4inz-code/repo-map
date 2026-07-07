/**
 * Animation types for the v2 animation framework.
 *
 * Defines the contract for all animation types: transitions,
 * progress-based animations, queued sequences, and frame scheduling.
 *
 * # Animation Model
 * ```
 * Animation
 *   ├── id: unique identifier
 *   ├── duration: in ms
 *   ├── easing: easing function
 *   ├── from / to: start/end values
 *   ├── tick(dt: ms) → current value (0..1 progress)
 *   └── onComplete: callback when animation finishes
 * ```
 *
 * # Transition Types
 * - Fade: opacity from 0 to 1 (or reverse)
 * - Slide: position offset from -N to 0 (or reverse)
 * - Expand: size from 0 to target (or reverse)
 * - Collapse: size from target to 0 (reverse of expand)
 * - Progress: value interpolation (e.g., 0 to 100)
 * - Number: numeric value interpolation
 *
 * # Scheduling
 * - Animations are registered with the AnimationScheduler.
 * - The scheduler runs at the frame rate (requestAnimationFrame equivalent).
 * - Multiple animations can run concurrently.
 * - Animations can be queued to run in sequence.
 */

import type { EasingFn } from '../types.js';

// ─── Animation States ─────────────────────────────────────────────

/** The state of an animation. */
export type AnimationState = 'pending' | 'running' | 'paused' | 'completed' | 'cancelled';

// ─── Animation Value Types ────────────────────────────────────────

/** The type of value being animated. */
export type AnimationValueType = 'opacity' | 'offset' | 'size' | 'number' | 'color';

// ─── Animation Definition ─────────────────────────────────────────

/**
 * A single animation instance.
 */
export interface AnimationDef {
  /** Unique animation identifier. */
  id: string;

  /** Type of value being animated. */
  type: AnimationValueType;

  /** Duration in milliseconds. */
  duration: number;

  /** Easing function (default: linear). */
  easing?: EasingFn;

  /** Start value (0..1 progress, or specific range). */
  from: number;

  /** End value. */
  to: number;

  /** Current progress (0..1). */
  progress: number;

  /** Current state. */
  state: AnimationState;

  /** Whether this animation should loop. */
  loop?: boolean;

  /** Delay before starting (ms). */
  delay?: number;

  /** Callback when animation completes. */
  onComplete?: () => void;

  /** Callback on each tick with current interpolated value. */
  onTick?: (value: number, progress: number) => void;
}

// ─── Transition ───────────────────────────────────────────────────

/**
 * A screen or component transition.
 */
export interface TransitionDef {
  /** Transition type. */
  type: 'fade' | 'slide' | 'expand' | 'collapse';

  /** Direction for slide transitions. */
  direction?: 'up' | 'down' | 'left' | 'right';

  /** Duration in ms. */
  duration: number;

  /** Easing function. */
  easing?: EasingFn;

  /** Delay before starting. */
  delay?: number;
}

// ─── Animation Queue ──────────────────────────────────────────────

/**
 * A queued animation that runs after previous animations complete.
 */
export interface QueuedAnimation {
  /** The animation to run. */
  animation: AnimationDef;

  /**
   * When to start this animation relative to the previous one.
   * - 'after': start after previous completes
   * - 'with': start at the same time as previous
   * - 'delay(N)': start N ms after previous
   */
  start: 'after' | 'with' | { delay: number };
}

// ─── Scheduler Stats ──────────────────────────────────────────────

/** Runtime statistics for the animation scheduler. */
export interface SchedulerStats {
  /** Total animations processed. */
  totalAnimations: number;
  /** Currently running animations. */
  running: number;
  /** Currently queued (pending) animations. */
  queued: number;
  /** Number of frames processed. */
  frames: number;
  /** Average frame time in ms. */
  avgFrameTime: number;
  /** Whether the scheduler is active. */
  active: boolean;
}
