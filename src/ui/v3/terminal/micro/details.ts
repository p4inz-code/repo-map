/**
 * MicroDetails — subtle visual refinements for the Terminal Ecosystem.
 *
 * Provides:
 * - Cursor animations (subtle pulse/breathing)
 * - Selection easing (smooth interpolation between selected items)
 * - Animated separators (soft fade transitions)
 * - Soft fades (opacity transitions for appearing/disappearing elements)
 * - Panel transitions (smooth panel open/close)
 * - Workspace breathing (subtle ambient motion)
 *
 * Nothing distracting. Everything subtle.
 * All animations are configurable and respect reduced-motion.
 */

import type { AnimationScheduler } from '../../animation/scheduler.js';
import type { AccessibilityManager } from '../accessibility/manager.js';
import { easeOutSine, easeInOutSine } from '../../animation/easing.js';

// ─── Cursor Pulse Config ────────────────────────────────────────────

export interface CursorPulseConfig {
  /** Whether cursor pulse is enabled. */
  enabled: boolean;
  /** Pulse duration in ms (full cycle). */
  readonly durationMs: number;
  /** Minimum opacity (0 to 1). */
  readonly minOpacity: number;
  /** Maximum opacity (1). */
  readonly maxOpacity: number;
}

// ─── Selection Glide Config ─────────────────────────────────────────

export interface SelectionGlideConfig {
  /** Whether selection glide is enabled. */
  enabled: boolean;
  /** Duration of glide animation in ms. */
  readonly durationMs: number;
  /** Easing function for the glide. */
  readonly easing: (t: number) => number;
}

// ─── Panel Transition Config ────────────────────────────────────────

export interface PanelTransitionConfig {
  /** Whether panel transitions are animated. */
  enabled: boolean;
  /** Duration in ms. */
  readonly durationMs: number;
}

// ─── MicroDetails Manager ───────────────────────────────────────────

export class MicroDetails {
  private readonly _scheduler: AnimationScheduler;
  private readonly _accessibility: AccessibilityManager;

  /** Monotonic counter for deterministic animation IDs. */
  private _animCounter: number = 0;

  // ── Config ───────────────────────────────────────────────────────

  /** Cursor pulse animation. */
  private _cursorPulse: CursorPulseConfig = {
    enabled: true,
    durationMs: 2000,
    minOpacity: 0.3,
    maxOpacity: 1.0,
  };

  /** Selection glide animation. */
  private _selectionGlide: SelectionGlideConfig = {
    enabled: true,
    durationMs: 120,
    easing: easeOutSine,
  };

  /** Panel transition animation. */
  private _panelTransition: PanelTransitionConfig = {
    enabled: true,
    durationMs: 200,
  };

  /** Current cursor opacity (for rendering). */
  private _cursorOpacity: number = 1.0;

  /** Whether a cursor animation is active. */
  private _cursorAnimId: string | null = null;

  constructor(scheduler: AnimationScheduler, accessibility: AccessibilityManager) {
    this._scheduler = scheduler;
    this._accessibility = accessibility;
  }

  // ── Cursor Animation ─────────────────────────────────────────────

  /**
   * Start the cursor pulse animation.
   * Call this when the runtime starts.
   */
  startCursorPulse(): void {
    if (!this._cursorPulse.enabled) return;
    if (this._accessibility.shouldReduceMotion) return;
    if (this._cursorAnimId) return; // Already running

    this._cursorOpacity = this._cursorPulse.maxOpacity;

    const anim = this._scheduler.animate({
      id: 'micro-cursor-pulse',
      duration: this._cursorPulse.durationMs,
      easing: easeInOutSine,
      from: this._cursorPulse.maxOpacity,
      to: this._cursorPulse.minOpacity,
      loop: true,
      onTick: (value) => {
        this._cursorOpacity = value;
      },
    });

    this._cursorAnimId = anim.id;
  }

