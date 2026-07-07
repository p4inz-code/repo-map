/**
 * Workspace types for the V3 Runtime.
 *
 * Defines the workspace state and context that flows through every frame.
 * WorkspaceContext replaces ad-hoc state lookups with a single, immutable
 * snapshot delivered via FrameContext.
 *
 * # WorkspaceContext Contents
 * - active screen (current view)
 * - repository (analysis data, when available)
 * - selection (selected item in sidebar/tree)
 * - search state (active, query, results)
 * - scroll state (per-screen scroll offsets)
 * - history (screen navigation history)
 * - cursor (cursor position and visibility)
 * - plugin state (future extensibility)
 */

import type { Analysis } from '../../../types.js';

// ─── Selection ────────────────────────────────────────────────────

/**
 * Represents a selected item in the workspace.
 */
export interface WorkspaceSelection {
  /** Selected item ID. */
  readonly id: string;
  /** Type of selected item. */
  readonly type: 'sidebar' | 'tree' | 'file' | 'search-result' | 'command';
  /** Optional metadata about the selection. */
  readonly metadata: Record<string, unknown>;
}

// ─── Scroll State ─────────────────────────────────────────────────

/**
 * Scroll state for a single view.
 */
export interface ScrollState {
  /** Current scroll offset (in lines). */
  readonly offset: number;
  /** Total scrollable height (in lines). */
  readonly totalHeight: number;
  /** Visible height (in lines). */
  readonly viewportHeight: number;
  /** Whether scrolling is at the top. */
  readonly atTop: boolean;
  /** Whether scrolling is at the bottom. */
  readonly atBottom: boolean;
}

// ─── Search State ─────────────────────────────────────────────────

/**
 * Workspace search state.
 */
export interface WorkspaceSearchState {
  /** Whether search is active. */
  readonly active: boolean;
  /** Search query string. */
  readonly query: string;
  /** Number of results found. */
  readonly resultCount: number;
  /** Index of the currently selected result. */
  readonly selectedIndex: number;
}

// ─── Screen History ───────────────────────────────────────────────

/**
 * Navigation history entry.
 */
export interface HistoryEntry {
  /** Screen ID. */
  readonly screenId: string;
  /** Timestamp when navigated to this screen. */
  readonly timestamp: number;
  /** Optional metadata (scroll position, selection, etc.). */
  readonly metadata: Record<string, unknown>;
}

// ─── Cursor State ─────────────────────────────────────────────────

/**
 * Cursor position and visibility.
 */
export interface CursorState {
  /** Whether the cursor is visible. */
  readonly visible: boolean;
  /** Cursor column. */
  readonly x: number;
  /** Cursor row. */
  readonly y: number;
  /** Cursor style (block, underline, bar). */
  readonly style: 'block' | 'underline' | 'bar';
}

// ─── Workspace Context ────────────────────────────────────────────

/**
 * Complete workspace state snapshot.
 *
 * Delivered via FrameContext to every renderer.
 * Immutable by convention — renderers should not mutate this object.
 */
export interface WorkspaceContext {
  /** Currently active screen ID. */
  readonly activeScreenId: string | null;

  /** List of all screens in the navigation history (oldest first). */
  readonly screenHistory: readonly HistoryEntry[];

  /** Current selection. */
  readonly selection: WorkspaceSelection | null;

  /** Search state. */
  readonly search: WorkspaceSearchState;

  /** Scroll state for the active screen. */
  readonly scroll: ScrollState;

  /** Cursor position and visibility. */
  readonly cursor: CursorState;

  /** Analysis data (null if not loaded). */
  readonly analysis: Analysis | null;

  /** Whether raw mode is active. */
  readonly rawMode: boolean;

  /** Plugin data (extensible key-value store for future plugins). */
  readonly plugins: ReadonlyMap<string, unknown>;
}

// ─── Workspace State Change ───────────────────────────────────────

/**
 * Events that can modify workspace state.
 */
export type WorkspaceChangeType =
  | 'screen-changed'
  | 'selection-changed'
  | 'search-updated'
  | 'scroll-changed'
  | 'cursor-moved'
  | 'analysis-loaded'
  | 'history-changed'
  | 'plugin-state-changed';

/**
 * A workspace state change event.
 */
export interface WorkspaceChangeEvent {
  /** Type of change. */
  readonly type: WorkspaceChangeType;
  /** New workspace context after the change. */
  readonly context: WorkspaceContext;
  /** Previous workspace context before the change. */
  readonly previousContext: WorkspaceContext;
}

// ─── Defaults ─────────────────────────────────────────────────────

/**
 * Create a default empty scroll state.
 */
export function defaultScrollState(): ScrollState {
  return {
    offset: 0,
    totalHeight: 0,
    viewportHeight: 0,
    atTop: true,
    atBottom: true,
  };
}

/**
 * Create a default empty search state.
 */
export function defaultSearchState(): WorkspaceSearchState {
  return {
    active: false,
    query: '',
    resultCount: 0,
    selectedIndex: 0,
  };
}

/**
 * Create a default cursor state.
 */
export function defaultCursorState(): CursorState {
  return {
    visible: true,
    x: 0,
    y: 0,
    style: 'block',
  };
}

/**
 * Create an initial, empty WorkspaceContext.
 */
export function createInitialWorkspaceContext(): WorkspaceContext {
  return {
    activeScreenId: null,
    screenHistory: [],
    selection: null,
    search: defaultSearchState(),
    scroll: defaultScrollState(),
    cursor: defaultCursorState(),
    analysis: null,
    rawMode: false,
    plugins: new Map(),
  };
}
