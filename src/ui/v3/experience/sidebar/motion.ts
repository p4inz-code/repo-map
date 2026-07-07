/**
 * SidebarMotion — animated sidebar interactions for the V3 Experience Engine.
 *
 * Provides:
 * - Gliding selection bar (eased position transition)
 * - Animated counters (values count up/down)
 * - Animated expand/collapse
 * - Smooth group resizing
 *
 * All animations are driven by the AnimationScheduler — no setTimeout.
 * All durations are configurable and deterministic.
 */

import type { AnimationScheduler } from '../../animation/scheduler.js';
import type { SidebarMotionState, SidebarMotionConfig, AnimatedCounter } from './types.js';
import { easeOutCubic } from '../../animation/easing.js';

// ─── SidebarMotion ────────────────────────────────────────────────

export class SidebarMotion {
  private readonly _scheduler: AnimationScheduler;
  private readonly _glideDurationMs: number;
  private readonly _expandDurationMs: number;
  private readonly _counterDurationMs: number;

  /** Current animated position for the selection bar. */
  private _animatedPosition: number = 0;
  private _targetPosition: number = 0;
  private _glideProgress: number = 1;

  /** Expand/collapse progress. */
  private _expandProgress: number = 1;

  /** Active counters. */
  private readonly _counters: Map<string, AnimatedCounter> = new Map();

  constructor(scheduler: AnimationScheduler, config?: SidebarMotionConfig) {
    this._scheduler = scheduler;
    this._glideDurationMs = config?.glideDurationMs ?? 200;
    this._expandDurationMs = config?.expandDurationMs ?? 300;
    this._counterDurationMs = config?.counterDurationMs ?? 400;
  }

  // ── Selection Glide ───────────────────────────────────────────

  /**
   * Animate the selection bar to a new position.
   *
   * @param targetY - The Y position (in item rows) to glide to.
   */
  glideSelection(targetY: number): void {
    const fromY = this._animatedPosition;
    this._targetPosition = targetY;
    this._glideProgress = 0;

    this._scheduler.animate({
      id: 'sidebar-glide',
      duration: this._glideDurationMs,
      easing: easeOutCubic,
      from: 0,
      to: 1,
      onTick: (value) => {
        this._glideProgress = value;
        this._animatedPosition = fromY + (targetY - fromY) * value;
      },
    });
  }

  // ── Expand / Collapse ─────────────────────────────────────────

  /**
   * Animate sidebar expanding from collapsed state.
   */
  expand(): void {
    this._scheduler.animate({
      id: 'sidebar-expand',
      duration: this._expandDurationMs,
      easing: easeOutCubic,
      from: this._expandProgress,
      to: 1,
      onTick: (value) => {
        this._expandProgress = value;
      },
    });
  }

  /**
   * Animate sidebar collapsing to icon-only state.
   */
  collapse(): void {
    this._scheduler.animate({
      id: 'sidebar-collapse',
      duration: this._expandDurationMs,
      easing: easeOutCubic,
      from: this._expandProgress,
      to: 0,
      onTick: (value) => {
        this._expandProgress = value;
      },
    });
  }

  /**
   * Toggle expand/collapse with animation.
   *
   * @returns The new state (true = expanded).
   */
  toggleExpand(): boolean {
    if (this._expandProgress > 0.5) {
      this.collapse();
      return false;
    } else {
      this.expand();
      return true;
    }
  }

  // ── Animated Counters ─────────────────────────────────────────

  /**
   * Animate a counter from its current value to a target value.
   *
   * @param id     - Counter identifier.
   * @param target - Target value to count to.
   */
  animateCounter(id: string, target: number): void {
    const existing = this._counters.get(id);
    const fromValue = existing?.currentValue ?? 0;

    const counter: AnimatedCounter = {
      id,
      currentValue: fromValue,
      targetValue: target,
      counting: true,
    };

    this._counters.set(id, counter);

    this._scheduler.animate({
      id: `counter-${id}`,
      duration: this._counterDurationMs,
      easing: easeOutCubic,
      from: fromValue,
      to: target,
      onTick: (value) => {
        counter.currentValue = Math.round(value);
      },
      onComplete: () => {
        counter.currentValue = target;
        counter.counting = false;
      },
    });
  }

  // ── Accessors ─────────────────────────────────────────────────

  /** Get the current sidebar motion state. */
  getState(): SidebarMotionState {
    return {
      animating: this._glideProgress < 1,
      animatedPosition: this._animatedPosition,
      targetPosition: this._targetPosition,
      glideProgress: this._glideProgress,
      expandProgress: this._expandProgress,
    };
  }

  /** Get the current animated position of the selection bar. */
  get animatedPosition(): number {
    return this._animatedPosition;
  }

  /** Get the current expand/collapse progress (0=icon-only, 1=full). */
  get expandProgress(): number {
    return this._expandProgress;
  }

  /** Get the current value of an animated counter. */
  getCounterValue(id: string): number {
    return this._counters.get(id)?.currentValue ?? 0;
  }

  /** Whether a counter is still counting. */
  isCounterCounting(id: string): boolean {
    return this._counters.get(id)?.counting ?? false;
  }

  /** Whether the selection is currently gliding. */
  get isGliding(): boolean {
    return this._glideProgress < 1;
  }

  /** Reset all motion state. */
  reset(): void {
    this._animatedPosition = 0;
    this._targetPosition = 0;
    this._glideProgress = 1;
    this._expandProgress = 1;
    this._counters.clear();
  }
}
