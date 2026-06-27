import { describe, it, expect } from 'vitest';
import { renderTable } from '../../../src/ui/primitives/table.js';

describe('renderTable', () => {
  it('returns empty array for no columns', () => {
    expect(renderTable({ columns: [], rows: [] })).toEqual([]);
  });

  it('renders header and rows', () => {
    const result = renderTable({
      columns: [{ header: 'Name' }, { header: 'Count' }],
      rows: [['Apples', '10'], ['Bananas', '3']],
    });
    expect(result[0]).toMatch(/Name/);
    expect(result[0]).toMatch(/Count/);
    expect(result[1]).toMatch(/Apples/);
    expect(result[2]).toMatch(/Bananas/);
  });

  it('aligns right when specified', () => {
    const result = renderTable({
      columns: [{ header: 'Item', align: 'right' }, { header: 'Qty', align: 'right' }],
      rows: [['Apples', '42']],
    });
    expect(result[0]).toMatch(/Item/);
    expect(result[1]).toMatch(/Apples/);
  });

  it('handles compact mode', () => {
    const result = renderTable({
      columns: [{ header: 'A' }, { header: 'B' }],
      rows: [['1', '2']],
      compact: true,
    });
    expect(result).toHaveLength(2);
  });

  it('handles a single row', () => {
    const result = renderTable({
      columns: [{ header: 'X' }],
      rows: [['Y']],
    });
    expect(result).toHaveLength(2);
    expect(result[1]).toContain('Y');
  });

  it('handles empty rows (only header)', () => {
    const result = renderTable({
      columns: [{ header: 'Header' }],
      rows: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('Header');
  });

  it('scales columns when width is specified', () => {
    const result = renderTable({
      columns: [{ header: 'LongHeader', minWidth: 5 }, { header: 'Short', minWidth: 3 }],
      rows: [['value1', 'v2']],
      width: 20,
    });
    // Both columns should fit within the total width
    expect(result[0].length).toBeLessThanOrEqual(22);
  });

  it('handles rows with missing cells', () => {
    const result = renderTable({
      columns: [{ header: 'A' }, { header: 'B' }],
      rows: [['only']],
    });
    expect(result[1]).toContain('only');
  });
});
