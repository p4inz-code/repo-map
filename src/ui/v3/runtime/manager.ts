/**
 * RuntimeManager — the central orchestrator of the V3 Runtime Layer.
 *
 * The RuntimeManager is the single entry point that wires together all
 * subsystems of the V3 Runtime:
 *
 * - Frame scheduling (render loop timing)
 * - Render pipeline (FrameBuilder → LayerComposer → DoubleBuffer → DiffEngine)
 * - Frame timing (FrameContext, budget evaluation)
 * - Animation scheduling (AnimationScheduler)
 * - Transition scheduling (TransitionManager)
 * - Dirty region tracking (per-layer dirty flags)
 * - Overlay ordering (OverlayManager)
 * - Z-index enforcement (FrameGraph)
 * - Frame budget (skip non-essential work when over budget)
 * - Event dispatch (EventBus)
 *
 * # Architecture
 * ```
 * RuntimeManager
 *   ├── FrameGraph        (deterministic render order)
 *   ├── FrameBuilder      (collects layer content)
 *   ├── LayerComposer     (composes layers by z-order)
 *   ├── DoubleBuffer      (frame diffing)
 *   ├── DiffEngine        (ANSI output generation)
 *   ├── AnimationScheduler (frame-based animations)
 *   ├── TransitionManager (screen transitions)
 *   ├── OverlayManager    (overlay stack, focus, dismiss)
 *   ├── FocusTree         (hierarchical focus system)
 *   ├── WorkspaceManager  (workspace state)
 *   ├── EventBus          (decoupled events)
 *   └── Render Loop       (setInterval-based frame pump)
 * ```
 *
 * # Initialization Order
 * 1. Create all subsystems
 * 2. Register FrameGraph layers with FrameBuilder
 * 3. Wire EventBus to subsystem callbacks
 * 4. Start the render loop
 *
 * # Frame Pipeline (each tick)
 * 1. Advance animations (AnimationScheduler)
 * 2. Update transitions (TransitionManager)
 * 3. Build frame (FrameBuilder) — collect dirty layer content
 * 4. Compose layers (LayerComposer) — blend by z-order
 * 5. Write to double buffer
 * 6. Diff against previous frame (DoubleBuffer)
 * 7. Generate ANSI output (DiffEngine)
 * 8. Write to terminal
 * 9. Emit frame-rendered event
 * 10. Evaluate frame budget
 *
 * # No screen should directly control rendering anymore.
 * All rendering flows through the RuntimeManager.
 *
 * @example
 * ```ts
 * const runtime = new RuntimeManager(theme, { width: 80, height: 24 });
 * runtime.initialize();
 *
 * // Register layer renderers
 * runtime.frameGraph.setRenderer('header', (ctx) => renderHeader(ctx));
 * runtime.frameGraph.setRenderer('sidebar', (ctx) => renderSidebar(ctx));
 *
 * // Start the loop
 * runtime.start();
 * ```
 */

// ─── Imports ──────────────────────────────────────────────────────

import type { ThemeV2 } from '../../v2/theme/theme.js';
import type { Line } from '../../v2/renderer/types.js';
import type { FrameGraphLayerId } from '../frame-graph/types.js';
import type { FrameContext, BudgetResult } from '../types.js';
import { createInitialFrameTiming, evaluateBudget } from '../types.js';
import { FrameGraph } from '../frame-graph/graph.js';
import { FRAME_GRAPH_ORDER } from '../frame-graph/types.js';
import { FrameBuilder } from '../pipeline/frame-builder.js';
import { LayerComposer } from '../pipeline/layer-composer.js';
import { DoubleBuffer } from '../pipeline/double-buffer.js';
import { DiffEngine } from '../pipeline/diff-engine.js';
import type { PipelineFrameStats } from '../pipeline/types.js';
import { AnimationScheduler } from '../animation/scheduler.js';
import { TransitionManager } from '../transition/manager.js';
import { OverlayManager } from '../overlay/manager.js';
import { FocusTree } from '../focus/tree.js';
import { WorkspaceManager } from '../workspace/context.js';
import { EventBus } from '../event-bus/bus.js';

// ─── Constants ─────────────────────────────────────────────────────

/** Default frame interval in ms (≈60fps). */
const DEFAULT_FRAME_INTERVAL_MS = 16;

/** Default maximum frame budget before skipping non-essential work. */
const DEFAULT_MAX_FRAME_BUDGET_MS = 32; // Allow up to 2x before degradation

// ─── Runtime Options ───────────────────────────────────────────────

