/**
 * Selection component — visual selection state management
 * and rendering for multi-option displays.
 *
 * Tracks a cursor position and renders items with highlighting
 * for the selected option. Used within lists, menus, and forms.
 *
 * # Usage
 * ```ts
 * const sel = new Selection('pick-one', {
 *   items: ['Option A', 'Option B', 'Option C'],
 *   selectedIndex: 0,
 * });
 * sel.render(renderer); // → Line[]
 * ```
 *
 * # Architecture
 * - Manages cursor position within a list of options.
 * - Renders with selection highlighting (inverse/bold).
 * - Does NOT handle input events directly.
 */

import { Component } from './component.js';
import type { Renderer, Line } from '../renderer.js';

// ─── Types ─────────────────────────────────────────────────────

export interface SelectionOptions {
  /** Selectable items. */
  items: string[];
  /** Initially selected index. Default: 0. */
  selectedIndex?: number;
  /** Character for the selection cursor. Default: '▸'. */
  cursor?: string;
  /** Character for unselected items. Default: ' '. */
  noCursor?: string;
}

// ─── Selection ─────────────────────────────────────────────────

export class Selection extends Component {
  private _items: string[];
  private _selectedIndex: number;
  private _cursor: string;
  private _noCursor: string;

  constructor(id: string, options: SelectionOptions) {
    super(id);
    this._items = options.items;
    this._selectedIndex = options.selectedIndex ?? 0;
    this._cursor = options.cursor ?? '▸';
    this._noCursor = options.noCursor ?? ' ';
  }

  // ── Accessors ────────────────────────────────────────────────

  get selectedIndex(): number {
    return this._selectedIndex;
  }

  get totalItems(): number {
    return this._items.length;
  }

  get selectedItem(): string | undefined {
    return this._items[this._selectedIndex];
  }

  // ── Mutators ─────────────────────────────────────────────────

  /**
   * Move selection down (with wrapping).
   */
  next(): void {
    if (this._items.length > 0) {
      this._selectedIndex = (this._selectedIndex + 1) % this._items.length;
    }
  }

  /**
   * Move selection up (with wrapping).
   */
  prev(): void {
    if (this._items.length > 0) {
      this._selectedIndex = (this._selectedIndex - 1 + this._items.length) % this._items.length;
    }
  }

  /**
   * Set selection to a specific index.
   */
  select(index: number): void {
    if (index >= 0 && index < this._items.length) {
      this._selectedIndex = index;
    }
  }

  /**
   * Replace items and reset selection.
   */
  setItems(items: string[]): void {
    this._items = items;
    this._selectedIndex = Math.min(this._selectedIndex, items.length - 1);
    if (this._selectedIndex < 0 && items.length > 0) {
      this._selectedIndex = 0;
    }
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    return this._items.length;
  }

  protected renderContent(_renderer: Renderer): Line[] {
    return this._items.map((item, i) => {
      const isSelected = i === this._selectedIndex;
      const prefix = isSelected ? this._cursor : this._noCursor;

      if (isSelected) {
        return {
          segments: [{ text: `${prefix} ${item}`, style: { bold: true } }],
        };
      }

      return {
        segments: [{ text: `${prefix} ${item}` }],
      };
    });
  }
}
