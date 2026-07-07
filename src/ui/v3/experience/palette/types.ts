/**
 * Palette UX types for the V3 Experience Engine.
 *
 * Raycast-inspired command palette with:
 * - Recent commands (last used tracking)
 * - Pinned commands (user favorites)
 * - Usage frequency (most-used rises)
 * - Search ranking (fuzzy match + recency + frequency)
 * - Keyboard-only workflow
 * - No mouse assumptions
 */

// ─── Palette Command ──────────────────────────────────────────────

export interface PaletteCommand {
  /** Unique command identifier. */
  readonly id: string;
  /** Display label. */
  readonly label: string;
  /** Optional description. */
  readonly description?: string;
  /** Category/group. */
  readonly category: string;
  /** Icon glyph. */
  readonly icon: string;
  /** Keyboard shortcuts (e.g., ['ctrl-p', 'cmd-p']). */
  readonly shortcuts: string[];
  /** Whether the command is pinned by the user. */
  pinned: boolean;
  /** Usage count. */
  usageCount: number;
  /** Timestamp of last use. */
  lastUsedAt: number;
}

// ─── Palette Entry ────────────────────────────────────────────────

/**
 * A ranked palette entry (command + ranking score).
 */
export interface PaletteEntry {
  /** The command. */
  readonly command: PaletteCommand;
  /** Search relevance score (higher = more relevant). */
  readonly score: number;
  /** Match positions in the label (for highlighting). */
  readonly matchPositions: number[];
}

// ─── Palette Search Query ─────────────────────────────────────────

export interface PaletteSearchQuery {
  /** Raw query string. */
  readonly query: string;
  /** Normalized lowercase tokens. */
  readonly tokens: string[];
  /** Whether this is an empty query (showing all/pinned/recent). */
  readonly isEmpty: boolean;
}

// ─── Palette UX State ─────────────────────────────────────────────

export interface PaletteUXState {
  /** Current search query. */
  readonly query: string;
  /** Ranked results. */
  readonly results: PaletteEntry[];
  /** Selected index in results. */
  readonly selectedIndex: number;
  /** Whether to show recent commands. */
  readonly showRecent: boolean;
  /** Whether to show pinned commands. */
  readonly showPinned: boolean;
}

// ─── Default Commands ─────────────────────────────────────────────

/**
 * Default command palette commands.
 */
export const DEFAULT_PALETTE_COMMANDS: PaletteCommand[] = [
  { id: 'show-dashboard', label: 'Show Dashboard', category: 'Navigation', icon: '◆', shortcuts: ['1'], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'run-scan', label: 'Run Scan', category: 'Actions', icon: '⌕', shortcuts: ['2'], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'show-results', label: 'Show Results', category: 'Navigation', icon: '█', shortcuts: ['3'], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'show-architecture', label: 'Show Architecture', category: 'Navigation', icon: '⟨⟩', shortcuts: ['4'], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'show-dependencies', label: 'Show Dependencies', category: 'Navigation', icon: '◎', shortcuts: ['5'], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'show-insights', label: 'Show Insights', category: 'Navigation', icon: '⌕', shortcuts: ['6'], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'show-suggestions', label: 'Show Suggestions', category: 'Navigation', icon: '⚠', shortcuts: ['7'], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'show-history', label: 'Show History', category: 'Navigation', icon: '◆', shortcuts: ['8'], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'show-plugins', label: 'Show Plugins', category: 'Navigation', icon: '⚒', shortcuts: ['9'], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'show-settings', label: 'Show Settings', category: 'Navigation', icon: '█', shortcuts: [], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'show-about', label: 'Show About', category: 'Navigation', icon: '✓', shortcuts: [], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'show-help', label: 'Show Help', category: 'Help', icon: '?', shortcuts: ['?'], pinned: true, usageCount: 0, lastUsedAt: 0 },
  { id: 'toggle-search', label: 'Toggle Search', category: 'Actions', icon: '⌕', shortcuts: ['/'], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', category: 'View', icon: '≡', shortcuts: [], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'export-json', label: 'Export as JSON', category: 'Export', icon: '█', shortcuts: [], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'export-markdown', label: 'Export as Markdown', category: 'Export', icon: '█', shortcuts: [], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'reanalyze', label: 'Re-analyze Repository', category: 'Actions', icon: '⌕', shortcuts: [], pinned: false, usageCount: 0, lastUsedAt: 0 },
  { id: 'quit', label: 'Quit', category: 'System', icon: '✗', shortcuts: ['q'], pinned: false, usageCount: 0, lastUsedAt: 0 },
];

// ─── Search Ranking ───────────────────────────────────────────────

/**
 * Calculate search relevance score for a command against a query.
 * Higher score = more relevant.
 *
 * Factors:
 * - Exact prefix match: +100
 * - Contains query: +50
 * - Fuzzy match (characters in order): +10 per matching char
 * - Recency bonus: +1 per use, +5 if used within last hour
 * - Pinned bonus: +20
 */
export function scoreCommand(
  command: PaletteCommand,
  query: PaletteSearchQuery,
): number {
  if (query.isEmpty) {
    // Empty query: show pinned first, then by usage
    let score = command.usageCount * 2;
    if (command.pinned) score += 100;
    if (command.lastUsedAt > 0) {
      const hoursSinceUse = (Date.now() - command.lastUsedAt) / 3600000;
      if (hoursSinceUse < 1) score += 50;
      if (hoursSinceUse < 24) score += 10;
    }
    return score;
  }

  const lower = command.label.toLowerCase();
  const queryLower = query.query.toLowerCase();

  let score = 0;

  // Exact prefix match
  if (lower.startsWith(queryLower)) {
    score += 100;
  }

  // Contains query
  if (lower.includes(queryLower)) {
    score += 50;
  }

  // Fuzzy match (characters in order)
  let queryIdx = 0;
  for (let i = 0; i < lower.length && queryIdx < queryLower.length; i++) {
    if (lower[i] === queryLower[queryIdx]) {
      score += 10;
      queryIdx++;
    }
  }

  // Did we match all characters?
  if (queryIdx === queryLower.length) {
    score += 20; // Full fuzzy match bonus
  }

  // Usage bonus
  score += command.usageCount * 0.5;

  // Pinned bonus
  if (command.pinned) score += 20;

  return score;
}

/**
 * Find matched character positions for highlighting.
 */
export function findMatchPositions(label: string, query: string): number[] {
  const positions: number[] = [];
  const lower = label.toLowerCase();
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
 * Parse a search query into tokens.
 */
export function parseQuery(query: string): PaletteSearchQuery {
  return {
    query,
    tokens: query.toLowerCase().split(/\s+/).filter((t) => t.length > 0),
    isEmpty: query.length === 0,
  };
}
