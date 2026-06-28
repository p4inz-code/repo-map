import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Renderer } from '../../../src/ui/renderer.js';
import { setForcedWidth } from '../../../src/ui/layout/width.js';
import {
  renderError,
  type ErrorOptions,
} from '../../../src/ui/screens/error.js';
import type { Theme, TextStyle, ColorToken, SymbolToken, BorderStyle, BorderChars } from '../../../src/ui/theme/index.js';
import type { WidthInfo } from '../../../src/ui/layout/width.js';

// ─── Mock Theme ──────────────────────────────────────────────────

const MOCK_ANSI_RED = '\x1b[31m';
const MOCK_ANSI_RESET = '\x1b[0m';
const MOCK_ANSI_DIM = '\x1b[2m';

function makeMockTheme(): Theme {
  return {
    name: 'test',
    color: (token: ColorToken) => {
      if (token === 'error') return MOCK_ANSI_RED;
      if (token === 'dim') return MOCK_ANSI_DIM;
      return '';
    },
    style: (text: string, style?: TextStyle) => {
      if (!style || (!style.bold && !style.dim && !style.color)) return text;
      let prefix = '';
      let suffix = '';
      if (style.bold) { prefix += '\x1b[1m'; suffix = '\x1b[0m'; }
      if (style.dim) { prefix += MOCK_ANSI_DIM; suffix = '\x1b[0m'; }
      if (style.color === 'error') { prefix += MOCK_ANSI_RED; suffix = '\x1b[0m'; }
      if (!prefix) return text;
      return `${prefix}${text}${suffix}`;
    },
    symbol: (token: SymbolToken) => {
      if (token === 'cross') return '✗';
      if (token === 'check') return '✓';
      if (token === 'arrow') return '→';
      return token;
    },
    border: (style: BorderStyle): BorderChars => ({
      tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│',
    }),
    colors: { primary: '', success: '', error: MOCK_ANSI_RED, warning: '', info: '', dim: MOCK_ANSI_DIM, muted: '', text: '', bg: '', heading: '', code: '', link: '', border: '' },
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

// =================================================================
// renderError
// =================================================================

describe('renderError', () => {
  let renderer: Renderer;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    renderer = new Renderer(makeMockTheme(), makeWidthInfo());
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    setForcedWidth(null);
  });

  it('renders a box with error title', () => {
    renderError({ message: 'File not found' }, renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('╭');
    expect(output).toContain('Error');
    expect(output).toContain('╰');
  });

  it('shows the cross symbol with the error message', () => {
    renderError({ message: 'File not found' }, renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('✗');
    expect(output).toContain('File not found');
  });

  it('displays the error message', () => {
    renderError({ message: 'Something went wrong' }, renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Something went wrong');
  });

  it('displays the suggestion when provided', () => {
    renderError(
      { message: 'Not found', suggestion: 'Try a different path' },
      renderer,
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Try a different path');
  });

  it('does not display suggestion when omitted', () => {
    renderError({ message: 'Oops' }, renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).not.toContain('Try');
  });

  it('does not show "Program will exit." text', () => {
    renderError({ message: 'Crash' }, renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).not.toContain('Program will exit.');
  });

  it('renders without box borders on narrow terminals', () => {
    const narrowWidth = makeWidthInfo({ columns: 50, contentWidth: 46, isNarrow: true, breakpoint: 'compact' });
    renderer = new Renderer(makeMockTheme(), narrowWidth);
    renderError({ message: 'Something went wrong' }, renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).not.toContain('╭');
    expect(output).not.toContain('╰');
    expect(output).toContain('Something went wrong');
  });

  it('applies error color to the message line', () => {
    renderError({ message: 'Critical failure' }, renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain(MOCK_ANSI_RED);
    expect(output).toContain('Critical failure');
  });

  it('applies dim style to suggestion text', () => {
    renderError(
      { message: 'Oops', suggestion: 'Fix it' },
      renderer,
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    // The suggestion should have dim styling
    expect(output).toContain(MOCK_ANSI_DIM);
  });

  it('handles long messages by wrapping', () => {
    const longMsg = 'This is a very long error message that should be wrapped across multiple lines because it exceeds the content width of the terminal';
    renderError({ message: longMsg }, renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('This is a very long');
    // Should have newlines indicating wrapping
    expect(output.split('\n').length).toBeGreaterThan(3);
  });

  it('handles empty message gracefully', () => {
    renderError({ message: '' }, renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Error');
  });
});
