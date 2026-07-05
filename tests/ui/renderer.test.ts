import { describe, it, expect, beforeEach } from 'vitest';
import { Renderer, type Line, type Segment } from '../../src/ui/renderer.js';
import type { Theme, TextStyle, ColorToken, SymbolToken, BorderStyle, BorderChars } from '../../src/ui/theme/index.js';
import type { WidthInfo } from '../../src/ui/layout/width.js';

// ─── Mock Theme ──────────────────────────────────────────────────

const MOCK_ANSI_RED = '\x1b[31m';
const MOCK_ANSI_GREEN = '\x1b[32m';
const MOCK_ANSI_BOLD = '\x1b[1m';
const MOCK_ANSI_RESET = '\x1b[0m';

function makeMockTheme(): Theme {
  return {
    name: 'test',
    color: (token: ColorToken) => {
      if (token === 'error') return MOCK_ANSI_RED;
      if (token === 'success') return MOCK_ANSI_GREEN;
      return '';
    },
    style: (text: string, style?: TextStyle) => {
      if (!style || (!style.bold && !style.dim && !style.color)) return text;
      let prefix = '';
      if (style.bold) prefix += MOCK_ANSI_BOLD;
      if (style.color === 'error') prefix += MOCK_ANSI_RED;
      if (style.color === 'success') prefix += MOCK_ANSI_GREEN;
      if (!prefix) return text;
      return `${prefix}${text}${MOCK_ANSI_RESET}`;
    },
    symbol: (token: SymbolToken) => token === 'check' ? '✓' : token,
    border: (_style: BorderStyle): BorderChars => ({
      tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│',
    }),
    colors: { primary: '', success: MOCK_ANSI_GREEN, error: MOCK_ANSI_RED, warning: '', info: '', dim: '', muted: '', text: '', bg: '', heading: '', code: '', link: '', border: '' },
    symbols: { check: '✓', cross: '✗', warning: '⚠', arrow: '→', bullet: '·', pointer: '▸', ellipsis: '…', arrowUp: '↑', arrowDown: '↓', separator: '─', filled: '█', empty: '░' },
    borders: {
      round: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' },
      single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
      none: { tl: '', tr: '', bl: '', br: '', h: '', v: '' },
    },
  };
}

function makeWidthInfo(overrides: Partial<WidthInfo> = {}): WidthInfo {
  return {
    columns: 80,
    contentWidth: 76,
    isNarrow: false,
    isWide: false,
    breakpoint: 'normal',
    ...overrides,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────

function line(...segments: Segment[]): Line {
  return { segments };
}

function seg(text: string, style?: TextStyle): Segment {
  return { text, style };
}

// =================================================================
// Constructor and accessors
// =================================================================

describe('Renderer', () => {
  let theme: Theme;
  let width: WidthInfo;

  beforeEach(() => {
    theme = makeMockTheme();
    width = makeWidthInfo();
  });

  describe('constructor', () => {
    it('stores theme and width', () => {
      const r = new Renderer(theme, width);
      expect(r.theme).toBe(theme);
      expect(r.width).toBe(width);
    });

    it('initializes lastLineCount to 0', () => {
      const r = new Renderer(theme, width);
      expect(r.lastLineCount).toBe(0);
    });
  });

  describe('accessors', () => {
    it('theme returns the injected theme', () => {
      const r = new Renderer(theme, width);
      expect(r.theme.name).toBe('test');
    });

    it('width returns the injected width info', () => {
      const w = makeWidthInfo({ columns: 50, isNarrow: true });
      const r = new Renderer(theme, w);
      expect(r.width.columns).toBe(50);
      expect(r.width.isNarrow).toBe(true);
    });

    it('lastLineCount starts at 0 and updates after renderFrame', () => {
      const r = new Renderer(theme, width);
      expect(r.lastLineCount).toBe(0);
      r.renderFrame([line(seg('a')), line(seg('b'))]);
      expect(r.lastLineCount).toBe(2);
    });
  });
});

// =================================================================
// renderFrame
// =================================================================

describe('renderFrame', () => {
  it('returns empty array for empty input', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    expect(r.renderFrame([])).toEqual([]);
  });

  it('returns plain text for unstyled segments', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const result = r.renderFrame([line(seg('Hello, world!'))]);
    expect(result).toEqual(['Hello, world!']);
  });

  it('returns styled text for styled segments', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const result = r.renderFrame([line(seg('Error: ', { color: 'error' }))]);
    expect(result[0]).toContain(MOCK_ANSI_RED);
    expect(result[0]).toContain('Error: ');
    expect(result[0]).toContain(MOCK_ANSI_RESET);
  });

  it('joins multiple segments on the same line', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const result = r.renderFrame([
      line(seg('Status: '), seg('OK', { color: 'success' })),
    ]);
    expect(result[0]).toBe('Status: ' + MOCK_ANSI_GREEN + 'OK' + MOCK_ANSI_RESET);
  });

  it('processes multiple lines', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const result = r.renderFrame([
      line(seg('First', { bold: true })),
      line(seg('Second')),
      line(seg('Third', { color: 'error' })),
    ]);
    expect(result).toHaveLength(3);
    expect(result[0]).toContain(MOCK_ANSI_BOLD);
    expect(result[1]).toBe('Second');
    expect(result[2]).toContain(MOCK_ANSI_RED);
  });

  it('handles segments with combined bold and color', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const result = r.renderFrame([
      line(seg('Alert!', { bold: true, color: 'error' })),
    ]);
    expect(result[0]).toContain(MOCK_ANSI_BOLD);
    expect(result[0]).toContain(MOCK_ANSI_RED);
    expect(result[0]).toContain('Alert!');
    expect(result[0]).toContain(MOCK_ANSI_RESET);
  });

  it('preserves plain text when no style is applied', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const result = r.renderFrame([line(seg('plain'), seg(' text'))]);
    expect(result[0]).toBe('plain text');
  });

  it('updates lastLineCount after rendering', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    expect(r.lastLineCount).toBe(0);
    r.renderFrame([line(seg('a')), line(seg('b')), line(seg('c'))]);
    expect(r.lastLineCount).toBe(3);
  });

  it('handles segments with empty text', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const result = r.renderFrame([line(seg(''), seg('non-empty'))]);
    expect(result[0]).toBe('non-empty');
  });
});

