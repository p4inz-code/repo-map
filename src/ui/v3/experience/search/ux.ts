/**
 * SearchUX — incremental search UX for the V3 Experience Engine.
 *
 * Features:
 * - Typing instantly filters (with configurable debounce)
 * - Highlight matched characters
 * - Scroll to result
 * - Result count indicator
 * - Current match indicator
 *
 * The search can operate on any array of strings (file names, content lines, etc.)
 * making it reusable across screens.
 */

import type { SearchMatch, SearchUXState, SearchConfig } from './types.js';
import { scoreSearchMatch, findSearchMatchPositions } from './types.js';

// ─── SearchUX ─────────────────────────────────────────────────────

export class SearchUX {
  private readonly _config: Required<SearchConfig>;

  /** The full list of items being searched. */
  private _items: string[] = [];

  /** Current state. */
  private _state: SearchUXState = {
    active: false,
    query: '',
    results: [],
    selectedIndex: 0,
    resultCount: 0,
    indexing: false,
  };

  /** Debounce timer. */
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Callback when results change. */
  private _onResultsChange: ((state: SearchUXState) => void) | null = null;

  /** Callback when a result is selected (jump to). */
  private _onJump: ((match: SearchMatch) => void) | null = null;

  constructor(config?: SearchConfig) {
    this._config = {
      debounceMs: config?.debounceMs ?? 50,
      maxResults: config?.maxResults ?? 50,
      contextChars: config?.contextChars ?? 30,
    };
  }

  // ── Setup ─────────────────────────────────────────────────────

  /**
   * Set the items to search through.
   */
  setItems(items: string[]): void {
    this._items = items;
    if (this._state.active) {
      this._search(this._state.query);
    }
  }

  /**
   * Activate search mode.
   */
  activate(initialQuery: string = ''): void {
    this._state = {
      ...this._state,
      active: true,
      query: initialQuery,
      selectedIndex: 0,
    };

    if (initialQuery) {
      this._search(initialQuery);
    } else {
      this._setState({
        results: [],
        resultCount: 0,
      });
    }
  }

  /**
   * Deactivate search mode.
   */
  deactivate(): void {
    this._setState({
      active: false,
      query: '',
      results: [],
      resultCount: 0,
      selectedIndex: 0,
    });
  }

  // ── Input ─────────────────────────────────────────────────────

  /**
   * Input a character (handles debounced search).
   */
  inputChar(ch: string): void {
    if (!this._state.active) return;

    const newQuery = this._state.query + ch;
    this._state = { ...this._state, query: newQuery };

    // Debounce search
    this._debounce(() => this._search(newQuery));
  }

  /**
   * Delete the last character (backspace).
   */
  backspace(): void {
    if (!this._state.active || this._state.query.length === 0) return;

    const newQuery = this._state.query.slice(0, -1);
    this._state = { ...this._state, query: newQuery };

    this._debounce(() => this._search(newQuery));
  }

  /**
   * Clear the search query.
   */
  clearQuery(): void {
    this._setState({
      query: '',
      results: [],
      resultCount: 0,
      selectedIndex: 0,
    });
  }

  // ── Selection ─────────────────────────────────────────────────

  /**
   * Select the next result.
   */
  selectNext(): void {
    if (this._state.results.length === 0) return;
    const next = (this._state.selectedIndex + 1) % this._state.results.length;
    this._state = { ...this._state, selectedIndex: next };
    this._notify();
  }

  /**
   * Select the previous result.
   */
  selectPrev(): void {
    if (this._state.results.length === 0) return;
    const prev = (this._state.selectedIndex - 1 + this._state.results.length) %
      this._state.results.length;
    this._state = { ...this._state, selectedIndex: prev };
    this._notify();
  }

  /**
   * Jump to the currently selected result.
   */
  jumpToSelected(): void {
    const selected = this._state.results[this._state.selectedIndex];
    if (selected) {
      this._onJump?.(selected);
    }
  }

  // ── Callbacks ─────────────────────────────────────────────────

  /**
   * Register a callback for when results change.
   */
  onResultsChange(callback: (state: SearchUXState) => void): void {
    this._onResultsChange = callback;
  }

  /**
   * Register a callback for when a result is selected (jump).
   */
  onJump(callback: (match: SearchMatch) => void): void {
    this._onJump = callback;
  }

  // ── Accessors ─────────────────────────────────────────────────

  /** Get the current search state. */
  getState(): SearchUXState {
    return this._state;
  }

  /** Whether search is active. */
  get isActive(): boolean {
    return this._state.active;
  }

  /** Current search query. */
  get query(): string {
    return this._state.query;
  }

  /** Current results. */
  get results(): readonly SearchMatch[] {
    return this._state.results;
  }

  /** Number of results. */
  get resultCount(): number {
    return this._state.resultCount;
  }

  /** Reset the search UX. */
  reset(): void {
    this._state = {
      active: false,
      query: '',
      results: [],
      selectedIndex: 0,
      resultCount: 0,
      indexing: false,
    };
    this._items = [];
  }

  // ── Internal ──────────────────────────────────────────────────

  private _search(query: string): void {
    if (!query) {
      this._state = {
        ...this._state,
        results: [],
        resultCount: 0,
        selectedIndex: 0,
      };
      this._notify();
      return;
    }

    // Score and filter all items
    const scored = this._items
      .map((item, index) => {
        const score = scoreSearchMatch(item, query);
        if (score <= 0) return null;

        const matchPositions = findSearchMatchPositions(item, query);

        return {
          item,
          lineNumber: index,
          matchPositions,
          contextBefore: '',
          contextAfter: '',
          score,
        } as SearchMatch;
      })
      .filter((m): m is SearchMatch => m !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, this._config.maxResults);

    this._state = {
      ...this._state,
      results: scored,
      resultCount: scored.length,
      selectedIndex: Math.min(this._state.selectedIndex, Math.max(0, scored.length - 1)),
    };

    this._notify();
  }

  private _debounce(fn: () => void): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = setTimeout(() => {
      fn();
      this._debounceTimer = null;
    }, this._config.debounceMs);
  }

  private _setState(partial: Partial<SearchUXState>): void {
    this._state = { ...this._state, ...partial };
    this._notify();
  }

  private _notify(): void {
    this._onResultsChange?.(this._state);
  }
}
