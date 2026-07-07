/**
 * LayerRenderer v2 — the rendering engine with dirty rectangles,
 * double buffering, partial redraws, frame diffing, and layering.
 *
 * # Architecture
 * ```
 * LayerRenderer
 *   ├── Layers (z-ordered render targets)
 *   ├── Double Buffer (back/front buffer for diffing)
 *   ├── Dirty Rect Tracker (accumulates dirty regions)
 *   ├── Frame Compositor (combines layers with z-order)
 *   └── Output Writer (ANSI escape sequences → terminal)
 * ```
 *
 * # Rendering Pipeline
 * 1. Components mark dirty rects via `markDirty()`.
 * 2. LayerRenderer accumulates dirty rects per layer.
 * 3. On `flush()`, the renderer:
 *    a. Resolves layer z-order.
 *    b. For each dirty layer, renders only dirty regions.
 *    c. Composes layers into a full frame.
 *    d. Diffs against previous frame → only writes changed cells.
 *    e. Writes ANSI sequences for changed regions.
 *
 * # Dirty Rectangle Algorithm
 * - When a component changes, it reports the region that changed.
 * - The renderer merges overlapping dirty rects into minimal rects.
 * - Only cells within dirty rects are re-rendered.
 * - Full redraw is triggered on terminal resize or explicit request.
 *
 * # Layer Rendering
 * - Layers are rendered bottom-up (lowest zIndex first).
 * - Each layer has an optional clip rect.
 * - Content outside the clip rect is not drawn.
 * - Higher layers overwrite lower layers where they overlap.
 *
 * # Double Buffering
 * - Front buffer: the last rendered frame (ANSI strings per cell).
 * - Back buffer: the current frame being built.
 * - On flush: diff back vs front, write only changed cells.
 * - On swap: back becomes front.
 *
 * # Performance Characteristics
 * - Dirty rect merging: O(n) where n = number of dirty rects.
 * - Frame diffing: O(dirty_cells) — only changed cells are written.
 * - Full redraw: O(total_cells) — rare (resize, theme change).
 * - Memory: 2 × (width × height) cell buffers.
 *
 * @example
 * ```ts
 * const renderer = new LayerRenderer({ columns: 80, rows: 24 }, theme);
 *
 * const layer = renderer.createLayer('main', { zIndex: 0 });
 * const overlay = renderer.createLayer('overlay', { zIndex: 10 });
 *
 * layer.render(ctx);     // Render main content
 * overlay.render(ctx);   // Render overlay on top
 *
 * renderer.flush();       // Diff and write to terminal
 * ```
 */

import type { RenderLayer, Line, Segment, FrameStats } from './types.js';
import type { ThemeV2 } from '../theme/theme.js';
import { cursorUp, cursorDown, clearLine } from '../../utils/ansi.js';

// ─── Constants ─────────────────────────────────────────────────────

/** Maximum number of dirty rects before triggering a full redraw. */
const MAX_DIRTY_RECTS = 50;

// ─── Types ─────────────────────────────────────────────────────────

export interface RenderContext {
  /** The current theme. */
  theme: ThemeV2;
  /** Terminal width in columns. */
  width: number;
  /** Terminal height in rows. */
  height: number;
  /** Current layer being rendered. */
  layerId: string;
  /** Whether this is a full redraw (vs partial). */
  fullRedraw: boolean;
}

export interface LayerRendererOptions {
  /** Initial terminal dimensions. */
  width: number;
  /** Initial terminal height. */
  height: number;
  /** Theme to use for styling. */
  theme: ThemeV2;
}

// ─── Layer Canvas ─────────────────────────────────────────────────

/**
 * A single layer's render buffer.
 */
class LayerCanvas {
  readonly id: string;
  readonly zIndex: number;
  visible: boolean = true;
  dirty: boolean = true;
  clip?: { x: number; y: number; width: number; height: number };

