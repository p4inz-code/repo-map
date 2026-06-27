/**
 * Text primitive — styling, wrapping, truncation, and padding.
 *
 * Pure functions that operate on text and return pre-ANSI styled lines.
 * No ANSI escape codes are emitted directly; all styling goes through
 * a Theme object.
 *
 * # Architecture Rules
 * - MUST NOT know about boxes, tables, lists, screens, or animation.
 * - MUST NOT emit ANSI escape codes directly (use Theme.style()).
 * - MUST NOT access terminal width directly (receive it as a parameter).
 */

import type { Theme, TextStyle } from '../theme/index.js';
import { stripAnsi, visibleLength } from '../utils/ansi.js';

// ─── Style ───────────────────────────────────────────────────────

/**
 * Apply a TextStyle to text via the theme.
 *
 * @param text  - Plain text to style.
 * @param theme - Resolved theme for ANSI code resolution.
 * @param style - Optional style to apply.
 * @returns Styled text with ANSI codes (or plain text if no style).
 */
export function style(text: string, theme: Theme, style?: TextStyle): string {
  return theme.style(text, style);
}

// ─── Wrapping ────────────────────────────────────────────────────

const SPACE = ' ';

/**
 * Word-wrap text to fit within `width` character cells.
 *
 * Words are split on space boundaries. If a single word exceeds
 * `width`, it is broken at `width` with an ellipsis appended.
 *
 * @param text  - The text to wrap. ANSI codes are stripped before
 *                measuring width.
 * @param width - Maximum line width in character cells.
 * @returns Array of wrapped lines.
 *
 * @example
 * wrap('hello world', 5) // ['hello', 'world']
 * wrap('short', 20)      // ['short']
 */
export function wrap(text: string, width: number): string[] {
  if (width <= 0) return [];

  const cleaned = stripAnsi(text);
  if (cleaned.length === 0) return [];
  if (width >= visibleLength(cleaned)) return [text];

  const words = cleaned.split(SPACE).filter((w) => w.length > 0);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const wordWidth = visibleLength(word);

    // Single word exceeds width — truncate and move on
    if (wordWidth > width) {
      if (current) {
        lines.push(current.trimEnd());
        current = '';
      }
      lines.push(truncate(word, width));
      continue;
    }

    const candidate = current ? `${current}${SPACE}${word}` : word;
    if (visibleLength(candidate) <= width) {
      current = candidate;
    } else {
      lines.push(current.trimEnd());
      current = word;
    }
  }

  if (current) {
    lines.push(current.trimEnd());
  }

  return lines;
}

// ─── Truncation ──────────────────────────────────────────────────

/**
 * Truncate text to fit within `maxLen` character cells, appending
 * an ellipsis when truncation occurs.
 *
 * The ellipsis is included in the width calculation.
 * ANSI codes in the input are preserved in the output.
 *
 * @param text   - The text to truncate.
 * @param maxLen - Maximum visible length, including the ellipsis.
 * @returns Truncated text (with ellipsis if truncated, or original).
 */
export function truncate(text: string, maxLen: number): string {
  if (maxLen <= 0) return '';

  const cleaned = stripAnsi(text);
  const visLen = visibleLength(cleaned);

  if (visLen <= maxLen) return text;

  const ellipsis = '\u2026'; // …
  const ellipsisWidth = 1;
  const available = maxLen - ellipsisWidth;

  if (available <= 0) return ellipsis;

  // Walk through the cleaned string accumulating visible width
  let result = '';
  let currentWidth = 0;
  for (const char of cleaned) {
    const charWidth = visibleLength(char);
    if (currentWidth + charWidth > available) break;
    result += char;
    currentWidth += charWidth;
  }

  return `${result}${ellipsis}`;
}

// ─── Padding ──────────────────────────────────────────────────────

/**
 * Left-pad text to `len` character cells by adding spaces before it.
 * ANSI codes in text are preserved; padding is measured against
 * visible length.
 *
 * @param text - The text to pad.
 * @param len  - Target visible length.
 * @returns Padded text (spaces + original text).
 */
export function padLeft(text: string, len: number): string {
  const visLen = visibleLength(text);
  if (visLen >= len) return text;
  return SPACE.repeat(len - visLen) + text;
}

/**
 * Right-pad text to `len` character cells by adding spaces after it.
 * ANSI codes in text are preserved; padding is measured against
 * visible length.
 *
 * @param text - The text to pad.
 * @param len  - Target visible length.
 * @returns Padded text (original text + spaces).
 */
export function padRight(text: string, len: number): string {
  const visLen = visibleLength(text);
  if (visLen >= len) return text;
  return text + SPACE.repeat(len - visLen);
}
