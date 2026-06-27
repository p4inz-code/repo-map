/**
 * Table primitive — column-aligned table with headers.
 *
 * # Architecture Rules
 * - MUST NOT know about business logic, screens, or animation.
 * - MUST NOT emit ANSI codes directly.
 * - Column widths are computed externally or passed explicitly.
 */

import { scaleColumns } from '../layout/width.js';

/**
 * A single column definition.
 */
export interface TableColumn {
  /** Column header text. */
  header: string;
  /** Text alignment within the column. */
  align?: 'left' | 'right';
  /** Fixed width for this column. If omitted, width is computed from header and content. */
  width?: number;
  /** Minimum width for this column. */
  minWidth?: number;
}

/**
 * Options for rendering a table.
 */
export interface TableOptions {
  /** Column definitions. */
  columns: TableColumn[];
  /** Row data — each row is an array of cell strings matching columns order. */
  rows: string[][];
  /** Total width available for the table in character cells. */
  width?: number;
  /** When true, reduces spacing between columns. Default: false. */
  compact?: boolean;
}

/**
 * Render a table with aligned columns and a header row.
 *
 * Column widths are computed from the header and cell content, with
 * optional explicit widths and minimums. If total width is specified,
 * columns are scaled proportionally.
 *
 * @param options - Table rendering options.
 * @returns Array of strings, one per table row (header + data rows).
 */
export function renderTable(options: TableOptions): string[] {
  const { columns, rows } = options;
  const compact = options.compact ?? false;
  const colGap = compact ? 1 : 2;

  if (columns.length === 0) return [];

  // Compute column widths
  const widths: number[] = columns.map((col, i) => {
    if (col.width) return col.width;

    const headerLen = col.header.length;
    let maxContent = headerLen;

    for (const row of rows) {
      const cell = row[i];
      if (cell && cell.length > maxContent) {
        maxContent = cell.length;
      }
    }

    // Clamp to minWidth if specified
    if (col.minWidth && maxContent < col.minWidth) {
      return col.minWidth;
    }

    return maxContent;
  });

  // If total width is specified, scale columns to fit
  if (options.width) {
    const totalContentWidth = widths.reduce((a, b) => a + b, 0) + colGap * (columns.length - 1);
    if (totalContentWidth > options.width) {
      // Need to shrink — use available width minus gaps, then scale
      const available = options.width - colGap * (columns.length - 1);
      if (available > 0) {
        const minWidths = columns.map((col) => col.minWidth ?? 2);
        const counts = widths;
        const scaled = scaleColumns(available, counts, minWidths);
        for (let i = 0; i < scaled.length; i++) {
          widths[i] = scaled[i];
        }
      }
    }
  }

  const lines: string[] = [];

  // Header row
  const headerCells = columns.map((col, i) => {
    const w = widths[i];
    if (col.align === 'right') {
      return col.header.padStart(w);
    }
    return col.header.padEnd(w);
  });
  lines.push(headerCells.join(' '.repeat(colGap)));

  // Data rows
  for (const row of rows) {
    const cells = row.map((cell, i) => {
      const w = widths[i];
      const col = columns[i];
      // Truncate if too long
      const truncated = cell.length > w ? cell.slice(0, w) : cell;
      if (col?.align === 'right') {
        return truncated.padStart(w);
      }
      return truncated.padEnd(w);
    });
    lines.push(cells.join(' '.repeat(colGap)));
  }

  return lines;
}
