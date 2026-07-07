/**
 * WorkspaceManager — manages workspace state for the V3 Runtime.
 *
 * Provides a centralized, observable workspace state that flows
 * through every frame via FrameContext.
 *
 * # Managed State
 * - Active screen (current view)
 * - Screen navigation history
 * - Selection (sidebar, tree, search results)
 * - Search state (active, query, results)
 * - Scroll state (per-screen or unified)
 * - Cursor position and visibility
 * - Analysis data
 * - Plugin state (future)
 *
 * # Architecture
 * ```
 * WorkspaceManager
 *   ├── WorkspaceContext (current state snapshot)
 *   ├── Change Events (subscribers notified on state change)
 *   └── Screen History (navigation stack)
 * ```
 *
 * # Observation
 * - Subscribe to specific changes via workspaceChange events.
 * - The RuntimeManager gets the current context for each frame.
 * - Context is immutable by convention (no direct mutation).
 */

import type { Analysis } from '../../../types.js';
import type {
  WorkspaceContext,
  WorkspaceSelection,
  WorkspaceSearchState,
  ScrollState,
  CursorState,
  HistoryEntry,
  WorkspaceChangeEvent,
  WorkspaceChangeType,
} from './types.js';
import {
  createInitialWorkspaceContext,
  defaultScrollState,
  defaultSearchState,
  defaultCursorState,
} from './types.js';

// ─── WorkspaceManager ─────────────────────────────────────────────

export class WorkspaceManager {
  /** Current workspace context. */
  private _context: WorkspaceContext;

  /** Subscribers for workspace changes. */
  private readonly _subscribers: Map<string, Set<(event: WorkspaceChangeEvent) => void>> = new Map();

  /** Global subscribers (all changes). */
  private readonly _globalSubscribers: Set<(event: WorkspaceChangeEvent) => void> = new Set();

  /** Maximum number of history entries before trimming (oldest removed). */
  private readonly _maxHistoryDepth: number;

  constructor(maxHistoryDepth: number = 50) {
    this._context = createInitialWorkspaceContext();
    this._maxHistoryDepth = maxHistoryDepth;
  }

  // ── Screen Management ─────────────────────────────────────────

  /**
   * Set the active screen.
   *
   * @param screenId - The screen ID to activate.
   */
  setActiveScreen(screenId: string): void {
    const previous = this._context;

    // Add to history (trim to max depth)
    const newHistory: HistoryEntry[] = [
      ...previous.screenHistory,
      {
        screenId,
        timestamp: Date.now(),
        metadata: {},
      },
    ].slice(-this._maxHistoryDepth);

    this._context = {
      ...previous,
      activeScreenId: screenId,
      screenHistory: newHistory,
    };

    this._emitChange('screen-changed', previous);
  }

  /**
   * Go back to the previous screen.
   *
   * @returns The previous screen ID, or null if history is empty.
   */
  goBack(): string | null {
    if (this._context.screenHistory.length < 2) return null;

    const previous = this._context;
    const newHistory = previous.screenHistory.slice(0, -1);
    const prevScreen = newHistory[newHistory.length - 1]?.screenId ?? null;

    this._context = {
      ...previous,
      activeScreenId: prevScreen,
      screenHistory: newHistory,
    };

    this._emitChange('screen-changed', previous);
    return prevScreen;
  }

  /**
   * Reset to the initial screen state.
   */
  resetHistory(): void {
    const previous = this._context;
    this._context = {
      ...previous,
      activeScreenId: null,
      screenHistory: [],
    };
    this._emitChange('history-changed', previous);
  }

  // ── Selection ─────────────────────────────────────────────────

  /**
   * Set the current selection.
   */
  setSelection(selection: WorkspaceSelection | null): void {
    const previous = this._context;
    this._context = { ...previous, selection };
    this._emitChange('selection-changed', previous);
  }

  /**
   * Clear the current selection.
   */
  clearSelection(): void {
    this.setSelection(null);
  }

  // ── Search ────────────────────────────────────────────────────

  /**
   * Update the search state.
   */
  setSearchState(search: Partial<WorkspaceSearchState>): void {
    const previous = this._context;
    this._context = {
      ...previous,
      search: { ...previous.search, ...search },
    };
    this._emitChange('search-updated', previous);
  }

  /**
   * Activate search with an optional initial query.
   */
  activateSearch(query: string = ''): void {
    this.setSearchState({ active: true, query, selectedIndex: 0 });
  }

