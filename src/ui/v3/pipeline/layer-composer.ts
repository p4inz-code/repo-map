/**
 * LayerComposer — the second stage of the V3 Render Pipeline.
 *
 * Takes LayerContent from the FrameBuilder and composes them into a single
 * ComposedFrame by:
 * 1. Sorting layers by z-index (lowest first).
 * 2. Overlaying higher-z layers on top of lower-z layers.
 * 3. Truncating or padding lines to the terminal width.
 * 4. Producing both Line[] (rich) and string[] (flat) representations.
 *
 * # Architecture
 * ```
 * FrameBuilder → LayerContent[] → LayerComposer → ComposedFrame → DoubleBuffer
 * ```
 *
 * # Compositing Rules
 * - Lower z-index layers are rendered first (background).
 * - Higher z-index layers overwrite lower ones where they overlap.
 * - Empty layers (isEmpty === true) are skipped.
 * - Lines beyond the terminal height are clipped.
 * - Each line is truncated to terminal width and space-padded to fill.
 *
 * # Determinism
 * - For the same set of LayerContent, always produces the same ComposedFrame.
 * - No external state is consulted.
 */

import type { LayerContent, ComposedFrame } from './types.js';
import type { Line } from '../../v2/renderer/types.js';
import type { ThemeV2 } from '../../v2/theme/theme.js';

// ─── LayerComposer ─────────────────────────────────────────────────

export class LayerComposer {
  /**
   * Compose multiple layers into a single frame.
   *
   * @param layers - Array of LayerContent (from FrameBuilder), unsorted.
   * @param width  - Terminal width in character cells.
   * @param height - Terminal height in character cells.
   * @param theme  - Theme for converting Line segments to styled strings.
   * @returns A ComposedFrame with both Line[] and string[] representations.
   */
  compose(
    layers: LayerContent[],
    width: number,
    height: number,
    theme: ThemeV2,
  ): ComposedFrame {
    // Sort by z-index (ascending, lowest first = background)
    const sorted = [...layers]
      .filter((l) => !l.isEmpty)
      .sort((a, b) => a.zIndex - b.zIndex);

    // Start with an empty frame (all spaces)
    const finalLines: Line[] = this._createEmptyLines(width, height);

    // Overlay each layer in z-order
    for (const layer of sorted) {
      for (let y = 0; y < layer.lines.length && y < height; y++) {
        const sourceLine = layer.lines[y];
        if (!sourceLine) continue;

        // Overlay this line onto the final frame at row y
        finalLines[y] = this._overlayLine(finalLines[y], sourceLine, width);
      }
    }

    // Convert to flat string representation for diffing
    const textLines: string[] = new Array(height);
    for (let y = 0; y < height; y++) {
      textLines[y] = this._lineToString(finalLines[y], theme);
    }

    return {
      lines: finalLines,
      textLines,
      width,
      height,
    };
  }

  /**
   * Create an empty frame filled with space lines.
   */
  private _createEmptyLines(width: number, height: number): Line[] {
    const lines: Line[] = new Array(height);
    for (let y = 0; y < height; y++) {
      lines[y] = {
        segments: [{ text: ' '.repeat(width) }],
      };
    }
    return lines;
  }

  /**
   * Overlay a source line onto a destination line, handling z-order.
   * Characters from the source overwrite the destination at each position.
   * Rendering style from the source is preserved.
   */
  private _overlayLine(dest: Line, source: Line, width: number): Line {
    // Extract segments from both lines
    const destChars = this._expandToChars(dest, width);
    const srcChars = this._expandToChars(source, width);

    // Overlay: source overwrites destination
    for (let x = 0; x < width; x++) {
      const src = srcChars[x];
      if (src && src.text !== '') {
        destChars[x] = src;
      }
    }

    // Compact back to segments
    return this._compactToLine(destChars);
  }

  /**
   * Expand a Line's segments into per-character array.
   */
  private _expandToChars(
    line: Line,
    width: number,
  ): Array<{ text: string; style?: Record<string, unknown> }> {
    const chars: Array<{ text: string; style?: Record<string, unknown> }> =
      new Array(width);

    let cursorX = 0;
    for (const seg of line.segments) {
      for (let i = 0; i < seg.text.length && cursorX < width; i++) {
        chars[cursorX] = {
          text: seg.text[i],
          style: seg.style ? { ...seg.style } : undefined,
        };
        cursorX++;
      }
    }

    // Fill remaining positions with spaces
    for (let x = cursorX; x < width; x++) {
      chars[x] = { text: ' ' };
    }

    return chars;
  }

  /**
   * Compact a per-character array back into a Line with segments.
   */
  private _compactToLine(
    chars: Array<{ text: string; style?: Record<string, unknown> }>,
  ): Line {
    const segments: Line['segments'] = [];
    let currentStyle: Record<string, unknown> | undefined;
    let currentText = '';

    for (const ch of chars) {
      // Check if style changed (stringify comparison for object equality)
      const styleChanged = !this._styleEqual(currentStyle, ch.style);

      if (styleChanged && currentText.length > 0) {
        segments.push({ text: currentText, style: currentStyle as Line['segments'][0]['style'] });
        currentText = '';
      }

      currentStyle = ch.style;
      currentText += ch.text;
    }

    // Flush remaining
    if (currentText.length > 0) {
      segments.push({ text: currentText, style: currentStyle as Line['segments'][0]['style'] });
    }

    return { segments };
  }

  /**
   * Compare two style objects by their JSON representation.
   */
  private _styleEqual(
    a?: Record<string, unknown>,
    b?: Record<string, unknown>,
  ): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /**
   * Convert a Line to a flat ANSI string for diffing.
   */
  private _lineToString(line: Line, theme: ThemeV2): string {
    return line.segments
      .map((seg) => theme.style(seg.text, seg.style))
      .join('');
  }
}
