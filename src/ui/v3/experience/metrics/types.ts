/**
 * Metric animation types for the V3 Experience Engine.
 *
 * Supported metric animations:
 * - Counting values (numbers count upward)
 * - Health bars (animated fill)
 * - Progress bars (animated fill)
 * - Gauge needle rotation
 * - Sparkline drawing
 *
 * Everything deterministic — no random values.
 */

import type { EasingFn } from '../../animation/easing.js';
import { easeOutCubic, easeOutQuad } from '../../animation/easing.js';

// ─── Animated Metric ──────────────────────────────────────────────

export interface AnimatedMetric {
  /** Metric identifier. */
  readonly id: string;
  /** Current displayed value (animated). */
  currentValue: number;
  /** Target value to reach. */
  readonly targetValue: number;
  /** Format of the value for display. */
  readonly format: 'number' | 'percentage' | 'filesize' | 'score';
  /** Current animation progress (0..1). */
  progress: number;
  /** Whether the metric is still counting. */
  counting: boolean;
  /** Whether the metric animation has completed. */
  completed: boolean;
}

// ─── Health Bar ───────────────────────────────────────────────────

export interface AnimatedHealthBar {
  /** Bar identifier. */
  readonly id: string;
  /** Current fill progress (0..1). */
  fillProgress: number;
  /** Target fill value (0..1). */
  readonly targetFill: number;
  /** Color at current fill level. */
  color: 'error' | 'warning' | 'success';
  /** Whether the bar is still animating. */
  animating: boolean;
}

// ─── Progress Bar ─────────────────────────────────────────────────

export interface AnimatedProgressBar {
  /** Bar identifier. */
  readonly id: string;
  /** Current progress (0..100). */
  currentProgress: number;
  /** Target progress. */
  readonly targetProgress: number;
  /** Whether the bar is still filling. */
  filling: boolean;
}

// ─── Metric Config ────────────────────────────────────────────────

export interface MetricAnimationConfig {
  /** Duration for counting animations in ms (default: 500). */
  readonly countDurationMs?: number;
  /** Duration for health bar fill in ms (default: 600). */
  readonly healthBarDurationMs?: number;
  /** Duration for progress bar fill in ms (default: 400). */
  readonly progressBarDurationMs?: number;
  /** Easing for counting (default: easeOutCubic). */
  readonly countEasing?: EasingFn;
  /** Easing for bars (default: easeOutQuad). */
  readonly barEasing?: EasingFn;
}

// ─── Health Bar Color Helper ──────────────────────────────────────

/**
 * Determine the color token for a health score.
 */
export function healthColor(score: number): 'error' | 'warning' | 'success' {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
}

/**
 * Format a metric value based on its format type.
 */
export function formatMetricValue(value: number, format: AnimatedMetric['format']): string {
  switch (format) {
    case 'number':
      return Math.round(value).toLocaleString();
    case 'percentage':
      return `${Math.round(value)}%`;
    case 'filesize':
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}MB`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}KB`;
      return `${Math.round(value)}B`;
    case 'score':
      return `${Math.round(value)}/100`;
    default:
      return Math.round(value).toString();
  }
}