  /**
   * Deactivate search.
   */
  deactivateSearch(): void {
    this.setSearchState({ active: false, query: '', selectedIndex: 0, resultCount: 0 });
  }

  // ── Scroll ────────────────────────────────────────────────────

  /**
   * Update the scroll state.
   */
  setScrollState(scroll: Partial<ScrollState>): void {
    const previous = this._context;
    this._context = {
      ...previous,
      scroll: { ...previous.scroll, ...scroll },
    };
    this._emitChange('scroll-changed', previous);
  }

  /**
   * Scroll the active view by a delta.
   */
  scrollBy(delta: number): void {
    const current = this._context.scroll;
    const newOffset = Math.max(
      0,
      Math.min(
        current.offset + delta,
        Math.max(0, current.totalHeight - current.viewportHeight),
      ),
    );
    this.setScrollState({ offset: newOffset });
  }

  // ── Cursor ────────────────────────────────────────────────────

  /**
   * Update the cursor state.
   */
  setCursorState(cursor: Partial<CursorState>): void {
    const previous = this._context;
    this._context = {
      ...previous,
      cursor: { ...previous.cursor, ...cursor },
    };
    this._emitChange('cursor-moved', previous);
  }

  /**
   * Hide the cursor.
   */
  hideCursor(): void {
    this.setCursorState({ visible: false });
  }

  /**
   * Show the cursor.
   */
  showCursor(): void {
    this.setCursorState({ visible: true });
  }

  // ── Analysis ──────────────────────────────────────────────────

  /**
   * Set the analysis data.
   */
  setAnalysis(analysis: Analysis | null): void {
    const previous = this._context;
    this._context = { ...previous, analysis };
    this._emitChange('analysis-loaded', previous);
  }

  // ── Plugin State ──────────────────────────────────────────────

  /**
   * Set plugin data by key.
   */
  setPluginData(key: string, value: unknown): void {
    const previous = this._context;
    const newPlugins = new Map(previous.plugins);
    newPlugins.set(key, value);
    this._context = { ...previous, plugins: newPlugins };
    this._emitChange('plugin-state-changed', previous);
  }

  /**
   * Get plugin data by key.
   */
  getPluginData(key: string): unknown {
    return this._context.plugins.get(key);
  }

  // ── Context Access ────────────────────────────────────────────

  /**
   * Get the current workspace context snapshot.
   */
  getContext(): WorkspaceContext {
    return this._context;
  }

  /**
   * Reset the workspace to its initial state.
   */
  reset(): void {
    this._context = createInitialWorkspaceContext();
  }

  // ── Subscriptions ─────────────────────────────────────────────

  /**
   * Subscribe to a specific type of workspace change.
   *
   * @param type     - The change type to subscribe to.
   * @param callback - Called with the change event.
   * @returns An unsubscribe function.
   */
  onChange(
    type: WorkspaceChangeType,
    callback: (event: WorkspaceChangeEvent) => void,
  ): () => void {
    if (!this._subscribers.has(type)) {
      this._subscribers.set(type, new Set());
    }
    this._subscribers.get(type)!.add(callback);

    return () => {
      this._subscribers.get(type)?.delete(callback);
    };
  }

  /**
   * Subscribe to all workspace changes.
   *
   * @param callback - Called with every change event.
   * @returns An unsubscribe function.
   */
  onAnyChange(callback: (event: WorkspaceChangeEvent) => void): () => void {
    this._globalSubscribers.add(callback);
    return () => this._globalSubscribers.delete(callback);
  }

  /**
   * Remove all subscribers.
   */
  clearSubscribers(): void {
    this._subscribers.clear();
    this._globalSubscribers.clear();
  }

  // ── Internal ──────────────────────────────────────────────────

  /**
   * Emit a change event to subscribers.
   */
  private _emitChange(type: WorkspaceChangeType, previous: WorkspaceContext): void {
    const event: WorkspaceChangeEvent = {
      type,
      context: this._context,
      previousContext: previous,
    };

    // Notify type-specific subscribers
    const typeSubs = this._subscribers.get(type);
    if (typeSubs) {
      for (const cb of typeSubs) {
        try { cb(event); } catch { /* swallow */ }
      }
    }

    // Notify global subscribers
    for (const cb of this._globalSubscribers) {
      try { cb(event); } catch { /* swallow */ }
    }
  }
}