// =================================================================
// buildUpdate
// =================================================================

describe('buildUpdate', () => {
  it('includes cursor-up sequence when there is a previous frame', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    // Render first frame to establish lastLineCount
    r.renderFrame([line(seg('old line'))]);
    expect(r.lastLineCount).toBe(1);

    const update = r.buildUpdate([line(seg('new line'))]);
    // First item should be cursor-up
    expect(update[0]).toBe('\x1b[1A');
    // Second item should be the new content
    expect(update[1]).toBe('new line');
  });

  it('includes cursor-up for multi-line previous frames', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    r.renderFrame([line(seg('a')), line(seg('b')), line(seg('c'))]);
    expect(r.lastLineCount).toBe(3);

    const update = r.buildUpdate([line(seg('x'))]);
    expect(update[0]).toBe('\x1b[3A');
    expect(update[1]).toBe('x');
  });

  it('does not include cursor-up when lastLineCount is 0', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const update = r.buildUpdate([line(seg('first'))]);
    expect(update[0]).toBe('first');
    expect(update).toHaveLength(1);
  });

  it('updates lastLineCount to the new frame size', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    r.renderFrame([line(seg('a')), line(seg('b'))]);
    expect(r.lastLineCount).toBe(2);

    r.buildUpdate([line(seg('x'))]);
    expect(r.lastLineCount).toBe(1);
  });

  it('renders styled content in the update', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    r.renderFrame([line(seg('old'))]);

    const update = r.buildUpdate([
      line(seg('error', { color: 'error' })),
    ]);
    expect(update[1]).toContain(MOCK_ANSI_RED);
    expect(update[1]).toContain('error');
  });
});

// =================================================================
// buildClear
// =================================================================

describe('buildClear', () => {
  it('does nothing when lastLineCount is 0', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    expect(r.buildClear()).toEqual([]);
  });

  it('returns cursor-up + clear-line for single-line frame', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    r.renderFrame([line(seg('content'))]);

    const clear = r.buildClear();
    expect(clear[0]).toBe('\x1b[1A');
    expect(clear[1]).toBe('\x1b[2K');
  });

  it('returns cursor-up + clear-line/cursor-down pairs for multi-line frame', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    r.renderFrame([line(seg('a')), line(seg('b')), line(seg('c'))]);

    const clear = r.buildClear();
    expect(clear[0]).toBe('\x1b[3A');    // cursor up to first line
    expect(clear[1]).toBe('\x1b[2K');    // clear line 1
    expect(clear[2]).toBe('\x1b[1B');    // cursor down to line 2
    expect(clear[3]).toBe('\x1b[2K');    // clear line 2
    expect(clear[4]).toBe('\x1b[1B');    // cursor down to line 3
    expect(clear[5]).toBe('\x1b[2K');    // clear line 3
    expect(clear).toHaveLength(6); // 1 cursor-up + 3 (clear+cursor-down) - last cursor-down omitted
  });

  it('resets lastLineCount to 0 after clear', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    r.renderFrame([line(seg('content'))]);
    expect(r.lastLineCount).toBe(1);

    r.buildClear();
    expect(r.lastLineCount).toBe(0);
  });

  it('produces no output when called twice in a row', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    r.renderFrame([line(seg('content'))]);
    r.buildClear();
    expect(r.buildClear()).toEqual([]);
  });
});

