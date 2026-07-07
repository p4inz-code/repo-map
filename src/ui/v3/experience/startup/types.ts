/**
 * Startup types for the V3 Experience Engine.
 *
 * Defines the startup boot sequence and timeline system.
 * Everything flows through AnimationScheduler — no blocking sleeps.
 *
 * # Startup Timeline Stages
 * 1. terminal-clear    — Clear terminal
 * 2. logo-appear       — Cyan logo renders
 * 3. logo-glow         — Logo glow animation
 * 4. version-fade      — Version string fades in
 * 5. scanner-init      — Repository scanner initializes
 * 6. runtime-init      — Runtime initializes
 * 7. workspace-init    — Workspace initializes
 * 8. theme-init        — Theme initializes
 * 9. frame-graph-init  — Frame graph initializes
 * 10. plugins-init     — Plugins initialize
 * 11. repo-load        — Repository loading animation
 * 12. repo-detected    — Repository detected
 * 13. workspace-expand — Workspace expands
 * 14. dashboard-fade   — Dashboard fades in
 */

import type { EasingFn } from '../../animation/easing.js';
import type { AnimationDef } from '../../animation/types.js';

// ─── Startup Stage ────────────────────────────────────────────────

/**
 * A single stage in the startup timeline.
 */
export interface StartupStage {
  /** Unique stage identifier. */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** Description of what this stage does. */
  readonly description: string;
  /** Estimated duration in ms (used for progress estimation). */
  readonly estimatedDurationMs: number;
  /** Actual duration in ms (filled when stage completes). */
  actualDurationMs: number;
  /** Whether the stage has completed. */
  completed: boolean;
  /** Whether the stage was skipped (e.g., due to interrupt). */
  skipped: boolean;
  /** Whether this stage can be interrupted. */
  readonly interruptible: boolean;
  /** Animation definitions for this stage (optional). */
  readonly animations?: Partial<AnimationDef & { id: string; duration: number; from: number; to: number }>[];
  /** Callback when the stage completes successfully. */
  readonly onComplete?: () => void;
  /** Callback when the stage is skipped. */
  readonly onSkip?: () => void;
}

// ─── Startup Timeline ─────────────────────────────────────────────

/**
 * The startup timeline configuration.
 */
export interface StartupTimeline {
  /** Ordered list of startup stages. */
  readonly stages: StartupStage[];
  /** Total estimated duration across all stages. */
  readonly totalEstimatedMs: number;
  /** Whether the startup has been interrupted. */
  interrupted: boolean;
  /** Whether the startup has completed. */
  completed: boolean;
  /** Index of the currently running stage. */
  currentStageIndex: number;
}

// ─── Startup Boot State ───────────────────────────────────────────

/**
 * Represents the state of the startup boot sequence.
 */
export interface StartupState {
  /** Whether the boot sequence is running. */
  readonly booting: boolean;
  /** Current stage ID (null if not booting). */
  readonly currentStageId: string | null;
  /** Overall progress (0..1). */
  readonly progress: number;
  /** Current stage progress (0..1). */
  readonly stageProgress: number;
  /** Whether startup was interrupted. */
  readonly interrupted: boolean;
  /** Whether startup completed. */
  readonly completed: boolean;
  /** Elapsed time since boot started in ms. */
  readonly elapsedMs: number;
}

// ─── Startup Options ──────────────────────────────────────────────

/**
 * Options for the startup boot sequence.
 */
export interface StartupOptions {
  /** Whether to skip the boot animation (instant startup). */
  readonly skipAnimation?: boolean;
  /** Whether to show verbose boot logging. */
  readonly verbose?: boolean;
  /** Custom animation durations multiplier (1.0 = normal). */
  readonly speedMultiplier?: number;
}

// ─── Default Startup Stages ───────────────────────────────────────

/**
 * Create the default startup timeline stages.
 */
export function createDefaultStages(): StartupStage[] {
  return [
    {
      id: 'terminal-clear',
      name: 'Terminal Clear',
      description: 'Clearing terminal for startup',
      estimatedDurationMs: 50,
      actualDurationMs: 0,
      completed: false,
      skipped: false,
      interruptible: true,
    },
    {
      id: 'logo-appear',
      name: 'Logo Appear',
      description: 'Rendering cyan repo-map logo',
      estimatedDurationMs: 200,
      actualDurationMs: 0,
      completed: false,
      skipped: false,
      interruptible: false,
    },
    {
      id: 'logo-glow',
      name: 'Logo Glow',
      description: 'Logo glow animation',
      estimatedDurationMs: 600,
      actualDurationMs: 0,
      completed: false,
      skipped: false,
      interruptible: false,
    },
    {
      id: 'version-fade',
      name: 'Version Fade',
      description: 'Version string fades in',
      estimatedDurationMs: 300,
      actualDurationMs: 0,
      completed: false,
      skipped: false,
      interruptible: false,
    },
    {
      id: 'scanner-init',
      name: 'Scanner Init',
      description: 'Repository scanner initializing',
      estimatedDurationMs: 400,
      actualDurationMs: 0,
      completed: false,
      skipped: false,
      interruptible: true,
    },
    {
      id: 'runtime-init',
      name: 'Runtime Init',
      description: 'V3 Runtime initializing subsystems',
      estimatedDurationMs: 300,
      actualDurationMs: 0,
      completed: false,
      skipped: false,
      interruptible: true,
    },
    {
      id: 'workspace-init',
      name: 'Workspace Init',
      description: 'Workspace state initializing',
      estimatedDurationMs: 200,
      actualDurationMs: 0,
      completed: false,
      skipped: false,
      interruptible: true,
    },
    {
      id: 'theme-init',
      name: 'Theme Init',
      description: 'Theme engine initializing',
      estimatedDurationMs: 150,
      actualDurationMs: 0,
      completed: false,
      skipped: false,
      interruptible: true,
    },
    {
      id: 'frame-graph-init',
      name: 'Frame Graph Init',
      description: 'Frame graph registering layers',
      estimatedDurationMs: 200,
      actualDurationMs: 0,
      completed: false,
      skipped: false,
      interruptible: true,
    },
    {
      id: 'plugins-init',
      name: 'Plugins Init',
      description: 'Plugin system initializing',
      estimatedDurationMs: 250,
      actualDurationMs: 0,
      completed: false,
      skipped: false,
      interruptible: true,
    },
    {
      id: 'repo-load',
      name: 'Repository Loading',
      description: 'Loading repository analysis data',
      estimatedDurationMs: 500,
      actualDurationMs: 0,
      completed: false,
      skipped: false,
      interruptible: false,
    },
    {
      id: 'repo-detected',
      name: 'Repository Detected',
      description: 'Repository detected and loaded',
      estimatedDurationMs: 200,
      actualDurationMs: 0,
      completed: false,
      skipped: false,
      interruptible: false,
    },
    {
      id: 'workspace-expand',
      name: 'Workspace Expand',
      description: 'Workspace expands to fill terminal',
      estimatedDurationMs: 400,
      actualDurationMs: 0,
      completed: false,
      skipped: false,
      interruptible: false,
    },
    {
      id: 'dashboard-fade',
      name: 'Dashboard Fade',
      description: 'Dashboard screen fades into view',
      estimatedDurationMs: 300,
      actualDurationMs: 0,
      completed: false,
      skipped: false,
      interruptible: false,
    },
  ];
}

/**
 * Calculate total estimated duration across all stages.
 */
export function totalEstimatedTime(stages: StartupStage[]): number {
  return stages.reduce((sum, s) => sum + s.estimatedDurationMs, 0);
}
