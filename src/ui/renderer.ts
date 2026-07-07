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

  // ── Rendered-frame cache ───────────────────────────────────────
  /** Hash key of the most recently rendered input Lines[]. */
  private _lastFrameInputKey: string | null = null;
  /** Cached ANSI-wrapped output from the last renderFrame() call. */
  private _lastFrameOutput: string[] | null = null;
  /** Snapshot of theme name for detecting theme swaps. */
  private _lastThemeName: string = '';
  /** Snapshot of terminal columns for detecting dimension changes. */
  private _lastWidthColumns: number = 0;

  /**
   * @param theme - Resolved theme for ANSI code resolution.
   * @param width - Terminal width info for content width awareness.
   */
  constructor(theme: Theme, width: WidthInfo) {
    this._theme = theme;
    this._width = width;
    this._lastThemeName = theme.name;
    this._lastWidthColumns = width.columns;
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
   * Caches the result keyed by content hash. When the same Lines
   * are passed again, the cached ANSI output is returned without
   * re-running Theme.style() for every segment. The cache is
   * invalidated when theme or terminal width changes.
   *
   * Updates internal `lastLineCount` for use with `buildUpdate()`.
   *
   * @param lines - The styled lines to render.
   * @returns One ANSI-wrapped string per input Line.
   */
  renderFrame(lines: Line[]): string[] {
    this._lastLineCount = lines.length;

    // Derive a deterministic key from the input lines for cache lookup
    const inputKey = this._computeLinesKey(lines);

    // Check cache: same input + same theme + same terminal dimensions
    if (
      this._lastFrameOutput !== null &&
      this._lastFrameInputKey === inputKey &&
      this._lastThemeName === this._theme.name &&
      this._lastWidthColumns === this._width.columns
    ) {
      return this._lastFrameOutput;
    }

    // Cache miss or invalidation — render fresh
    const output = lines.map((line) => this._renderLine(line));

    this._lastFrameInputKey = inputKey;
    this._lastFrameOutput = output;
    this._lastThemeName = this._theme.name;
    this._lastWidthColumns = this._width.columns;

    return output;
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

  /**
   * Compute a deterministic string key for an array of Lines.
   *
   * The key encodes every segment's text and style so that two
   * Line[] arrays with identical content produce the same key.
   *
   * Format:
   *   For each line: seg1_text[|style_flags]\tseg2_text[|style_flags]\t...
   *   Lines separated by \n
   *   Style flags: b=bold, d=dim, followed by color token if set
   *
   * Used as the cache lookup key in renderFrame().
   */
  private _computeLinesKey(lines: Line[]): string {
    if (lines.length === 0) return '';

    const parts: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.segments.length === 0) {
        parts.push('');
        continue;
      }
      const segParts: string[] = [];
      for (let j = 0; j < line.segments.length; j++) {
        const seg = line.segments[j];
        let s = seg.text;
        if (seg.style) {
          s += '|';
          if (seg.style.bold) s += 'b';
          if (seg.style.dim) s += 'd';
          if (seg.style.color) s += seg.style.color;
        }
        segParts.push(s);
      }
      parts.push(segParts.join('\t'));
    }
    return parts.join('\n');
  }
}
