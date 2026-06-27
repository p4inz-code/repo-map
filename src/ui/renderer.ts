/**
 * Renderer — the only module that converts semantic TextStyle tokens
 * into ANSI-wrapped terminal output strings.
 *
 * # Architecture
 *
 *   Screen  →  Layout  →  Renderer  →  Terminal (via UISession)
 *     │                  │
 *     │ Pure data        │ ANSI conversion only
 *     │ (Line[])         │ (string[])
 *
 * # Rules
 * - NO terminal writes (returns string arrays).
 * - NO process.stdout usage.
 * - NO layout logic (truncation, wrapping, padding).
 * - NO animation logic (cursor management is caller's responsibility).
 * - The ONLY module that resolves TextStyle → ANSI sequences
 *   (alongside the low-level ansi.ts utilities).
 * - All styling goes through Theme.style() — never raw ANSI.
 */

import type { Theme, TextStyle } from './theme/index.js';
import type { WidthInfo } from './layout/width.js';
import { cursorUp, cursorDown, clearLine } from './utils/ansi.js';

// ─── Types ───────────────────────────────────────────────────────

/**
 * A single styled segment of text.
 * Segments are the atomic unit of styled content.
 */
export interface Segment {
  text: string;
  /** Optional style to apply. Omit or pass `undefined` for plain text. */
  style?: TextStyle;
}

/**
 * A single line of content, composed of one or more Segments.
 */
export interface Line {
  segments: Segment[];
}

// ─── Renderer ────────────────────────────────────────────────────

export class Renderer {
  private _theme: Theme;
  private _width: WidthInfo;
  private _lastLineCount: number = 0;

  /**
   * @param theme - Resolved theme for ANSI code resolution.
   * @param width - Terminal width info for content width awareness.
   */
  constructor(theme: Theme, width: WidthInfo) {
    this._theme = theme;
    this._width = width;
  }

  // ── Accessors ──────────────────────────────────────────────────

  /** The theme used for ANSI code resolution. */
  get theme(): Theme {
    return this._theme;
  }

  /** Terminal width info used for content width calculations. */
  get width(): WidthInfo {
    return this._width;
  }

  /** Number of lines rendered in the most recent `renderFrame()` call. */
  get lastLineCount(): number {
    return this._lastLineCount;
  }

  // ── Frame rendering ────────────────────────────────────────────

  /**
   * Convert an array of styled Lines into ANSI-wrapped strings.
   *
   * Each Segment's text is styled via `Theme.style()`, then all
   * segments in a Line are joined to produce the final string.
   *
   * Updates internal `lastLineCount` for use with `buildUpdate()`.
   *
   * @param lines - The styled lines to render.
   * @returns One ANSI-wrapped string per input Line.
   */
  renderFrame(lines: Line[]): string[] {
    this._lastLineCount = lines.length;
    return lines.map((line) => this._renderLine(line));
  }

  /**
   * Build the ANSI sequences needed to update the previously rendered
   * frame in-place on the terminal.
   *
   * Produces: cursor-up (to overwrite previous frame) + new content.
   *
   * @param lines - The new styled lines to display.
   * @returns Strings to send to the terminal (caller writes them).
   */
  buildUpdate(lines: Line[]): string[] {
    const output: string[] = [];

    // If there was a previous frame, move cursor up to overwrite it
    if (this._lastLineCount > 0) {
      output.push(cursorUp(this._lastLineCount));
    }

    const frame = this.renderFrame(lines);
    output.push(...frame);
    return output;
  }

  /**
   * Build the ANSI sequences needed to clear the previously rendered
   * region from the terminal.
   *
   * Produces: cursor-up + clear-line for each rendered line.
   * Resets `lastLineCount` to 0 after building.
   *
   * @returns Strings to send to the terminal (caller writes them).
   */
  buildClear(): string[] {
    const output: string[] = [];

    if (this._lastLineCount > 0) {
      // Move cursor up to the first line of the last frame
      output.push(cursorUp(this._lastLineCount));

      // Clear each line: clear current line, then move down (except last)
      for (let i = 0; i < this._lastLineCount; i++) {
        output.push(clearLine());
        if (i < this._lastLineCount - 1) {
          output.push(cursorDown(1));
        }
      }
    }

    this._lastLineCount = 0;
    return output;
  }

  /**
   * Apply a TextStyle to text via the theme.
   *
   * This is a convenience wrapper around `Theme.style()` for cases
   * where the caller has a single styled string rather than segments.
   *
   * @param text  - The plain text to style.
   * @param style - Optional style to apply.
   * @returns Styled text with ANSI codes (or plain text if no style).
   */
  styleText(text: string, style?: TextStyle): string {
    return this._theme.style(text, style);
  }

  // ── Internal helpers ───────────────────────────────────────────

  /**
   * Convert a single Line into an ANSI-wrapped string.
   */
  private _renderLine(line: Line): string {
    return line.segments
      .map((seg) => this._theme.style(seg.text, seg.style))
      .join('');
  }
}
