/**
 * Border character definitions for the repo-map CLI.
 *
 * Maps border styles to their character sets.
 * Supports rounded, single, double, thick, and no-border variants.
 * Different styles convey visual hierarchy:
 *   - round: primary panels (default, friendly)
 *   - single: secondary panels (subtle, informational)
 *   - double: dialog/overlay panels (important)
 *   - thick: error panels (high emphasis)
 *   - none: free-form layout (no borders)
 */

export type BorderStyle = 'round' | 'single' | 'double' | 'thick' | 'none';

export interface BorderChars {
  tl: string;
  tr: string;
  bl: string;
  br: string;
  h: string;
  v: string;
}

const BORDERS: Record<BorderStyle, { unicode: BorderChars; ascii: BorderChars }> = {
  round: {
    unicode: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
    ascii: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' },
  },
  single: {
    unicode: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
    ascii: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' },
  },
  double: {
    unicode: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
    ascii: { tl: '+', tr: '+', bl: '+', br: '+', h: '=', v: '|' },
  },
  thick: {
    unicode: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
    ascii: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' },
  },
  none: {
    unicode: { tl: '', tr: '', bl: '', br: '', h: '', v: '' },
    ascii: { tl: '', tr: '', bl: '', br: '', h: '', v: '' },
  },
};

/**
 * Resolve a border style to its character set.
 *
 * @param style - The border style to resolve
 * @param unicode - Whether to use Unicode characters (true) or ASCII fallback (false)
 * @returns The set of border characters for the given style
 */
export function resolveBorder(style: BorderStyle, unicode: boolean): BorderChars {
  const border = BORDERS[style];
  return unicode ? border.unicode : border.ascii;
}
