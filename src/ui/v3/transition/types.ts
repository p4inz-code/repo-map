/**
 * Transition types for the V3 Transition Manager.
 *
 * Defines the contract for page transitions between screens.
 * Transitions are configurable by type, duration, easing, and direction.
 *
 * # Transition Types
 * - Fade: opacity crossfade between screens.
 * - Slide: screen slides in from a direction.
 * - Push: new screen pushes the old one out.
 * - Reveal: new screen reveals under the old one.
 * - Crossfade: both screens fade simultaneously.
 *
 * # State Machine
 * ```
 * IDLE → PREPARING → RUNNING → COMPLETED → IDLE
 *                        ↓
 *                     CANCELLED → IDLE
 * ```
 *
 * No transition implementation yet — only architecture.
 */

import type { EasingFn } from '../animation/easing.js';

// ─── Transition Types ─────────────────────────────────────────────

/**
 * Supported transition types.
 */
export type TransitionType = 'fade' | 'slide' | 'push' | 'reveal' | 'crossfade';

/**
 * Direction for slide/push/reveal transitions.
 */
export type TransitionDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Phase of a transition's lifecycle.
 */
export type TransitionPhase =
  | 'idle'       // No transition running
  | 'preparing'  // Transition is being set up (screens notified)
  | 'entering'   // New screen is entering
  | 'exiting'    // Old screen is exiting
  | 'completed'; // Transition has finished

// ─── Transition Definition ────────────────────────────────────────

/**
 * Configuration for a screen transition.
 *
 * All properties are optional with sensible defaults.
 * This allows screens to define transitions without specifying every detail.
 */
export interface TransitionConfig {
  /** Transition type (default: 'fade'). */
  type: TransitionType;
  /** Duration in milliseconds (default: 200). */
  duration: number;
  /** Easing function (default: ease-out). */
  easing: EasingFn;
  /** Direction for slide/push/reveal (default: 'right'). */
  direction: TransitionDirection;
  /** Whether the transition should be instant (no animation). */
  instant: boolean;
  /** Delay before the transition starts (ms). */
  delay: number;
}

// ─── Active Transition ────────────────────────────────────────────

/**
 * A currently running transition.
 * Tracks progress and provides methods for interaction.
 */
export interface ActiveTransition {
  /** Unique transition ID. */
  readonly id: string;
  /** Transition configuration. */
  readonly config: TransitionConfig;
  /** Current phase. */
  phase: TransitionPhase;
  /** Progress (0..1). */
  progress: number;
  /** Source screen ID (the one being navigated away from). */
  readonly fromScreen: string | null;
  /** Destination screen ID (the one being navigated to). */
  readonly toScreen: string;
  /** Timestamp when the transition started (performance.now()). */
  readonly startedAt: number;
  /** Whether this transition has been cancelled. */
  cancelled: boolean;
}

// ─── Transition Manager State ─────────────────────────────────────

/**
 * Snapshot of the TransitionManager's state.
 */
export interface TransitionManagerState {
  /** Whether a transition is currently running. */
  readonly active: boolean;
  /** Current active transition (null if idle). */
  readonly current: ActiveTransition | null;
  /** Queue of pending transitions. */
  readonly queue: TransitionConfig[];
  /** Total transitions completed since creation. */
  readonly totalCompleted: number;
}

// ─── Default Transition ───────────────────────────────────────────

/**
 * Default transition configuration.
 */
export const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  type: 'fade',
  duration: 200,
  easing: (t: number) => t * (2 - t), // easeOutQuad
  direction: 'right',
  instant: false,
  delay: 0,
};
