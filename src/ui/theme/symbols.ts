/**
 * Symbol token definitions for the repo-map UI.
 *
 * Every symbol has a Unicode and ASCII fallback variant.
 * No emoji. No decorative characters beyond the curated set.
 */

export type SymbolToken =
  | 'check'
  | 'cross'
  | 'warning'
  | 'arrow'
  | 'bullet'
  | 'pointer'
  | 'ellipsis'
  | 'arrowUp'
  | 'arrowDown'
  | 'separator'
  | 'filled'
  | 'empty';

const UNICODE_SYMBOLS: Record<SymbolToken, string> = {
  check: '✓',
  cross: '✗',
  warning: '⚠',
  arrow: '→',
  bullet: '·',
  pointer: '▸',
  ellipsis: '…',
  arrowUp: '↑',
  arrowDown: '↓',
  separator: '─',
  filled: '█',
  empty: '░',
};

const ASCII_SYMBOLS: Record<SymbolToken, string> = {
  check: '[ok]',
  cross: '[!]',
  warning: '[!]',
  arrow: '->',
  bullet: '*',
  pointer: '>',
  ellipsis: '...',
  arrowUp: '^',
  arrowDown: 'v',
  separator: '-',
  filled: '#',
  empty: '.',
};

/**
 * Detect whether the terminal supports Unicode characters.
 *
 * Windows CMD (non-Windows Terminal) has limited Unicode support.
 * CI and piped output use ASCII fallback by default.
 */
export function detectUnicodeSupport(): boolean {
  // When stdout is not a TTY, assume no Unicode support for safety
  if (!process.stdout.isTTY) return false;

  // Windows legacy console (CMD) — limited Unicode
  if (process.platform === 'win32' && !process.env.WT_SESSION) {
    return false;
  }

  return true;
}

/**
 * Resolve a symbol token to its display character.
 *
 * @param token - The symbol to resolve
 * @param unicode - Whether to use Unicode (true) or ASCII fallback (false)
 * @returns The display character
 */
export function resolveSymbol(token: SymbolToken, unicode: boolean): string {
  return unicode ? UNICODE_SYMBOLS[token] : ASCII_SYMBOLS[token];
}
