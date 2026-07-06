/**
 * Minimal theme preset — no color, ASCII symbols, ASCII borders.
 *
 * Used for environments with limited terminal capabilities or when the user
 * wants the most compact, universally-compatible output.
 * Visual hierarchy is maintained through spacing and text structure alone.
 */

import type { Theme, ColorToken, ColorMode, SymbolToken, BorderStyle, TextStyle } from '../index.js';
import { resolveSymbol } from '../symbols.js';
import { resolveBorder } from '../borders.js';

export const minimalTheme: Theme = {
  name: 'minimal',

  color(_token: ColorToken, _mode?: ColorMode): string {
    return '';
  },

  style(text: string, _style?: TextStyle): string {
    return text;
  },

  symbol(token: SymbolToken): string {
    return resolveSymbol(token, false);
  },

  border(style: BorderStyle) {
    return resolveBorder(style, false);
  },

  colors: {
    primary: '', success: '', warning: '', error: '', info: '',
    dim: '', muted: '', text: '', bg: '',
    heading: '', code: '', link: '', border: '',
    'bar-fill': '', 'bar-empty': '',
  },

  symbols: {
    check: '[ok]', cross: '[!]', warning: '[!]',
    arrow: '->', bullet: '*', pointer: '>',
    ellipsis: '...', arrowUp: '^', arrowDown: 'v',
    separator: '-', filled: '#', empty: '.',
    repo: '[R]', file: '[f]', folder: '[D]', folderOpen: '[D]',
    code: '<>', branch: '->', commit: '*', issue: '[!]',
    tag: '#', star: '*', search: '?', setting: '[S]',
    language: '(L)', framework: '(F)', test: '(T)', tool: '(t)',
    database: '(D)', package: '(p)', doc: '[d]', config: '[c]',
    script: '$', docker: '[D]', ci: '[C]', deploy: '^',
    success: '[ok]', error: '[!]', info: '(i)', time: '[t]', stats: '[#]',
  },

  borders: {
    round: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' },
    single: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' },
    double: { tl: '+', tr: '+', bl: '+', br: '+', h: '=', v: '|' },
    thick: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' },
    none: { tl: '', tr: '', bl: '', br: '', h: '', v: '' },
  },
};
