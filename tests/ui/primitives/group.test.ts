import { describe, it, expect } from 'vitest';
import { renderGroup } from '../../../src/ui/primitives/group.js';

describe('renderGroup', () => {
  it('renders title with indented items', () => {
    const result = renderGroup({ title: 'Languages', items: ['TypeScript', 'JavaScript'] });
    expect(result[0]).toBe('Languages');
    expect(result[1]).toBe('  TypeScript');
    expect(result[2]).toBe('  JavaScript');
  });

  it('handles empty items', () => {
    const result = renderGroup({ title: 'Empty', items: [] });
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Empty');
  });

  it('handles a single item', () => {
    const result = renderGroup({ title: 'File', items: ['index.ts'] });
    expect(result).toHaveLength(2);
    expect(result[1]).toBe('  index.ts');
  });

  it('respects indentation', () => {
    const result = renderGroup({ title: 'Root', items: ['Item'], indent: 2 });
    expect(result[0]).toBe('  Root');
    expect(result[1]).toBe('    Item');
  });
});
