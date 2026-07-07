/**
 * KeyboardDiscoverability — makes every interaction discoverable.
 *
 * Provides:
 * - Contextual key hints (shown in footer / status bar)
 * - Cheat sheet overlay (all available key bindings)
 * - Context help (per-screen key bindings)
 * - Progressive disclosure (basic vs advanced hints)
 *
 * Every key binding in the system is registered here.
 * Hints update automatically based on current context.
 */

import type { EventBus } from '../../event-bus/bus.js';
import type { ContextMode } from '../../experience/context-hints/types.js';

// ─── Key Binding ────────────────────────────────────────────────────

export interface KeyBinding {
  /** Key or key combination (e.g., 'j', 'ctrl-p', 'tab'). */
  readonly key: string;
  /** Human-readable description. */
  readonly description: string;
  /** Category for grouping in cheat sheet. */
  readonly category: KeyBindingCategory;
  /** Context where this binding is active. */
  readonly context: ContextMode | '*';
  /** Whether this is a basic binding (shown in compact hints). */
  readonly basic: boolean;
}

// ─── Key Binding Categories ─────────────────────────────────────────

export type KeyBindingCategory =
  | 'navigation'
  | 'selection'
  | 'search'
  | 'palette'
  | 'export'
  | 'workspace'
  | 'general'
  | 'plugin';

// ─── Cheat Sheet ────────────────────────────────────────────────────

export interface CheatSheet {
  /** Category label. */
  readonly category: KeyBindingCategory;
  /** Bindings in this category. */
  readonly bindings: KeyBinding[];
}

// ─── KeyboardDiscoverability ────────────────────────────────────────

export class KeyboardDiscoverability {
  private readonly _eventBus: EventBus;

  /** All registered key bindings. */
  private readonly _bindings: Map<string, KeyBinding> = new Map();

  /** Current context mode (for filtering hints). */
  private _currentContext: ContextMode = 'browsing';

