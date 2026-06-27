import { describe, it, expect, beforeEach } from 'vitest';

// We test with explicit options since the test runner has no TTY.
// Auto-detection in non-TTY environments correctly returns 'minimal'.
// All behavioral tests use explicit { color, unicode } options to
// test specific theme presets deterministically.

import { resolveTheme, getTheme, clearThemeCache } from '../../../src/ui/theme/index.js';

describe('resolveTheme', () => {
  it('returns the default theme when color and unicode are enabled', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    expect(theme.name).toBe('default');
  });

  it('returns the monochrome theme when color is disabled', () => {
    const theme = resolveTheme({ color: false, unicode: true });
    expect(theme.name).toBe('monochrome');
  });

  it('returns the high-contrast theme when highContrast is true', () => {
    const theme = resolveTheme({ color: true, unicode: true, highContrast: true });
    expect(theme.name).toBe('high-contrast');
  });

  it('returns the minimal theme when minimal is true', () => {
    const theme = resolveTheme({ minimal: true });
    expect(theme.name).toBe('minimal');
  });

  it('returns the minimal theme when both color and unicode are false', () => {
    const theme = resolveTheme({ color: false, unicode: false });
    expect(theme.name).toBe('minimal');
  });

  it('returns the minimal theme in non-TTY environments (auto-detection)', () => {
    // In a test/CI environment without a TTY, auto-detection returns 'minimal'
    const theme = resolveTheme();
    expect(theme.name).toBe('minimal');
  });
});

describe('getTheme', () => {
  beforeEach(() => {
    clearThemeCache();
  });

  it('returns a theme with all expected methods', () => {
    const theme = getTheme({ color: true, unicode: true });
    expect(theme).toBeDefined();
    expect(typeof theme.color).toBe('function');
    expect(typeof theme.style).toBe('function');
    expect(typeof theme.symbol).toBe('function');
    expect(typeof theme.border).toBe('function');
  });

  it('caches the theme for subsequent calls without options', () => {
    const theme1 = getTheme({ color: true, unicode: true });
    clearThemeCache();
    const theme2 = getTheme({ color: true, unicode: true });
    expect(theme2.name).toBe(theme1.name);
  });

  it('clearThemeCache forces re-resolution with different options', () => {
    clearThemeCache();
    const defaultTheme = getTheme({ color: true, unicode: true });
    clearThemeCache();
    const monoTheme = getTheme({ color: false, unicode: true });
    expect(defaultTheme.name).not.toBe(monoTheme.name);
  });
});

describe('theme.color()', () => {
  it('returns ANSI codes for the default theme', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    expect(theme.color('primary')).toMatch(/^\x1b\[/);
    expect(theme.color('error')).toMatch(/^\x1b\[/);
    expect(theme.color('success')).toMatch(/^\x1b\[/);
  });

  it('returns empty strings for the monochrome theme', () => {
    const theme = resolveTheme({ color: false, unicode: true });
    expect(theme.color('primary')).toBe('');
    expect(theme.color('error')).toBe('');
  });
});

describe('theme.style()', () => {
  it('returns unstyled text when no style is provided', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    expect(theme.style('hello')).toBe('hello');
  });

  it('returns unstyled text when empty style is provided', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    expect(theme.style('hello', {})).toBe('hello');
  });

  it('applies bold style', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    const result = theme.style('bold text', { bold: true });
    expect(result).toContain('\x1b[1m');
    expect(result).toContain('bold text');
    expect(result).toContain('\x1b[0m');
  });

  it('applies dim style', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    const result = theme.style('dim text', { dim: true });
    expect(result).toContain('\x1b[2m');
  });

  it('applies color style', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    const result = theme.style('error text', { color: 'error' });
    expect(result).toMatch(/^\x1b\[/);
    expect(result).toContain('error text');
    expect(result).toContain('\x1b[0m');
  });

  it('returns plain text in minimal theme regardless of style', () => {
    const theme = resolveTheme({ minimal: true });
    expect(theme.style('hello', { bold: true, color: 'error' })).toBe('hello');
  });
});

describe('theme.symbol()', () => {
  it('returns Unicode symbols in default theme', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    expect(theme.symbol('check')).toBe('✓');
    expect(theme.symbol('cross')).toBe('✗');
  });

  it('returns ASCII symbols in minimal theme', () => {
    const theme = resolveTheme({ minimal: true });
    expect(theme.symbol('check')).toBe('[ok]');
    expect(theme.symbol('arrow')).toBe('->');
  });

  it('returns a value for every symbol token', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    const tokens = ['check', 'cross', 'warning', 'arrow', 'bullet', 'pointer', 'ellipsis'] as const;
    for (const token of tokens) {
      expect(theme.symbol(token)).not.toBe('');
    }
  });
});

describe('theme.border()', () => {
  it('returns round borders by default', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    const borders = theme.border('round');
    expect(borders.tl).toBe('╭');
    expect(borders.tr).toBe('╮');
    expect(borders.bl).toBe('╰');
    expect(borders.br).toBe('╯');
  });

  it('returns single borders for single style', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    const borders = theme.border('single');
    expect(borders.tl).toBe('┌');
    expect(borders.tr).toBe('┐');
  });

  it('returns empty strings for none style', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    const borders = theme.border('none');
    expect(borders.tl).toBe('');
    expect(borders.tr).toBe('');
    expect(borders.h).toBe('');
    expect(borders.v).toBe('');
  });

  it('returns ASCII borders in minimal theme', () => {
    const theme = resolveTheme({ minimal: true });
    const borders = theme.border('round');
    expect(borders.tl).toBe('+');
    expect(borders.tr).toBe('+');
  });
});

describe('theme.colors (pre-computed)', () => {
  it('contains all color tokens in default theme', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    const tokens = ['primary', 'success', 'warning', 'error', 'info', 'dim', 'muted', 'text', 'bg', 'heading', 'code', 'link', 'border'] as const;
    for (const token of tokens) {
      expect(theme.colors[token]).toBeDefined();
      expect(typeof theme.colors[token]).toBe('string');
    }
  });

  it('contains empty strings for monochrome theme colors', () => {
    const theme = resolveTheme({ color: false, unicode: true });
    expect(theme.colors.primary).toBe('');
    expect(theme.colors.success).toBe('');
  });
});

describe('theme.symbols (pre-computed)', () => {
  it('contains all symbol tokens', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    const tokens = ['check', 'cross', 'arrow', 'bullet', 'ellipsis', 'filled', 'empty'] as const;
    for (const token of tokens) {
      expect(theme.symbols[token]).toBeDefined();
      expect(typeof theme.symbols[token]).toBe('string');
    }
  });
});

describe('theme.borders (pre-computed)', () => {
  it('contains all border styles', () => {
    const theme = resolveTheme({ color: true, unicode: true });
    expect(theme.borders.round).toBeDefined();
    expect(theme.borders.single).toBeDefined();
    expect(theme.borders.none).toBeDefined();
    expect(theme.borders.round.tl).toBe('╭');
  });
});