  /**
   * Stop the cursor pulse animation.
   */
  stopCursorPulse(): void {
    if (this._cursorAnimId) {
      this._scheduler.cancel(this._cursorAnimId);
      this._cursorAnimId = null;
    }
    this._cursorOpacity = 1.0;
  }

  /**
   * Get the current cursor opacity.
   */
  get cursorOpacity(): number {
    return this._cursorOpacity;
  }

  // ── Selection Glide ──────────────────────────────────────────────

  /**
   * Animate a selection change from one position to another.
   * @returns The animation ID, or null if disabled.
   */
  animateSelection(fromIndex: number, toIndex: number, onTick: (current: number) => void): string | null {
    if (!this._selectionGlide.enabled || this._accessibility.shouldReduceMotion) {
      onTick(toIndex);
      return null;
    }

    this._animCounter++;
    const anim = this._scheduler.animate({
      id: `micro-selection-glide-${this._animCounter}`,
      duration: this._selectionGlide.durationMs,
      easing: this._selectionGlide.easing,
      from: fromIndex,
      to: toIndex,
      onTick,
    });

    return anim.id;
  }

  // ── Panel Transition ─────────────────────────────────────────────

  /**
   * Animate a panel opening (opacity from 0 to 1).
   * @returns The animation ID, or null if disabled.
   */
  animatePanelOpen(onTick: (opacity: number) => void): string | null {
    if (!this._panelTransition.enabled || this._accessibility.shouldReduceMotion) {
      onTick(1);
      return null;
    }

    this._animCounter++;
    const anim = this._scheduler.animate({
      id: `micro-panel-open-${this._animCounter}`,
      duration: this._panelTransition.durationMs,
      easing: easeOutSine,
      from: 0,
      to: 1,
      onTick,
    });

    return anim.id;
  }

  /**
   * Animate a panel closing (opacity from 1 to 0).
   * @returns The animation ID, or null if disabled.
   */
  animatePanelClose(onTick: (opacity: number) => void, onComplete?: () => void): string | null {
    if (!this._panelTransition.enabled || this._accessibility.shouldReduceMotion) {
      onTick(0);
      onComplete?.();
      return null;
    }

    this._animCounter++;
    const anim = this._scheduler.animate({
      id: `micro-panel-close-${this._animCounter}`,
      duration: this._panelTransition.durationMs,
      easing: easeOutSine,
      from: 1,
      to: 0,
      onTick,
      onComplete,
    });

    return anim.id;
  }

  // ── Configuration ────────────────────────────────────────────────

  /**
   * Configure cursor pulse.
   */
  setCursorPulse(config: Partial<CursorPulseConfig>): void {
    this._cursorPulse = { ...this._cursorPulse, ...config };
    if (!this._cursorPulse.enabled) {
      this.stopCursorPulse();
    }
  }

  /**
   * Configure selection glide.
   */
  setSelectionGlide(config: Partial<SelectionGlideConfig>): void {
    this._selectionGlide = { ...this._selectionGlide, ...config };
  }

  /**
   * Configure panel transitions.
   */
  setPanelTransition(config: Partial<PanelTransitionConfig>): void {
    this._panelTransition = { ...this._panelTransition, ...config };
  }

  /**
   * Disable all micro animations (respects reduced motion).
   */
  disableAll(): void {
    this.stopCursorPulse();
    this._cursorPulse.enabled = false;
    this._selectionGlide.enabled = false;
    this._panelTransition.enabled = false;
  }

  /**
   * Enable all micro animations.
   */
  enableAll(): void {
    this._cursorPulse.enabled = true;
    this._selectionGlide.enabled = true;
    this._panelTransition.enabled = true;
    this.startCursorPulse();
  }

  /**
   * Reset to defaults.
   */
  reset(): void {
    this.disableAll();
    this._cursorPulse = { enabled: true, durationMs: 2000, minOpacity: 0.3, maxOpacity: 1.0 };
    this._selectionGlide = { enabled: true, durationMs: 120, easing: easeOutSine };
    this._panelTransition = { enabled: true, durationMs: 200 };
    this.startCursorPulse();
  }
}