  /** Whether to show advanced hints. */
  private _showAdvanced: boolean = false;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
    this._registerDefaults();
    this._setupListeners();
  }

  // ── Registration ──────────────────────────────────────────────────

  /**
   * Register a key binding.
   */
  register(binding: KeyBinding): void {
    this._bindings.set(binding.key, binding);
  }

  /**
   * Register multiple key bindings at once.
   */
  registerMany(bindings: KeyBinding[]): void {
    for (const binding of bindings) {
      this._bindings.set(binding.key, binding);
    }
  }

  // ── Querying ──────────────────────────────────────────────────────

  /**
   * Get all hints for the current context.
   * @param compact - Whether to return only basic hints.
   */
  getHints(compact: boolean = true): KeyBinding[] {
    const mode = this._currentContext;
    const allHints: KeyBinding[] = [];

    for (const [, binding] of this._bindings) {
      if (binding.context !== '*' && binding.context !== mode) continue;
      if (compact && !binding.basic) continue;
      if (!this._showAdvanced && !binding.basic) continue;
      allHints.push(binding);
    }

    return allHints;
  }

  /**
   * Get the full cheat sheet, organized by category.
   */
  getCheatSheet(): CheatSheet[] {
    const grouped = new Map<KeyBindingCategory, KeyBinding[]>();

    for (const [, binding] of this._bindings) {
      let list = grouped.get(binding.category);
      if (!list) {
        list = [];
        grouped.set(binding.category, list);
      }
      list.push(binding);
    }

    return Array.from(grouped.entries())
      .map(([category, bindings]) => ({ category, bindings }));
  }

  /**
   * Get context-specific help bindings.
   */
  getContextHelp(): KeyBinding[] {
    return Array.from(this._bindings.values())
      .filter((b) => b.context === this._currentContext || b.context === '*');
  }

  /**
   * Set whether to show advanced hints.
   */
  setShowAdvanced(show: boolean): void {
    this._showAdvanced = show;
  }

  /**
   * Toggle advanced hints.
   */
  toggleAdvanced(): void {
    this._showAdvanced = !this._showAdvanced;
  }

  /**
   * Get a specific binding by key.
   */
  getBinding(key: string): KeyBinding | undefined {
    return this._bindings.get(key);
  }

  /**
   * Find a binding by description.
   */
  findBinding(query: string): KeyBinding[] {
    const lower = query.toLowerCase();
    return Array.from(this._bindings.values())
      .filter((b) => b.description.toLowerCase().includes(lower));
  }

  /**
   * Reset to defaults.
   */
  reset(): void {
    this._bindings.clear();
    this._registerDefaults();
  }

  // ── Internal ──────────────────────────────────────────────────

  private _registerDefaults(): void {
    this.registerMany([
      // Navigation — REAL bindings
      { key: '↑', description: 'Move up / Prev item', category: 'navigation', context: '*', basic: true },
      { key: '↓', description: 'Move down / Next item', category: 'navigation', context: '*', basic: true },
      { key: '←', description: 'Navigate back', category: 'navigation', context: '*', basic: true },
      { key: '→', description: 'Navigate forward', category: 'navigation', context: '*', basic: true },
      { key: 'tab', description: 'Next section / Cycle focus', category: 'navigation', context: '*', basic: true },
      { key: 'shift-tab', description: 'Previous section / Cycle focus', category: 'navigation', context: '*', basic: true },
      { key: 'pageup', description: 'Scroll page up', category: 'navigation', context: '*', basic: false },
      { key: 'pagedown', description: 'Scroll page down', category: 'navigation', context: '*', basic: false },
      { key: 'home', description: 'Go to top', category: 'navigation', context: '*', basic: false },
      { key: 'end', description: 'Go to bottom', category: 'navigation', context: '*', basic: false },

      // Selection
      { key: 'enter', description: 'Select / Open / Jump', category: 'selection', context: '*', basic: true },
      { key: 'space', description: 'Toggle selection', category: 'selection', context: '*', basic: false },

      // Search — REAL bindings
      { key: '/', description: 'Open search (v2)', category: 'search', context: '*', basic: true },
      { key: 'ctrl-f', description: 'Open incremental search', category: 'search', context: '*', basic: true },
      { key: 'n', description: 'Next search result', category: 'search', context: 'searching', basic: true },
      { key: 'N', description: 'Previous search result', category: 'search', context: 'searching', basic: true },
      { key: 'escape', description: 'Close search / Cancel', category: 'search', context: '*', basic: true },

      // Palette — REAL bindings
      { key: 'ctrl-k', description: 'Open command palette', category: 'palette', context: '*', basic: true },
      { key: 'ctrl-p', description: 'Open palette (legacy)', category: 'palette', context: '*', basic: true },
      { key: 'escape', description: 'Close palette', category: 'palette', context: 'palette', basic: true },

      // Export
      { key: 'e', description: 'Export', category: 'export', context: 'browsing', basic: true },
      { key: 'ctrl-s', description: 'Save export', category: 'export', context: '*', basic: false },

      // Workspace — REAL bindings
      { key: '?', description: 'Toggle help screen', category: 'workspace', context: '*', basic: true },
      { key: 'r', description: 'Refresh current screen', category: 'workspace', context: 'browsing', basic: true },
      { key: 'i', description: 'Toggle inspector panel', category: 'workspace', context: '*', basic: true },
      { key: '1-9', description: 'Navigate to sidebar item', category: 'workspace', context: '*', basic: false },
      { key: 'ctrl-l', description: 'Clear terminal', category: 'workspace', context: '*', basic: false },
      { key: 'q', description: 'Quit workspace', category: 'workspace', context: '*', basic: true },
      { key: 'escape', description: 'Go back / Dismiss', category: 'workspace', context: 'browsing', basic: true },
    ]);
  }

  /**
   * Update context hints dynamically based on current screen/state.
   */
  updateContext(params: {
    screenId: string | null;
    paletteOpen: boolean;
    searchActive: boolean;
    overlayVisible: boolean;
    focusOwner: string | null;
  }): void {
    // Update context based on state
    if (params.paletteOpen) {
      this._currentContext = 'palette';
    } else if (params.searchActive) {
      this._currentContext = 'searching';
    } else if (params.overlayVisible) {
      this._currentContext = 'browsing';
    } else {
      this._currentContext = 'browsing';
    }
  }

  private _setupListeners(): void {
    this._eventBus.on('screen-changed', () => {
      // Default context is 'browsing' for most screens
      this._currentContext = 'browsing';
    });

    this._eventBus.on('search-opened', () => {
      this._currentContext = 'searching';
    });

    this._eventBus.on('search-closed', () => {
      this._currentContext = 'browsing';
    });

    this._eventBus.on('palette-opened', () => {
      this._currentContext = 'palette';
    });

    this._eventBus.on('palette-closed', () => {
      this._currentContext = 'browsing';
    });
  }
}
