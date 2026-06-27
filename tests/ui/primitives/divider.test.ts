import { describe, it, expect } from 'vitest';
import { renderDivider } from '../../../src/ui/primitives/divider.js';

describe('renderDivider', () => {
  it('renders full-width line with default char', () => {
    const line = renderDivider({ width: 10 });
    expect(line).toBe('──────────');
  });

  it('renders with custom character', () => {
    const line = renderDivider({ char: '-', width: 8 });
    expect(line).toBe('--------');
  });

  it('renders with centered label', () => {
    const line = renderDivider({ label: 'test', width: 20, char: '─' });
    expect(line).toContain(' test ');
    expect(line.length).toBe(20);
  });

  it('returns empty for zero width', () => {
    expect(renderDivider({ width: 0 })).toBe('');
  });

  it('returns label only when label exceeds width', () => {
    const line = renderDivider({ label: 'longlabel', width: 5 });
    expect(line).toBe('longl');
  });

  it('renders default width when width is omitted', () => {
    const line = renderDivider();
    expect(line.length).toBe(80);
  });
});
