/**
 * TransitionManager — manages screen-to-screen transitions.
 *
 * Provides a configurable API for page transitions with:
 * - Fade, Slide, Push, Reveal, Crossfade transition types
 * - Configurable duration, easing, direction
 * - Queued transitions (sequential)
 * - Transition lifecycle callbacks (onStart, onComplete, onCancel)
 * - Integration with the AnimationScheduler for frame timing
 *
 * # Architecture
 * ```
 * TransitionManager
 *   ├── Active Transition (current running transition)
 *   ├── Transition Queue (pending transitions)
 *   ├── Lifecycle Callbacks (onStart, onComplete, onCancel)
 *   └── Default Configuration (per-transition-type defaults)
 * ```
 *
 * # State Machine
 * ```
 * IDLE → navigate() → PREPARING → (animation tick) → RUNNING → COMPLETED → IDLE
 *                                                      ↓
 *                                                   CANCELLED → IDLE
 * ```
 *
 * # No Transition Implementation
 * This manager provides the architecture and state machine for transitions.
 * Actual visual rendering of transitions (fade, slide, etc.) will be
 * implemented in a future phase. The manager tracks progress and phase
 * so that renderers can inspect the active transition via FrameContext.
 */

import type { EasingFn } from '../animation/easing.js';
import { easeOutQuad } from '../animation/easing.js';
import type {
  TransitionType,
  TransitionDirection,
  TransitionPhase,
  TransitionConfig,
  ActiveTransition,
  TransitionManagerState,
} from './types.js';
import { DEFAULT_TRANSITION_CONFIG } from './types.js';

// ─── TransitionManager ────────────────────────────────────────────

export class TransitionManager {
  /** Currently active transition (null if idle). */
  private _current: ActiveTransition | null = null;

  /** Queue of pending transitions. */
  private readonly _queue: Array<{
    toScreen: string;
    config: TransitionConfig;
  }> = [];

  /** Callbacks. */
  private _onStart: ((transition: ActiveTransition) => void) | null = null;
  private _onComplete: ((transition: ActiveTransition) => void) | null = null;
  private _onCancel: ((transition: ActiveTransition) => void) | null = null;

  /** Counter for generating unique transition IDs. */
  private _idCounter: number = 0;

  /** Total transitions completed. */
  private _totalCompleted: number = 0;

  /** Previous screen ID (the one being navigated away from). */
  private _previousScreen: string | null = null;

  // ── Transition Lifecycle ─────────────────────────────────────

  /**
   * Start a transition between screens.
   *
   * @param toScreen - The screen ID to transition to.
   * @param config   - Optional transition configuration (defaults apply).
   * @returns The active transition, or null if a transition is already in progress.
   */
  startTransition(
    toScreen: string,
    config?: Partial<TransitionConfig>,
  ): ActiveTransition | null {
    // If a transition is already running, queue this one
    if (this._current && this._current.phase !== 'completed') {
      this._queue.push({
        toScreen,
        config: this._resolveConfig(config),
      });
      return null;
    }

    return this._beginTransition(toScreen, this._resolveConfig(config));
  }

  /**
   * Cancel the current transition.
   */
  cancelTransition(): void {
    if (!this._current) return;

    this._current.cancelled = true;
    this._current.phase = 'completed';
    this._onCancel?.(this._current);
    this._current = null;

    // Process queue
    this._processQueue();
  }

  /**
   * Update the current transition's progress.
   * Should be called each frame by the RuntimeManager.
   *
   * @param dt - Delta time in milliseconds since the last frame.
   * @returns The updated active transition, or null if no transition is running.
   */
  update(dt: number): ActiveTransition | null {
    if (!this._current || this._current.phase === 'completed') return null;

    const transition = this._current;

    // Advance progress
    transition.progress += dt / transition.config.duration;

    if (transition.progress >= 1) {
      transition.progress = 1;
      transition.phase = 'completed';
      this._totalCompleted++;
      this._onComplete?.(transition);
      this._current = null;

      // Process next in queue
      this._processQueue();
    }

    return transition;
  }

  // ── Callbacks ─────────────────────────────────────────────────

  /**
   * Register a callback fired when a transition starts.
   */
  onStart(callback: (transition: ActiveTransition) => void): void {
    this._onStart = callback;
  }

  /**
   * Register a callback fired when a transition completes.
   */
  onComplete(callback: (transition: ActiveTransition) => void): void {
    this._onComplete = callback;
  }

  /**
   * Register a callback fired when a transition is cancelled.
   */
  onCancel(callback: (transition: ActiveTransition) => void): void {
    this._onCancel = callback;
  }

  // ── Accessors ─────────────────────────────────────────────────

  /**
   * Get the current active transition (null if idle).
   */
  get current(): ActiveTransition | null {
    return this._current;
  }

  /**
   * Whether a transition is currently running.
   */
  get isActive(): boolean {
    return this._current !== null &&
      this._current.phase !== 'completed' &&
      !this._current.cancelled;
  }

  /**
   * Get the transition manager state snapshot.
   */
  getState(): TransitionManagerState {
    return {
      active: this.isActive,
      current: this._current,
      queue: this._queue.map((q) => q.config),
      totalCompleted: this._totalCompleted,
    };
  }

  /**
   * Get the previous screen ID (the one being transitioned from).
   */
  get previousScreen(): string | null {
    return this._previousScreen;
  }

  /**
   * Set the previous screen ID.
   */
  set previousScreen(id: string | null) {
    this._previousScreen = id;
  }

  /**
   * Clear all pending transitions.
   */
  clearQueue(): void {
    this._queue.length = 0;
  }

  /**
   * Reset the transition manager to idle state.
   */
  reset(): void {
    this._current = null;
    this._queue.length = 0;
    this._previousScreen = null;
  }

  // ── Internal ──────────────────────────────────────────────────

  /**
   * Begin a transition (internal).
   */
  private _beginTransition(
    toScreen: string,
    config: TransitionConfig,
  ): ActiveTransition {
    const transition: ActiveTransition = {
      id: `transition-${++this._idCounter}`,
      config,
      phase: 'preparing',
      progress: 0,
      fromScreen: this._previousScreen,
      toScreen,
      startedAt: performance.now(),
      cancelled: false,
    };

    // Short phase for preparation
    transition.phase = 'entering';

    this._current = transition;
    this._onStart?.(transition);

    return transition;
  }

  /**
   * Process the next transition in the queue.
   */
  private _processQueue(): void {
    if (this._queue.length === 0) return;

    const next = this._queue.shift()!;
    this._previousScreen = next.toScreen;
    this._beginTransition(next.toScreen, next.config);
  }

  /**
   * Resolve partial config with defaults.
   */
  private _resolveConfig(partial?: Partial<TransitionConfig>): TransitionConfig {
    return {
      type: partial?.type ?? DEFAULT_TRANSITION_CONFIG.type,
      duration: partial?.duration ?? DEFAULT_TRANSITION_CONFIG.duration,
      easing: partial?.easing ?? DEFAULT_TRANSITION_CONFIG.easing,
      direction: partial?.direction ?? DEFAULT_TRANSITION_CONFIG.direction,
      instant: partial?.instant ?? DEFAULT_TRANSITION_CONFIG.instant,
      delay: partial?.delay ?? DEFAULT_TRANSITION_CONFIG.delay,
    };
  }
}
