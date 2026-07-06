/**
 * ScrollableList component — production-quality scrollable list
 * with full keyboard navigation and selection support.
 *
 * # Keyboard Support
 * - ↑/↓: Navigate items
 * - PageUp/PageDown: Scroll one page
 * - Home: Go to first item
 * - End: Go to last item
 * - Selection follows scroll at all times
 *
 * # Architecture
 * - Render optimization: only marks dirty when selection or items change.
 * - Zero scroll offset = no unnecessary re-renders.
 * - Selection follows scroll to keep selected item visible.
 * - Mouse-wheel-ready: scrollOffset can be set externally for mouse events.
 *
 * # Scroll Behavior
 * - When selection moves down, the list scrolls to keep the selected item
 *   in the middle of the visible area (centered scrolling).
 * - PageUp/PageDown move selection by visibleItems count.
 * - Home/End jump to first/last item instantly.
 */

import { Component } from './component.js';
import type { Renderer, Line } from '../renderer.js';

// ─── Types ─────────────────────────────────────────────────────

export interface ScrollableListOptions {
  /** Items to display. */
  items: string[];
  /** Index of the selected item. Default: 0. */
  selectedIndex?: number;
  /** Number of items visible at once. Default: 10. */
  visibleItems?: number;
  /** Whether to show item numbers. Default: false. */
  showNumbers?: boolean;
  /** Prefix character for selected items. Default: '▸'. */
  selectedPrefix?: string;
  /** Prefix character for unselected items. Default: ' '. */
  unselectedPrefix?: string;
  /** Style for selected items. */
  selectedStyle?: 'bold' | 'inverse' | 'highlight';
}

// ─── ScrollableList ────────────────────────────────────────────

export class ScrollableList extends Component {
  private _items: string[];
  private _selectedIndex: number;
  private _visibleItems: number;
  private _showNumbers: boolean;
  private _selectedPrefix: string;
  private _unselectedPrefix: string;
  private _selectedStyle: 'bold' | 'inverse' | 'highlight';
  private _explicitScrollOffset: number | null = null;

  constructor(id: string, options: ScrollableListOptions) {
    super(id);
    this._items = options.items;
    this._selectedIndex = options.selectedIndex ?? 0;
    this._visibleItems = options.visibleItems ?? 10;
    this._showNumbers = options.showNumbers ?? false;
    this._selectedPrefix = options.selectedPrefix ?? '▸';
    this._unselectedPrefix = options.unselectedPrefix ?? ' ';
    this._selectedStyle = options.selectedStyle ?? 'bold';
  }

  // ── Accessors ────────────────────────────────────────────────

  get selectedIndex(): number {
    return this._selectedIndex;
  }

  get totalItems(): number {
    return this._items.length;
  }

  get visibleItems(): number {
    return this._visibleItems;
  }

  get scrollOffset(): number {
    return this._computeScrollOffset();
  }

  get maxScrollOffset(): number {
    return Math.max(0, this._items.length - this._visibleItems);
  }

  get items(): string[] {
    return [...this._items];
  }

  // ── Mutators ─────────────────────────────────────────────────

  /**
   * Select the next item (with wrapping).
   */
  selectNext(): void {
    if (this._items.length === 0) return;
    this._selectedIndex = (this._selectedIndex + 1) % this._items.length;
    this._explicitScrollOffset = null;
    this.markDirty();
  }

  /**
   * Select the previous item (with wrapping).
   */
  selectPrev(): void {
    if (this._items.length === 0) return;
    this._selectedIndex = (this._selectedIndex - 1 + this._items.length) % this._items.length;
    this._explicitScrollOffset = null;
    this.markDirty();
  }

  /**
   * Select a specific index.
   */
  selectIndex(index: number): void {
    if (index >= 0 && index < this._items.length && index !== this._selectedIndex) {
      this._selectedIndex = index;
      this._explicitScrollOffset = null;
      this.markDirty();
    }
  }

  /**
   * Select the first item.
   */
  selectFirst(): void {
    if (this._items.length > 0 && this._selectedIndex !== 0) {
      this._selectedIndex = 0;
      this._explicitScrollOffset = null;
      this.markDirty();
    }
  }

  /**
   * Select the last item.
   */
  selectLast(): void {
    if (this._items.length > 0) {
      this._selectedIndex = this._items.length - 1;
      this._explicitScrollOffset = 0; // Will be computed from selection
      this.markDirty();
    }
  }

