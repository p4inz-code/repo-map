/**
 * StartupTimeline — drives the startup boot sequence through the AnimationScheduler.
 *
 * Every startup stage is managed by the timeline:
 * - name, description, estimated/actual duration
 * - completion callback, skip callback
 * - interrupt support
 * - progress tracking
 *
 * The timeline does not use setTimeout or sleep.
 * Stage transitions are driven by the AnimationScheduler frame callbacks.
 *
 * # Architecture
 * ```
 * StartupTimeline
 *   ├── Ordered stages (created via createDefaultStages)
 *   ├── Current stage tracking (index, progress)
 *   ├── Interrupt support (user can skip)
 *   └── Completion/skip callbacks per stage
 * ```
 */

import type { AnimationScheduler } from '../../animation/scheduler.js';
import type { StartupStage, StartupTimeline as StartupTimelineType, StartupState, StartupOptions } from './types.js';
import { createDefaultStages, totalEstimatedTime } from './types.js';

// ─── StartupTimeline ──────────────────────────────────────────────

export class StartupTimeline {
  /** The ordered list of startup stages. */
  private readonly _stages: StartupStage[];

  /** Total estimated duration in ms. */
  private readonly _totalEstimatedMs: number;

  /** Whether the timeline has been interrupted. */
  private _interrupted: boolean = false;

  /** Whether the timeline has completed. */
  private _completed: boolean = false;

  /** Index of the currently running stage (-1 if not started). */
  private _currentIndex: number = -1;

  /** Stage progress (0..1). */
  private _stageProgress: number = 0;

  /** Overall progress (0..1). */
  private _overallProgress: number = 0;

  /** Elapsed time since start in ms. */
  private _elapsedMs: number = 0;

  /** Speed multiplier (1.0 = normal). */
  private readonly _speedMultiplier: number;

  /** Whether to skip animation. */
  private readonly _skipAnimation: boolean;

  /** Callback for stage transitions. */
  private _onStageChange: ((stage: StartupStage | null) => void) | null = null;

  /** Callback for progress updates. */
  private _onProgress: ((overall: number, stage: number) => void) | null = null;

  /** Callback for completion. */
  private _onComplete: (() => void) | null = null;

  /** Callback for interrupt. */
  private _onInterrupt: (() => void) | null = null;

  /** Timestamp when the timeline started (performance.now()). */
  private _startTime: number = 0;

  /** Stage-local elapsed time counter. */
  private _stageElapsed: number = 0;