/**
 * Configuration options for the RuntimeManager.
 */
export interface RuntimeOptions {
  /** Terminal width in character cells (default: 80). */
  width?: number;
  /** Terminal height in character cells (default: 24). */
  height?: number;
  /** Frame interval in ms (default: 16). */
  frameIntervalMs?: number;
  /** Maximum frame budget before skipping non-essential work (default: 32). */
  maxFrameBudgetMs?: number;
  /** Whether to auto-start the render loop after initialize() (default: true). */
  autoStart?: boolean;
  /** Whether to enable debug logging (default: false). */
  debug?: boolean;
}

// ─── RuntimeManager ────────────────────────────────────────────────

export class RuntimeManager {
  // ── Subsystems (public for direct access) ──────────────────────

  /** Determines render order and enforces z-index. */
  readonly frameGraph: FrameGraph;

  /** Collects dirty layer content each frame. */
  readonly frameBuilder: FrameBuilder;

  /** Composes layers by z-order into a single frame. */
  readonly layerComposer: LayerComposer;

  /** Double buffer for frame diffing. */
  readonly doubleBuffer: DoubleBuffer;

  /** Generates minimal ANSI terminal output. */
  readonly diffEngine: DiffEngine;

  /** Schedules and runs animations. */
  readonly animationScheduler: AnimationScheduler;

  /** Manages screen-to-screen transitions. */
  readonly transitionManager: TransitionManager;

  /** Manages overlay stack (palette, search, notifications, modals). */
  readonly overlayManager: OverlayManager;

  /** Hierarchical focus system. */
  readonly focusTree: FocusTree;

  /** Centralized workspace state. */
  readonly workspaceManager: WorkspaceManager;

  /** Decoupled event system. */
  readonly eventBus: EventBus;

  // ── Configuration ─────────────────────────────────────────────

  private readonly _theme: ThemeV2;
  private readonly _frameIntervalMs: number;
  private readonly _maxFrameBudgetMs: number;
  private readonly _debug: boolean;

  // ── Internal State ────────────────────────────────────────────

  /** Render loop timer handle. */
  private _renderTimer: ReturnType<typeof setInterval> | null = null;

  /** Whether the runtime has been initialized. */
  private _initialized: boolean = false;

  /** Whether the render loop is running. */
  private _running: boolean = false;

  /** Whether the runtime has been destroyed. */
  private _destroyed: boolean = false;

  /** Current frame number (monotonic counter). */
  private _frameNumber: number = 0;

  /** Last frame timestamp (performance.now()). */
  private _lastFrameTime: number = 0;

  /** Cumulative elapsed time. */
  private _elapsedMs: number = 0;

  /** Smoothed FPS (exponential moving average). */
  private _smoothedFps: number = 60;

  /** Maximum terminal width/height. */
  private _width: number;
  private _height: number;

  /** Terminal writer (defaults to process.stderr.write). */
  private _terminalWriter: (data: string) => void;

  /** Cached FrameContext for the current frame (rebuilt each tick). */
  private _context: FrameContext | null = null;

  /** Whether a full redraw was requested (e.g., after resize). */
  private _fullRedrawRequested: boolean = true;

  /** Dirty layer set (layers that need re-rendering). */
  private _dirtyLayers: Set<string> = new Set();

  // ── Construction ──────────────────────────────────────────────

