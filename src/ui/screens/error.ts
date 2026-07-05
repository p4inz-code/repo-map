/**
 * Error screen — user-facing error presentation with calm, actionable feedback.
 *
 * Renders a boxed error with the error message as the focal point,
 * and an optional suggestion for resolution.
 *
 * # Architecture
 * - Uses the Renderer for ANSI conversion (never emits raw codes).
 * - Uses renderBox primitive for layout.
 * - Static render (no animation) — writes once to stderr.
 *
 * # Layout
 * ```
 * ╭─ Error ──────────────────────────────────────────────────╮
 * │                                                           │
 * │  ✗ Path does not exist: /nonexistent                      │
 * │                                                           │
 * │  Provide a valid path to a directory,                     │
 * │  or run 'repo-map .' for the current one.                 │
 * │                                                           │
 * ╰───────────────────────────────────────────────────────────╯
 * ```
 *
 * # Narrow-terminal layout (< 60 cols)
 * No box borders. Text-only with cross symbol.
 *
 * # What it must NOT know about
 * - Animation manager, analysis pipeline, file system I/O
 * - Raw ANSI escape codes
 */

import { Renderer } from '../renderer.js';
import { renderBox } from '../primitives/box.js';
import { wrap } from '../primitives/text.js';
import { sanitizeFilePath } from '../utils/ansi.js';

// ─── Types ───────────────────────────────────────────────────────

export interface ErrorOptions {
  /** The error message explaining what went wrong. */
  message: string;
  /** Optional suggestion for how to resolve the error. */
  suggestion?: string;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Render an error screen to stderr.
 *
 * Displays a calm, actionable error message inside a bordered box.
 * The error message is the focal point (bold + error color).
 * On narrow terminals, renders without box borders.
 *
 * @param options  - Error display options.
 * @param renderer - The renderer for ANSI conversion.
 */
export function renderError(options: ErrorOptions, renderer: Renderer): void {
  const contentWidth = renderer.width.contentWidth;
  const isNarrow = renderer.width.isNarrow;
  const theme = renderer.theme;

  const indent = ' '; // 1 extra space beyond box padding (padding=1 → total 2)
  const crossSymbol = theme.symbol('cross');

  // Build inner content lines (plain text)
  const contentLines: string[] = [];

  // ── Breathing after top border ──────────────────────────────────
  contentLines.push('');

  // ── Error message with cross symbol (focal point) ───────────────
  contentLines.push(`${indent}${crossSymbol} ${sanitizeFilePath(options.message)}`);

  // ── Blank between message and suggestion ─────────────────────────
  contentLines.push('');

  // ── Suggestion (dim, wrapped) ────────────────────────────────────
  const maxMsgWidth = isNarrow ? contentWidth - 2 : contentWidth - 4;

  let suggWrapped: string[] = [];
  if (options.suggestion) {
    suggWrapped = wrap(options.suggestion, maxMsgWidth);
    for (const sLine of suggWrapped) {
      contentLines.push(`${indent}${sLine}`);
    }
  }

  // ── Breathing before bottom border ──────────────────────────────
  contentLines.push('');

  // Compute line indices for styling
  //   0: blank (breathing)
  //   1: cross + message (focal point)
  //   2: blank
  //   3..3+suggLen-1: suggestion lines (if any)
  //   last: blank (breathing)
  const suggestionLineCount = suggWrapped.length;
  const suggestionStart = options.suggestion ? 3 : -1;

  const styledLines = contentLines.map((line, idx) => {
    if (!line) return { segments: [{ text: line }] };

    const trimmed = line.trimStart();

    // Error message — bold + error color (focal point)
    if (idx === 1 && trimmed.startsWith(crossSymbol)) {
      return {
        segments: [
          { text: line.slice(0, line.indexOf(trimmed)), style: { color: 'error' as const } },
          { text: trimmed, style: { bold: true, color: 'error' as const } },
        ],
      };
    }

    // Suggestion lines — dim
    if (
      suggestionStart >= 0 &&
      idx >= suggestionStart &&
      idx < suggestionStart + suggestionLineCount
    ) {
      return { segments: [{ text: line, style: { dim: true as const } }] };
    }

    return { segments: [{ text: line }] };
  });

  const styledStrings = renderer.renderFrame(styledLines);

  if (isNarrow) {
    for (const line of styledStrings) {
      process.stderr.write(line + '\n');
    }
  } else {
    const border = theme.border('round');
    const boxWidth = Math.min(contentWidth + 2, renderer.width.columns);

    const boxLines = renderBox(styledStrings, {
      title: 'Error',
      width: boxWidth,
      padding: 1,
      border: border.tl ? border : undefined,
    });

    for (const line of boxLines) {
      process.stderr.write(line + '\n');
    }
  }
}