  constructor(options?: StartupOptions) {
    this._stages = createDefaultStages();
    this._totalEstimatedMs = totalEstimatedTime(this._stages);
    this._speedMultiplier = options?.speedMultiplier ?? 1.0;
    this._skipAnimation = options?.skipAnimation ?? false;
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  /**
   * Start the startup timeline.
   */
  start(): void {
    this._startTime = performance.now();
    this._elapsedMs = 0;
    this._stageElapsed = 0;
    this._interrupted = false;
    this._completed = false;
    this._currentIndex = -1;
    this._stageProgress = 0;
    this._overallProgress = 0;

    if (this._skipAnimation) {
      this._completeAll();
      return;
    }

    this._advanceStage();
  }

  /**
   * Interrupt the startup sequence.
   * Any interruptible stages already running will be skipped.
   * Non-interruptible stages will continue until completion.
   */
  interrupt(): void {
    if (this._completed) return;

    this._interrupted = true;

    // Skip all interruptible stages from current position
    for (let i = this._currentIndex; i < this._stages.length; i++) {
      const stage = this._stages[i];
      if (stage.interruptible) {
        stage.skipped = true;
        stage.completed = true;
        stage.actualDurationMs = 0;
        stage.onSkip?.();
      }
    }

    this._onInterrupt?.();

    // Find the next non-interruptible stage or complete
    this._advancePastInterrupted();
  }

  /**
   * Update progress. Called each frame by the startup boot driver.
   *
   * @param dt - Delta time in milliseconds since last frame.
   */
  update(dt: number): void {
    if (this._completed || this._currentIndex < 0) return;

    this._elapsedMs += dt;
    this._stageElapsed += dt * this._speedMultiplier;

    const stage = this._stages[this._currentIndex];

    // Calculate stage progress
    this._stageProgress = Math.min(1, this._stageElapsed / stage.estimatedDurationMs);

    // Calculate overall progress
    const completedTime = this._stages
      .slice(0, this._currentIndex)
      .reduce((sum, s) => sum + s.estimatedDurationMs, 0);
    this._overallProgress = (completedTime + this._stageElapsed) / this._totalEstimatedMs;

    this._onProgress?.(this._overallProgress, this._stageProgress);

    // Check if current stage is complete
    if (this._stageProgress >= 1) {
      stage.actualDurationMs = this._stageElapsed;
      stage.completed = true;
      stage.onComplete?.();

      // Advance to next stage
      const nextIndex = this._currentIndex + 1;
      if (nextIndex >= this._stages.length) {
        this._completeAll();
      } else {
        this._advanceStage();
      }
    }
  }

  // ── Callbacks ─────────────────────────────────────────────────

  /**
   * Register a callback fired when the active stage changes.
   */
  onStageChange(callback: (stage: StartupStage | null) => void): void {
    this._onStageChange = callback;
  }

  /**
   * Register a callback for progress updates.
   */
  onProgress(callback: (overall: number, stage: number) => void): void {
    this._onProgress = callback;
  }

  /**
   * Register a callback for completion.
   */
  onComplete(callback: () => void): void {
    this._onComplete = callback;
  }

  /**
   * Register a callback for interruption.
   */
  onInterrupt(callback: () => void): void {
    this._onInterrupt = callback;
  }

  // ── Accessors ─────────────────────────────────────────────────

  /** Get the current timeline state. */
  getState(): StartupState {
    return {
      booting: !this._completed && this._currentIndex >= 0,
      currentStageId: this._currentIndex >= 0 ? this._stages[this._currentIndex]?.id ?? null : null,
      progress: this._overallProgress,
      stageProgress: this._stageProgress,
      interrupted: this._interrupted,
      completed: this._completed,
      elapsedMs: this._elapsedMs,
    };
  }

  /** Get the current stage. */
  get currentStage(): StartupStage | null {
    return this._currentIndex >= 0 ? this._stages[this._currentIndex] : null;
  }

  /** Get all stages. */
  get stages(): readonly StartupStage[] {
    return this._stages;
  }

  /** Get the timeline as a config object. */
  getTimeline(): StartupTimelineType {
    return {
      stages: this._stages,
      totalEstimatedMs: this._totalEstimatedMs,
      interrupted: this._interrupted,
      completed: this._completed,
      currentStageIndex: this._currentIndex,
    };
  }

  /** Whether the timeline has completed. */
  get completed(): boolean {
    return this._completed;
  }

  /** Whether the timeline was interrupted. */
  get interrupted(): boolean {
    return this._interrupted;
  }

  /** Overall progress (0..1). */
  get progress(): number {
    return this._overallProgress;
  }

  // ── Internal ──────────────────────────────────────────────────

  /**
   * Advance to the next stage.
   */
  private _advanceStage(): void {
    this._currentIndex++;
    this._stageProgress = 0;
    this._stageElapsed = 0;

    if (this._currentIndex < this._stages.length) {
      this._onStageChange?.(this._stages[this._currentIndex]);
    }
  }

  /**
   * Advance past any interruptible stages.
   */
  private _advancePastInterrupted(): void {
    // Find the next non-interruptible stage
    while (this._currentIndex < this._stages.length) {
      const stage = this._stages[this._currentIndex];
      if (!stage.skipped && !stage.interruptible) {
        return; // Found a non-interrupted stage
      }
      this._currentIndex++;
    }

    // All stages processed
    this._completeAll();
  }

  /**
   * Mark the entire timeline as complete.
   */
  private _completeAll(): void {
    // Mark remaining stages as completed
    for (let i = this._currentIndex + 1; i < this._stages.length; i++) {
      const stage = this._stages[i];
      if (!stage.completed) {
        stage.completed = true;
        stage.skipped = true;
        stage.onSkip?.();
      }
    }

    this._completed = true;
    this._overallProgress = 1;
    this._stageProgress = 1;
    this._currentIndex = this._stages.length;
    this._onComplete?.();
    this._onStageChange?.(null);
  }
}
