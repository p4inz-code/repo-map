/**
 * MetricAnimator — drives metric animations for the V3 Experience Engine.
 *
 * Supports:
 * - Counting values (numbers count upward)
 * - Health bars (animated fill)
 * - Progress bars (animated fill)
 * - Everything driven by AnimationScheduler
 * - Everything deterministic
 */

import type { AnimationScheduler } from '../../animation/scheduler.js';
import type {
  AnimatedMetric,
  AnimatedHealthBar,
  AnimatedProgressBar,
  MetricAnimationConfig,
} from './types.js';
import { easeOutCubic, easeOutQuad } from '../../animation/easing.js';

// ─── MetricAnimator ───────────────────────────────────────────────

export class MetricAnimator {
  private readonly _scheduler: AnimationScheduler;
  private readonly _config: Required<MetricAnimationConfig>;

  /** Active metric animations. */
  private readonly _metrics: Map<string, AnimatedMetric> = new Map();
  private readonly _healthBars: Map<string, AnimatedHealthBar> = new Map();
  private readonly _progressBars: Map<string, AnimatedProgressBar> = new Map();

  constructor(scheduler: AnimationScheduler, config?: MetricAnimationConfig) {
    this._scheduler = scheduler;
    this._config = {
      countDurationMs: config?.countDurationMs ?? 500,
      healthBarDurationMs: config?.healthBarDurationMs ?? 600,
      progressBarDurationMs: config?.progressBarDurationMs ?? 400,
      countEasing: config?.countEasing ?? easeOutCubic,
      barEasing: config?.barEasing ?? easeOutQuad,
    };
  }

  // ── Counting Values ───────────────────────────────────────────

  /**
   * Animate a metric value counting from 0 (or current) to target.
   *
   * @param id     - Metric identifier.
   * @param target - Target value.
   * @param format - Display format.
   * @param onTick - Optional callback with current value.
   */
  countMetric(
    id: string,
    target: number,
    format: AnimatedMetric['format'] = 'number',
    onTick?: (value: number) => void,
  ): void {
    const existing = this._metrics.get(id);
    const fromValue = existing?.currentValue ?? 0;

    const metric: AnimatedMetric = {
      id,
      currentValue: fromValue,
      targetValue: target,
      format,
      progress: 0,
      counting: true,
      completed: false,
    };

    this._metrics.set(id, metric);

    this._scheduler.animate({
      id: `metric-${id}`,
      duration: this._config.countDurationMs,
      easing: this._config.countEasing,
      from: fromValue,
      to: target,
      onTick: (value) => {
        metric.currentValue = value;
        metric.progress = value / target;
        onTick?.(value);
      },
      onComplete: () => {
        metric.currentValue = target;
        metric.progress = 1;
        metric.counting = false;
        metric.completed = true;
        onTick?.(target);
      },
    });
  }

  // ── Health Bars ───────────────────────────────────────────────

  /**
   * Animate a health bar filling to a target percentage.
   *
   * @param id     - Bar identifier.
   * @param target - Target fill (0..1).
   */
  fillHealthBar(id: string, target: number): void {
    const existing = this._healthBars.get(id);
    const fromValue = existing?.fillProgress ?? 0;

    const bar: AnimatedHealthBar = {
      id,
      fillProgress: fromValue,
      targetFill: target,
      color: target >= 0.8 ? 'success' : target >= 0.5 ? 'warning' : 'error',
      animating: true,
    };

    this._healthBars.set(id, bar);

    this._scheduler.animate({
      id: `healthbar-${id}`,
      duration: this._config.healthBarDurationMs,
      easing: this._config.barEasing,
      from: fromValue,
      to: target,
      onTick: (value) => {
        bar.fillProgress = value;
        bar.color = value >= 0.8 ? 'success' : value >= 0.5 ? 'warning' : 'error';
      },
      onComplete: () => {
        bar.fillProgress = target;
        bar.animating = false;
      },
    });
  }

  // ── Progress Bars ─────────────────────────────────────────────

  /**
   * Animate a progress bar filling to a target percentage.
   *
   * @param id     - Bar identifier.
   * @param target - Target progress (0..100).
   */
  fillProgressBar(id: string, target: number): void {
    const existing = this._progressBars.get(id);
    const fromValue = existing?.currentProgress ?? 0;

    const bar: AnimatedProgressBar = {
      id,
      currentProgress: fromValue,
      targetProgress: target,
      filling: true,
    };

    this._progressBars.set(id, bar);

    this._scheduler.animate({
      id: `progressbar-${id}`,
      duration: this._config.progressBarDurationMs,
      easing: this._config.barEasing,
      from: fromValue,
      to: target,
      onTick: (value) => {
        bar.currentProgress = value;
      },
      onComplete: () => {
        bar.currentProgress = target;
        bar.filling = false;
      },
    });
  }

  // ── Accessors ─────────────────────────────────────────────────

  /** Get the current animated value of a metric. */
  getMetricValue(id: string): number {
    return this._metrics.get(id)?.currentValue ?? 0;
  }

  /** Get whether a metric is still counting. */
  isMetricCounting(id: string): boolean {
    return this._metrics.get(id)?.counting ?? false;
  }

  /** Get the current health bar fill progress. */
  getHealthBarFill(id: string): number {
    return this._healthBars.get(id)?.fillProgress ?? 0;
  }

  /** Get health bar color based on current fill. */
  getHealthBarColor(id: string): string {
    const bar = this._healthBars.get(id);
    if (!bar) return 'success';
    return bar.fillProgress >= 0.8 ? 'success' : bar.fillProgress >= 0.5 ? 'warning' : 'error';
  }

  /** Get the current progress bar value. */
  getProgressValue(id: string): number {
    return this._progressBars.get(id)?.currentProgress ?? 0;
  }

  /** Whether a progress bar is still filling. */
  isProgressFilling(id: string): boolean {
    return this._progressBars.get(id)?.filling ?? false;
  }

  /** Reset all metric animations. */
  reset(): void {
    this._metrics.clear();
    this._healthBars.clear();
    this._progressBars.clear();
  }
}