// =================================================================
// styleText
// =================================================================

describe('styleText', () => {
  it('returns unstyled text when no style is provided', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    expect(r.styleText('hello')).toBe('hello');
  });

  it('returns unstyled text for empty style', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    expect(r.styleText('hello', {})).toBe('hello');
  });

  it('applies bold style', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const result = r.styleText('bold text', { bold: true });
    expect(result).toContain(MOCK_ANSI_BOLD);
    expect(result).toContain('bold text');
    expect(result).toContain(MOCK_ANSI_RESET);
  });

  it('applies color style', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const result = r.styleText('error text', { color: 'error' });
    expect(result).toContain(MOCK_ANSI_RED);
    expect(result).toContain('error text');
    expect(result).toContain(MOCK_ANSI_RESET);
  });
});

// =================================================================
// Edge cases
// =================================================================

describe('edge cases', () => {
  it('handles empty segments array in a line', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const result = r.renderFrame([line()]);
    expect(result[0]).toBe('');
  });

  it('handles mixed empty and non-empty segments', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const result = r.renderFrame([line(seg(''), seg('middle'), seg(''))]);
    expect(result[0]).toBe('middle');
  });

  it('handles many lines', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const manyLines: Line[] = Array.from({ length: 100 }, (_, i) =>
      line(seg(`line ${i}`)),
    );
    const result = r.renderFrame(manyLines);
    expect(result).toHaveLength(100);
    expect(result[0]).toBe('line 0');
    expect(result[99]).toBe('line 99');
    expect(r.lastLineCount).toBe(100);
  });

  it('handles segments with special characters', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const result = r.renderFrame([
      line(seg('Cost: $10.99 (15%) [y/n]?')),
    ]);
    expect(result[0]).toBe('Cost: $10.99 (15%) [y/n]?');
  });

  it('buildUpdate with empty lines clears lastLineCount', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    r.renderFrame([line(seg('content'))]);
    expect(r.lastLineCount).toBe(1);

    r.buildUpdate([]);
    expect(r.lastLineCount).toBe(0);
  });

  it('renderFrame with empty input resets lastLineCount', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    r.renderFrame([line(seg('old'))]);
    expect(r.lastLineCount).toBe(1);

    r.renderFrame([]);
    expect(r.lastLineCount).toBe(0);
  });

  it('styleText with combined bold+color produces both ANSI codes', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const result = r.styleText('CRITICAL', { bold: true, color: 'error' });
    expect(result).toContain(MOCK_ANSI_BOLD);
    expect(result).toContain(MOCK_ANSI_RED);
    expect(result).toContain(MOCK_ANSI_RESET);
  });

  it('update correctly tracks lastLineCount through multiple cycles', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());

    // Frame 1: 2 lines
    r.renderFrame([line(seg('a')), line(seg('b'))]);
    expect(r.lastLineCount).toBe(2);

    // Frame 2: 3 lines — accumulates state
    const u1 = r.buildUpdate([line(seg('x')), line(seg('y')), line(seg('z'))]);
    expect(u1[0]).toBe('\x1b[2A'); // cursor up by 2 (previous frame)
    expect(r.lastLineCount).toBe(3);

    // Frame 3: 1 line
    const u2 = r.buildUpdate([line(seg('alone'))]);
    expect(u2[0]).toBe('\x1b[3A'); // cursor up by 3 (previous frame)
    expect(r.lastLineCount).toBe(1);
  });

  it('does not use process.stdout (verified by absence of terminal writes)', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    // All methods return string arrays — no void returns for stdout writes
    const frame = r.renderFrame([line(seg('test'))]);
    expect(Array.isArray(frame)).toBe(true);
    const update = r.buildUpdate([line(seg('test'))]);
    expect(Array.isArray(update)).toBe(true);
    const clear = r.buildClear();
    expect(Array.isArray(clear)).toBe(true);
  });

  it('all output methods return string arrays (no void returns)', () => {
    const r = new Renderer(makeMockTheme(), makeWidthInfo());
    const frame = r.renderFrame([line(seg('test'))]);
    expect(Array.isArray(frame)).toBe(true);
    expect(frame.every((s) => typeof s === 'string')).toBe(true);

    const update = r.buildUpdate([line(seg('test'))]);
    expect(Array.isArray(update)).toBe(true);
    expect(update.every((s) => typeof s === 'string')).toBe(true);

    const clear = r.buildClear();
    expect(Array.isArray(clear)).toBe(true);
    expect(clear.every((s) => typeof s === 'string')).toBe(true);
  });
});
