/**
 * Monochrome theme preset — no color, Unicode symbols, rounded borders.
 *
 * Used when --no-color is set or NO_COLOR env var is present.
 * Visual hierarchy is maintained through spacing, symbols, and text structure alone.
 */

import type { Theme, ColorToken, ColorMode, SymbolToken, BorderStyle, TextStyle } from '../index.js';
import { resolveSymbol } from '../symbols.js';
import { resolveBorder } from '../borders.js';

export const monochromeTheme: Theme = {
  name: 'monochrome',

  color(_token: ColorToken, _mode?: ColorMode): string {
    return '';
  },

  style(text: string, style?: TextStyle): string {
    if (!style) return text;
    // Only bold and dim are available in monochrome mode
    if (style.bold) return `\x1b[1m${text}\x1b[0m`;
    if (style.dim) return `\x1b[2m${text}\x1b[0m`;
    return text;
  },

  symbol(token: SymbolToken): string {
    return resolveSymbol(token, true);
  },

  border(style: BorderStyle) {
    return resolveBorder(style, true);
  },

  colors: {
    primary: '', success: '', warning: '', error: '', info: '',
    dim: '\x1b[2m', muted: '', text: '', bg: '',
    heading: '\x1b[1m', code: '', link: '', border: '',
    'bar-fill': '', 'bar-empty': '\x1b[2m',
  },

  symbols: {
    check: '✓', cross: '✗', warning: '⚠', arrow: '→',
    bullet: '·', pointer: '▸', ellipsis: '…',
    arrowUp: '↑', arrowDown: '↓', separator: '─',
    filled: '█', empty: '░',
  },

  borders: {
    round: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
    single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
    none: { tl: '', tr: '', bl: '', br: '', h: '', v: '' },
  },
};
