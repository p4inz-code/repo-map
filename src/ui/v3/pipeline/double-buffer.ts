/**
 * DoubleBuffer — the frame storage and diffing engine for the V3 Render Pipeline.
 *
 * Maintains two buffers (front and back) for frame-at-a-time diffing:
 * - Front buffer: the last committed frame rendered to the terminal.
 * - Back buffer: the current frame being built.
 *
 * # Architecture
 * ```
 * DoubleBuffer
 *   ├── Front Buffer (Cell[][]): last committed frame
 *   ├── Back Buffer (Cell[][]):  current frame being built
 *   ├── write(x, y, char, style)
 *   ├── diff() → CellChange[]
 *   ├── swap()  → back becomes front
 *   └── clear() → reset back buffer
 * ```
 *
 * # Diff Algorithm
 * - Compares each cell between front and back buffers.
 * - Only reports cells where char OR style has changed.
 * - Optimized for sparse changes: typical frames have <5% change rate.
 *
 * # Memory
 * - 2 × (width × height) cells.
 * - Each cell stores { char: string, style: string }.
 * - For a 120×40 terminal: ~19KB per buffer, ~38KB total.
 *
 * # Determinism
 * - write() and diff() are deterministic for the same sequence of inputs.
 * - No external state is consulted beyond the cell buffers.
 */

import type { CellChange } from './types.js';

// ─── Cell ─────────────────────────────────────────────────────────

/**
 * A single cell in the frame buffer.
 * Represents one character cell of the terminal.
 */
interface Cell {
  char: string;
  style: string;
}

// ─── DoubleBuffer ─────────────────────────────────────────────────

export class DoubleBuffer {
  private _width: number;
  private _height: number;
  private _front: Cell[][];
  private _back: Cell[][];

  /**
   * @param width  - Terminal width in character cells.
   * @param height - Terminal height in character cells.
   */
  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
    this._front = this._createEmpty(width, height);
    this._back = this._createEmpty(width, height);
  }

  // ── Buffer Management ─────────────────────────────────────────

  /**
   * Resize both buffers to new dimensions.
   * All existing content is discarded.
   */
  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this._front = this._createEmpty(width, height);
    this._back = this._createEmpty(width, height);
  }

  /**
   * Clear the back buffer to spaces.
   */
  clearBack(): void {
    for (let y = 0; y < this._height; y++) {
      const row = this._back[y];
      for (let x = 0; x < this._width; x++) {
        row[x] = { char: ' ', style: '' };
      }
    }
  }

  /**
   * Clear the front buffer to spaces.
   */
  clearFront(): void {
    for (let y = 0; y < this._height; y++) {
      const row = this._front[y];
      for (let x = 0; x < this._width; x++) {
        row[x] = { char: ' ', style: '' };
      }
    }
  }

  /**
   * Clear both buffers.
   */
  clearAll(): void {
    this.clearBack();
    this.clearFront();
  }

  // ── Writing ───────────────────────────────────────────────────

  /**
   * Write a single character to the back buffer.
   */
  write(x: number, y: number, char: string, style: string): void {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return;
    this._back[y][x] = { char, style };
  }

  /**
   * Write a string to the back buffer starting at (x, y).
   * Characters beyond the terminal width are clipped.
   */
  writeString(x: number, y: number, text: string, style: string): void {
    if (y < 0 || y >= this._height) return;
    const maxLen = Math.min(text.length, this._width - x);
    const row = this._back[y];
    for (let i = 0; i < maxLen; i++) {
      row[x + i] = { char: text[i], style };
    }
  }

  /**
   * Write an entire line (array of styled segments) to the back buffer.
   * Segments are concatenated horizontally from (x, y).
   */
  writeLine(x: number, y: number, segments: Array<{ text: string; style?: string }>): void {
    let cursorX = x;
    for (const seg of segments) {
      const style = seg.style ?? '';
      for (let i = 0; i < seg.text.length; i++) {
        if (cursorX >= this._width) break;
        this.write(cursorX, y, seg.text[i], style);
        cursorX++;
      }
    }
  }

  // ── Diffing ───────────────────────────────────────────────────

  /**
   * Diff the back buffer against the front buffer.
   * Returns only the cells that have changed (char or style).
   */
  diff(): CellChange[] {
    const changes: CellChange[] = [];

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

  /**
   * Diff only a specific rectangular region.
   * More efficient when only part of the screen changed.
   */
  diffRegion(
    regionX: number,
    regionY: number,
    regionWidth: number,
    regionHeight: number,
  ): CellChange[] {
    const changes: CellChange[] = [];
    const maxX = Math.min(regionX + regionWidth, this._width);
    const maxY = Math.min(regionY + regionHeight, this._height);

    for (let y = regionY; y < maxY; y++) {
      const frontRow = this._front[y];
      const backRow = this._back[y];
      for (let x = regionX; x < maxX; x++) {
        const front = frontRow[x];
        const back = backRow[x];
        if (front.char !== back.char || front.style !== back.style) {
          changes.push({ x, y, char: back.char, style: back.style });
        }
      }
    }

    return changes;
  }

  // ── Buffer Swap ───────────────────────────────────────────────

  /**
   * Swap the back buffer to the front.
   * The previous front buffer becomes the new back buffer.
   */
  swap(): void {
    const tmp = this._front;
    this._front = this._back;
    this._back = tmp;
  }

  // ── Accessors ─────────────────────────────────────────────────

  /** Terminal width. */
  get width(): number {
    return this._width;
  }

  /** Terminal height. */
  get height(): number {
    return this._height;
  }

  /** Get a shallow copy of a row from the front buffer. */
  getFrontRow(y: number): ReadonlyArray<{ char: string; style: string }> | undefined {
    return this._front[y];
  }

  /** Get the front buffer cell at (x, y), or undefined if out of bounds. */
  getFrontCell(x: number, y: number): Readonly<Cell> | undefined {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return undefined;
    return this._front[y][x];
  }

  /** Get the back buffer cell at (x, y), or undefined if out of bounds. */
  getBackCell(x: number, y: number): Readonly<Cell> | undefined {
    if (x < 0 || x >= this._width || y < 0 || y >= this._height) return undefined;
    return this._back[y][x];
  }

  // ── Internal ──────────────────────────────────────────────────

  /**
   * Create an empty cell buffer filled with spaces.
   */
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
}
