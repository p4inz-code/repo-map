import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Renderer } from '../../../src/ui/renderer.js';
import { setForcedWidth } from '../../../src/ui/layout/width.js';
import {
  renderSuggest,
  type SuggestOptions,
} from '../../../src/ui/screens/suggest.js';
import type { Theme, TextStyle, ColorToken, SymbolToken, BorderStyle, BorderChars } from '../../../src/ui/theme/index.js';
import type { WidthInfo } from '../../../src/ui/layout/width.js';

// ─── Mock Theme ──────────────────────────────────────────────────

const MOCK_ANSI_GREEN = '\x1b[32m';
const MOCK_ANSI_RED = '\x1b[31m';
const MOCK_ANSI_YELLOW = '\x1b[33m';
const MOCK_ANSI_DIM = '\x1b[2m';
const MOCK_ANSI_BOLD = '\x1b[1m';
const MOCK_ANSI_RESET = '\x1b[0m';

function makeMockTheme(): Theme {
  return {
    name: 'test',
    color: (token: ColorToken) => {
      if (token === 'success') return MOCK_ANSI_GREEN;
      if (token === 'error') return MOCK_ANSI_RED;
      if (token === 'warning') return MOCK_ANSI_YELLOW;
      if (token === 'dim') return MOCK_ANSI_DIM;
      return '';
    },
    style: (text: string, style?: TextStyle) => {
      if (!style || (!style.bold && !style.dim && !style.color)) return text;
      let prefix = '';
      let suffix = '';
      if (style.bold) { prefix += MOCK_ANSI_BOLD; suffix = MOCK_ANSI_RESET; }
      if (style.dim) { prefix += MOCK_ANSI_DIM; suffix = MOCK_ANSI_RESET; }
      if (style.color === 'success') { prefix += MOCK_ANSI_GREEN; suffix = MOCK_ANSI_RESET; }
      if (style.color === 'error') { prefix += MOCK_ANSI_RED; suffix = MOCK_ANSI_RESET; }
      if (style.color === 'warning') { prefix += MOCK_ANSI_YELLOW; suffix = MOCK_ANSI_RESET; }
      if (!prefix) return text;
      return `${prefix}${text}${suffix}`;
    },
    symbol: (token: SymbolToken) => {
      if (token === 'check' || token === 'success') return '✓';
      if (token === 'cross' || token === 'error') return '✗';
      if (token === 'warning') return '⚠';
      if (token === 'bullet') return '·';
      if (token === 'separator') return '·';
      return token;
    },
    border: (_style: BorderStyle): BorderChars => ({
      tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│',
    }),
    colors: { primary: '', success: MOCK_ANSI_GREEN, error: MOCK_ANSI_RED, warning: MOCK_ANSI_YELLOW, info: '', dim: MOCK_ANSI_DIM, muted: '', text: '', bg: '', heading: '', code: '', link: '', border: '' },
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

function makeDefaultOptions(overrides: Partial<SuggestOptions> = {}): SuggestOptions {
  return {
    projectName: 'my-project',
    strengths: [
      { title: 'Clean project structure with clear separation' },
      { title: 'Comprehensive test coverage' },
      { title: 'Consistent coding style' },
    ],
    suggestions: [
      { title: 'Add CI/CD pipeline for automated testing', priority: 'high' },
      { title: 'Upgrade outdated dependencies (3 high-severity)', priority: 'medium' },
      { title: 'Consider adding API documentation', priority: 'low' },
    ],
    ...overrides,
  };
}

/** Strip ANSI escape sequences for visible-text assertions. */
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

// =================================================================
// renderSuggest
// =================================================================

describe('renderSuggest', () => {
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

  // ── Box with title ────────────────────────────────────────────

  it('renders a box with suggestions title', () => {
    renderSuggest(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('my-project');
    expect(output).toContain('suggestions');
    expect(output).toContain('╰');
    expect(output).toContain('│');
  });

  // ── Section headers ───────────────────────────────────────────

  it('shows Strengths section header', () => {
    renderSuggest(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Strengths');
    expect(output).toContain(MOCK_ANSI_BOLD);
  });

  it('shows Suggestions section header', () => {
    renderSuggest(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Suggestions');
  });

  // ── Strengths ─────────────────────────────────────────────────

  it('renders strengths with ✓ marker in green', () => {
    renderSuggest(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('✓');
    expect(output).toContain('Clean project structure with clear separation');
    expect(output).toContain('Comprehensive test coverage');
    expect(output).toContain('Consistent coding style');
    expect(output).toContain(MOCK_ANSI_GREEN);
  });

  // ── Suggestions by priority ───────────────────────────────────

  it('renders high priority suggestions with ✗ in red', () => {
    renderSuggest(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('✗');
    expect(output).toContain('Add CI/CD pipeline for automated testing');
    expect(output).toContain(MOCK_ANSI_RED);
  });

  it('renders medium priority suggestions with ! in yellow', () => {
    renderSuggest(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    // Check that ! appears near the medium priority suggestion
    const visible = stripAnsi(output);
    expect(visible).toContain('⚠');
    expect(visible).toContain('Upgrade outdated dependencies');
    expect(output).toContain(MOCK_ANSI_YELLOW);
  });

  it('renders low priority suggestions with · in dim', () => {
    renderSuggest(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('·');
    expect(output).toContain('Consider adding API documentation');
    expect(output).toContain(MOCK_ANSI_DIM);
  });

  // ── Breathing whitespace ──────────────────────────────────────

  it('includes breathing whitespace between sections', () => {
    renderSuggest(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    const lines = output.split('\n');
    const emptyContentLines = lines.filter((line) =>
      line.includes('│') && line.trim().replace(/│/g, '').trim() === '',
    );
    // Should have at least 3 blank lines: after top, between sections, before bottom
    expect(emptyContentLines.length).toBeGreaterThanOrEqual(3);
  });

  // ── Narrow terminal ───────────────────────────────────────────

  it('renders without box borders on narrow terminals', () => {
    const narrowWidth = makeWidthInfo({ columns: 50, contentWidth: 46, isNarrow: true, breakpoint: 'compact' });
    renderer = new Renderer(makeMockTheme(), narrowWidth);
    renderSuggest(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).not.toContain('╭');
    expect(output).not.toContain('╰');
    expect(output).toContain('Strengths');
    expect(output).toContain('✓');
  });

  // ── Empty/edge cases ──────────────────────────────────────────

  it('handles empty strengths gracefully', () => {
    renderSuggest(makeDefaultOptions({ strengths: [] }), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('No strengths identified');
    expect(output).not.toContain('NaN');
    expect(output).not.toContain('undefined');
  });

  it('handles empty suggestions gracefully', () => {
    renderSuggest(makeDefaultOptions({ suggestions: [] }), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('No suggestions');
    expect(output).not.toContain('NaN');
    expect(output).not.toContain('undefined');
  });

  it('handles completely empty data', () => {
    renderSuggest(makeDefaultOptions({ strengths: [], suggestions: [] }), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Strengths');
    expect(output).toContain('Suggestions');
    expect(output).toContain('No strengths identified');
    expect(output).toContain('No suggestions');
  });

  // ── Priority sorting ─────────────────────────────────────────

  it('sorts suggestions by priority: high, medium, low', () => {
    renderSuggest(
      makeDefaultOptions({
        suggestions: [
          { title: 'Low item', priority: 'low' },
          { title: 'High item', priority: 'high' },
          { title: 'Medium item', priority: 'medium' },
        ],
      }),
      renderer,
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    const visible = stripAnsi(output);
    // High should come before Medium, Medium before Low
    const highIdx = visible.indexOf('High item');
    const medIdx = visible.indexOf('Medium item');
    const lowIdx = visible.indexOf('Low item');
    expect(highIdx).toBeLessThan(medIdx);
    expect(medIdx).toBeLessThan(lowIdx);
  });
});
