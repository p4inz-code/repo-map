/**
 * Border character definitions for the repo-map CLI.
 *
 * Maps border styles to their character sets.
 * Supports rounded, single-line, and no-border variants.
 */

export type BorderStyle = 'round' | 'single' | 'none';

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
