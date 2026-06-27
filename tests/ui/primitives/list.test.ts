import { describe, it, expect } from 'vitest';
import { renderList } from '../../../src/ui/primitives/list.js';

describe('renderList', () => {
  it('returns empty array for empty items', () => {
    expect(renderList({ items: [] })).toEqual([]);
  });

  it('renders bullet list', () => {
    const result = renderList({ items: ['Apples', 'Bananas'], style: 'bullet' });
    expect(result[0]).toBe('· Apples');
    expect(result[1]).toBe('· Bananas');
  });

  it('renders pointer list', () => {
    const result = renderList({ items: ['One'], style: 'pointer' });
    expect(result[0]).toBe('▸ One');
  });

  it('renders ordered list with numbers', () => {
    const result = renderList({ items: ['First', 'Second'], style: 'ordered' });
    expect(result[0]).toBe('1. First');
    expect(result[1]).toBe('2. Second');
  });

  it('renders plain (none) list', () => {
    const result = renderList({ items: ['Just text'], style: 'none' });
    expect(result[0]).toBe('Just text');
  });

  it('respects indentation', () => {
    const result = renderList({ items: ['Item'], style: 'bullet', indent: 4 });
    expect(result[0]).toBe('    · Item');
  });

  it('handles a single item', () => {
    const result = renderList({ items: ['Only'], style: 'ordered' });
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('1. Only');
  });

  it('defaults to bullet style', () => {
    const result = renderList({ items: ['Default'] });
    expect(result[0]).toBe('· Default');
  });
});
