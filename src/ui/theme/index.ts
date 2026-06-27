/**
 * Theme system entry point.
 *
 * Provides the Theme interface, resolveTheme() factory, and getTheme() cached accessor.
 * Every visual decision in the CLI flows through this module.
 */

import { detectColorMode } from './colors.js';
import type { ColorToken, ColorMode } from './colors.js';
import { detectUnicodeSupport } from './symbols.js';
import type { SymbolToken } from './symbols.js';
import type { BorderStyle, BorderChars } from './borders.js';
import { defaultTheme } from './presets/default.js';
import { monochromeTheme } from './presets/monochrome.js';
import { highContrastTheme } from './presets/high-contrast.js';
import { minimalTheme } from './presets/minimal.js';

export type { ColorToken, ColorMode } from './colors.js';
export type { SymbolToken } from './symbols.js';
export type { BorderStyle, BorderChars } from './borders.js';

/**
 * Resolvable text style.
 *
 * No hardcoded ANSI — all styling goes through Theme.style().
 */
export interface TextStyle {
  bold?: boolean;
  dim?: boolean;
  color?: ColorToken;
}

/**
 * Theme interface — the single source of truth for all visual decisions.
 *
 * Every function takes semantic tokens and returns the appropriate
 * character or ANSI code for the theme's configuration.
 */
export interface Theme {
  /** Human-readable name of the theme preset. */
  name: string;

  /** Resolve a ColorToken to its ANSI escape code. */
  color(token: ColorToken, mode?: ColorMode): string;

  /** Apply a TextStyle to text, returning styled text with ANSI codes. */
  style(text: string, style?: TextStyle): string;

  /** Resolve a SymbolToken to its display character. */
  symbol(token: SymbolToken): string;

  /** Resolve a BorderStyle to its complete character set. */
  border(style: BorderStyle): BorderChars;

  /** Pre-computed color codes for all ColorTokens. */
  colors: Record<ColorToken, string>;

  /** Pre-computed symbol characters for all SymbolTokens. */
  symbols: Record<SymbolToken, string>;

  /** Pre-computed border character sets for all BorderStyles. */
  borders: Record<BorderStyle, BorderChars>;
}

/**
 * Options for resolving a theme.
 */
export interface ThemeOptions {
  /** Whether color output is enabled. Defaults to auto-detection. */
  color?: boolean;
  /** Whether Unicode output is supported. Defaults to auto-detection. */
  unicode?: boolean;
  /** Whether high contrast mode is requested. */
  highContrast?: boolean;
  /** Whether minimal mode is requested. */
  minimal?: boolean;
}

let cachedTheme: Theme | null = null;

/**
 * Resolve and cache a theme based on the given options.
 *
 * Uses auto-detection by default. Call with specific options to force a theme.
 * The theme is cached after first resolution for the lifetime of the process.
 */
export function getTheme(options?: ThemeOptions): Theme {
  if (cachedTheme && !options) {
    return cachedTheme;
  }

  const resolved = resolveTheme(options);
  cachedTheme = resolved;
  return resolved;
}

/**
 * Resolve a theme based on the given options without caching.
 *
 * @param options - Theme options (all optional, auto-detected when omitted)
 * @returns A Theme instance
 */
export function resolveTheme(options?: ThemeOptions): Theme {
  const colorMode = detectColorMode();
  const unicodeSupported = detectUnicodeSupport();

  const color = options?.color ?? (colorMode !== 'none');
  const unicode = options?.unicode ?? unicodeSupported;
  const highContrast = options?.highContrast ?? false;
  const minimal = options?.minimal ?? false;

  // Minimal takes highest precedence (explicit opt-in)
  if (minimal || (!color && !unicode)) {
    return minimalTheme;
  }

  // High contrast overrides default
  if (highContrast) {
    return highContrastTheme;
  }

  // Monochrome when color is disabled
  if (!color) {
    return monochromeTheme;
  }

  // Default theme for all other cases
  return defaultTheme;
}

/**
 * Clear the cached theme. Useful for testing.
 */
export function clearThemeCache(): void {
  cachedTheme = null;
}
