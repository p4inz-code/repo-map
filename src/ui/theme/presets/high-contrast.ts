/**
 * High Contrast theme preset — bold text, background fills, clear visual separation.
 *
 * Designed for accessibility in bright environments or for users who need
 * stronger visual distinction between elements.
 */

import type { Theme, ColorToken, ColorMode, SymbolToken, BorderStyle, TextStyle } from '../index.js';
import { resolveColor } from '../colors.js';
import { resolveSymbol } from '../symbols.js';
import { resolveBorder } from '../borders.js';

export const highContrastTheme: Theme = {
  name: 'high-contrast',

  color(token: ColorToken, mode?: ColorMode): string {
    return resolveColor(token, mode ?? 'truecolor');
  },

  style(text: string, style?: TextStyle): string {
    if (!style) return text;

    const parts: string[] = [];

    if (style.color) {
      const code = resolveColor(style.color, 'truecolor');
      if (code) parts.push(code);
    }
    // High contrast always applies bold for readability
    parts.push('\x1b[1m');
    if (style.dim) parts.push('\x1b[2m');

    if (parts.length === 0) return text;
    return `${parts.join('')}${text}\x1b[0m`;
  },

  symbol(token: SymbolToken): string {
    return resolveSymbol(token, true);
  },

  border(style: BorderStyle) {
    return resolveBorder(style, true);
  },

  colors: {
    primary: '\x1b[38;2;0;212;255m',
    success: '\x1b[38;2;0;255;94m',
    warning: '\x1b[38;2;255;255;0m',
    error: '\x1b[1;38;2;255;0;0m',
    info: '\x1b[38;2;0;175;255m',
    dim: '\x1b[38;2;180;180;180m',
    muted: '\x1b[38;2;100;100;100m',
    text: '\x1b[0m',
    bg: '\x1b[48;2;20;20;20m',
    heading: '\x1b[1;38;2;0;212;255m',
    code: '\x1b[1;38;2;255;174;0m',
    link: '\x1b[1;4;38;2;0;175;255m',
    border: '\x1b[1;38;2;100;100;100m',
  },

  symbols: {
    check: '✓', cross: '✗', warning: '⚠', arrow: '→',
    bullet: '·', pointer: '▸', ellipsis: '…',
    arrowUp: '↑', arrowDown: '↓', separator: '─',
    filled: '▓', empty: '░',
  },

  borders: {
    round: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '━', v: '┃' },
    single: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
    none: { tl: '', tr: '', bl: '', br: '', h: '', v: '' },
  },
};
