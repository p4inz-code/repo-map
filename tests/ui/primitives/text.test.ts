import { describe, it, expect } from 'vitest';
import { style, wrap, truncate, padLeft, padRight } from '../../../src/ui/primitives/text.js';
import type { Theme, TextStyle } from '../../../src/ui/theme/index.js';

function makeTheme(): Theme {
  return {
    name: 'test',
    style: (text: string, s?: TextStyle) => {
      if (!s) return text;
      let prefix = '';
      if (s.bold) prefix += '\x1b[1m';
      if (s.color === 'error') prefix += '\x1b[31m';
      if (s.color === 'success') prefix += '\x1b[32m';
      if (!prefix) return text;
      return `${prefix}${text}\x1b[0m`;
    },
  } as Theme;
}

const theme = makeTheme();

describe('style', () => {
  it('returns plain text with no style', () => {
    expect(style('hello', theme)).toBe('hello');
  });
  it('applies bold', () => {
    expect(style('bold', theme, { bold: true })).toContain('\x1b[1m');
  });
  it('applies color', () => {
    expect(style('err', theme, { color: 'error' })).toContain('\x1b[31m');
  });
});

describe('wrap', () => {
  it('returns empty array for empty text', () => {
    expect(wrap('', 80)).toEqual([]);
  });
  it('returns single line when text fits', () => {
    expect(wrap('short', 80)).toEqual(['short']);
  });
  it('wraps at word boundaries', () => {
    expect(wrap('hello world', 5)).toEqual(['hello', 'world']);
  });
  it('truncates words exceeding width', () => {
    const result = wrap('superlongword', 5);
    // maxLen=5, ellipsis takes 1 cell, so 4 chars + '…'
    expect(result[0]).toBe('supe…');
  });
  it('returns empty for zero width', () => {
    expect(wrap('text', 0)).toEqual([]);
  });
});

describe('truncate', () => {
  it('returns empty for maxLen <= 0', () => {
    expect(truncate('hello', 0)).toBe('');
  });
  it('returns original when shorter than max', () => {
    expect(truncate('hi', 5)).toBe('hi');
  });
  it('adds ellipsis when truncated', () => {
    expect(truncate('hello world', 5)).toBe('hell…');
  });
  it('returns ellipsis for very narrow maxLen', () => {
    expect(truncate('hello', 1)).toBe('…');
  });
});

describe('padLeft', () => {
  it('pads short text', () => {
    expect(padLeft('hi', 5)).toBe('   hi');
  });
  it('does nothing when text fits', () => {
    expect(padLeft('hello', 3)).toBe('hello');
  });
});

describe('padRight', () => {
  it('pads short text', () => {
    expect(padRight('hi', 5)).toBe('hi   ');
  });
  it('does nothing when text fits', () => {
    expect(padRight('hello', 3)).toBe('hello');
  });
});
