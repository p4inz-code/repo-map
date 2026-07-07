/**
 * Empty state types for the V3 Experience Engine.
 *
 * Every empty state explains:
 * - Why the view is empty
 * - What happened
 * - How to continue
 *
 * Supported empty states:
 * - No repository loaded
 * - No results (analysis)
 * - No dependencies found
 * - No suggestions generated
 * - No plugins installed
 * - No history (navigation)
 */

// ─── Empty State ──────────────────────────────────────────────────

export interface EmptyState {
  /** Unique identifier. */
  readonly id: string;
  /** Short title. */
  readonly title: string;
  /** Explanation of why this view is empty. */
  readonly explanation: string;
  /** What the user can do next. */
  readonly suggestion: string;
  /** Icon/emoji to display. */
  readonly icon: string;
  /** Suggested action label (e.g., "Scan Repository"). */
  readonly actionLabel?: string;
  /** Action type for routing (e.g., 'navigate:scan'). */
  readonly actionType?: string;
}

// ─── Empty State Registry ─────────────────────────────────────────

/**
 * Registry of all empty states by screen ID.
 */
export const EMPTY_STATES: Record<string, EmptyState> = {
  'no-repository': {
    id: 'no-repository',
    title: 'No Repository Loaded',
    explanation: 'No repository has been scanned yet. The workspace is empty because there is no project data to display.',
    suggestion: 'Start by scanning a repository to analyze its structure, dependencies, and architecture.',
    icon: '◆',
    actionLabel: 'Scan Repository',
    actionType: 'navigate:scan',
  },
  'no-results': {
    id: 'no-results',
    title: 'No Results',
    explanation: 'The analysis completed but no results were generated. This can happen if the repository is empty or contains no supported file types.',
    suggestion: 'Try scanning a different directory or checking that the repository contains source code files.',
    icon: '·',
    actionLabel: 'Re-scan',
    actionType: 'navigate:scan',
  },
  'no-dependencies': {
    id: 'no-dependencies',
    title: 'No Dependencies Found',
    explanation: 'No external dependencies were detected in this repository. The dependency analyzer did not find any package configuration files.',
    suggestion: 'Dependencies are detected from package.json, requirements.txt, Cargo.toml, and similar files.',
    icon: '·',
  },
  'no-suggestions': {
    id: 'no-suggestions',
    title: 'No Suggestions',
    explanation: 'The analysis did not generate any suggestions. This means the repository appears to follow best practices.',
    suggestion: 'Run a full analysis to get architecture and code quality insights that may generate suggestions.',
    icon: '✓',
    actionLabel: 'Run Analysis',
    actionType: 'navigate:scan',
  },
  'no-plugins': {
    id: 'no-plugins',
    title: 'No Plugins Installed',
    explanation: 'The plugin system is ready but no plugins are currently installed. Extend repo-map with community or custom plugins.',
    suggestion: 'Visit the plugin marketplace or use the plugin API to create your own extensions.',
    icon: '⚒',
    actionLabel: 'Browse Plugins',
    actionType: 'navigate:plugins',
  },
  'no-history': {
    id: 'no-history',
    title: 'No Navigation History',
    explanation: 'You haven\'t navigated to any screens yet. Navigation history is empty because this is your first interaction.',
    suggestion: 'Browse through the sidebar items to build up your navigation history.',
    icon: '·',
  },
};

/**
 * Get the empty state for a given screen/context.
 * Falls back to a generic empty state.
 */
export function getEmptyState(id: string): EmptyState {
  return EMPTY_STATES[id] ?? {
    id: 'empty',
    title: 'Nothing Here',
    explanation: 'This view is empty.',
    suggestion: 'Try navigating to a different screen.',
    icon: '·',
  };
}
