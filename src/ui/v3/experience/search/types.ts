/**
 * Search UX types for the V3 Experience Engine.
 *
 * Features:
 * - Incremental search (typing instantly filters)
 * - Highlight matches in results
 * - Scroll to result
 * - Animated highlight
 * - Result count
 * - Current match indicator
 */

// ─── Search Match ─────────────────────────────────────────────────

export interface SearchMatch {
  /** The item/line that matched. */
  readonly item: string;
  /** Line number (0-based). */
  readonly lineNumber: number;
  /** Column positions of matched characters. */
  readonly matchPositions: number[];
  /** Context before the match (for preview). */
  readonly contextBefore: string;
  /** Context after the match (for preview). */
  readonly contextAfter: string;
  /** Score for ranking (higher = better match). */
  readonly score: number;
}

// ─── Search UX State ──────────────────────────────────────────────

export interface SearchUXState {
  /** Whether search is active. */
  readonly active: boolean;
  /** Current search query. */
  readonly query: string;
  /** Current results. */
  readonly results: SearchMatch[];
  /** Index of the currently selected result. */
  readonly selectedIndex: number;
  /** Total number of results (for display). */
  readonly resultCount: number;
  /** Whether search is still indexing (for large datasets). */
  readonly indexing: boolean;
}

// ─── Search Config ────────────────────────────────────────────────

export interface SearchConfig {
  /** Debounce delay in ms before filtering (default: 50). */
  readonly debounceMs?: number;
  /** Maximum results to display (default: 50). */
  readonly maxResults?: number;
  /** Context characters before/after match (default: 30). */
  readonly contextChars?: number;
}

// ─── Search Ranking ───────────────────────────────────────────────

/**
 * Score a search match for ranking.
 * Higher score = better match.
 *
 * Factors:
 * - Exact match: +100
 * - Starts with query: +50
 * - Contains query: +30
 * - Case-sensitive match: +10
 */
export function scoreSearchMatch(item: string, query: string): number {
  const lower = item.toLowerCase();
  const queryLower = query.toLowerCase();

  if (lower === queryLower) return 100;
  if (lower.startsWith(queryLower)) return 80;
  if (lower.includes(queryLower)) return 50;
  if (item.includes(query)) return 20; // Case-sensitive

  // Fuzzy match
  let score = 0;
  let queryIdx = 0;
  for (let i = 0; i < lower.length && queryIdx < queryLower.length; i++) {
    if (lower[i] === queryLower[queryIdx]) {
      score += 5;
      queryIdx++;
    }
  }

  return queryIdx === queryLower.length ? score + 10 : 0;
}

/**
 * Find matched character positions in an item.
 */
export function findSearchMatchPositions(item: string, query: string): number[] {
  const positions: number[] = [];
  const lower = item.toLowerCase();
  const queryLower = query.toLowerCase();

  let queryIdx = 0;
  for (let i = 0; i < lower.length && queryIdx < queryLower.length; i++) {
    if (lower[i] === queryLower[queryIdx]) {
      positions.push(i);
      queryIdx++;
    }
  }

  return positions;
}

/**
 * Extract context around a match position.
 */
export function extractContext(
  text: string,
  matchStart: number,
  matchEnd: number,
  contextChars: number,
): { before: string; after: string } {
  const before = text.slice(Math.max(0, matchStart - contextChars), matchStart);
  const after = text.slice(matchEnd, Math.min(text.length, matchEnd + contextChars));
  return { before, after };
}
