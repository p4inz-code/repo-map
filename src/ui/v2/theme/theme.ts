/**
 * Theme v2 — the enhanced theme engine with spacing scales,
 * padding tokens, glyph packs, semantic colors, and status colors.
 *
 * # Architecture
 * ```
 * ThemeV2
 *   ├── Colors (semantic + status tokens)
 *   ├── Spacing (4-cell grid scale)
 *   ├── Glyphs (icon packs with style variants)
 *   ├── Borders (character sets)
 *   ├── Style (ANSI text decoration)
 *   └── Presets (default, dark, high-contrast, minimal)
 * ```
 *
 * # Design Tokens
 * - **Semantic colors**: primary, success, warning, error, info
 * - **Status colors**: focus, selection, highlight, dim, muted
 * - **Spacing scale**: {0, 1, 2, 4, 8, 12, 16, 24} (character cells)
 * - **Glyphs**: themed icon set with ASCII fallback
 *
 * # Rules
 * - NO hardcoded colors outside presets.
 * - All text styling goes through ThemeV2.style().
 * - Theme presets are immutable after creation.
 */

import type { ColorToken as V1ColorToken } from '../theme/index.js';

// ─── Text Styles ──────────────────────────────────────────────────

/**
 * Text style definition — controls ANSI decoration.
 */
export interface TextStyle {
  bold?: boolean;
  dim?: boolean;
  color?: ColorToken;
}

// ─── Color Tokens ─────────────────────────────────────────────────

/** Semantic color tokens for the v2 engine. */
export type ColorToken =
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'focus'
  | 'selection'
  | 'highlight'
  | 'dim'
  | 'muted'
  | 'text'
  | 'bg'
  | 'heading'
  | 'code'
  | 'link'
  | 'border'
  | 'bar-fill'
  | 'bar-empty';

/** All color tokens mapped to their ANSI escape codes. */
export type ColorMap = Record<ColorToken, string>;

// ─── Spacing Scale ─────────────────────────────────────────────────

/** Spacing values on the 4-cell grid. */
export type SpacingToken =
  | 0 | 1 | 2 | 4 | 8 | 12 | 16 | 24;

/** Padding specification (can be uniform or per-side). */
export type PaddingSpec =
  | SpacingToken
  | { top?: SpacingToken; right?: SpacingToken; bottom?: SpacingToken; left?: SpacingToken };

// ─── Glyph Packs ───────────────────────────────────────────────────

/** Named glyph collections. */
export type GlyphPack = 'default' | 'minimal' | 'arrows' | 'status';

/** Glyph variant within a pack. */
export interface GlyphSet {
  check: string;
  cross: string;
  warning: string;
  arrow: string;
  bullet: string;
  pointer: string;
  ellipsis: string;
  arrowUp: string;
  arrowDown: string;
  separator: string;
  filled: string;
  empty: string;
  repo: string;
  file: string;
  folder: string;
  folderOpen: string;
  code: string;
  branch: string;
  search: string;
  language: string;
  framework: string;
  tool: string;
  stats: string;
}

// ─── ThemeV2 ───────────────────────────────────────────────────────

/**
 * Enhanced theme interface.
 * Every visual decision flows through this interface.
 */
export interface ThemeV2 {
  /** Theme name. */
  name: string;

  /** Resolve a ColorToken to its ANSI escape code. */
  color(token: ColorToken): string;

  /** Apply a TextStyle to text. */
  style(text: string, style?: TextStyle): string;

  /** Get a glyph character. */
  glyph(name: string): string;

  /** Get a spacing value from the scale. */
  spacing(token: SpacingToken): number;

  /** Resolve a PaddingSpec to a concrete padding object. */
  resolvePadding(spec: PaddingSpec): { top: number; right: number; bottom: number; left: number };

  /** Get border characters. */
  border(style: 'round' | 'single' | 'double' | 'thick' | 'none'): {
    tl: string; tr: string; bl: string; br: string;
    h: string; v: string;
  };

  /** Pre-computed color map. */
  readonly colors: ColorMap;

  /** Pre-computed glyph set. */
  readonly glyphs: GlyphSet;

  /** Whether this theme supports Unicode. */
  readonly unicode: boolean;

  /** Whether this theme supports color. */
  readonly colorEnabled: boolean;
}

// ─── Spacing Scale ─────────────────────────────────────────────────

/** All spacing tokens in ascending order. */
export const SPACING_SCALE: SpacingToken[] = [0, 1, 2, 4, 8, 12, 16, 24];

/** Validate that a number is a valid spacing token. */
export function isSpacingToken(value: number): value is SpacingToken {
  return SPACING_SCALE.includes(value as SpacingToken);
}

/** Clamp a number to the nearest spacing token. */
export function clampToSpacing(value: number): SpacingToken {
  return SPACING_SCALE.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
  );
}

// ─── Resolve padding ──────────────────────────────────────────────

export function resolvePadding(spec: PaddingSpec): { top: number; right: number; bottom: number; left: number } {
  if (typeof spec === 'number') {
    return { top: spec, right: spec, bottom: spec, left: spec };
  }
  return {
    top: spec.top ?? 0,
    right: spec.right ?? 0,
    bottom: spec.bottom ?? 0,
    left: spec.left ?? 0,
  };
}

// ─── Factory helper (maps v1 theme tokens to v2) ──────────────────

/**
 * Convert a v1 ColorToken to a v2 ColorToken.
 */
export function v1ToV2Color(token: V1ColorToken): ColorToken {
  return token as ColorToken;
}
