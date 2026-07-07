/**
 * Loading state types for the V3 Experience Engine.
 *
 * Every expensive operation has an informative loading state.
 * Never spinner-only — loading states show what's happening.
 *
 * Supported operations:
 * - Repository scan
 * - Architecture generation
 * - JSON export
 * - Markdown export
 * - Suggestions
 * - Search indexing
 */

// ─── Loading Operation ────────────────────────────────────────────

export type LoadingOperation =
  | 'scanning'
  | 'analyzing'
  | 'exporting-json'
  | 'exporting-markdown'
  | 'generating-suggestions'
  | 'indexing-search'
  | 'loading';

// ─── Loading State ────────────────────────────────────────────────

export interface LoadingState {
  /** The operation being performed. */
  readonly operation: LoadingOperation;
  /** Human-readable title. */
  readonly title: string;
  /** Description of what's happening. */
  readonly description: string;
  /** Current progress (0..100, -1 if indeterminate). */
  progress: number;
  /** Current status message (e.g., "Processing file 42/100"). */
  statusMessage: string;
  /** Estimated time remaining in ms (-1 if unknown). */
  estimatedRemainingMs: number;
  /** Elapsed time since the operation started in ms. */
  elapsedMs: number;
  /** Whether the operation is complete. */
  completed: boolean;
  /** Whether the operation encountered an error. */
  errored: boolean;
  /** Error message (if errored). */
  errorMessage?: string;
  /** Operation-specific metadata. */
  metadata: Record<string, unknown>;
}

// ─── Loading Operation Helpers ────────────────────────────────────

/**
 * Get the default title for a loading operation.
 */
export function getLoadingTitle(operation: LoadingOperation): string {
  const titles: Record<LoadingOperation, string> = {
    scanning: 'Scanning Repository',
    analyzing: 'Analyzing Architecture',
    'exporting-json': 'Exporting JSON',
    'exporting-markdown': 'Exporting Markdown',
    'generating-suggestions': 'Generating Suggestions',
    'indexing-search': 'Indexing Search',
    loading: 'Loading',
  };
  return titles[operation] ?? 'Loading';
}

/**
 * Get the default description for a loading operation.
 */
export function getLoadingDescription(operation: LoadingOperation): string {
  const descriptions: Record<LoadingOperation, string> = {
    scanning: 'Walking the file tree to discover project structure',
    analyzing: 'Analyzing dependencies, architecture patterns, and code quality',
    'exporting-json': 'Writing structured analysis data to JSON format',
    'exporting-markdown': 'Writing human-readable report to Markdown format',
    'generating-suggestions': 'Generating actionable improvement suggestions',
    'indexing-search': 'Building search index for fast lookup',
    loading: 'Preparing workspace',
  };
  return descriptions[operation] ?? 'Processing...';
}
