/**
 * ResizeManager v2 — handles terminal resize events with
 * minimum/maximum size enforcement, re-layout triggering,
 * state preservation, and flicker-free operation.
 *
 * # Architecture
 * ```
 * ResizeManager
 *   ├── Terminal listener (SIGWINCH / process.stdout.resize)
 *   ├── Size constraints (min/max width/height)
 *   ├── Callback dispatcher (re-layout, re-render notifications)
 *   └── Debounce (rate-limit resize handling)
 * ```
 *
 * # Behavior
 * - Listens to terminal resize events via process.stdout 'resize'.
 * - Enforces minimum size: if terminal is too small, triggers a
 *   "terminal too small" state rather than broken rendering.
 * - Preserves application state: resize does not reset selections,
 *   scroll positions, or active views.
 * - Notifies registered callbacks so the layout engine can recompute.
 * - Debounces at 100ms to avoid excessive re-layout during resize.
 *
 * # Resize Flow
 * ```
 * Terminal resize → ResizeManager detects change
 *   → Enforce min/max constraints
 *   → Notify layout callbacks → LayoutEngine recomputes
 *   → Notify render callbacks → LayerRenderer.fullRedraw()
 *   → Components re-render with new dimensions
 * ```
 *
 * # Minimum Size
 * - minWidth: 40 columns (below this, show "terminal too small")
 * - minHeight: 10 rows (below this, show "terminal too small")
 *
 * @example
 * ```ts
 * const rm = new ResizeManager();
 * rm.onResize((width, height) => {
 *   renderer.resize(width, height);
 *   renderer.requestFullRedraw();
 * });
 * rm.start();
 * ```
 */

// ─── Constants ─────────────────────────────────────────────────────

/** Default minimum terminal width. */
const DEFAULT_MIN_WIDTH = 40;

/** Default minimum terminal height. */
const DEFAULT_MIN_HEIGHT = 10;

/** Maximum terminal width (capped for performance). */
const DEFAULT_MAX_WIDTH = 400;

/** Maximum terminal height (capped for performance). */
const DEFAULT_MAX_HEIGHT = 200;

/** Debounce interval in ms. */
const DEBOUNCE_MS = 100;

// ─── Types ────────────────────────────────────────────────────────

export type ResizeCallback = (width: number, height: number) => void;

export interface ResizeManagerOptions {
  /** Minimum terminal width. Default: 40. */
  minWidth?: number;
  /** Minimum terminal height. Default: 10. */
  minHeight?: number;
  /** Maximum terminal width. Default: 400. */
  maxWidth?: number;
  /** Maximum terminal height. Default: 200. */
  maxHeight?: number;
  /** Debounce interval in ms. Default: 100. */
  debounceMs?: number;
}

export interface TerminalSize {
  /** Terminal width in columns. */
  columns: number;
  /** Terminal height in rows. */
  rows: number;
  /** Whether the terminal meets minimum size requirements. */
  valid: boolean;
}

// ─── ResizeManager ─────────────────────────────────────────────────

export class ResizeManager {
  private _minWidth: number;
  private _minHeight: number;
  private _maxWidth: number;
  private _maxHeight: number;
  private _debounceMs: number;
  private _callbacks: ResizeCallback[] = [];
  private _lastSize: TerminalSize;
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private _boundHandler: (() => void) | null = null;
  private _running: boolean = false;

  constructor(options?: ResizeManagerOptions) {
    this._minWidth = options?.minWidth ?? DEFAULT_MIN_WIDTH;
    this._minHeight = options?.minHeight ?? DEFAULT_MIN_HEIGHT;
    this._maxWidth = options?.maxWidth ?? DEFAULT_MAX_WIDTH;
    this._maxHeight = options?.maxHeight ?? DEFAULT_MAX_HEIGHT;
    this._debounceMs = options?.debounceMs ?? DEBOUNCE_MS;
    this._lastSize = this._detectSize();
  }

  // ── Lifecycle ───────────────────────────────────────────────────

  /**
   * Start listening for terminal resize events.
   * Safe to call multiple times.
   */
  start(): void {
    if (this._running) return;

    this._boundHandler = () => this._handleResize();
    try {
      process.stdout.on('resize', this._boundHandler);
    } catch {
      // Not all platforms support 'resize' events
    }
    this._running = true;
  }

  /**
   * Stop listening for resize events.
   */
  stop(): void {
    if (!this._running) return;

    if (this._boundHandler) {
      try {
        process.stdout.removeListener('resize', this._boundHandler);
      } catch {
        // Ignore cleanup errors
      }
      this._boundHandler = null;
    }

    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }

    this._running = false;
  }

  // ── Register callbacks ──────────────────────────────────────────

  /**
   * Register a callback for resize events.
   * Callback receives the new (width, height) after constraints.
   *
   * @param callback - Fired with (clampedWidth, clampedHeight) on resize.
   * @returns An unsubscribe function.
   */
  onResize(callback: ResizeCallback): () => void {
    this._callbacks.push(callback);
    return () => {
      const idx = this._callbacks.indexOf(callback);
      if (idx !== -1) {
        this._callbacks.splice(idx, 1);
      }
    };
  }

  /**
   * Remove all resize callbacks.
   */
  clearCallbacks(): void {
    this._callbacks = [];
  }

  // ── Accessors ───────────────────────────────────────────────────

  /**
   * Get the current terminal size (with constraints applied).
   */
  getSize(): TerminalSize {
    return this._detectSize();
  }

  /**
   * Get the last known valid terminal size.
   * Returns { columns: 80, rows: 24, valid: false } if never detected.
   */
  getLastSize(): TerminalSize {
    return this._lastSize;
  }

  /**
   * Get the minimum width.
   */
  get minWidth(): number {
    return this._minWidth;
  }

  /**
   * Get the minimum height.
   */
  get minHeight(): number {
    return this._minHeight;
  }

  /**
   * Whether the terminal is currently large enough for the UI.
   */
  get isTerminalValid(): boolean {
    return this._lastSize.valid;
  }

  // ── Internal ────────────────────────────────────────────────────

  /**
   * Detect the current terminal size, applying constraints.
   */
  private _detectSize(): TerminalSize {
    const rawColumns = process.stdout.columns ?? 80;
    const rawRows = process.stdout.rows ?? 24;

    const columns = Math.max(this._minWidth, Math.min(this._maxWidth, rawColumns));
    const rows = Math.max(this._minHeight, Math.min(this._maxHeight, rawRows));

    return {
      columns,
      rows,
      valid: rawColumns >= this._minWidth && rawRows >= this._minHeight,
    };
  }

  /**
   * Handle a resize event (debounced).
   */
  private _handleResize(): void {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
    }

    this._debounceTimer = setTimeout(() => {
      this._debounceTimer = null;
      this._processResize();
    }, this._debounceMs);
  }

  /**
   * Process a resize: detect size, update last size, fire callbacks.
   */
  private _processResize(): void {
    const newSize = this._detectSize();
    const oldSize = this._lastSize;
    this._lastSize = newSize;

    // Only fire callbacks if size actually changed
    if (newSize.columns === oldSize.columns && newSize.rows === oldSize.rows) {
      return;
    }

    // Fire all callbacks
    for (const cb of this._callbacks) {
      try {
        cb(newSize.columns, newSize.rows);
      } catch {
        // Swallow individual callback errors
      }
    }
  }
}
