/**
 * Default theme preset v2 — full color, Unicode glyphs, rounded borders.
 *
 * The standard visual identity for the v2 engine.
 */

import type { ThemeV2, ColorMap, GlyphSet, ColorToken, TextStyle } from '../theme.js';
import { resolvePadding } from '../theme.js';

// ─── Color Map ─────────────────────────────────────────────────────

const COLORS: ColorMap = {
  primary: '\x1b[38;2;0;212;255m',    // #00d4ff Bright Cyan
  success: '\x1b[38;2;0;255;94m',     // #00ff5e Green
  warning: '\x1b[38;2;255;255;0m',    // #ffff00 Yellow
  error: '\x1b[38;2;255;0;0m',        // #ff0000 Red
  info: '\x1b[38;2;0;175;255m',       // #00afff Blue
  focus: '\x1b[38;2;0;212;255m',      // Same as primary
  selection: '\x1b[48;2;0;100;150m',  // Highlight BG
  highlight: '\x1b[1;38;2;255;255;255m', // Bright white bold
  dim: '\x1b[38;2;108;108;108m',      // Gray
  muted: '\x1b[38;2;48;48;48m',       // Dark gray
  text: '\x1b[0m',                    // Default
  bg: '\x1b[48;2;38;38;38m',         // #262626 Dark BG
  heading: '\x1b[1;38;2;0;212;255m', // Bold + Cyan
  code: '\x1b[38;2;255;174;0m',      // #ffae00 Gold
  link: '\x1b[4;38;2;0;175;255m',    // Underline + Blue
  border: '\x1b[2;38;2;48;48;48m',   // Dim + Dark gray
  'bar-fill': '\x1b[38;2;0;255;94m',   // Green
  'bar-empty': '\x1b[38;2;108;108;108m', // Gray
};

// ─── Glyph Pack ───────────────────────────────────────────────────

const GLYPHS: GlyphSet = {
  check: '✓', cross: '✗', warning: '⚠',
  arrow: '→', bullet: '·', pointer: '►',
  ellipsis: '…', arrowUp: '↑', arrowDown: '↓',
  separator: '─', filled: '█', empty: '░',
  repo: '◆', file: '·', folder: '▾', folderOpen: '▾',
  code: '⟨⟩', branch: '⊸', search: '⌕',
  language: '◎', framework: '◈', tool: '⚒', stats: '█',
};

// ─── Spacing ──────────────────────────────────────────────────────

const SPACING: Record<number, number> = {
  0: 0, 1: 1, 2: 2, 4: 4, 8: 8, 12: 12, 16: 16, 24: 24,
};

// ─── Borders ──────────────────────────────────────────────────────

const BORDERS = {
  round: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
  single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  thick: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
  none: { tl: '', tr: '', bl: '', br: '', h: '', v: '' },
};

// ─── Theme Instance ───────────────────────────────────────────────

export const defaultThemeV2: ThemeV2 = {
  name: 'default-v2',
  colorEnabled: true,
  unicode: true,
  colors: COLORS,
  glyphs: GLYPHS,

  color(token: ColorToken): string {
    return COLORS[token] ?? '';
  },

  style(text: string, style?: TextStyle): string {
    if (!style) return text;

    const parts: string[] = [];
    if (style.color) {
      const code = COLORS[style.color as ColorToken];
      if (code) parts.push(code);
    }
    if (style.bold) parts.push('\x1b[1m');
    if (style.dim) parts.push('\x1b[2m');

    if (parts.length === 0) return text;
    return `${parts.join('')}${text}\x1b[0m`;
  },

  glyph(name: string): string {
    const key = name as keyof GlyphSet;
    return GLYPHS[key] ?? '?';
  },

  spacing(token: number): number {
    return SPACING[token] ?? token;
  },

  resolvePadding(spec) {
    return resolvePadding(spec);
  },

  border(style) {
    return BORDERS[style] ?? BORDERS.none;
  },
};