  constructor(
    theme: ThemeV2,
    options: RuntimeOptions = {},
  ) {
    this._theme = theme;
    this._width = options.width ?? 80;
    this._height = options.height ?? 24;
    this._frameIntervalMs = options.frameIntervalMs ?? DEFAULT_FRAME_INTERVAL_MS;
    this._maxFrameBudgetMs = options.maxFrameBudgetMs ?? DEFAULT_MAX_FRAME_BUDGET_MS;
    this._debug = options.debug ?? false;
    this._terminalWriter = (data: string) => process.stderr.write(data);

    // Create all subsystems
    this.frameGraph = new FrameGraph();
    this.frameBuilder = new FrameBuilder();
    this.layerComposer = new LayerComposer();
    this.doubleBuffer = new DoubleBuffer(this._width, this._height);
    this.diffEngine = new DiffEngine();
    this.animationScheduler = new AnimationScheduler({
      targetFrameIntervalMs: this._frameIntervalMs,
    });
    this.transitionManager = new TransitionManager();
    this.overlayManager = new OverlayManager();
    this.focusTree = new FocusTree();
    this.workspaceManager = new WorkspaceManager();
    this.eventBus = new EventBus();
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  /**
   * Initialize the runtime: register FrameGraph layers with FrameBuilder
   * and set up internal event wiring.
   *
   * Call before start().
   */
  initialize(): void {
    if (this._initialized) return;

    this._log('[RuntimeManager] Initializing...');

    // Register all FrameGraph layers with the FrameBuilder
    for (const layerId of FRAME_GRAPH_ORDER) {
      this._registerLayer(layerId);
    }

    // Wire animation scheduler frame callback
    this.animationScheduler.onFrame(() => {
      // Animation updates mark workspace as dirty
      this._dirtyLayers.add('workspace');
    });

    // Wire event bus for overlay changes
    this.overlayManager.onChange((state) => {
      // Mark overlay layers dirty when overlay state changes
      this._dirtyLayers.add('overlay');
      this._dirtyLayers.add('notifications');
      this._dirtyLayers.add('palette');
      this._dirtyLayers.add('search');

      if (state.topmost) {
        this.eventBus.emit('overlay-changed', {
          overlayId: state.topmost.id,
          visible: state.topmost.visible,
          modal: state.topmost.modal,
        }, 'runtime');
      }
    });

    // Wire workspace changes to event bus
    this.workspaceManager.onAnyChange((event) => {
      if (event.type === 'screen-changed') {
        this._dirtyLayers.add('workspace');
        this._dirtyLayers.add('sidebar');
        this.eventBus.emit('screen-changed', {
          screenId: event.context.activeScreenId ?? '',
          previousScreenId: event.previousContext.activeScreenId,
          isBack: false,
        }, 'runtime');
      }
      if (event.type === 'search-updated') {
        this._dirtyLayers.add('search');
        this._dirtyLayers.add('workspace');
        if (event.context.search.active) {
          this.eventBus.emit('search-opened', {
            query: event.context.search.query,
            resultCount: event.context.search.resultCount,
          }, 'runtime');
        } else {
          this.eventBus.emit('search-closed', {
            query: '',
            resultCount: 0,
          }, 'runtime');
        }
      }
      if (event.type === 'analysis-loaded') {
        this.eventBus.emit('repository-loaded', {
          projectName: event.context.analysis?.projectName ?? 'unknown',
          fileCount: event.context.analysis?.stats.totalFiles ?? 0,
          directoryCount: event.context.analysis?.stats.totalDirectories ?? 0,
        }, 'runtime');
      }
    });

    this._initialized = true;
    this._log('[RuntimeManager] Initialized');
  }

  /**
   * Start the render loop. The runtime begins pumping frames.
   */
  start(): void {
    if (!this._initialized) {
      this.initialize();
    }
    if (this._running) return;

    this._log('[RuntimeManager] Starting render loop...');

    this._running = true;
    this._lastFrameTime = performance.now();
    this._frameNumber = 0;

    // Start animation scheduler
    this.animationScheduler.start();

    // Start render loop
    this._renderTimer = setInterval(() => this._tick(), this._frameIntervalMs);

    this._log(`[RuntimeManager] Render loop started (${this._frameIntervalMs}ms interval)`);
  }

  /**
   * Stop the render loop.
   */
  stop(): void {
    if (!this._running) return;

    this._log('[RuntimeManager] Stopping render loop...');

    this._running = false;

    if (this._renderTimer !== null) {
      clearInterval(this._renderTimer);
      this._renderTimer = null;
    }

    this.animationScheduler.stop();
  }

  /**
   * Destroy the runtime and clean up all resources.
   */
  destroy(): void {
    if (this._destroyed) return;

    this._log('[RuntimeManager] Destroying...');

    this.stop();

    this.animationScheduler.cancelAll();
    this.workspaceManager.clearSubscribers();
    this.eventBus.clearAll();

    this._destroyed = true;
    this._log('[RuntimeManager] Destroyed');
  }

  // ── Terminal Management ──────────────────────────────────────

  /**
   * Handle terminal resize.
   * Triggers a full redraw on the next frame.
   */
  resize(width: number, height: number): void {
    if (width === this._width && height === this._height) return;

    this._log(`[RuntimeManager] Resize: ${this._width}x${this._height} → ${width}x${height}`);

    this._width = width;
    this._height = height;
    this.doubleBuffer.resize(width, height);
    this.requestFullRedraw();

    this.eventBus.emit('resize', { width, height }, 'runtime');
  }

  /**
   * Request a full redraw on the next frame.
   */
  requestFullRedraw(): void {
    this._fullRedrawRequested = true;
    this.frameBuilder.markAllDirty();
  }

  /**
   * Mark a specific layer as dirty, forcing re-render.
   */
  markDirty(layerId: string): void {
    this._dirtyLayers.add(layerId);
    this.frameBuilder.markDirty(layerId);
  }

  /**
   * Force one synchronous frame render.
   * Used for one-shot output screens that don't need a continuous render loop.
   * Must be called after initialize(). Temporarily starts the loop if needed.
   */
  syncFrame(): void {
    if (this._destroyed) return;
    const wasRunning = this._running;
    if (!wasRunning) {
      this._running = true;
      this._lastFrameTime = performance.now();
    }
    this._tick();
    if (!wasRunning) {
      this._running = false;
    }
  }

  /**
   * Set a custom terminal writer (defaults to process.stderr.write).
   */
  setTerminalWriter(writer: (data: string) => void): void {
    this._terminalWriter = writer;
  }

  // ── Accessors ─────────────────────────────────────────────────

  /** Whether the render loop is running. */
  get isRunning(): boolean {
    return this._running;
  }

  /** Whether the runtime has been initialized. */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /** The theme used by this runtime. */
  get theme(): ThemeV2 {
    return this._theme;
  }

  /** Current terminal width. */
  get width(): number {
    return this._width;
  }

  /** Current terminal height. */
  get height(): number {
    return this._height;
  }

  /** Current frame number. */
  get frameNumber(): number {
    return this._frameNumber;
  }

  /** Smoothed FPS. */
  get fps(): number {
    return this._smoothedFps;
  }

  /** Get the current FrameContext (null if not in a frame). */
  get currentContext(): FrameContext | null {
    return this._context;
  }

  // ── Internal ──────────────────────────────────────────────────

  /**
   * Main render tick — the heart of the runtime.
   */
  private _tick(): void {
    if (!this._running || this._destroyed) return;

    const tickStart = performance.now();

    // ── 1. Frame Timing ──────────────────────────────────────────
    const now = performance.now();
    const dt = now - this._lastFrameTime;
    this._lastFrameTime = now;
    this._elapsedMs += dt;
    this._frameNumber++;

    // Update smoothed FPS (exponential moving average)
    const instantFps = 1000 / dt;
    this._smoothedFps = this._smoothedFps * 0.9 + instantFps * 0.1;

    const timing = {
      ...createInitialFrameTiming({ maxFrameBudgetMs: this._maxFrameBudgetMs }),
      frameNumber: this._frameNumber,
      deltaTimeMs: dt,
      fps: this._smoothedFps,
      elapsedMs: this._elapsedMs,
      timestamp: now,
    };

    // ── 2. Update Animations & Transitions ───────────────────────
    this.transitionManager.update(dt);

    const activeTransition = this.transitionManager.current
      ? {
          type: this.transitionManager.current.config.type,
          progress: this.transitionManager.current.progress,
          duration: this.transitionManager.current.config.duration,
          fromScreen: this.transitionManager.current.fromScreen ?? '',
          toScreen: this.transitionManager.current.toScreen,
        }
      : null;

    // ── 3. Build Workspace Snapshot ──────────────────────────────
    const wsCtx = this.workspaceManager.getContext();
    const workspaceSnapshot = {
      activeScreenId: wsCtx.activeScreenId,
      selectedId: wsCtx.selection?.id ?? null,
      searchQuery: wsCtx.search.query,
      searchActive: wsCtx.search.active,
      paletteOpen: this.overlayManager.isVisible('palette'),
      scrollOffset: wsCtx.scroll.offset,
      historyDepth: wsCtx.screenHistory.length,
      topOverlayId: this.overlayManager.getState().topmost?.id ?? null,
      modalVisible: this.overlayManager.hasModal || wsCtx.rawMode,
    };

    // ── 4. Build FrameContext ────────────────────────────────────
    const fullRedraw = this._fullRedrawRequested;

    const frameContext: FrameContext = {
      timing: { ...timing, frameTimeMs: 0 },
      width: this._width,
      height: this._height,
      theme: this._theme,
      workspace: workspaceSnapshot,
      dirtyLayers: new Set(this._dirtyLayers),
      dirtyRects: [],
      fullRedraw,
      activeTransition,
      frame: this._frameNumber,
      dt,
    };

    this._context = frameContext;

    // ── 5. Evaluate Frame Budget ─────────────────────────────────
    const budget = evaluateBudget(0, this._maxFrameBudgetMs);
    const skip = budget.skipFlags;

    // ── 6. Build Frame (collect dirty layer content) ─────────────
    const buildStart = performance.now();
    const layerContents = this.frameBuilder.build(frameContext, !fullRedraw);
    const buildMs = performance.now() - buildStart;

    // ── 7. Compose Layers ────────────────────────────────────────
    const composeStart = performance.now();
    const composedFrame = this.layerComposer.compose(
      layerContents,
      this._width,
      this._height,
      this._theme,
    );
    const composeMs = performance.now() - composeStart;

    // ── 8. Write to Double Buffer ────────────────────────────────
    for (let y = 0; y < composedFrame.textLines.length && y < this._height; y++) {
      const text = composedFrame.textLines[y] ?? ' '.repeat(this._width);
      this.doubleBuffer.writeString(0, y, text, '');
    }

    // ── 9. Diff & Generate Output ────────────────────────────────
    const diffStart = performance.now();
    const changes = fullRedraw
      ? [] // Full redraw generates all cells
      : this.doubleBuffer.diff();

    const diffResult = this.diffEngine.computeDiff(
      changes,
      this._width,
      this._height,
    );
    const diffMs = performance.now() - diffStart;

    // ── 10. Write to Terminal ─────────────────────────────────────
    const flushStart = performance.now();

    if (fullRedraw && composedFrame.textLines.length > 0) {
      // Full redraw: write all lines
      const output = this.diffEngine.buildFullOutput(composedFrame.textLines);
      if (output) {
        this._terminalWriter('\x1b[?25l'); // Hide cursor
        this._terminalWriter('\x1b[H');    // Cursor to home
        this._terminalWriter(output);
      }
      this._fullRedrawRequested = false;
    } else if (diffResult.changes.length > 0) {
      const output = this.diffEngine.buildOutput(diffResult.changes);
      if (output) {
        this._terminalWriter(output);
      }
    }

    const flushMs = performance.now() - flushStart;

    // ── 11. Swap Buffers ─────────────────────────────────────────
    if (!fullRedraw) {
      this.doubleBuffer.swap();
    }

    // ── 12. Compute Actual Frame Time ────────────────────────────
    const frameTimeMs = performance.now() - tickStart;
    timing.frameTimeMs = frameTimeMs;

    // Evaluate budget with actual time
    const actualBudget = evaluateBudget(frameTimeMs, this._maxFrameBudgetMs);

    // ── 13. Clear Dirty State ────────────────────────────────────
    this._dirtyLayers.clear();

    // ── 14. Emit Frame Rendered Event ────────────────────────────
    const stats: PipelineFrameStats = {
      frameNumber: this._frameNumber,
      buildMs,
      composeMs,
      diffMs,
      flushMs,
      totalMs: frameTimeMs,
      changedCells: fullRedraw ? this._width * this._height : diffResult.changes.length,
      fullRedraw,
    };

    this.eventBus.emit('frame-rendered', {
      frameNumber: stats.frameNumber,
      frameTimeMs: stats.totalMs,
      fullRedraw: stats.fullRedraw,
      changedCells: stats.changedCells,
    }, 'runtime');

    // Debug logging
    if (this._debug && this._frameNumber % 60 === 0) {
      this._log(
        `[Frame ${this._frameNumber}] ${stats.totalMs.toFixed(1)}ms ` +
        `(build:${buildMs.toFixed(1)} compose:${composeMs.toFixed(1)} ` +
        `diff:${diffMs.toFixed(1)} flush:${flushMs.toFixed(1)}) ` +
        `cells:${stats.changedCells} ${this._smoothedFps.toFixed(0)}fps` +
        (actualBudget.withinBudget ? '' : ` OVER_BUDGET(+${actualBudget.overageMs.toFixed(0)}ms)`),
      );
    }
  }

  /**
   * Register a FrameGraph layer with the FrameBuilder.
   */
  private _registerLayer(layerId: FrameGraphLayerId): void {
    const node = this.frameGraph.getNode(layerId);
    if (!node) return;

    const zIndex = node.zIndex;

    this.frameBuilder.registerLayer(layerId, zIndex, (ctx: FrameContext) => {
      // Get the renderer from the FrameGraph and call it
      const graphNode = this.frameGraph.getNode(layerId);
      if (!graphNode || !this.frameGraph.isVisible(layerId)) {
        return [];
      }
      return graphNode.render(ctx);
    });
  }

  /**
   * Log a debug message.
   */
  private _log(message: string): void {
    if (this._debug) {
      process.stderr.write(`${message}\n`);
    }
  }
}
