import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Renderer } from '../../../src/ui/renderer.js';
import { setForcedWidth } from '../../../src/ui/layout/width.js';
import {
  renderCompletion,
  type CompletionOptions,
} from '../../../src/ui/screens/completion.js';
import type { Theme, TextStyle, ColorToken, SymbolToken, BorderStyle, BorderChars } from '../../../src/ui/theme/index.js';
import type { WidthInfo } from '../../../src/ui/layout/width.js';

// ─── Mock Theme ──────────────────────────────────────────────────

const MOCK_ANSI_GREEN = '\x1b[32m';
const MOCK_ANSI_RESET = '\x1b[0m';
const MOCK_ANSI_DIM = '\x1b[2m';

function makeMockTheme(): Theme {
  return {
    name: 'test',
    color: (token: ColorToken) => {
      if (token === 'success') return MOCK_ANSI_GREEN;
      if (token === 'dim') return MOCK_ANSI_DIM;
      return '';
    },
    style: (text: string, style?: TextStyle) => {
      if (!style || (!style.bold && !style.dim && !style.color)) return text;
      let prefix = '';
      let suffix = '';
      if (style.bold) { prefix += '\x1b[1m'; suffix = '\x1b[0m'; }
      if (style.dim) { prefix += MOCK_ANSI_DIM; suffix = '\x1b[0m'; }
      if (style.color === 'success') { prefix += MOCK_ANSI_GREEN; suffix = '\x1b[0m'; }
      if (!prefix) return text;
      return `${prefix}${text}${suffix}`;
    },
    symbol: (token: SymbolToken) => token === 'check' ? '✓' : token,
    border: (style: BorderStyle): BorderChars => ({
      tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│',
    }),
    colors: { primary: '', success: MOCK_ANSI_GREEN, error: '', warning: '', info: '', dim: MOCK_ANSI_DIM, muted: '', text: '', bg: '', heading: '', code: '', link: '', border: '' },
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

function makeDefaultOptions(overrides: Partial<CompletionOptions> = {}): CompletionOptions {
  return {
    projectName: 'my-project',
    totalFiles: 42,
    totalDirectories: 12,
    totalSize: 15672,
    maxDepth: 4,
    classification: 'CLI Tool',
    classificationConfidence: 87,
    maturity: 'Active Development',
    healthScore: 65,
    technologies: [
      { name: 'TypeScript', category: 'language', count: 30 },
      { name: 'JavaScript', category: 'language', count: 8 },
      { name: 'JSON', category: 'language', count: 4 },
      { name: 'Vitest', category: 'testing', count: 5 },
    ],
    strengthsCount: 5,
    suggestionsCount: 3,
    highPriorityCount: 2,
    elapsed: 1.2,
    ...overrides,
  };
}

// =================================================================
// renderCompletion
// =================================================================

describe('renderCompletion', () => {
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

  it('renders a box with the project title', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');

    // Box corners present (title follows corner directly, no dash in between)
    expect(output).toContain('╭ repo-map · my-project');
    expect(output).toContain('╰─');
    expect(output).toContain('│');
  });

  // ── Key metrics ───────────────────────────────────────────────

  it('shows all key metrics', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');

    expect(output).toContain('Files: 42');
    expect(output).toContain('Dirs: 12');
    expect(output).toContain('Size: 15.3 KB');
    expect(output).toContain('Depth: 4');
  });

  // ── Classification, maturity, health score ────────────────────

  it('shows classification with confidence', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('CLI Tool (87%)');
  });

  it('shows maturity', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Active Development');
  });

  it('shows health score', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('65/100');
  });

  // ── Language breakdown ────────────────────────────────────────

  it('renders language breakdown with file counts and percentages', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');

    expect(output).toContain('TypeScript');
    expect(output).toContain('30 files');
    expect(output).toContain('71.4%');

    expect(output).toContain('JavaScript');
    expect(output).toContain('8 files');
    expect(output).toContain('19.0%');

    expect(output).toContain('JSON');
    expect(output).toContain('4 files');
    expect(output).toContain('9.5%');
  });

  // ── Strengths and Suggestions ─────────────────────────────────

  it('shows strengths count with check mark', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    // Check mark symbol + count
    expect(output).toContain('✓');
    expect(output).toContain('5 strengths identified');
  });

  it('shows suggestions with high priority count', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('3 improvement suggestions');
    expect(output).toContain('2 high priority');
  });

  it('shows suggestions without high priority when count is 0', () => {
    renderCompletion(
      makeDefaultOptions({ suggestionsCount: 4, highPriorityCount: 0 }),
      renderer,
      makeWidthInfo(),
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('4 improvement suggestions');
    expect(output).not.toContain('high priority');
  });

  // ── Elapsed time ──────────────────────────────────────────────

  it('shows completed time', () => {
    renderCompletion(makeDefaultOptions({ elapsed: 2.5 }), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Completed in 2.5s');
  });

  // ── Output path ───────────────────────────────────────────────

  it('displays the output path when provided', () => {
    renderCompletion(
      makeDefaultOptions({ outputPath: 'architecture.md' }),
      renderer,
      makeWidthInfo(),
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Output written to architecture.md');
  });

  it('does not display output path when omitted', () => {
    renderCompletion(makeDefaultOptions({ outputPath: undefined }), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).not.toContain('Output written');
  });

  // ── Empty technologies ────────────────────────────────────────

  it('handles empty technologies list gracefully', () => {
    renderCompletion(
      makeDefaultOptions({ technologies: [] }),
      renderer,
      makeWidthInfo(),
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('No languages detected');
    expect(output).not.toContain('undefined');
    expect(output).not.toContain('NaN');
  });

  it('handles technologies with no language entries', () => {
    renderCompletion(
      makeDefaultOptions({
        technologies: [
          { name: 'Vitest', category: 'testing', count: 5 },
        ],
      }),
      renderer,
      makeWidthInfo(),
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('No languages detected');
  });

  // ── Narrow terminal ───────────────────────────────────────────

  it('renders without box borders on narrow terminals', () => {
    const narrowWidth = makeWidthInfo({ columns: 50, contentWidth: 46, isNarrow: true, breakpoint: 'compact' });
    renderCompletion(makeDefaultOptions(), renderer, narrowWidth);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');

    // No box characters
    expect(output).not.toContain('╭');
    expect(output).not.toContain('╰');
    expect(output).not.toContain('│');

    // Content is still present
    expect(output).toContain('Files: 42');
    expect(output).toContain('TypeScript');
  });

  // ── Styling verification ──────────────────────────────────────

  it('applies success color to strengths line', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    // The strengths line should have green ANSI codes
    expect(output).toContain(MOCK_ANSI_GREEN);
    expect(output).toContain('5 strengths identified');
  });

  it('applies dim style to elapsed line', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    // The elapsed line should have dim ANSI codes
    expect(output).toContain(MOCK_ANSI_DIM);
    expect(output).toContain('Completed in');
  });

  it('applies bold style to classification label', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    // Bold ANSI code
    expect(output).toContain('\x1b[1m');
    expect(output).toContain('Classification');
  });

  // ── Zero values ───────────────────────────────────────────────

  it('handles zero files without crashing', () => {
    renderCompletion(
      makeDefaultOptions({
        totalFiles: 0,
        totalDirectories: 0,
        totalSize: 0,
        technologies: [],
        strengthsCount: 0,
        suggestionsCount: 0,
        highPriorityCount: 0,
        elapsed: 0,
      }),
      renderer,
      makeWidthInfo(),
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Files: 0');
    expect(output).toContain('0 B');
    expect(output).toContain('No languages detected');
    expect(output).not.toContain('NaN');
    expect(output).not.toContain('undefined');
  });
});
