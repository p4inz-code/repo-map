/**
 * ScrollingEngine — smooth scrolling with momentum for the V3 Experience Engine.
 *
 * Features:
 * - Smooth interpolation (eased scroll)
 * - Momentum (scroll continues after release)
 * - Large jumps animate
 * - Scrollbar fades in/out
 * - Edge shadow at top/bottom boundaries
 *
 * All animations are driven by the AnimationScheduler.
 * Everything deterministic — no random values.
 */

import type { AnimationScheduler } from '../../animation/scheduler.js';
import type { ScrollConfig, ScrollState as ScrollStateType } from './types.js';
import { easeOutCubic } from '../../animation/easing.js';

// ─── ScrollingEngine ──────────────────────────────────────────────

export class ScrollingEngine {
  private readonly _scheduler: AnimationScheduler;
  private readonly _config: Required<ScrollConfig>;

  /** Current state. */
  private _offset: number = 0;
  private _targetOffset: number = 0;
  private _totalHeight: number = 0;
  private _viewportHeight: number = 0;

  /** Momentum state. */
  private _velocity: number = 0;
  private _momentumAnimating: boolean = false;

  /** Smooth scroll state. */
  private _smoothAnimating: boolean = false;

  /** Scrollbar state. */
  private _scrollbarOpacity: number = 0;
  private _scrollbarVisible: boolean = false;
  private _scrollbarFadeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Edge shadow state. */
  private _topShadow: boolean = false;
  private _bottomShadow: boolean = false;

  constructor(scheduler: AnimationScheduler, config?: ScrollConfig) {
    this._scheduler = scheduler;
    this._config = {
      smoothDurationMs: config?.smoothDurationMs ?? 200,
      momentumDurationMs: config?.momentumDurationMs ?? 400,
      smoothEasing: config?.smoothEasing ?? easeOutCubic,
      scrollStep: config?.scrollStep ?? 1,
      showScrollbar: config?.showScrollbar ?? true,
      scrollbarFadeDelayMs: config?.scrollbarFadeDelayMs ?? 1000,
      showEdgeShadow: config?.showEdgeShadow ?? true,
      edgeShadowHeight: config?.edgeShadowHeight ?? 2,
    };
  }

  // ── Dimensions ─────────────────────────────────────────────────

  /**
   * Set the scrollable content dimensions.
   *
   * @param totalHeight    - Total content height in lines.
   * @param viewportHeight - Visible viewport height in lines.
   */
  setDimensions(totalHeight: number, viewportHeight: number): void {
    this._totalHeight = totalHeight;
    this._viewportHeight = viewportHeight;

    // Clamp offset to new bounds
    this._clampOffset();
  }

  // ── Scrolling ─────────────────────────────────────────────────

  /**
   * Scroll by a delta (arrow keys, mouse wheel).
   * If the delta is small (< 3 lines), animate smoothly.
   * If the delta is large, animate with a jump.
   */
  scrollBy(delta: number): void {
    if (!this._canScroll()) return;

    this._showScrollbar();

    const newTarget = this._clamp(this._targetOffset + delta);

    // Large jumps animate with a longer duration
    const isLargeJump = Math.abs(delta) >= 5;
    const duration = isLargeJump
      ? this._config.smoothDurationMs * 1.5
      : this._config.smoothDurationMs;

    this._animateTo(newTarget, duration);
  }

  /**
   * Scroll to an absolute position.
   */
  scrollTo(offset: number): void {
    if (!this._canScroll()) return;

    this._showScrollbar();

    const clamped = this._clamp(offset);
    const dist = Math.abs(clamped - this._offset);
    const duration = Math.min(
      this._config.smoothDurationMs * 2,
      this._config.smoothDurationMs + dist * 10,
    );

    this._animateTo(clamped, duration);
  }

  /**
   * Scroll to the top.
   */
  scrollToTop(): void {
    this.scrollTo(0);
  }

  /**
   * Scroll to the bottom.
   */
  scrollToBottom(): void {
    this.scrollTo(Math.max(0, this._totalHeight - this._viewportHeight));
  }

  /**
   * Page up (viewport height).
   */
  pageUp(): void {
    this.scrollBy(-this._viewportHeight);
  }

  /**
   * Page down (viewport height).
   */
  pageDown(): void {
    this.scrollBy(this._viewportHeight);
  }

  // ── Momentum ─────────────────────────────────────────────────

  /**
   * Start momentum scrolling (called when the user releases a scroll).
   *
   * @param velocity - Lines per ms of velocity.
   */
  startMomentum(velocity: number): void {
    if (!this._canScroll() || Math.abs(velocity) < 0.5) return;

    this._velocity = velocity;
    this._momentumAnimating = true;

    this._scheduler.animate({
      id: 'scroll-momentum',
      duration: this._config.momentumDurationMs,
      easing: (t: number) => 1 - Math.pow(1 - t, 3), // Ease out cubic for momentum
      from: 0,
      to: 1,
      onTick: (value) => {
        // Decelerate
        const decayedVelocity = this._velocity * (1 - value);
        const delta = decayedVelocity * 16; // Approximate frame delta
        this._offset = this._clamp(this._offset + delta);
        this._targetOffset = this._offset;
        this._updateShadows();
      },
      onComplete: () => {
        this._momentumAnimating = false;
        this._velocity = 0;
        this._scheduleScrollbarFade();
      },
    });
  }