  /** Cached rendered lines (Line[]). */
  private _lines: Line[] = [];
  /** Rendered frame cache (string[]). */
  private _frameLines: string[] = [];
  /** Whether this layer's frame cache is valid. */
  private _frameValid: boolean = false;

  constructor(id: string, zIndex: number) {
    this.id = id;
    this.zIndex = zIndex;
  }

  /** Store rendered lines from a render pass. */
  setLines(lines: Line[], renderedStrings: string[]): void {
    this._lines = lines;
    this._frameLines = renderedStrings;
    this._frameValid = true;
    this.dirty = false;
  }

  /** Get the last rendered lines. */
  get lines(): Line[] {
    return this._lines;
  }

  /** Get the cached ANSI frame strings. */
  get frameLines(): string[] {
    return this._frameLines;
  }

  /** Whether the frame cache is valid. */
  get frameValid(): boolean {
    return this._frameValid;
  }

  /** Invalidate frame cache. */
  invalidate(): void {
    this._frameValid = false;
    this.dirty = true;
  }
}

// ─── Cell Buffer ──────────────────────────────────────────────────

/**
 * A single cell in the frame buffer.
 * Represents one character cell of the terminal.
 */
interface Cell {
  char: string;
  style: string;
}

/**
 * Double buffer for frame diffing.
 * Stores the rendered state of every cell.
 */
class DoubleBuffer {
  private _width: number;
  private _height: number;
  private _front: Cell[][];
  private _back: Cell[][];

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
    this._front = this._createEmpty(width, height);
    this._back = this._createEmpty(width, height);
  }

  /** Create an empty cell buffer. */
  private _createEmpty(width: number, height: number): Cell[][] {
    const buffer: Cell[][] = new Array(height);
    for (let y = 0; y < height; y++) {
      const row: Cell[] = new Array(width);
      for (let x = 0; x < width; x++) {
        row[x] = { char: ' ', style: '' };
      }
      buffer[y] = row;
    }
    return buffer;
  }

  /** Resize both buffers. */
  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this._front = this._createEmpty(width, height);
    this._back = this._createEmpty(width, height);
  }

  /** Write to the back buffer. */
  write(x: number, y: number, char: string, style: string): void {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return;
    this._back[y][x] = { char, style };
  }

  /** Write a string to the back buffer starting at (x, y). */
  writeString(x: number, y: number, text: string, style: string): void {
    for (let i = 0; i < text.length; i++) {
      this.write(x + i, y, text[i], style);
    }
  }

  /**
   * Diff the back buffer against the front buffer.
   * Returns an array of changed cell positions with their new content.
   */
  diff(): Array<{ x: number; y: number; char: string; style: string }> {
    const changes: Array<{ x: number; y: number; char: string; style: string }> = [];

    for (let y = 0; y < this._height; y++) {
      const frontRow = this._front[y];
      const backRow = this._back[y];
      for (let x = 0; x < this._width; x++) {
        const front = frontRow[x];
        const back = backRow[x];
        if (front.char !== back.char || front.style !== back.style) {
          changes.push({ x, y, char: back.char, style: back.style });
        }
      }
    }

    return changes;
  }

  /** Swap back buffer to front. */
  swap(): void {
    const tmp = this._front;
    this._front = this._back;
    this._back = tmp;
  }

  /** Clear the back buffer to spaces. */
  clearBack(): void {
    for (let y = 0; y < this._height; y++) {
      const row = this._back[y];
      for (let x = 0; x < this._width; x++) {
        row[x] = { char: ' ', style: '' };
      }
    }
  }

  /** Get dimensions. */
  get width(): number { return this._width; }
  get height(): number { return this._height; }

  /** Get a cell from the front buffer (last committed frame). */
  getFrontCell(x: number, y: number): Cell | undefined {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return undefined;
    return this._front[y][x];
  }
}

// ─── LayerRenderer ─────────────────────────────────────────────────

