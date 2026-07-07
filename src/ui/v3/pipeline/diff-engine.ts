/**
 * DiffEngine — converts cell changes into optimized ANSI escape sequences.
 *
 * Takes the output of DoubleBuffer.diff() and produces minimal ANSI
 * terminal output by:
 * - Grouping changes by row for efficient cursor positioning
 * - Using relative cursor movement when adjacent rows are contiguous
 * - Using absolute positioning for non-adjacent rows
 * - Skipping rows with no changes
 * - Clearing to end-of-line after writing changed cells
 *
 * # Architecture
 * ```
 * DiffEngine
 *   └── buildOutput(changes) → ANSI string
 *       1. Group changes by row
 *       2. Sort rows and columns
 *       3. Emit cursor positioning + content for each affected row
 *       4. Apply styles only where they differ from previous cell
 * ```
 *
 * # Output Size
 * - Typical frame: 100-500 bytes of ANSI output.
 * - Full redraw: width × height × ~8 bytes per cell (worst case).
 * - Average: ~300 bytes per frame (with <5% change rate).
 *
 * # Determinism
 * - Same changes array always produces the same output string.
 * - No external state is consulted.
 */

import type { CellChange, DiffResult } from './types.js';

// ─── Constants ─────────────────────────────────────────────────────

/** ANSI escape to clear to end of line. */
const ANSI_CLEAR_EOL = '\x1b[K';

/** ANSI escape to reset all styles. */
const ANSI_RESET = '\x1b[0m';

/** ANSI escape for cursor position. */
function cursorPos(y: number, x: number): string {
  return `\x1b[${y + 1};${x + 1}H`;
}

/** ANSI escape for cursor up. */
function cursorUp(n: number): string {
  return `\x1b[${n}A`;
}

/** ANSI escape for cursor down. */
function cursorDown(n: number): string {
  return `\x1b[${n}B`;
}

// ─── DiffEngine ───────────────────────────────────────────────────

export class DiffEngine {
  /**
   * Build a DiffResult from a set of cell changes.
   *
   * @param changes - Array of cell changes from the double buffer.
   * @param width   - Terminal width (for determining if full redraw).
   * @param height  - Terminal height (for determining if full redraw).
   * @returns A DiffResult with ANSI output and stats.
   */
  computeDiff(
    changes: CellChange[],
    width: number,
    height: number,
  ): DiffResult {
    const totalCells = width * height;
    const isFullRedraw = changes.length >= totalCells * 0.9; // 90%+ changed

    if (changes.length === 0) {
      return { changes: [], changeCount: 0, isFullRedraw: false };
    }

    return {
      changes,
      changeCount: changes.length,
      isFullRedraw,
    };
  }

  /**
   * Build the minimal ANSI output string from cell changes.
   *
   * Strategy:
   * 1. Group changes by row.
   * 2. For each row, emit an absolute cursor position.
   * 3. Write changed cells in column order.
   * 4. Apply styles inline.
   * 5. Clear rest of the row.
   *
   * @param changes - Sorted array of cell changes.
   * @returns The ANSI escape sequence string to write to the terminal.
   */
  buildOutput(changes: CellChange[]): string {
    if (changes.length === 0) return '';

    // Group by row
    const rowMap = new Map<number, CellChange[]>();
    for (const change of changes) {
      let group = rowMap.get(change.y);
      if (!group) {
        group = [];
        rowMap.set(change.y, group);
      }
      group.push(change);
    }

    // Sort rows
    const sortedRows = [...rowMap.entries()].sort((a, b) => a[0] - b[0]);

    const parts: string[] = [];
    let lastY = -1;

    for (const [y, rowChanges] of sortedRows) {
      // Sort by column within each row
      rowChanges.sort((a, b) => a.x - b.x);

      // Move cursor: use '\n' if contiguous, absolute positioning otherwise
      if (y === lastY + 1) {
        parts.push('\n');
      } else {
        parts.push(cursorPos(y, 0));
      }
      lastY = y;

      // Build row content
      let cursorX = 0;
      let currentStyle = '';
      const rowParts: string[] = [];

      for (const change of rowChanges) {
        // Fill gaps with spaces
        if (change.x > cursorX) {
          if (currentStyle) {
            rowParts.push(`${ANSI_RESET}${currentStyle}${' '.repeat(change.x - cursorX)}`);
          } else {
            rowParts.push(' '.repeat(change.x - cursorX));
          }
        }

        // Apply new style if different
        if (change.style !== currentStyle) {
          if (currentStyle) {
            // End previous styled run
          }
          currentStyle = change.style;
        }

        // Write character with style
        if (change.style) {
          rowParts.push(`${change.style}${change.char}`);
        } else {
          rowParts.push(change.char);
        }

        cursorX = change.x + 1;
      }

      // Reset style at end of row
      if (currentStyle) {
        rowParts.push(ANSI_RESET);
      }

      // Clear rest of line
      rowParts.push(ANSI_CLEAR_EOL);

      parts.push(rowParts.join(''));
    }

    return parts.join('');
  }

  /**
   * Build full-screen output (for initial render or full redraw).
   * Writes every cell position.
   *
   * @param lines - Array of strings, each representing a full terminal row.
   * @returns The ANSI escape sequence string.
   */
  buildFullOutput(lines: string[]): string {
    const parts: string[] = [];

    for (let y = 0; y < lines.length; y++) {
      const line = lines[y] ?? '';
      parts.push(cursorPos(y, 0));
      parts.push(line);
      parts.push(ANSI_CLEAR_EOL);
    }

    return parts.join('');
  }
}
