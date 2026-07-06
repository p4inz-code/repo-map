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

    const parts: string[] = [];
    if (style.bold) parts.push('\x1b[1m');
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
    primary: '', success: '', warning: '', error: '', info: '',
    dim: '\x1b[2m', muted: '', text: '', bg: '',
    heading: '\x1b[1m', code: '', link: '', border: '',
    'bar-fill': '', 'bar-empty': '\x1b[2m',
  },

  symbols: {
    check: '✓', cross: '✗', warning: '⚠',
    arrow: '→', bullet: '·', pointer: '▸',
    ellipsis: '…', arrowUp: '↑', arrowDown: '↓',
    separator: '─', filled: '█', empty: '░',
    repo: '⊞', file: '⊡', folder: '▣', folderOpen: '◫',
    code: '⟨⟩', branch: '⊸', commit: '◆', issue: '⊘',
    tag: '⌗', star: '★', search: '⌕', setting: '⚙',
    language: '◎', framework: '◈', test: '☷', tool: '⚒',
    database: '⌂', package: '◉', doc: '⊏', config: '⚙',
    script: '⌘', docker: '⊟', ci: '↻', deploy: '⇧',
    success: '✓', error: '✗', info: 'ℹ', time: '⏱', stats: '▤',
  },

  borders: {
    round: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
    single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
    double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
    thick: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
    none: { tl: '', tr: '', bl: '', br: '', h: '', v: '' },
  },
};