  // ── Scrollbar ─────────────────────────────────────────────────

  /**
   * Get the scrollbar position and size for rendering.
   */
  getScrollbarMetrics(): { position: number; size: number } | null {
    if (!this._config.showScrollbar || this._totalHeight <= this._viewportHeight) {
      return null;
    }

    const trackSize = this._viewportHeight;
    const contentRatio = this._viewportHeight / this._totalHeight;
    const thumbSize = Math.max(1, Math.round(trackSize * contentRatio));
    const maxOffset = Math.max(1, this._totalHeight - this._viewportHeight);
    const position = Math.round((this._offset / maxOffset) * (trackSize - thumbSize));

    return { position, size: thumbSize };
  }

  // ── State ─────────────────────────────────────────────────────

  /**
   * Get the current scroll state.
   */
  getState(): ScrollStateType {
    const maxOffset = Math.max(0, this._totalHeight - this._viewportHeight);

    return {
      offset: this._offset,
      targetOffset: this._targetOffset,
      totalHeight: this._totalHeight,
      viewportHeight: this._viewportHeight,
      animating: this._smoothAnimating || this._momentumAnimating,
      momentum: this._momentumAnimating,
      velocity: this._velocity,
      scrollbarOpacity: this._scrollbarOpacity,
      scrollbarVisible: this._scrollbarVisible,
      showTopShadow: this._config.showEdgeShadow && this._offset > 0 && this._topShadow,
      showBottomShadow: this._config.showEdgeShadow && this._offset < maxOffset && this._bottomShadow,
      atTop: this._offset <= 0,
      atBottom: this._offset >= maxOffset,
      scrollProgress: maxOffset > 0 ? this._offset / maxOffset : 0,
    };
  }

  /** Whether the content is scrollable. */
  get isScrollable(): boolean {
    return this._totalHeight > this._viewportHeight;
  }

  /** Current scroll offset. */
  get offset(): number {
    return this._offset;
  }

  /** Current target offset. */
  get targetOffset(): number {
    return this._targetOffset;
  }

  /** Reset all scroll state. */
  reset(): void {
    this._offset = 0;
    this._targetOffset = 0;
    this._velocity = 0;
    this._momentumAnimating = false;
    this._smoothAnimating = false;
    this._scrollbarOpacity = 0;
    this._scrollbarVisible = false;
    this._topShadow = false;
    this._bottomShadow = false;

    if (this._scrollbarFadeTimer) {
      clearTimeout(this._scrollbarFadeTimer);
      this._scrollbarFadeTimer = null;
    }
  }

  // ── Internal ──────────────────────────────────────────────────

  private _canScroll(): boolean {
    return this._totalHeight > this._viewportHeight;
  }

  private _clamp(offset: number): number {
    return Math.max(0, Math.min(offset, Math.max(0, this._totalHeight - this._viewportHeight)));
  }

  private _clampOffset(): void {
    this._offset = this._clamp(this._offset);
    this._targetOffset = this._clamp(this._targetOffset);
  }

  private _animateTo(target: number, duration: number): void {
    this._targetOffset = target;
    const fromOffset = this._offset;

    // Cancel previous smooth scroll
    this._scheduler.cancel('scroll-smooth');

    this._smoothAnimating = true;

    this._scheduler.animate({
      id: 'scroll-smooth',
      duration,
      easing: this._config.smoothEasing,
      from: 0,
      to: 1,
      onTick: (value) => {
        this._offset = fromOffset + (target - fromOffset) * value;
        this._updateShadows();
      },
      onComplete: () => {
        this._offset = target;
        this._smoothAnimating = false;
        this._scheduleScrollbarFade();
      },
    });
  }

  private _showScrollbar(): void {
    this._scrollbarVisible = true;
    this._scrollbarOpacity = 1;

    if (this._scrollbarFadeTimer) {
      clearTimeout(this._scrollbarFadeTimer);
      this._scrollbarFadeTimer = null;
    }
  }

  private _scheduleScrollbarFade(): void {
    if (this._scrollbarFadeTimer) {
      clearTimeout(this._scrollbarFadeTimer);
    }

    this._scrollbarFadeTimer = setTimeout(() => {
      this._scrollbarFadeTimer = null;
      this._scheduler.animate({
        id: 'scrollbar-fade',
        duration: 300,
        easing: easeOutCubic,
        from: 1,
        to: 0,
        onTick: (value) => {
          this._scrollbarOpacity = value;
        },
        onComplete: () => {
          this._scrollbarOpacity = 0;
          this._scrollbarVisible = false;
        },
      });
    }, this._config.scrollbarFadeDelayMs);
  }

  private _updateShadows(): void {
    const maxOffset = Math.max(0, this._totalHeight - this._viewportHeight);
    this._topShadow = this._offset > 0;
    this._bottomShadow = this._offset < maxOffset;
  }
}
