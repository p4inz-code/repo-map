/**
 * Theme v2 — barrel export.
 *
 * Provides the getThemeV2() factory for resolving the v2 theme,
 * along with all theme types.
 */

import type { ThemeV2, ColorToken, TextStyle, GlyphSet } from './theme.js';
import { defaultThemeV2 } from './presets/default.js';

export type { ThemeV2, ColorToken, TextStyle, GlyphSet };

/** Cached v2 theme instance. */
let _cachedTheme: ThemeV2 | null = null;

/**
 * Get the v2 theme, creating it if necessary.
 *
 * Unlike v1, v2 has a single default theme for now.
 * Future versions will support dynamic theme switching.
 *
 * @returns A ThemeV2 instance.
 */
export function getThemeV2(): ThemeV2 {
  if (_cachedTheme) return _cachedTheme;
  _cachedTheme = defaultThemeV2;
  return _cachedTheme;
}

/**
 * Clear the cached theme (for testing).
 */
export function clearThemeV2Cache(): void {
  _cachedTheme = null;
}
