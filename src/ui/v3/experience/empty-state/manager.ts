/**
 * EmptyStateManager — provides context-aware empty states for the V3 Experience Engine.
 *
 * Each empty state explains:
 * - Why the view is empty
 * - What happened
 * - How to continue
 *
 * Replaces generic empty screens with informative guidance.
 */

import type { EmptyState } from './types.js';
import { EMPTY_STATES, getEmptyState } from './types.js';

// ─── EmptyStateManager ────────────────────────────────────────────

export class EmptyStateManager {
  /** Custom empty state overrides. */
  private readonly _overrides: Map<string, EmptyState> = new Map();

  /**
   * Register a custom empty state override.
   */
  register(id: string, state: EmptyState): void {
    this._overrides.set(id, state);
  }

  /**
   * Get the empty state for a given context ID.
   * First checks overrides, then falls back to the registry.
   */
  getState(id: string): EmptyState {
    return this._overrides.get(id) ?? getEmptyState(id);
  }

  /**
   * Check whether a screen needs an empty state.
   *
   * @param screenId - The screen ID to check.
   * @param dataAvailable - Whether data has been loaded for this screen.
   * @returns The empty state if one should be shown, or null if the screen has content.
   */
  checkScreen(screenId: string, dataAvailable: boolean): EmptyState | null {
    if (dataAvailable) return null;

    // Map screen IDs to empty state IDs
    const screenToEmpty: Record<string, string> = {
      dashboard: 'no-repository',
      results: 'no-results',
      dependencies: 'no-dependencies',
      suggestions: 'no-suggestions',
      plugins: 'no-plugins',
      history: 'no-history',
    };

    const emptyId = screenToEmpty[screenId];
    if (!emptyId) return null;

    return this.getState(emptyId);
  }

  /**
   * Remove all custom overrides.
   */
  reset(): void {
    this._overrides.clear();
  }
}
