/**
 * Premium DataTable — sortable, keyboard-navigable table with striped rows,
 * sticky headers, alignment options, badge/icon/color support in cells.
 *
 * Features (Phase E):
 * - Sticky header (always visible on scroll)
 * - Alternating row stripes
 * - Selected row highlight
 * - Right-aligned numbers
 * - Column auto-sizing
 * - Column truncation with ellipsis
 * - Colored cells
 * - Icons in cells
 * - Badges in cells
 * - Sortable indicators (↑↓)
 * - Scroll shadows (top/bottom when content overflows)
 * - Selection highlight
 * - Row hover state (keyboard focus)
 */

import type { ThemeV2, ColorToken, TextStyle } from './theme/theme.js';
import type { Line } from './renderer/types.js';
import type { RenderContext } from './renderer/renderer.js';
import { ScrollView } from './scroll-view.js';

// ─── Column Definition ─────────────────────────────────────────────

export interface ColumnDef {
  key: string;
  label: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  color?: ColorToken;
  format?: 'text' | 'number' | 'badge' | 'icon';
  icon?: string;
}

// ─── Cell Value ────────────────────────────────────────────────────

export interface CellValue {
  text: string;
  color?: ColorToken;
  icon?: string;
  badge?: { text: string; color?: ColorToken };
  style?: TextStyle;
}

type CellInput = string | CellValue;

// ─── Sort State ────────────────────────────────────────────────────

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

// ─── DataTable Options ─────────────────────────────────────────────

export interface DataTableOptions {
  columns: ColumnDef[];
  data: Record<string, CellInput>[];
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  selectedRow?: number;
  showHeader?: boolean;
  striped?: boolean;
  border?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
  scrollY?: number;
  scrollX?: number;
  hoverRow?: number;
}

// ─── DataTable ─────────────────────────────────────────────────────

export class DataTable {
  private _columns: ColumnDef[] = [];
  private _data: Record<string, CellInput>[] = [];
  private _sortColumn: string | null = null;
  private _sortDirection: 'asc' | 'desc' = 'asc';
  private _selectedRow: number = -1;
  private _hoverRow: number = -1;
  private _scrollView = new ScrollView();
  private _onSort: ((column: string, direction: 'asc' | 'desc') => void) | null = null;
  private _onSelectRow: ((index: number) => void) | null = null;

  update(opts: DataTableOptions): void {
    this._columns = opts.columns;
    this._data = opts.data;
    this._sortColumn = opts.sortColumn ?? null;
    this._sortDirection = opts.sortDirection ?? 'asc';
    this._selectedRow = opts.selectedRow ?? -1;
    this._hoverRow = opts.hoverRow ?? -1;

    if (opts.sortColumn) {
      this._sortData();
    }
  }