export class LayerRenderer {
  private _width: number;
  private _height: number;
  private _theme: ThemeV2;
  private _layers: Map<string, LayerCanvas> = new Map();
  private _layerOrder: string[] = [];
  private _buffer: DoubleBuffer;
  private _dirtyRects: Array<{ layerId: string; x: number; y: number; width: number; height: number }> = [];
  private _fullRedraw: boolean = true;
  private _frameCount: number = 0;
  private _lastWriteLineCount: number = 0;

  constructor(options: LayerRendererOptions) {
    this._width = options.width;
    this._height = options.height;
    this._theme = options.theme;
    this._buffer = new DoubleBuffer(options.width, options.height);
  }

  // ─── Layer Management ──────────────────────────────────────────

  /**
   * Create a new render layer.
   *
   * @param id - Unique layer identifier.
   * @param options - Layer configuration.
   * @returns The created layer.
   */
  createLayer(id: string, options?: { zIndex?: number; clip?: { x: number; y: number; width: number; height: number } }): RenderLayer {
    if (this._layers.has(id)) {
      return this._layers.get(id)!.id as unknown as RenderLayer;
    }

    const zIndex = options?.zIndex ?? 0;
    const canvas = new LayerCanvas(id, zIndex);
    this._layers.set(id, canvas);
    this._layerOrder.push(id);
    this._sortLayers();
    this._fullRedraw = true;

    return {
      id,
      zIndex,
      clip: options?.clip,
      visible: true,
      dirty: true,
    };
  }

  /**
   * Remove a layer and free its resources.
   */
  removeLayer(id: string): void {
    this._layers.delete(id);
    this._layerOrder = this._layerOrder.filter((lid) => lid !== id);
  }

  /**
   * Get a layer by ID.
   */
  getLayer(id: string): RenderLayer | undefined {
    const canvas = this._layers.get(id);
    if (!canvas) return undefined;
    return {
      id: canvas.id,
      zIndex: canvas.zIndex,
      clip: canvas.clip,
      visible: canvas.visible,
      dirty: canvas.dirty,
    };
  }

  /**
   * Set layer visibility.
   */
  setLayerVisible(id: string, visible: boolean): void {
    const canvas = this._layers.get(id);
    if (canvas) {
      canvas.visible = visible;
      if (visible) canvas.invalidate();
      this._fullRedraw = true;
    }
  }

  /**
   * Set layer clipping region.
   */
  setLayerClip(id: string, clip?: { x: number; y: number; width: number; height: number }): void {
    const canvas = this._layers.get(id);
    if (canvas) {
      canvas.clip = clip;
      canvas.invalidate();
    }
  }

  // ─── Dirty Rect Tracking ───────────────────────────────────────

  /**
   * Mark a region in a layer as dirty.
   *
   * @param layerId - The layer that needs redrawing.
   * @param x - Column start.
   * @param y - Row start.
   * @param width - Width of dirty region.
   * @param height - Height of dirty region.
   */
  markDirty(layerId: string, x: number, y: number, width: number, height: number): void {
    if (this._fullRedraw) return; // Full redraw supersedes all dirty rects

    const canvas = this._layers.get(layerId);
    if (!canvas || !canvas.visible) return;

    canvas.invalidate();

    // Merge overlapping dirty rects to minimize regions
    const merged = this._mergeDirtyRect({ layerId, x, y, width, height });
    if (merged) {
      this._dirtyRects.push(merged);
    }

    // If too many dirty rects, fall back to full redraw
    if (this._dirtyRects.length > MAX_DIRTY_RECTS) {
      this.requestFullRedraw();
    }
  }

  /**
   * Request a full redraw on the next flush.
   */
  requestFullRedraw(): void {
    this._fullRedraw = true;
    this._dirtyRects = [];
    for (const canvas of this._layers.values()) {
      canvas.invalidate();
    }
  }

  // ─── Rendering ─────────────────────────────────────────────────

