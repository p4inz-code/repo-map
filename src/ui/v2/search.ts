/**
 * Search System — global search activated by / key.
 *
 * Features:
 * - Live incremental filtering
 * - Match highlighting
 * - Case insensitive
 * - ESC closes, Enter jumps
 * - Search history
 * - Result counter
 * - Clear button
 * - Future fuzzy search ready
 *
 * Works against: sidebar, tables, tree views, architecture items,
 * dependency list, suggestions, history
 */

import type { ThemeV2, ColorToken, TextStyle } from './theme/theme.js';
import type { Line } from './renderer/types.js';
import type { RenderContext } from './renderer/renderer.js';
import type { V2Store, SearchState } from './state.js';

// ─── Search Driver ────────────────────────────────────────────────

export interface SearchableItem {
  id: string;
  text: string;
  category?: string;
  data?: unknown;
}

export interface SearchResult {
  item: SearchableItem;
  matches: { start: number; end: number }[];
  score: number;
}

export class SearchDriver {
  private _items: SearchableItem[] = [];
  private _query: string = '';
  private _results: SearchResult[] = [];
  private _selectedIndex: number = 0;

  /** Set the searchable items. */
  setItems(items: SearchableItem[]): void {
    this._items = items;
  }

  /** Update the search query and recompute results. */
  setQuery(query: string): SearchResult[] {
    this._query = query;
    this._selectedIndex = 0;

    if (!query || query.length === 0) {
      this._results = [];
      return [];
    }

    const q = query.toLowerCase();
    this._results = this._items
      .map((item) => {
        const ltext = item.text.toLowerCase();
        const matches: { start: number; end: number }[] = [];

        // Find all occurrences of the query
        let idx = 0;
        while ((idx = ltext.indexOf(q, idx)) !== -1) {
          matches.push({ start: idx, end: idx + q.length });
          idx += 1; // Allow overlapping matches
        }

        if (matches.length === 0) return null;

        // Compute a simple score: earlier matches + more matches = higher score
        const firstMatch = matches[0].start;
        const score = 1000 - firstMatch + matches.length * 10;

        return { item, matches, score };
      })
      .filter((r): r is SearchResult => r !== null)
      .sort((a, b) => b.score - a.score);

    return this._results;
  }

  /** Get current filtered results. */
  getResults(): SearchResult[] {
    return this._results;
  }

  /** Get the selected result index. */
  get selectedIndex(): number { return this._selectedIndex; }

  /** Select next result. */
  selectNext(): void {
    if (this._selectedIndex < this._results.length - 1) this._selectedIndex++;
  }

  /** Select previous result. */
  selectPrev(): void {
    if (this._selectedIndex > 0) this._selectedIndex--;
  }

  /** Get the selected result (for jump). */
  getSelectedResult(): SearchResult | null {
    return this._results[this._selectedIndex] ?? null;
  }

  /** Get current query. */
  get query(): string { return this._query; }
  get hasResults(): boolean { return this._results.length > 0; }
  get resultCount(): number { return this._results.length; }
  get isActive(): boolean { return this._query.length > 0; }

  /** Clear the search. */
  clear(): void {
    this._query = '';
    this._results = [];
    this._selectedIndex = 0;
  }
}

// ─── Search UI ────────────────────────────────────────────────────

export interface SearchUIOptions {
  query: string;
  resultCount: number;
  selectedIndex: number;
  isActive: boolean;
  viewportWidth: number;
}

/**
 * Render the search bar overlay.
 * Shows: / prefix, query text, result counter, cursor indicator
 */
export function renderSearchBar(theme: ThemeV2, opts: SearchUIOptions): Line[] {
  const w = Math.min(50, opts.viewportWidth - 4);

  const queryStr = opts.isActive ? opts.query : '';
  const placeholder = opts.isActive && !opts.query ? 'Type to search...' : '';
  const countStr = opts.isActive && opts.resultCount > 0
    ? ` (${opts.resultCount} result${opts.resultCount !== 1 ? 's' : ''})`
    : opts.isActive && !opts.query ? ''
    : opts.isActive ? ' (no results)' : 'Press / to search';

  // Build the search bar line
  const inputPart = opts.isActive
    ? `${theme.glyph('search')} ${queryStr}${countStr}`
    : `${theme.glyph('search')} ${placeholder} ${countStr}`;

  const padLen = Math.max(0, w - inputPart.length - 4);
  const fullLine = `${' '.repeat(Math.floor(padLen / 2))}╭${'─'.repeat(w)}╮`;

  const lines: Line[] = [
    { segments: [{ text: fullLine, style: opts.isActive ? { color: 'primary' } : { dim: true } }] },
    {
      segments: [
        { text: `${' '.repeat(Math.floor(padLen / 2))}│ ${inputPart}${' '.repeat(Math.max(0, w - inputPart.length))} │`,
          style: opts.isActive ? { bold: true } : { dim: true } },
      ],
    },
    { segments: [{ text: `${' '.repeat(Math.floor(padLen / 2))}╰${'─'.repeat(w)}╯`, style: opts.isActive ? { color: 'primary' } : { dim: true } }] },
  ];

  return lines;
}

