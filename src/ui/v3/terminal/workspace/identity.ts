/**
 * WorkspaceIdentity — the unified workspace ecosystem for repo-map V3.
 *
 * Provides:
 * - Workspace identity (header, sidebar, breadcrumbs, footer as one system)
 * - Persistent workspace state (last screen, scroll positions, palette history)
 * - Navigation history (back, forward, recently visited)
 * - Breadcrumb engine (keyboard-navigable path hierarchy)
 *
 * Integrates with EventBus for all state changes.
 * Integrates with WorkspaceManager for screen state.
 * Integrates with RuntimeManager for frame scheduling.
 */

import type { EventBus } from '../../event-bus/bus.js';
import type { WorkspaceManager } from '../../workspace/context.js';

// ─── History Entry ────────────────────────────────────────────────

export interface WorkspaceHistoryEntry {
  /** Screen ID. */
  readonly screenId: string;
  /** Human-readable label. */
  readonly label: string;
  /** Timestamp of navigation. */
  readonly timestamp: number;
  /** Scroll position at the time of navigation. */
  readonly scrollOffset: number;
  /** Selected item at the time of navigation. */
  readonly selectedId: string | null;
}

// ─── Breadcrumb ───────────────────────────────────────────────────

export interface Breadcrumb {
  /** Screen ID. */
  readonly screenId: string;
  /** Display label. */
  readonly label: string;
  /** Whether this breadcrumb is the current (last) one. */
  readonly isCurrent: boolean;
}

// ─── Persistent State ─────────────────────────────────────────────

export interface PersistentWorkspaceState {
  /** Last active screen ID. */
  lastScreen: string | null;
  /** Expanded tree node IDs. */
  expandedNodes: string[];
  /** Scroll positions per screen. */
  scrollPositions: Record<string, number>;
  /** Selection per screen. */
  selections: Record<string, string | null>;
  /** Palette recent commands (most recent first). */
  paletteRecentCommands: string[];
  /** Recent searches (most recent first). */
  recentSearches: string[];
  /** Last selected repository path. */
  lastRepository: string | null;
  /** Theme name. */
  theme: string;
  /** Layout configuration. */
  layout: {
    sidebarWidth: number;
    sidebarCollapsed: boolean;
    inspectorWidth: number;
    inspectorVisible: boolean;
  };
}

// ─── WorkspaceIdentity ────────────────────────────────────────────

export class WorkspaceIdentity {
  private readonly _eventBus: EventBus;
  private readonly _workspaceManager: WorkspaceManager;

  /** Navigation history (past states, for "back"). */
  private readonly _backStack: WorkspaceHistoryEntry[] = [];

  /** Navigation history (future states, for "forward"). */
  private readonly _forwardStack: WorkspaceHistoryEntry[] = [];

  /** Persistent workspace state. */
  private _persistentState: PersistentWorkspaceState;

  /** Current breadcrumbs. */
  private _breadcrumbs: Breadcrumb[] = [];

  /** Maximum history depth. */
  private readonly _maxHistory: number = 50;