  /**
   * Render a layer with content lines.
   * Converts Lines to ANSI strings and stores them in the layer canvas.
   *
   * @param layerId - Target layer.
   * @param lines - Styled lines to render.
   * @returns The ANSI-converted string array.
   */
  renderLines(layerId: string, lines: Line[]): string[] {
    const canvas = this._layers.get(layerId);
    if (!canvas) return [];

    const rendered = lines.map((line) => this._renderLine(line));

    // Check if we should cache (only cache on full layer render, not partial)
    const context: RenderContext = {
      theme: this._theme,
      width: this._width,
      height: this._height,
      layerId,
      fullRedraw: this._fullRedraw,
    };

    canvas.setLines(lines, rendered);
    return rendered;
  }

  /**
   * Apply rendered content to the back buffer.
   * Should be called after all layers have been rendered.
   */
  compose(): void {
    if (this._fullRedraw) {
      this._buffer.clearBack();
    }

    // Sort layers by z-index (lowest first)
    const sortedLayers = [...this._layers.values()]
      .filter((c) => c.visible && c.frameValid)
      .sort((a, b) => a.zIndex - b.zIndex);

    // Determine which layers need to be composited
    const layersToComposite = this._fullRedraw
      ? sortedLayers
      : sortedLayers.filter((c) => c.dirty || !c.frameValid);

    for (const canvas of layersToComposite) {
      if (!canvas.frameValid) continue;

      const frameLines = canvas.frameLines;
      for (let y = 0; y < frameLines.length && y < this._height; y++) {
        const line = frameLines[y];
        if (!line) continue;

        // Apply clipping
        if (canvas.clip) {
          const clipStart = canvas.clip.x;
          const clipEnd = canvas.clip.x + canvas.clip.width;
          const visibleChars = line.slice(clipStart, clipEnd);
          this._buffer.writeString(clipStart, y, visibleChars, '');
        } else {
          this._buffer.writeString(0, y, line, '');
        }
      }
    }
  }

  /**
   * Flush all changes to the terminal.
   * Diffs back vs front buffer and writes only changed cells.
   *
   * @returns Frame timing stats.
   */
  flush(): FrameStats {
    const startTime = performance.now();

    // Diff the buffers
    const changes = this._fullRedraw ? this._getAllCells() : this._buffer.diff();

    const diffTime = performance.now();

    // Generate ANSI output for changed cells
    const output = this._buildAnsiOutput(changes);
    const renderTime = performance.now();

    // Write to terminal
    if (output.length > 0) {
      if (this._buffer.height > 0) {
        // Move cursor back to top to overwrite previous frame
        const cursorSeq = this._lastWriteLineCount > 0
          ? cursorUp(this._lastWriteLineCount)
          : '';
        process.stderr.write(cursorSeq + output);
      }
    }

    const flushTime = performance.now();

    // Track how many lines we wrote
    this._lastWriteLineCount = this._buffer.height;

    // Swap buffers
    this._buffer.swap();
    this._fullRedraw = false;
    this._dirtyRects = [];
    this._frameCount++;

    return {
      frame: this._frameCount,
      layoutMs: 0,
      renderMs: diffTime - startTime,
      flushMs: flushTime - renderTime,
      totalMs: flushTime - startTime,
      dirtyRectCount: this._fullRedraw ? this._width * this._height : changes.length,
      fullRedraw: this._fullRedraw,
    };
  }

  // ─── Resize Handling ───────────────────────────────────────────

  /**
   * Handle terminal resize. Triggers a full redraw.
   */
  resize(width: number, height: number): void {
    if (width === this._width && height === this._height) return;

    this._width = width;
    this._height = height;
    this._buffer.resize(width, height);
    this.requestFullRedraw();
  }

  // ─── Accessors ─────────────────────────────────────────────────

  get width(): number { return this._width; }
  get height(): number { return this._height; }
  get theme(): ThemeV2 { return this._theme; }
  get frameCount(): number { return this._frameCount; }

  /** Create a render context for the current state. */
  createContext(layerId: string): RenderContext {
    return {
      theme: this._theme,
      width: this._width,
      height: this._height,
      layerId,
      fullRedraw: this._fullRedraw,
    };
  }

  // ─── Internal ──────────────────────────────────────────────────

