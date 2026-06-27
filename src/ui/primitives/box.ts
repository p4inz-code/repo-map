/**
 * Box primitive — bordered content panel with optional title.
 *
 * # Architecture Rules
 * - MUST NOT know about tables, lists, screens, or analysis data.
 * - MUST NOT emit ANSI codes directly (use Theme.border() for characters).
 * - Receives border characters from the caller (who gets them from Theme).
 */

import type { BorderChars } from '../theme/index.js';
import { visibleLength } from '../utils/ansi.js';

/**
 * Options for rendering a box.
 */
export interface BoxOptions {
  /** Optional title displayed in the top border. */
  title?: string;
  /** Total width of the box in character cells (including borders). */
  width?: number;
  /** Internal left/right padding in character cells. Default: 1. */
  padding?: number;
  /** Border character set to use. */
  border?: BorderChars;
}

/**
 * Render a bordered panel around content lines.
 *
 * The box uses the provided `border` character set for corners and edges.
 * Internal padding adds spaces between the border and content on each side.
 *
 * @param content - Lines of content to place inside the box.
 * @param options - Box rendering options.
 * @returns Array of styled lines forming the box.
 *
 * @example
 * renderBox(['Hello'], { width: 20, border: roundBorders })
 * // ['╭──────────────────╮',
 * //  '│  Hello           │',
 * //  '╰──────────────────╯']
 */
export function renderBox(
  content: string[],
  options?: BoxOptions,
): string[] {
  const border = options?.border;
  const width = options?.width ?? 80;
  const padding = options?.padding ?? 1;

  // If no border, return content as-is (no-box mode for narrow terminals)
  if (!border || !border.tl) {
    return content;
  }

  const innerWidth = width - 2; // subtract left + right borders
  if (innerWidth <= 0) return content;

  const padStr = ' '.repeat(Math.max(0, padding));

  const lines: string[] = [];

  // Top border
  const title = options?.title;
  if (title) {
    const titleStr = ` ${title} `;
    const leftFill = border.h.repeat(Math.max(0, innerWidth - titleStr.length));
    lines.push(`${border.tl}${titleStr}${leftFill}${border.tr}`);
  } else {
    lines.push(`${border.tl}${border.h.repeat(innerWidth)}${border.tr}`);
  }

  // Content lines
  for (const line of content) {
    const visLen = visibleLength(line);
    const rightPad = Math.max(0, innerWidth - visLen - padStr.length * 2);
    lines.push(`${border.v}${padStr}${line}${' '.repeat(rightPad)}${padStr}${border.v}`);
  }

  // Bottom border
  lines.push(`${border.bl}${border.h.repeat(innerWidth)}${border.br}`);

  return lines;
}
