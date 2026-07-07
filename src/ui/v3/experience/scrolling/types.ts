/**
 * Scrolling types for the V3 Experience Engine.
 *
 * Scrolling must feel premium with:
 * - Smooth interpolation (eased scroll)
 * - Momentum (scroll continues after release)
 * - Large jumps animate
 * - Scrollbar fades in/out
 * - Edge shadow appears at boundaries
 * - Viewport indicators (showing position)
 */

import type { EasingFn } from '../../animation/easing.js';
import { easeOutCubic } from '../../animation/easing.js';

// ─── Scroll Direction ─────────────────────────────────────────────

export type ScrollDirection = 'up' | 'down';

// ─── Scroll Config ────────────────────────────────────────────────

export interface ScrollConfig {
  /** Duration of smooth scroll in ms (default: 200). */
  readonly smoothDurationMs?: number;
  /** Duration of momentum scroll in ms (default: 400). */
  readonly momentumDurationMs?: number;
  /** Easing for smooth scroll (default: easeOutCubic). */
  readonly smoothEasing?: EasingFn;
  /** Lines per scroll step (default: 1). */
  readonly scrollStep?: number;
  /** Whether to show scrollbar (default: true). */
  readonly showScrollbar?: boolean;
  /** Scrollbar fade delay in ms (default: 1000). */
  readonly scrollbarFadeDelayMs?: number;
  /** Whether to show edge shadow (default: true). */
  readonly showEdgeShadow?: boolean;
  /** Edge shadow height in rows (default: 2). */
  readonly edgeShadowHeight?: number;
}

// ─── Scroll State ─────────────────────────────────────────────────

export interface ScrollState {
  /** Current scroll offset (in lines). */
  readonly offset: number;
  /** Target scroll offset (for smooth animation). */
  readonly targetOffset: number;
  /** Total scrollable height (in lines). */
  readonly totalHeight: number;
  /** Viewport height (in lines). */
  readonly viewportHeight: number;
  /** Whether scrolling is currently animating. */
  readonly animating: boolean;
  /** Whether momentum scrolling is active. */
  readonly momentum: boolean;
  /** Current velocity (lines per ms, for momentum). */
  readonly velocity: number;
  /** Scrollbar opacity (0..1). */
  readonly scrollbarOpacity: number;
  /** Whether scrollbar is visible. */
  readonly scrollbarVisible: boolean;
  /** Whether an edge shadow should appear at the top. */
  readonly showTopShadow: boolean;
  /** Whether an edge shadow should appear at the bottom. */
  readonly showBottomShadow: boolean;
  /** Whether scrolled to top. */
  readonly atTop: boolean;
  /** Whether scrolled to bottom. */
  readonly atBottom: boolean;
  /** Scroll progress (0..1 for scrollbar position). */
  readonly scrollProgress: number;
}
