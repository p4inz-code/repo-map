/**
 * Context hint types for the V3 Experience Engine.
 *
 * The status bar changes contextually based on the current mode.
 * Hints change automatically as the user interacts.
 *
 * Modes:
 * - browsing: Normal navigation mode
 * - searching: Search is active
 * - palette: Command palette is open
 * - loading: An operation is in progress
 * - exporting: Exporting data
 * - scanning: Scanning repository
 * - error: Error state
 */

// ─── Context Mode ─────────────────────────────────────────────────

export type ContextMode =
  | 'browsing'
  | 'searching'
  | 'palette'
  | 'loading'
  | 'exporting'
  | 'scanning'
  | 'analyzing'
  | 'error';

// ─── Context Hint Definition ──────────────────────────────────────

export interface ContextHint {
  /** The mode this hint applies to. */
  readonly mode: ContextMode;
  /** Left-side status text. */
  readonly statusText: string;
  /** Right-side hint text. */
  readonly hintText: string;
  /** Short key hints (e.g., "?=Help q=Quit"). */
  readonly shortcuts: string;
  /** Whether to show progress indicator. */
  readonly showProgress: boolean;
}

// ─── Context Hint Registry ────────────────────────────────────────

/**
 * Registry of context hints for each mode.
 */
export const CONTEXT_HINTS: Record<ContextMode, ContextHint> = {
  browsing: {
    mode: 'browsing',
    statusText: 'Browsing',
    hintText: 'Use arrow keys to navigate',
    shortcuts: '?=Help q=Quit /=Search',
    showProgress: false,
  },
  searching: {
    mode: 'searching',
    statusText: 'Searching',
    hintText: 'Type to filter results',
    shortcuts: 'Esc=Cancel Enter=Jump',
    showProgress: false,
  },
  palette: {
    mode: 'palette',
    statusText: 'Command Palette',
    hintText: 'Type a command',
    shortcuts: 'Esc=Close Enter=Execute',
    showProgress: false,
  },
  loading: {
    mode: 'loading',
    statusText: 'Loading',
    hintText: 'Please wait...',
    shortcuts: '',
    showProgress: true,
  },
  exporting: {
    mode: 'exporting',
    statusText: 'Exporting',
    hintText: 'Writing output file',
    shortcuts: '',
    showProgress: true,
  },
  scanning: {
    mode: 'scanning',
    statusText: 'Scanning',
    hintText: 'Walking file tree',
    shortcuts: '',
    showProgress: true,
  },
  analyzing: {
    mode: 'analyzing',
    statusText: 'Analyzing',
    hintText: 'Processing repository data',
    shortcuts: '',
    showProgress: true,
  },
  error: {
    mode: 'error',
    statusText: 'Error',
    hintText: 'An error occurred',
    shortcuts: 'Esc=Dismiss q=Quit',
    showProgress: false,
  },
};

/**
 * Auto-detect context mode from workspace state.
 */
export function detectContextMode(params: {
  searchActive: boolean;
  paletteOpen: boolean;
  isLoading: boolean;
  isScanning: boolean;
  isAnalyzing: boolean;
  isExporting: boolean;
  isError: boolean;
}): ContextMode {
  if (params.isError) return 'error';
  if (params.isScanning) return 'scanning';
  if (params.isAnalyzing) return 'analyzing';
  if (params.isExporting) return 'exporting';
  if (params.isLoading) return 'loading';
  if (params.paletteOpen) return 'palette';
  if (params.searchActive) return 'searching';
  return 'browsing';
}