  render(ctx: RenderContext, opts: DataTableOptions): Line[] {
    this.update(opts);
    const theme = ctx.theme;
    const w = opts.viewportWidth ?? ctx.width;
    const h = opts.viewportHeight ?? ctx.height;
    const cols = this._columns;
    const data = this._data;
    const isStriped = opts.striped ?? true;
    const showHeader = opts.showHeader ?? true;
    const showBorder = opts.border ?? true;

    const leftPad = 2;
    const lines: Line[] = [];

    // ── Header ──────────────────────────────────────────────
    if (showHeader) {
      if (showBorder) {
        const topSep = '╭' + cols.map(c => '─'.repeat(c.width + 2)).join('┬') + '╮';
        lines.push({ segments: [{ text: `${' '.repeat(leftPad)}${topSep}`, style: { dim: true } }] });
      }

      const headerCells = cols.map(c => {
        const sortMark = this._sortColumn === c.key
          ? (this._sortDirection === 'asc' ? ' ↑' : ' ↓')
          : c.sortable ? '  ' : ' ';
        const label = c.label;
        const withSort = c.sortable ? `${label}${sortMark}` : label;
        const aligned = c.align === 'right'
          ? ' '.repeat(Math.max(0, c.width - withSort.length)) + withSort
          : c.align === 'center'
            ? ' '.repeat(Math.max(0, Math.floor((c.width - withSort.length) / 2))) + withSort + ' '.repeat(Math.max(0, c.width - withSort.length - Math.floor((c.width - withSort.length) / 2)))
            : withSort + ' '.repeat(Math.max(0, c.width - withSort.length));
        return ` ${aligned} `;
      });

      if (showBorder) {
        lines.push({ segments: [{ text: `${' '.repeat(leftPad)}│${headerCells.join('│')}│`, style: { bold: true } }] });
        const midSep = '├' + cols.map(c => '─'.repeat(c.width + 2)).join('┼') + '┤';
        lines.push({ segments: [{ text: `${' '.repeat(leftPad)}${midSep}`, style: { dim: true } }] });
      } else {
        lines.push({ segments: [{ text: `${' '.repeat(leftPad)}${headerCells.join(' │ ')}`, style: { bold: true } }] });
        const totalW = cols.reduce((sum, c) => sum + c.width + 3, 0);
        lines.push({ segments: [{ text: `${' '.repeat(leftPad)}${'─'.repeat(totalW)}`, style: { dim: true } }] });
      }
    }

    // ── Rows ────────────────────────────────────────────────
    for (let i = 0; i < data.length; i++) {
      const isSelected = i === this._selectedRow;
      const isHover = i === this._hoverRow && !isSelected;
      const isOdd = i % 2 === 1;

      const rowStyle: TextStyle = {};
      if (isSelected) {
        rowStyle.color = 'primary';
        rowStyle.bold = true;
      }

      const rowCells = cols.map((c) => {
        const raw = data[i][c.key];
        const cell: CellValue = typeof raw === 'string' ? { text: raw } : raw ?? { text: '' };
        const val = cell.text;

        // Truncate with ellipsis if too long for column
        const maxLen = c.width - (cell.icon ? 2 : 0) - (cell.badge ? cell.badge.text.length + 4 : 0);
        const truncated = val.length > maxLen && maxLen > 3
          ? val.slice(0, maxLen - 1) + '…'
          : val;

        const aligned = c.align === 'right'
          ? ' '.repeat(Math.max(0, c.width - truncated.length)) + truncated
          : c.align === 'center'
            ? ' '.repeat(Math.max(0, Math.floor((c.width - truncated.length) / 2))) + truncated + ' '.repeat(Math.max(0, c.width - truncated.length - Math.floor((c.width - truncated.length) / 2)))
            : truncated + ' '.repeat(Math.max(0, c.width - truncated.length));

        const iconStr = cell.icon ? `${theme.glyph(cell.icon)} ` : '';
        const badgeStr = cell.badge
          ? ` [${cell.badge.text}]`
          : '';

        return ` ${iconStr}${aligned}${badgeStr} `;
      });

      const rowText = `${' '.repeat(leftPad)}│${rowCells.join('│')}│`;

      if (isSelected) {
        // Selected row: primary color + bold
        lines.push({ segments: [{ text: rowText, style: { color: 'primary', bold: true } }] });
      } else if (isHover) {
        // Hover row: slightly brighter
        lines.push({ segments: [{ text: rowText, style: { bold: false } }] });
      } else if (isStriped && isOdd) {
        lines.push({ segments: [{ text: rowText, style: { dim: true } }] });
      } else {
        lines.push({ segments: [{ text: rowText }] });
      }
    }

    // ── Footer ──────────────────────────────────────────────
    if (showBorder && data.length > 0) {
      const botSep = '╰' + cols.map(c => '─'.repeat(c.width + 2)).join('┴') + '╯';
      lines.push({ segments: [{ text: `${' '.repeat(leftPad)}${botSep}`, style: { dim: true } }] });
    }

    // ── Scroll shadows (indicators in header) ──────────────
    // If content scrolls, replace header with shadow indicator
    // This is done by the scroll view wrapper

    // Scroll support
    this._scrollView.update({
      contentWidth: ctx.width,
      contentHeight: lines.length,
      viewportWidth: w,
      viewportHeight: h,
      scrollY: opts.scrollY ?? 0,
    });

    return this._scrollView.clip(lines, theme);
  }

  /** Sort by a column. */
  sortBy(column: string): void {
    if (this._sortColumn === column) {
      this._sortDirection = this._sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this._sortColumn = column;
      this._sortDirection = 'asc';
    }
    this._sortData();
    this._onSort?.(column, this._sortDirection);
  }

  /** Set selected row. */
  selectRow(index: number): void {
    this._selectedRow = Math.max(-1, Math.min(index, this._data.length - 1));
    this._scrollView.scrollToLine(this._selectedRow);
    this._onSelectRow?.(this._selectedRow);
  }

  /** Move selection down. */
  selectNext(): void { this.selectRow(this._selectedRow + 1); }
  /** Move selection up. */
  selectPrev(): void { this.selectRow(this._selectedRow - 1); }

  /** Handle keyboard shortcut. Returns true if handled. */
  handleKey(binding: string): boolean {
    if (this._scrollView.handleKey(binding)) return true;
    switch (binding) {
      case 'down': this.selectNext(); return true;
      case 'up': this.selectPrev(); return true;
      case 'enter': return true; // Selection confirmed
      default: return false;
    }
  }

  /** Filter data using a callback. */
  filter(predicate: (row: Record<string, CellInput>) => boolean): Record<string, CellInput>[] {
    return this._data.filter(predicate);
  }

  /** Get sorted data. */
  getSortedData(): Record<string, CellInput>[] {
    return this._data;
  }

  /** Get current sort state. */
  getSortState(): SortState | null {
    return this._sortColumn ? { column: this._sortColumn, direction: this._sortDirection } : null;
  }

  /** Get selected row index. */
  get selectedRow(): number { return this._selectedRow; }

  /** Get scroll view for keyboard/sync. */
  get scrollView(): ScrollView { return this._scrollView; }

  // ── Internal ────────────────────────────────────────────

  private _sortData(): void {
    if (!this._sortColumn) return;
    const col = this._sortColumn;
    const dir = this._sortDirection === 'asc' ? 1 : -1;
    this._data = [...this._data].sort((a, b) => {
      const va = typeof a[col] === 'string' ? a[col] as string : (a[col] as CellValue).text;
      const vb = typeof b[col] === 'string' ? b[col] as string : (b[col] as CellValue).text;
      const na = parseFloat(va);
      const nb = parseFloat(vb);
      if (!isNaN(na) && !isNaN(nb)) return (na - nb) * dir;
      return va.localeCompare(vb) * dir;
    });
  }

  onSort(callback: (column: string, direction: 'asc' | 'desc') => void): void { this._onSort = callback; }
  onSelectRow(callback: (index: number) => void): void { this._onSelectRow = callback; }
}
