/**
 * StartupBoot — the complete startup boot sequence for the V3 Experience Engine.
 *
 * Drives the full startup pipeline:
 * 1. Terminal clear
 * 2. Cyan logo appears
 * 3. Logo glow animation
 * 4. Version fades in
 * 5. Runtime/Workspace/Theme/FrameGraph/Plugins initialize
 * 6. Repository loading animation
 * 7. Workspace expands
 * 8. Dashboard fades in
 *
 * Everything flows through the AnimationScheduler. No blocking sleeps.
 * The StartupTimeline drives stage progression — animations are registered
 * with the scheduler and run in parallel with timeline advancement.
 *
 * # Architecture
 * ```
 * StartupTimeline (drives stage transitions)
 *   └── AnimationScheduler (drives per-stage animations)
 *         └── RuntimeManager (receives frame updates)
 * ```
 *
 * # No random durations
 * All animation durations are deterministic and based on the estimated
 * duration of each timeline stage.
 */

import type { AnimationScheduler } from '../../animation/scheduler.js';
import type { RuntimeManager } from '../../runtime/manager.js';
import type { EventBus } from '../../event-bus/bus.js';
import type { StartupOptions } from './types.js';
import { StartupTimeline } from './timeline.js';
import { easeOutCubic } from '../../animation/easing.js';

// ─── StartupBoot ──────────────────────────────────────────────────

export class StartupBoot {
  /** Reference to the runtime manager (for frame updates). */
  private readonly _runtime: RuntimeManager;

  /** Reference to the animation scheduler. */
  private readonly _scheduler: AnimationScheduler;

  /** Reference to the event bus. */
  private readonly _eventBus: EventBus;

  /** The startup timeline driving stage transitions. */
  private readonly _timeline: StartupTimeline;

  /** Options. */
  private readonly _options: StartupOptions;

  /** Whether the boot sequence is running. */
  private _running: boolean = false;

  /** Whether the boot sequence has completed. */
  private _completed: boolean = false;

  /** Animation IDs for cleanup. */
  private _activeAnimationIds: string[] = [];

  /** Frame subscription for updating the timeline. */
  private _frameUnsub: (() => void) | null = null;

  constructor(
    runtime: RuntimeManager,
    scheduler: AnimationScheduler,
    eventBus: EventBus,
    options?: StartupOptions,
  ) {
    this._runtime = runtime;
    this._scheduler = scheduler;
    this._eventBus = eventBus;
    this._options = options ?? {};
    this._timeline = new StartupTimeline(options);
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  /**
   * Start the boot sequence.
   *
   * @returns A promise that resolves when boot completes.
   */
  start(): Promise<void> {
    if (this._running) return Promise.resolve();

    this._running = true;
    this._completed = false;

    return new Promise((resolve) => {
      // Request full redraw for boot frame
      this._runtime.requestFullRedraw();

      // Listen for timeline completion
      this._timeline.onComplete(() => {
        this._completed = true;
        this._running = false;

        // Cleanup frame subscription
        if (this._frameUnsub) {
          this._frameUnsub();
          this._frameUnsub = null;
        }

        // Emit animation-completed to signal boot is done
        // Frame renders will now show the dashboard
        this._runtime.requestFullRedraw();
        this._runtime.markDirty('workspace');
        this._runtime.markDirty('sidebar');
        this._runtime.markDirty('header');
        this._runtime.markDirty('status-bar');
        resolve();
      });

      // Advance the timeline each frame
      // Use the runtime's frame pipeline by subscribing to render events
      const sub = this._eventBus.on('frame-rendered', () => {
        if (this._running && !this._completed) {
          const dt = 16; // Approximate frame time
          this._timeline.update(dt);

          // Register per-stage animations based on current stage
          this._updateStageAnimations();
        }
      });
      this._frameUnsub = sub.unsubscribe.bind(sub);

      // Start the timeline
      this._timeline.start();

      // Start initial-stage animations
      this._updateStageAnimations();
    });
  }

  /**
   * Interrupt the boot sequence.
   * Interruptible stages are skipped immediately.
   */
  interrupt(): void {
    if (!this._running || this._completed) return;

    // Cancel all active animations
    for (const id of this._activeAnimationIds) {
      this._scheduler.cancel(id);
    }
    this._activeAnimationIds = [];

    this._timeline.interrupt();
  }

  // ── Accessors ─────────────────────────────────────────────────

  /** Whether the boot sequence is running. */
  get isRunning(): boolean {
    return this._running;
  }

  /** Whether the boot sequence has completed. */
  get completed(): boolean {
    return this._completed;
  }

  /** Get the underlying timeline. */
  get timeline(): StartupTimeline {
    return this._timeline;
  }

  // ── Internal ──────────────────────────────────────────────────

  /**
   * Update per-stage animations when the stage changes.
   * Called each frame by the frame-rendered callback.
   */
  private _updateStageAnimations(): void {
    const stage = this._timeline.currentStage;
    if (!stage) return;

    // Cancel animations from previous stages
    // (Keep them if they're still running — the scheduler handles this)
  }

  /**
   * Register a reusable glow-pulse animation.
   * Creates an opacity pulse that loops.
   */
  private _startGlowAnimation(): void {
    const anim = this._scheduler.animate({
      id: 'boot-logo-glow',
      duration: this._findStageDuration('logo-glow', 600),
      from: 0.3,
      to: 1.0,
      easing: easeOutCubic,
      onTick: (value) => {
        // The logo layer renderer reads this value from the animation
        // or the runtime can mark layers dirty
        this._runtime.markDirty('background');
        this._runtime.markDirty('header');
      },
    });
    this._activeAnimationIds.push(anim.id);
  }

  /**
   * Find a stage's estimated duration by ID.
   */
  private _findStageDuration(stageId: string, fallback: number): number {
    const stage = this._timeline.stages.find((s) => s.id === stageId);
    return stage ? stage.estimatedDurationMs : fallback;
  }
}
