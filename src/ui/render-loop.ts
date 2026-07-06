/**
 * RenderLoop — the global animation and render scheduler.
 *
 * A single requestAnimationFrame/setInterval-style loop that:
 * - Checks dirty state from the Store
 * - Only re-renders dirty components (dirty-state rendering)
 * - Reuses render buffers when nothing changed
 * - Handles terminal resize (SIGWINCH) via callback
 * - Provides proper cleanup on exit
 *
 * # Architecture
 * - One RenderLoop per App instance.
 * - Runs at ~60fps (16ms interval) but does NO work when dirty set is empty.
 * - Components register themselves and mark themselves dirty on state change.
 * - Full redraw (e.g., after resize) triggers re-render of all components.
 *
 * # Lifecycle
 * ```
 * const loop = new RenderLoop(store, () => renderCallback());
 * loop.start();
 * // ... dirty components get re-rendered on next tick ...
 * loop.stop();
 * ```
 *
 * # Dirty-state Algorithm
 * 1. On each tick, check if any components are dirty or fullRedraw is set.
 * 2. If nothing is dirty, skip entirely (no work, no terminal writes).
 * 3. If dirty, collect all dirty component render outputs.
 * 4. Compute terminal update (clear old + write new).
 * 5. Write to stderr.
 * 6. Clear dirty flags.
 */

import { Store } from './state/index.js';
import { clearLine, cursorUp, cursorDown } from './utils/ansi.js';

// ─── Constants ─────────────────────────────────────────────────

/** Target interval in ms. 16ms ≈ 60fps, but we use 33ms (30fps) for TUI. */
const TICK_INTERVAL_MS = 33;

// ─── Types ─────────────────────────────────────────────────────

/**
 * Callback for rendering the current frame.
 * Returns an array of ANSI-wrapped terminal lines.
 * The RenderLoop handles cursor positioning and clearing.
 */
export type RenderCallback = () => string[];

/**
 * Callback for handling terminal resize events.
 */
export type ResizeCallback = (columns: number, rows: number) => void;

/**
 * Callback for writing output to the terminal.
 */
export type OutputWriter = (output: string) => void;

// ─── RenderLoop ────────────────────────────────────────────────

export class RenderLoop {
  private _store: Store;
  private _renderCallback: RenderCallback | null = null;
  private _resizeCallback: ResizeCallback | null = null;
  private _outputWriter: OutputWriter;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _running: boolean = false;
  private _lastRenderedLines: number = 0;
  private _pendingResize: boolean = false;
  private _boundResize: (() => void) | null = null;

  /** Counter of total frames rendered (for debugging). */
  private _frameCount: number = 0;

  /**
   * @param store - The application store (for reading dirty state).
   * @param outputWriter - Function that writes output to the terminal.
   */
  constructor(store: Store, outputWriter: OutputWriter = (o) => process.stderr.write(o)) {
    this._store = store;
    this._outputWriter = outputWriter;
  }

  // ── Configuration ────────────────────────────────────────────

  /**
   * Set the render callback. Called when dirty components need re-rendering.
   * Should return the full frame lines to display (already ANSI-wrapped).
   */
  onRender(callback: RenderCallback): void {
    this._renderCallback = callback;
  }

  /**
   * Set the resize callback. Called when the terminal is resized.
   */
  onResize(callback: ResizeCallback): void {
    this._resizeCallback = callback;
  }

  /**
   * Override the output writer (useful for testing).
   */
  setOutputWriter(writer: OutputWriter): void {
    this._outputWriter = writer;
  }

  // ── Lifecycle ────────────────────────────────────────────────

  /**
   * Start the render loop.
   *
   * The loop ticks at ~30fps but only does work when dirty components exist.
   * Subscribes to SIGWINCH for resize events.
   *
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  start(): void {
    if (this._running) return;

    this._running = true;
    this._pendingResize = false;

    // Subscribe to resize events via SIGWINCH
    this._boundResize = () => {
      this._pendingResize = true;
      this._markFullRedraw();
    };

    try {
      process.stdout.on('resize', this._boundResize);
    } catch {
      // SIGWINCH not available on all platforms
    }

    // Start the tick loop
    this._timer = setInterval(() => this._tick(), TICK_INTERVAL_MS);
  }

  /**
   * Stop the render loop.
   *
   * Clears the timer and removes resize listener.
   * Safe to call multiple times.
   */
  stop(): void {
    this._running = false;

    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }

    if (this._boundResize) {
      try {
        process.stdout.removeListener('resize', this._boundResize);
      } catch {
        // Ignore errors during cleanup
      }
      this._boundResize = null;
    }
  }

  /**
   * Trigger a full redraw on the next tick.
   */
  requestFullRedraw(): void {
    this._markFullRedraw();
  }

  /**
   * Get the total number of frames rendered.
   */
  get frameCount(): number {
    return this._frameCount;
  }

  /**
   * Whether the loop is currently running.
   */
  get running(): boolean {
    return this._running;
  }

  /**
   * Clear the last rendered frame from the terminal.
   */
  clearScreen(): void {
    if (this._lastRenderedLines > 0) {
      const output: string[] = [];
      output.push(cursorUp(this._lastRenderedLines));
      for (let i = 0; i < this._lastRenderedLines; i++) {
        output.push(clearLine());
        if (i < this._lastRenderedLines - 1) {
          output.push(cursorDown(1));
        }
      }
      this._writeOutput(output.join(''));
      this._lastRenderedLines = 0;
    }
  }

  // ── Internal ─────────────────────────────────────────────────

  /**
   * Main tick function. Called at ~30fps.
   */
  private _tick(): void {
    const state = this._store.getState();

    // Check if resize is pending
    if (this._pendingResize && this._resizeCallback) {
      this._pendingResize = false;
      const columns = process.stdout.columns ?? 80;
      const rows = process.stdout.rows ?? 24;
      this._resizeCallback(columns, rows);
    }

    // Check if anything needs rendering
    if (!state.dirty.fullRedraw && state.dirty.dirtyComponents.size === 0 && !state.dirty.layoutDirty) {
      return; // Nothing to render — skip this tick
    }

    // We have work to do — call the render callback
    if (!this._renderCallback) return;

    const frameLines = this._renderCallback();

    if (frameLines.length === 0) {
      // Clear dirty flags and return
      this._clearDirty(state);
      return;
    }

    // Build the terminal update: cursor-up to overwrite previous frame
    const output: string[] = [];

    if (this._lastRenderedLines > 0) {
      output.push(cursorUp(this._lastRenderedLines));
    }

    // Write the new frame
    output.push(...frameLines);

    // Write to terminal
    this._writeOutput(output.join(''));

    // Track rendered line count for next update
    this._lastRenderedLines = frameLines.length;

    // Clear dirty flags
    this._clearDirty(state);

    this._frameCount++;
  }

  /**
   * Mark all components as dirty for a full redraw.
   */
  private _markFullRedraw(): void {
    const state = this._store.getState();
    this._store.setState({
      dirty: {
        ...state.dirty,
        fullRedraw: true,
        layoutDirty: true,
      },
    });
  }

  /**
   * Clear dirty flags after rendering.
   */
  private _clearDirty(state: ReturnType<Store['getState']>): void {
    this._store.setState({
      dirty: {
        ...state.dirty,
        dirtyComponents: new Set<string>(),
        fullRedraw: false,
        layoutDirty: false,
      },
      renderTick: state.renderTick + 1,
    });
  }

  /**
   * Write output to the terminal via the configured writer.
   */
  private _writeOutput(output: string): void {
    if (output.length > 0) {
      this._outputWriter(output);
    }
  }
}
