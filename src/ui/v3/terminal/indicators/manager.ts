/**
 * WorkspaceIndicators — small status indicators for the workspace.
 *
 * Provides subtle visual indicators for:
 * - Loading state
 * - Dirty state (unsaved changes, pending operations)
 * - Readonly state
 * - Search active
 * - Selection active
 * - Plugins active
 * - Background tasks running
 *
 * Indicators are small, single-character or short-string glyphs
 * displayed in the status bar or header area.
 */

// ─── Indicator Types ────────────────────────────────────────────────

export type IndicatorId =
  | 'loading'
  | 'dirty'
  | 'readonly'
  | 'search'
  | 'selection'
  | 'plugins'
  | 'tasks';

// ─── Indicator Definition ───────────────────────────────────────────

export interface Indicator {
  /** Indicator identifier. */
  readonly id: IndicatorId;
  /** Display glyph/character. */
  readonly glyph: string;
  /** Tooltip / accessible description. */
  readonly description: string;
  /** Whether this indicator is currently active. */
  active: boolean;
  /** Color class for styling. */
  readonly color: IndicatorColor;
  /** Priority for ordering (lower = higher priority). */
  readonly priority: number;
}

// ─── Indicator Colors ───────────────────────────────────────────────

export type IndicatorColor = 'info' | 'success' | 'warning' | 'danger' | 'muted';

// ─── WorkspaceIndicators Manager ────────────────────────────────────

export class WorkspaceIndicators {
  /** Registered indicators. */
  private readonly _indicators: Map<IndicatorId, Indicator> = new Map();

  constructor() {
    this._registerDefaults();
  }

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Set an indicator's active state.
   */
  setActive(id: IndicatorId, active: boolean): void {
    const indicator = this._indicators.get(id);
    if (indicator) {
      indicator.active = active;
    }
  }

  /**
   * Toggle an indicator's active state.
   */
  toggle(id: IndicatorId): void {
    const indicator = this._indicators.get(id);
    if (indicator) {
      indicator.active = !indicator.active;
    }
  }

  /**
   * Get all active indicators, sorted by priority.
   */
  getActive(): Indicator[] {
    const active: Indicator[] = [];
    for (const [, indicator] of this._indicators) {
      if (indicator.active) {
        active.push(indicator);
      }
    }
    active.sort((a, b) => a.priority - b.priority);
    return active;
  }

  /**
   * Get all registered indicators.
   */
  getAll(): Indicator[] {
    return Array.from(this._indicators.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get a specific indicator.
   */
  get(id: IndicatorId): Indicator | undefined {
    return this._indicators.get(id);
  }

  /**
   * Check if any indicator is active.
   */
  get hasActive(): boolean {
    for (const [, indicator] of this._indicators) {
      if (indicator.active) return true;
    }
    return false;
  }

  /**
   * Get the count of active indicators.
   */
  get activeCount(): number {
    let count = 0;
    for (const [, indicator] of this._indicators) {
      if (indicator.active) count++;
    }
    return count;
  }

  /**
   * Register a custom indicator.
   */
  register(id: IndicatorId, glyph: string, description: string, color: IndicatorColor, priority: number): void {
    this._indicators.set(id, {
      id,
      glyph,
      description,
      active: false,
      color,
      priority,
    });
  }

  /**
   * Reset all indicators to inactive.
   */
  reset(): void {
    for (const [, indicator] of this._indicators) {
      indicator.active = false;
    }
  }

  // ── Internal ──────────────────────────────────────────────────

  private _registerDefaults(): void {
    this._indicators.set('loading', {
      id: 'loading',
      glyph: '◌',
      description: 'Loading',
      active: false,
      color: 'info',
      priority: 0,
    });

    this._indicators.set('dirty', {
      id: 'dirty',
      glyph: '●',
      description: 'Unsaved changes',
      active: false,
      color: 'warning',
      priority: 1,
    });

    this._indicators.set('readonly', {
      id: 'readonly',
      glyph: '🔒',
      description: 'Read-only',
      active: false,
      color: 'muted',
      priority: 2,
    });

    this._indicators.set('search', {
      id: 'search',
      glyph: '⌕',
      description: 'Search active',
      active: false,
      color: 'info',
      priority: 3,
    });

    this._indicators.set('selection', {
      id: 'selection',
      glyph: '◆',
      description: 'Selection active',
      active: false,
      color: 'info',
      priority: 4,
    });

    this._indicators.set('plugins', {
      id: 'plugins',
      glyph: '⚒',
      description: 'Plugin(s) active',
      active: false,
      color: 'muted',
      priority: 5,
    });

    this._indicators.set('tasks', {
      id: 'tasks',
      glyph: '⚙',
      description: 'Background task(s) running',
      active: false,
      color: 'info',
      priority: 6,
    });
  }
}