  /** Screen label map. */
  private readonly _screenLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    scan: 'Scan',
    results: 'Results',
    architecture: 'Architecture',
    dependencies: 'Dependencies',
    insights: 'Insights',
    suggestions: 'Suggestions',
    history: 'History',
    plugins: 'Plugins',
    settings: 'Settings',
    about: 'About',
    help: 'Help',
    error: 'Error',
    loading: 'Loading',
  };

  constructor(eventBus: EventBus, workspaceManager: WorkspaceManager) {
    this._eventBus = eventBus;
    this._workspaceManager = workspaceManager;
    this._persistentState = this._loadPersistentState();
    this._setupListeners();
  }

  // ── Navigation History ───────────────────────────────────────

  /**
   * Record a navigation in history.
   */
  recordNavigation(screenId: string, scrollOffset: number = 0): void {
    const ctx = this._workspaceManager.getContext();

    const entry: WorkspaceHistoryEntry = {
      screenId,
      label: this._screenLabels[screenId] ?? screenId,
      timestamp: Date.now(),
      scrollOffset,
      selectedId: ctx.selection?.id ?? null,
    };

    // Push to back stack, clear forward stack
    this._backStack.push(entry);
    if (this._backStack.length > this._maxHistory) {
      this._backStack.shift();
    }
    this._forwardStack.length = 0;

    // Update breadcrumbs
    this._updateBreadcrumbs(screenId);

    // Save to persistent state
    this._persistentState.lastScreen = screenId;
    this._persistentState.scrollPositions[screenId] = scrollOffset;
    this._savePersistentState();
  }

  /**
   * Navigate back in history.
   * @returns The screen ID to navigate to, or null if no history.
   */
  goBack(): string | null {
    if (this._backStack.length < 2) return null;

    const current = this._backStack.pop()!;
    this._forwardStack.push(current);

    const previous = this._backStack[this._backStack.length - 1];

    // Update breadcrumbs
    this._updateBreadcrumbs(previous.screenId);

    return previous.screenId;
  }

  /**
   * Navigate forward in history.
   * @returns The screen ID to navigate to, or null if no forward history.
   */
  goForward(): string | null {
    if (this._forwardStack.length === 0) return null;

    const next = this._forwardStack.pop()!;
    this._backStack.push(next);

    // Update breadcrumbs
    this._updateBreadcrumbs(next.screenId);

    return next.screenId;
  }

  /**
   * Get the navigation history (most recent first).
   */
  getRecentHistory(limit: number = 10): WorkspaceHistoryEntry[] {
    return [...this._backStack].reverse().slice(0, limit);
  }

  // ── Breadcrumbs ──────────────────────────────────────────────

  /**
   * Get current breadcrumbs.
   */
  getBreadcrumbs(): Breadcrumb[] {
    return [...this._breadcrumbs];
  }

  /**
   * Navigate to a breadcrumb by index.
   */
  navigateToBreadcrumb(index: number): string | null {
    if (index < 0 || index >= this._breadcrumbs.length) return null;

    const target = this._breadcrumbs[index];
    if (target.isCurrent) return null;

    // Pop back stack until we reach the target
    while (this._backStack.length > 0) {
      const current = this._backStack[this._backStack.length - 1];
      if (current.screenId === target.screenId) break;
      const popped = this._backStack.pop()!;
      this._forwardStack.push(popped);
    }

    this._updateBreadcrumbs(target.screenId);
    return target.screenId;
  }

  // ── Persistent State ─────────────────────────────────────────

  /**
   * Get the persistent workspace state.
   */
  getPersistentState(): PersistentWorkspaceState {
    return { ...this._persistentState };
  }

  /**
   * Update persistent state.
   */
  updatePersistentState(partial: Partial<PersistentWorkspaceState>): void {
    this._persistentState = { ...this._persistentState, ...partial };
    this._savePersistentState();
  }

  /**
   * Remember an expanded tree node.
   */
  rememberExpandedNode(nodeId: string): void {
    const nodes = this._persistentState.expandedNodes;
    if (!nodes.includes(nodeId)) {
      nodes.push(nodeId);
      this._persistentState.expandedNodes = nodes;
      this._savePersistentState();
    }
  }

  /**
   * Forget an expanded tree node.
   */
  forgetExpandedNode(nodeId: string): void {
    this._persistentState.expandedNodes =
      this._persistentState.expandedNodes.filter((id) => id !== nodeId);
    this._savePersistentState();
  }

  /**
   * Add a palette command to recent history.
   */
  recordPaletteCommand(commandId: string): void {
    const recent = this._persistentState.paletteRecentCommands;
    const filtered = recent.filter((id) => id !== commandId);
    filtered.unshift(commandId);
    this._persistentState.paletteRecentCommands = filtered.slice(0, 20);
    this._savePersistentState();
  }

  /**
   * Add a search query to recent searches.
   */
  recordSearch(query: string): void {
    if (!query) return;
    const recent = this._persistentState.recentSearches;
    const filtered = recent.filter((q) => q !== query);
    filtered.unshift(query);
    this._persistentState.recentSearches = filtered.slice(0, 10);
    this._savePersistentState();
  }

  /**
   * Restore the last session.
   * @returns The screen ID to navigate to, or null for default.
   */
  restoreLastSession(): string | null {
    return this._persistentState.lastScreen;
  }

  /**
   * Get scroll position for a screen.
   */
  getScrollPosition(screenId: string): number {
    return this._persistentState.scrollPositions[screenId] ?? 0;
  }

  /**
   * Get selection for a screen.
   */
  getSelection(screenId: string): string | null {
    return this._persistentState.selections[screenId] ?? null;
  }

  // ── Internal ─────────────────────────────────────────────────

  private _setupListeners(): void {
    this._eventBus.on('screen-changed', (msg) => {
      this.recordNavigation(msg.payload.screenId);
    });
  }

  private _updateBreadcrumbs(screenId: string): void {
    // Build breadcrumb path through the back stack
    const seen = new Set<string>();
    const crumbs: Breadcrumb[] = [];

    for (const entry of this._backStack) {
      if (seen.has(entry.screenId)) continue;
      seen.add(entry.screenId);
      crumbs.push({
        screenId: entry.screenId,
        label: entry.label,
        isCurrent: entry.screenId === screenId,
      });
    }

    // Ensure the current screen is included
    if (!seen.has(screenId)) {
      crumbs.push({
        screenId,
        label: this._screenLabels[screenId] ?? screenId,
        isCurrent: true,
      });
    }

    this._breadcrumbs = crumbs.slice(-8); // Max 8 breadcrumbs
  }

  /**
   * Load persistent state from a storage mechanism.
   * Currently uses a module-level variable; future versions can use localStorage or file.
   */
  private _loadPersistentState(): PersistentWorkspaceState {
    // In a CLI context, we use a module-level cache.
    // Future: persist to ~/.repo-map/state.json
    return {
      lastScreen: null,
      expandedNodes: [],
      scrollPositions: {},
      selections: {},
      paletteRecentCommands: [],
      recentSearches: [],
      lastRepository: null,
      theme: 'default-v2',
      layout: {
        sidebarWidth: 24,
        sidebarCollapsed: false,
        inspectorWidth: 30,
        inspectorVisible: true,
      },
    };
  }

  private _savePersistentState(): void {
    // Future: persist to ~/.repo-map/state.json
    // For now, state lives in memory for the session.
    // This method is a hook for future file-based persistence.
  }
}
