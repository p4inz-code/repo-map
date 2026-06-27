import { describe, it, expect } from 'vitest';
import { renderBox } from '../../../src/ui/primitives/box.js';
import type { BorderChars } from '../../../src/ui/theme/borders.js';

const round: BorderChars = { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' };
const single: BorderChars = { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' };
const noBorder: BorderChars = { tl: '', tr: '', bl: '', br: '', h: '', v: '' };

describe('renderBox', () => {
  it('renders a box with round borders', () => {
    const result = renderBox(['Hello'], { width: 14, border: round });
    expect(result[0]).toBe('╭────────────╮');
    // padding=1: 1 space before content, remaining space after
    expect(result[1]).toBe('│ Hello      │');
    expect(result[2]).toBe('╰────────────╯');
  });

  it('renders a box with single borders', () => {
    const result = renderBox(['Hi'], { width: 10, border: single });
    expect(result[0]).toBe('┌────────┐');
    expect(result[2]).toBe('└────────┘');
  });

  it('returns content as-is when border is none', () => {
    const result = renderBox(['Hello'], { width: 20, border: noBorder });
    expect(result).toEqual(['Hello']);
  });

  it('renders with title in top border', () => {
    const result = renderBox(['Hi'], { width: 16, border: round, title: 'Info' });
    expect(result[0]).toContain(' Info ');
  });

  it('handles empty content', () => {
    const result = renderBox([], { width: 10, border: round });
    expect(result).toHaveLength(2); // top + bottom only
  });

  it('renders with custom padding', () => {
    const result = renderBox(['A'], { width: 10, border: round, padding: 2 });
    // padding=2: 2 spaces before content, remaining space after
    expect(result[1]).toBe('│  A     │');
  });

  it('returns content as-is when no border object provided', () => {
    const result = renderBox(['Hello']);
    expect(result).toEqual(['Hello']);
  });

  it('handles multiple content lines', () => {
    const result = renderBox(['Line 1', 'Line 2'], { width: 12, border: round });
    expect(result).toHaveLength(4);
    expect(result[0]).toBe('╭──────────╮');
    expect(result[3]).toBe('╰──────────╯');
  });
});
