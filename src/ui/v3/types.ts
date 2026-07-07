/**
 * Core V3 Runtime types.
 *
 * These are the primitive types that every subsystem in the V3 Runtime depends on.
 * They are intentionally small, composable, and reusable across all layers.
 *
 * # FrameContext
 * Every renderer in the pipeline receives a FrameContext that contains:
 * - frame number (monotonic counter)
 * - delta time (ms since last frame)
 * - FPS (smoothed)
 * - terminal size
 * - theme
 * - workspace state
 * - dirty rectangles
 * - transition state
 *
 * # Coordinate System
 * - (0,0) is top-left of the terminal.
 * - x increases right, y increases down.
 * - All measurements are in character cells (monospace).
 *
 * # Frame Budget
 * - Target: 16ms per frame (≈60fps).
 * - If a frame exceeds the budget, the pipeline may skip non-essential work.
 * - Frame budget is configurable via RuntimeOptions.
 */

import type { ThemeV2 } from '../v2/theme/theme.js';
import type { Line, DirtyRect } from '../v2/renderer/types.js';

// ─── Frame Timing ─────────────────────────────────────────────────

/**
 * Frame timing data passed to every renderer in the pipeline.
 */
export interface FrameTiming {
  /** Monotonic frame number (starts at 0, increments each frame). */
  readonly frameNumber: number;
  /** Delta time in milliseconds since the last frame. */
  readonly deltaTimeMs: number;
  /** Smoothed frames per second (exponential moving average). */
  readonly fps: number;
  /** Total elapsed time in ms since the runtime started. */
  readonly elapsedMs: number;
  /** Timestamp of this frame (performance.now()). */
  readonly timestamp: number;
  /** Whether this frame is within the budget (frameTimeMs <= maxFrameBudgetMs). */
  readonly withinBudget: boolean;
  /** Actual frame computation time in ms (filled after pipeline completes). */
  frameTimeMs: number;
  /** Maximum allowed frame time in ms before frame skipping. */
  readonly maxFrameBudgetMs: number;
}

// ─── Frame Context ────────────────────────────────────────────────

/**
 * Complete context delivered to every renderer during a frame.
 *
 * This is the single source of truth for rendering state. No component
 * should access global state directly during rendering — everything
 * flows through FrameContext.
 */
export interface FrameContext {
  /** Frame timing data. */
  readonly timing: FrameTiming;
  /** Terminal width in character cells. */
  readonly width: number;
  /** Terminal height in character cells. */
  readonly height: number;
  /** Current theme engine. */
  readonly theme: ThemeV2;
  /** Workspace state snapshot. */
  readonly workspace: WorkspaceSnapshot;
  /** Set of layer IDs that are dirty this frame. */
  readonly dirtyLayers: ReadonlySet<string>;
  /** Accumulated dirty rectangles (for partial redraw optimization). */
  readonly dirtyRects: readonly DirtyRect[];
  /** Whether this is a full redraw (e.g., after resize). */
  readonly fullRedraw: boolean;
  /** Active transition (null if no transition is running). */
  readonly activeTransition: ActiveTransition | null;
  /** Frame number as a convenience (aliases timing.frameNumber). */
  readonly frame: number;
  /** Delta time as a convenience (aliases timing.deltaTimeMs). */
  readonly dt: number;
}

// ─── Workspace Snapshot ───────────────────────────────────────────

/**
 * Immutable snapshot of workspace state at render time.
 */
export interface WorkspaceSnapshot {
  /** Currently active screen ID. */
  readonly activeScreenId: string | null;
  /** Currently selected item ID (sidebar or context-dependent). */
  readonly selectedId: string | null;
  /** Search query (empty if search is inactive). */
  readonly searchQuery: string;
  /** Whether search is active. */
  readonly searchActive: boolean;
  /** Whether the command palette is open. */
  readonly paletteOpen: boolean;
  /** Scroll position of the active screen. */
  readonly scrollOffset: number;
  /** Screen history stack depth. */
  readonly historyDepth: number;
  /** Which overlay is currently on top (null if none). */
  readonly topOverlayId: string | null;
  /** Whether a modal dialog is visible. */
  readonly modalVisible: boolean;
}

// ─── Active Transition ────────────────────────────────────────────

/**
 * Describes a transition that is currently running.
 */
export interface ActiveTransition {
  /** Transition type identifier. */
  readonly type: string;
  /** Progress from 0 (start) to 1 (complete). */
  readonly progress: number;
  /** Transition duration in ms. */
  readonly duration: number;
  /** Source screen ID (transitioning from). */
  readonly fromScreen: string;
  /** Destination screen ID (transitioning to). */
  readonly toScreen: string;
}

// ─── Builders ─────────────────────────────────────────────────────

/**
 * Create an initial FrameTiming for frame 0.
 */
export function createInitialFrameTiming(options?: {
  maxFrameBudgetMs?: number;
}): FrameTiming {
  return {
    frameNumber: 0,
    deltaTimeMs: 16,
    fps: 60,
    elapsedMs: 0,
    timestamp: performance.now(),
    withinBudget: true,
    frameTimeMs: 0,
    maxFrameBudgetMs: options?.maxFrameBudgetMs ?? 16,
  };
}

/**
 * Create an initial FrameContext.
 */
export function createInitialFrameContext(
  width: number,
  height: number,
  theme: ThemeV2,
): FrameContext {
  return {
    timing: createInitialFrameTiming(),
    width,
    height,
    theme,
    workspace: {
      activeScreenId: null,
      selectedId: null,
      searchQuery: '',
      searchActive: false,
      paletteOpen: false,
      scrollOffset: 0,
      historyDepth: 0,
      topOverlayId: null,
      modalVisible: false,
    },
    dirtyLayers: new Set<string>(),
    dirtyRects: [],
    fullRedraw: true,
    activeTransition: null,
    frame: 0,
    dt: 16,
  };
}

// ─── Frame Budget Tracking ────────────────────────────────────────

/**
 * Result of a single frame's budget check.
 */
export interface BudgetResult {
  /** Whether the frame stayed within budget. */
  readonly withinBudget: boolean;
  /** How much over budget (negative if under budget). */
  readonly overageMs: number;
  /** What work should be skipped this frame, if any. */
  readonly skipFlags: FrameSkipFlags;
}

/** Flags indicating what work can be skipped when over budget. */
export interface FrameSkipFlags {
  /** Skip non-essential animation updates. */
  readonly skipAnimations: boolean;
  /** Skip overlay rendering (keep previous frame). */
  readonly skipOverlays: boolean;
  /** Skip status bar updates. */
  readonly skipStatusBar: boolean;
  /** Skip inspector panel updates. */
  readonly skipInspector: boolean;
}

/**
 * Evaluate frame budget and determine what to skip.
 */
export function evaluateBudget(
  elapsedMs: number,
  maxBudgetMs: number,
): BudgetResult {
  const overageMs = elapsedMs - maxBudgetMs;
  const withinBudget = overageMs <= 0;

  if (withinBudget) {
    return {
      withinBudget: true,
      overageMs: 0,
      skipFlags: {
        skipAnimations: false,
        skipOverlays: false,
        skipStatusBar: false,
        skipInspector: false,
      },
    };
  }

  // Progressive degradation based on severity of overage
  const severity = overageMs / maxBudgetMs;

  return {
    withinBudget: false,
    overageMs,
    skipFlags: {
      skipAnimations: severity > 0.25,
      skipOverlays: severity > 0.5,
      skipStatusBar: severity > 0.75,
      skipInspector: severity > 1.0,
    },
  };
}