  /**
   * Scroll one page up (moves selection up by visible items).
   */
  pageUp(): void {
    if (this._items.length === 0) return;
    this._selectedIndex = Math.max(0, this._selectedIndex - this._visibleItems);
    this._explicitScrollOffset = null;
    this.markDirty();
  }

  /**
   * Scroll one page down (moves selection down by visible items).
   */
  pageDown(): void {
    if (this._items.length === 0) return;
    this._selectedIndex = Math.min(
      this._items.length - 1,
      this._selectedIndex + this._visibleItems,
    );
    this._explicitScrollOffset = null;
    this.markDirty();
  }

  /**
   * Scroll without changing selection (for mouse wheel support).
   * Keeps selection visible but adjusts viewport.
   */
  scrollBy(offset: number): void {
    const currentOffset = this._computeScrollOffset();
    const maxOffset = this.maxScrollOffset;
    const newOffset = Math.max(0, Math.min(maxOffset, currentOffset + offset));
    if (newOffset !== currentOffset) {
      this._explicitScrollOffset = newOffset;
      this.markDirty();
    }
  }

  /**
   * Set scroll offset directly (for mouse wheel).
   */
  setScrollOffset(offset: number): void {
    const clamped = Math.max(0, Math.min(this.maxScrollOffset, offset));
    if (clamped !== this._explicitScrollOffset) {
      this._explicitScrollOffset = clamped;
      this.markDirty();
    }
  }

  /**
   * Get the currently selected item text.
   */
  getSelectedItem(): string | undefined {
    return this._items[this._selectedIndex];
  }

  /**
   * Replace all items and reset selection.
   */
  setItems(items: string[]): void {
    this._items = items;
    this._selectedIndex = Math.min(this._selectedIndex, items.length - 1);
    if (this._selectedIndex < 0 && items.length > 0) {
      this._selectedIndex = 0;
    }
    this._explicitScrollOffset = null;
    this.markDirty();
  }

  /**
   * Set the number of visible items (e.g., on resize).
   */
  setVisibleItems(visible: number): void {
    if (visible !== this._visibleItems) {
      this._visibleItems = Math.max(1, visible);
      this.markDirty();
    }
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    return Math.min(this._items.length, this._visibleItems);
  }

  protected renderContent(_renderer: Renderer): Line[] {
    const lines: Line[] = [];
    const offset = this._computeScrollOffset();
    const end = Math.min(offset + this._visibleItems, this._items.length);

    for (let i = offset; i < end; i++) {
      const isSelected = i === this._selectedIndex;
      const prefix = isSelected ? this._selectedPrefix : this._unselectedPrefix;
      const numberStr = this._showNumbers
        ? `${String(i + 1).padStart(3)}. `
        : '';

      const segments: { text: string; style?: Record<string, unknown> }[] = [];

      if (isSelected) {
        segments.push({
          text: `${prefix} ${numberStr}${this._items[i]}`,
          style: { bold: this._selectedStyle === 'bold' },
        });
      } else {
        segments.push({
          text: `${prefix} ${numberStr}${this._items[i]}`,
        });
      }

      lines.push({ segments } as Line);
    }

    return lines;
  }

  // ── Internal ─────────────────────────────────────────────────

  /**
   * Compute the scroll offset to keep the selected item visible.
   * Uses centered scrolling: selected item is in the middle of the viewport.
   * If an explicit scroll offset was set (e.g., by mouse wheel), uses that.
   */
  private _computeScrollOffset(): number {
    if (this._items.length <= this._visibleItems) {
      this._explicitScrollOffset = 0;
      return 0;
    }

    const maxOffset = this._items.length - this._visibleItems;

    // Use explicit offset if set
    if (this._explicitScrollOffset !== null) {
      const clamped = Math.min(this._explicitScrollOffset, maxOffset);
      // Ensure selected item is visible
      if (
        this._selectedIndex < clamped ||
        this._selectedIndex >= clamped + this._visibleItems
      ) {
        // Selected item is outside viewport — override to keep it visible
        const centered = Math.max(0, Math.min(
          this._selectedIndex - Math.floor(this._visibleItems / 2),
          maxOffset,
        ));
        this._explicitScrollOffset = centered;
        return centered;
      }
      return clamped;
    }

    // Centered scrolling: put selected item in the middle
    const centered = Math.max(0, Math.min(
      this._selectedIndex - Math.floor(this._visibleItems / 2),
      maxOffset,
    ));

    return centered;
  }
}
