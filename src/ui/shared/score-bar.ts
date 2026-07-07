/**
 * ScoreBar — shared helper for rendering horizontal score bars.
 *
 * Previously the bar computation was duplicated in:
 * - InfoPanel._renderContent()
 * - InfoPanel._renderInspectorMode()
 * - completion.ts (summary panel)
 *
 * # Usage
 * ```ts
 * const { filled, empty } = renderScoreBar(healthScore, 24);
 * // Use filled/empty counts with '█'.repeat(filled) and '░'.repeat(empty)
 * ```
 *
 * # Architecture
 * - Pure computation: returns character counts, no rendering.
 * - Callers style the bar segments themselves (colors differ per context).
 * - Bar appearance is preserved exactly.
 */

export interface ScoreBarResult {
  /** Number of filled characters (█). */
  filled: number;
  /** Number of empty characters (░). */
  empty: number;
}

/**
 * Compute the filled and empty character counts for a horizontal score bar.
 *
 * Clamps the score to [0, 100], then scales proportionally to `barWidth`.
 *
 * @param score    - A numeric score typically in the range [0, 100].
 * @param barWidth - The total width of the bar in character cells.
 * @returns An object with `filled` and `empty` character counts.
 *
 * @example
 * ```ts
 * renderScoreBar(65, 24)   // { filled: 16, empty: 8 }
 * renderScoreBar(100, 20)  // { filled: 20, empty: 0 }
 * renderScoreBar(0, 20)    // { filled: 0, empty: 20 }
 * renderScoreBar(150, 20)  // { filled: 20, empty: 0 }  // clamped
 * ```
 */
export function renderScoreBar(score: number, barWidth: number): ScoreBarResult {
  const clamped = Math.max(0, Math.min(score, 100));
  const filled = Math.round((clamped / 100) * barWidth);
  const empty = barWidth - filled;
  return { filled, empty };
}
