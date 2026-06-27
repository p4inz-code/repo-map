/**
 * Error screen — user-facing error presentation with calm, actionable feedback.
 *
 * Renders a boxed error with title, description, and optional suggestion.
 * Non-fatal errors show a hint; fatal errors indicate the program will exit.
 *
 * # Architecture
 * - Uses the Renderer for ANSI conversion (never emits raw codes).
 * - Uses renderBox primitive for layout.
 * - Static render (no animation) — writes once to stderr.
 *
 * # Layout
 * ```
 * ╭─ Error ────────────────────────────────────────────╮
 * │                                                     │
 * │  ✗ Path does not exist: /invalid/path               │
 * │                                                     │
 * │  Provide a valid path to a directory to scan, or     │
 * │  run 'repo-map .' to scan the current directory.    │
 * │                                                     │
 * ╰───────────────────────────────────────────────────────╯
 * ```
 *
 * # What it must NOT know about
 * - Animation manager, analysis pipeline, file system I/O
 * - Raw ANSI escape codes
 */

import { Renderer } from '../renderer.js';
import { renderBox } from '../primitives/box.js';
import { wrap } from '../primitives/text.js';

// ─── Types ───────────────────────────────────────────────────────

export interface ErrorOptions {
  /** Short error title (e.g. "Path Error", "Scan Failed"). */
  title: string;
  /** The main error message explaining what went wrong. */
  message: string;
  /** Optional suggestion for how to resolve the error. */
  suggestion?: string;
  /** Whether this is a fatal error (program will exit). */
  fatal: boolean;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Render an error screen to stderr.
 *
 * Displays a calm, actionable error message inside a bordered box.
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

  // Error title with cross symbol
  contentLines.push(`${indent}${crossSymbol} ${options.title}`);
  contentLines.push('');

  // Error message — wrap at content width
  const maxMsgWidth = isNarrow ? contentWidth - 2 : contentWidth - 4;
  const wrapped = wrap(options.message, maxMsgWidth);
  for (const wLine of wrapped) {
    contentLines.push(`${indent}${wLine}`);
  }

  // Optional suggestion
  let suggWrapped: string[] = [];
  if (options.suggestion) {
    contentLines.push('');
    suggWrapped = wrap(options.suggestion, maxMsgWidth);
    for (const sLine of suggWrapped) {
      contentLines.push(`${indent}${sLine}`);
    }
  }

  // Fatal hint
  if (options.fatal) {
    contentLines.push('');
    contentLines.push(`${indent}Program will exit.`);
  }

  // Bottom spacer
  contentLines.push('');

  // Compute line indices:
  //   0: title (cross + title)
  //   1: blank
  //   2..2+msgLen-1: message lines
  //   (if suggestion) 2+msgLen: blank
  //   (if suggestion) 2+msgLen+1..2+msgLen+suggLen: suggestion lines
  //   (if fatal) after suggestion: blank + "Program will exit."
  //   last: bottom spacer
  const suggestionLineCount = suggWrapped.length;
  const msgLineCount = wrapped.length;
  const suggSectionStart = options.suggestion
    ? 2 + msgLineCount + 1
    : -1;

  const styledLines = contentLines.map((line, idx) => {
    if (!line) return { segments: [{ text: line }] };

    const trimmed = line.trimStart();

    // Error title — bold + error color
    if (idx === 0 && trimmed.startsWith(crossSymbol)) {
      return {
        segments: [
          { text: line.slice(0, line.indexOf(trimmed)), style: { color: 'error' as const } },
          { text: trimmed, style: { bold: true, color: 'error' as const } },
        ],
      };
    }

    // Suggestion lines — dim
    if (
      suggSectionStart >= 0 &&
      idx >= suggSectionStart &&
      idx < suggSectionStart + suggestionLineCount
    ) {
      return { segments: [{ text: line, style: { dim: true as const } }] };
    }

    // Fatal hint — dim
    if (options.fatal && trimmed === 'Program will exit.') {
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
    const boxWidth = Math.min(contentWidth + 4, renderer.width.columns);

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