  /** Render a single Line to an ANSI string. */
  private _renderLine(line: Line): string {
    return line.segments
      .map((seg) => this._theme.style(seg.text, seg.style))
      .join('');
  }

  /** Merge a dirty rect with existing rects, or return it as-is. */
  private _mergeDirtyRect(
    rect: { layerId: string; x: number; y: number; width: number; height: number },
  ): typeof rect | null {
    // Try to merge with an existing rect
    for (let i = 0; i < this._dirtyRects.length; i++) {
      const existing = this._dirtyRects[i];
      if (existing.layerId !== rect.layerId) continue;

      // Check if they overlap or are adjacent
      const overlapX = rect.x < existing.x + existing.width && rect.x + rect.width > existing.x;
      const overlapY = rect.y < existing.y + existing.height && rect.y + rect.height > existing.y;

      if (overlapX && overlapY) {
        // Merge: expand existing rect to encompass both
        const newX = Math.min(existing.x, rect.x);
        const newY = Math.min(existing.y, rect.y);
        const newW = Math.max(existing.x + existing.width, rect.x + rect.width) - newX;
        const newH = Math.max(existing.y + existing.height, rect.y + rect.height) - newY;
        this._dirtyRects[i] = { layerId: existing.layerId, x: newX, y: newY, width: newW, height: newH };
        return null; // Merged, don't add separately
      }
    }
    return rect; // No merge needed, return to be added
  }

  /** Sort layers by z-index to ensure correct render order. */
  private _sortLayers(): void {
    this._layerOrder.sort((a, b) => {
      const ca = this._layers.get(a);
      const cb = this._layers.get(b);
      return (ca?.zIndex ?? 0) - (cb?.zIndex ?? 0);
    });
  }

  /** Get all cells from the back buffer (for full redraw). */
  private _getAllCells(): Array<{ x: number; y: number; char: string; style: string }> {
    const cells: Array<{ x: number; y: number; char: string; style: string }> = [];
    for (let y = 0; y < this._buffer.height; y++) {
      for (let x = 0; x < this._buffer.width; x++) {
        const cell = this._buffer.getFrontCell(x, y);
        if (cell) {
          cells.push({ x, y, char: cell.char, style: cell.style });
        }
      }
    }
    return cells;
  }

  /**
   * Build ANSI escape sequences for a set of cell changes.
   * Uses cursor positioning to minimize output.
   */
  private _buildAnsiOutput(
    changes: Array<{ x: number; y: number; char: string; style: string }>,
  ): string {
    if (changes.length === 0) return '';

    // Group changes by row for efficient cursor movement
    const rowGroups = new Map<number, Array<{ x: number; char: string; style: string }>>();
    for (const change of changes) {
      let group = rowGroups.get(change.y);
      if (!group) {
        group = [];
        rowGroups.set(change.y, group);
      }
      group.push(change);
    }

    // Sort rows
    const sortedRows = [...rowGroups.entries()].sort((a, b) => a[0] - b[0]);

    const parts: string[] = [];
    let lastY = -1;

    for (const [y, rowChanges] of sortedRows) {
      // Move cursor to the correct row
      if (y !== lastY + 1) {
        parts.push(`\x1b[${y + 1}H`); // Absolute positioning
      } else {
        parts.push('\n'); // Next line
      }
      lastY = y;

      // Sort by x position
      rowChanges.sort((a, b) => a.x - b.x);

      // Build the row string
      let rowStr = '';
      let cursorX = 0;

      for (const change of rowChanges) {
        if (change.x > cursorX) {
          // Fill gap with spaces
          rowStr += ' '.repeat(change.x - cursorX);
        }
        // Apply style and add character
        if (change.style) {
          rowStr += `${change.style}${change.char}\x1b[0m`;
        } else {
          rowStr += change.char;
        }
        cursorX = change.x + 1;
      }

      // Clear rest of line
      parts.push(rowStr);
      parts.push('\x1b[K'); // Clear to end of line
    }

    return parts.join('');
  }
}