/**
 * Highlight matches in a text string.
 * Returns segments array with highlighted portions.
 */
export function highlightMatches(
  text: string,
  query: string,
  theme: ThemeV2,
): { text: string; style?: TextStyle }[] {
  if (!query || query.length === 0) {
    return [{ text }];
  }

  const q = query.toLowerCase();
  const ltext = text.toLowerCase();
  const segments: { text: string; style?: TextStyle }[] = [];
  let lastEnd = 0;

  let idx = ltext.indexOf(q, 0);
  while (idx !== -1) {
    // Text before match
    if (idx > lastEnd) {
      segments.push({ text: text.slice(lastEnd, idx) });
    }
    // Highlighted match
    segments.push({ text: text.slice(idx, idx + q.length), style: { color: 'highlight', bold: true } });
    lastEnd = idx + q.length;
    idx = ltext.indexOf(q, lastEnd);
  }

  // Remaining text after last match
  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd) });
  }

  if (segments.length === 0) {
    segments.push({ text });
  }

  return segments;
}

// ─── Global Search Manager ────────────────────────────────────────

export class SearchManager {
  private _driver = new SearchDriver();
  private _store: V2Store;
  private _onActivate: (() => void) | null = null;
  private _onDeactivate: (() => void) | null = null;
  private _onJump: ((result: SearchResult) => void) | null = null;

  constructor(store: V2Store) {
    this._store = store;
  }

  /** Activate search mode. */
  activate(): void {
    this._store.setState({ search: { ...this._store.getState().search, active: true } });
    this._onActivate?.();
  }

  /** Deactivate search mode. */
  deactivate(): void {
    this._driver.clear();
    this._store.setState({ search: { ...this._store.getState().search, active: false, query: '', matchIndices: [] } });
    this._onDeactivate?.();
  }

  /** Process a character input. */
  inputChar(char: string): void {
    if (char.length !== 1) return;
    const state = this._store.getState().search;
    if (!state.active) return;

    const newQuery = state.query + char;
    const results = this._driver.setQuery(newQuery);

    this._store.setState({
      search: {
        ...state,
        query: newQuery,
        matchIndices: results.map((_, i) => i),
      },
    });
  }

  /** Process backspace. */
  backspace(): void {
    const state = this._store.getState().search;
    if (!state.active) return;

    const newQuery = state.query.slice(0, -1);
    const results = this._driver.setQuery(newQuery);

    this._store.setState({
      search: {
        ...state,
        query: newQuery,
        matchIndices: results.map((_, i) => i),
      },
    });
  }

  /** Select next result. */
  selectNext(): void {
    this._driver.selectNext();
    this._syncSelected();
  }

  /** Select previous result. */
  selectPrev(): void {
    this._driver.selectPrev();
    this._syncSelected();
  }

  /** Jump to the selected result. */
  jumpToSelected(): void {
    const result = this._driver.getSelectedResult();
    if (result) {
      this._onJump?.(result);
    }
  }

  /** Set the searchable items. */
  setItems(items: SearchableItem[]): void {
    this._driver.setItems(items);
  }

  /** Get search results for rendering. */
  getResults(): SearchResult[] {
    return this._driver.getResults();
  }

  /** Handle a key binding. Returns true if handled. */
  handleKey(binding: string): boolean {
    const state = this._store.getState().search;
    if (!state.active && binding === '/') {
      this.activate();
      return true;
    }
    if (!state.active) return false;

    switch (binding) {
      case 'escape':
        this.deactivate();
        return true;
      case 'enter':
        this.jumpToSelected();
        return true;
      case 'up':
        this.selectPrev();
        return true;
      case 'down':
        this.selectNext();
        return true;
      case 'backspace':
        this.backspace();
        return true;
      case 'tab':
        this.selectNext();
        return true;
      default:
        if (binding && binding.length === 1 && !binding.match(/[^a-zA-Z0-9_\\-\\s]/)) {
          this.inputChar(binding);
          return true;
        }
        return false;
    }
  }

  onActivate(callback: () => void): void { this._onActivate = callback; }
  onDeactivate(callback: () => void): void { this._onDeactivate = callback; }
  onJump(callback: (result: SearchResult) => void): void { this._onJump = callback; }

  get isActive(): boolean { return this._store.getState().search.active; }
  get query(): string { return this._store.getState().search.query; }

  private _syncSelected(): void {
    const state = this._store.getState().search;
    this._store.setState({
      search: { ...state, selectedMatch: this._driver.selectedIndex },
    });
  }
}
