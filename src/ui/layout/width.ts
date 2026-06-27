/**
 * Terminal width detection, content width calculation, and column
 * space distribution utilities for the repo-map CLI.
 *
 * This module determines the usable terminal width, provides forced
 * width overrides for deterministic testing, and distributes space
 * across columns proportionally.
 *
 * # Architecture Rule
 * - This module must NOT know about Theme, screens, animations, or
 *   any analysis data.
 * - It depends on `ansi.ts` ONLY for `isTTY()`.
 * - It does NOT emit ANSI codes, write to stdout, or apply colors.
 */

import { isTTY } from '../utils/ansi.js';

// ─── Constants ───────────────────────────────────────────────────

/**
 * Left/right margin from terminal edge (character cells).
 */
const MARGIN = 2;

/**
 * Maximum usable content width in any terminal. Wider terminals are
 * capped to this value to reduce eye travel.
 */
const MAX_CONTENT_WIDTH = 100;

/**
 * Terminals narrower than this are considered "compact" and layouts
 * should reduce padding, disable side-by-side columns, etc.
 */
const NARROW_BREAKPOINT = 60;

/**
 * Terminals at least this wide are considered "wide" and can use
 * full padding and maximum content width.
 */
const WIDE_BREAKPOINT = 120;

// ─── State ───────────────────────────────────────────────────────

/**
 * Forced terminal width override. When non-null, all width detection
 * returns this value. Used exclusively for deterministic testing.
 * @internal
 */
let forcedWidth: number | null = null;

// ─── Public Types ────────────────────────────────────────────────

export interface WidthInfo {
  /** Total terminal columns (or forced width). */
  columns: number;
  /** Usable content width = min(columns - margins, MAX_CONTENT_WIDTH). */
  contentWidth: number;
  /** `true` when columns < 60 — use compact layout. */
  isNarrow: boolean;
  /** `true` when columns >= 120 — use generous layout. */
  isWide: boolean;
  /** Readable breakpoint label. */
  breakpoint: 'compact' | 'normal' | 'wide';
}

// ─── Width Detection ─────────────────────────────────────────────

/**
 * Detect the terminal width from the environment.
 *
 * Behavior:
 * - If `setForcedWidth()` has been called with a non-null value,
 *   that value is returned (testing mode).
 * - If stdout is a TTY, returns `process.stdout.columns` (or 80
 *   as fallback if the property is undefined).
 * - If stdout is not a TTY, returns 80.
 */
function detectColumns(): number {
  if (isTTY()) {
    return process.stdout.columns ?? 80;
  }
  return 80;
}

/**
 * Compute a `WidthInfo` record from a raw column count.
 */
function computeWidthInfo(columns: number): WidthInfo {
  return {
    columns,
    contentWidth: Math.max(0, Math.min(columns - MARGIN * 2, MAX_CONTENT_WIDTH)),
    isNarrow: columns < NARROW_BREAKPOINT,
    isWide: columns >= WIDE_BREAKPOINT,
    breakpoint: breakpoint(columns),
  };
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Get the current terminal width information.
 *
 * In non-TTY environments, returns a fallback of 80 columns.
 * Use `setForcedWidth()` to override for deterministic tests.
 */
export function getTerminalWidth(): WidthInfo {
  const columns = forcedWidth !== null ? forcedWidth : detectColumns();
  return computeWidthInfo(columns);
}

/**
 * Override the detected terminal width with a fixed value.
 *
 * Pass `null` to restore automatic detection.
 * This is intended ONLY for testing — do not use in production code
 * paths outside of test setup.
 *
 * @example
 * ```ts
 * setForcedWidth(80);
 * const info = getTerminalWidth();
 * expect(info.columns).toBe(80);
 *
 * setForcedWidth(null); // restore
 * ```
 */
export function setForcedWidth(width: number | null): void {
  forcedWidth = width;
}

/**
 * Classify a column count into a layout breakpoint.
 *
 * - `'compact'`:  < 60 columns — minimal padding, no boxes
 * - `'normal'`:   60–119 columns — default layout
 * - `'wide'`:     >= 120 columns — generous padding, full content width
 */
export function breakpoint(columns: number): 'compact' | 'normal' | 'wide' {
  if (columns < NARROW_BREAKPOINT) return 'compact';
  if (columns >= WIDE_BREAKPOINT) return 'wide';
  return 'normal';
}

/**
 * Distribute `available` character cells across `n` columns
 * proportionally by their relative `weights`, ensuring no column
 * falls below its `minWidths` entry.
 *
 * Algorithm:
 * 1. Assign each column its minimum width.
 * 2. Distribute remaining space proportionally by weight.
 * 3. Distribute any leftover cells (due to floor rounding) to the
 *    earliest columns.
 *
 * @param available - Total character cells available for all columns.
 * @param counts    - Relative importance of each column (e.g. header
 *                    text lengths).  Higher count = larger share.
 * @param minWidths - Minimum width each column must receive.
 * @returns Array of allocated widths, one per column.
 *
 * @example
 * ```ts
 * scaleColumns(50, [10, 5, 3], [5, 3, 2])
 * // → [24, 14, 12] approximately
 * ```
 */
export function scaleColumns(
  available: number,
  counts: number[],
  minWidths: number[],
): number[] {
  const n = counts.length;
  if (n === 0) return [];
  if (n === 1) return [Math.max(minWidths[0], available)];

  // 1. Clamp minWidths to available and assign initial widths
  const minSum = minWidths.reduce((a, b) => a + b, 0);
  const widths = [...minWidths];

  // Nothing left to distribute — return minimums
  if (minSum >= available) {
    return widths;
  }

  let remaining = available - minSum;

  // 2. Proportionally distribute remaining space
  const totalCount = counts.reduce((a, b) => a + b, 0);
  if (totalCount === 0) {
    // Equal split when there are no counts
    const share = Math.floor(remaining / n);
    for (let i = 0; i < n; i++) {
      widths[i] += share;
    }
    remaining -= share * n;
  } else {
    let allocated = 0;
    for (let i = 0; i < n; i++) {
      const share = Math.floor((remaining * counts[i]) / totalCount);
      widths[i] += share;
      allocated += share;
    }
    remaining = remaining - allocated;
  }

  // 3. Distribute remainder from floor rounding
  for (let i = 0; i < remaining && i < n; i++) {
    widths[i] += 1;
  }

  return widths;
}
