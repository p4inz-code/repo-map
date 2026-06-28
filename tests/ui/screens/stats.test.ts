import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Renderer } from '../../../src/ui/renderer.js';
import { setForcedWidth } from '../../../src/ui/layout/width.js';
import {
  renderStats,
  type StatsOptions,
} from '../../../src/ui/screens/stats.js';
import type { Theme, TextStyle, ColorToken, SymbolToken, BorderStyle, BorderChars } from '../../../src/ui/theme/index.js';
import type { WidthInfo } from '../../../src/ui/layout/width.js';

// ─── Mock Theme ──────────────────────────────────────────────────

const MOCK_ANSI_BOLD = '\x1b[1m';
const MOCK_ANSI_DIM = '\x1b[2m';
const MOCK_ANSI_RESET = '\x1b[0m';

function makeMockTheme(): Theme {
  return {
    name: 'test',
    color: () => '',
    style: (text: string, style?: TextStyle) => {
      if (!style || (!style.bold && !style.dim && !style.color)) return text;
      let prefix = '';
      let suffix = '';
      if (style.bold) { prefix += MOCK_ANSI_BOLD; suffix = MOCK_ANSI_RESET; }
      if (style.dim) { prefix += MOCK_ANSI_DIM; suffix = MOCK_ANSI_RESET; }
      if (!prefix) return text;
      return `${prefix}${text}${suffix}`;
    },
    symbol: (token: SymbolToken) => {
      if (token === 'check') return '✓';
      return token;
    },
    border: (style: BorderStyle): BorderChars => ({
      tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│',
    }),
    colors: { primary: '', success: '', error: '', warning: '', info: '', dim: MOCK_ANSI_DIM, muted: '', text: '', bg: '', heading: '', code: '', link: '', border: '' },
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

function makeDefaultOptions(overrides: Partial<StatsOptions> = {}): StatsOptions {
  return {
    projectName: 'my-project',
    totalFiles: 42,
    totalDirectories: 12,
    totalSize: '15.3 KB',
    maxDepth: 4,
    languages: [
      { name: 'TypeScript', count: 30, percentage: 71.4 },
      { name: 'JavaScript', count: 8, percentage: 19.0 },
      { name: 'JSON', count: 4, percentage: 9.5 },
    ],
    largestFile: { path: 'src/app.ts', size: '2.5 KB' },
    largestDir: { path: 'src/components', files: 15 },
    avgFilesPerDir: 3.5,
    elapsed: 1.2,
    ...overrides,
  };
}

/** Strip ANSI escape sequences for visible-text assertions. */
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

// =================================================================
// renderStats
// =================================================================

describe('renderStats', () => {
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

  it('renders a box with stats title', () => {
    renderStats(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('repo-map · my-project · stats');
    expect(output).toContain('╰');
    expect(output).toContain('│');
  });

  // ── Metrics ───────────────────────────────────────────────────

  it('shows all key metrics with bold labels', () => {
    renderStats(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Files');
    expect(output).toContain('42');
    expect(output).toContain('Dirs');
    expect(output).toContain('12');
    expect(output).toContain('Size');
    expect(output).toContain('15.3 KB');
    expect(output).toContain('Depth');
    expect(output).toContain('4');
    expect(output).toContain('Avg files/dir');
    expect(output).toContain('3.5');
    // Labels should be bold
    expect(output).toContain(MOCK_ANSI_BOLD);
  });

  // ── Languages section header ──────────────────────────────────

  it('shows "Languages" section header', () => {
    renderStats(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Languages');
  });

  it('renders language breakdown with decimal percentages', () => {
    renderStats(makeDefaultOptions(), renderer);
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

  // ── Largest file/dir (renderLabelValue pattern) ────────────────

  it('shows largest file with 20-char label alignment', () => {
    renderStats(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    const line = output.split('\n').find((l) => l.includes('Largest file'));
    expect(line).toBeDefined();
    const visible = stripAnsi(line!);
    // "Largest file" is 12 chars, padded to 20 with 8 spaces
    expect(visible).toContain('Largest file        src/app.ts (2.5 KB)');
  });

  it('shows largest dir with 20-char label alignment', () => {
    renderStats(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    const line = output.split('\n').find((l) => l.includes('Largest dir'));
    expect(line).toBeDefined();
    const visible = stripAnsi(line!);
    // "Largest dir" is 11 chars, padded to 20 with 9 spaces
    expect(visible).toContain('Largest dir         src/components (15 files)');
  });

  // ── Elapsed time ──────────────────────────────────────────────

  it('shows elapsed time at bottom', () => {
    renderStats(makeDefaultOptions({ elapsed: 2.5 }), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Completed in 2.5s');
  });

  it('applies dim style to elapsed time', () => {
    renderStats(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    const elapsedLine = output.split('\n').find((l) => l.includes('Completed in'));
    expect(elapsedLine).toBeDefined();
    expect(elapsedLine).toContain(MOCK_ANSI_DIM);
  });

  // ── Breathing whitespace ──────────────────────────────────────

  it('includes breathing whitespace between sections', () => {
    renderStats(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    const lines = output.split('\n');
    // Find lines that are just box border + padding (empty content lines)
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
    renderStats(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).not.toContain('╭');
    expect(output).not.toContain('╰');
    expect(output).toContain('Files');
    expect(output).toContain('42');
  });

  it('shows elapsed on narrow terminals', () => {
    const narrowWidth = makeWidthInfo({ columns: 50, contentWidth: 46, isNarrow: true, breakpoint: 'compact' });
    renderer = new Renderer(makeMockTheme(), narrowWidth);
    renderStats(makeDefaultOptions({ elapsed: 0.8 }), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Completed in 0.8s');
  });

  // ── Empty/edge cases ──────────────────────────────────────────

  it('handles empty languages gracefully', () => {
    renderStats(makeDefaultOptions({ languages: [] }), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('No languages detected');
    expect(output).not.toContain('NaN');
    expect(output).not.toContain('undefined');
  });

  it('handles missing optional stats gracefully', () => {
    renderStats(
      makeDefaultOptions({
        largestFile: undefined,
        largestDir: undefined,
        avgFilesPerDir: 0,
      }),
      renderer,
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).not.toContain('Largest file');
    expect(output).not.toContain('Largest dir');
    expect(output).toContain('Avg files/dir');
    expect(output).toContain('0');
  });

  it('handles zero files without crashing', () => {
    renderStats(
      makeDefaultOptions({
        totalFiles: 0,
        totalDirectories: 0,
        totalSize: '0 B',
        maxDepth: 0,
        languages: [],
        largestFile: undefined,
        largestDir: undefined,
        avgFilesPerDir: 0,
        elapsed: 0,
      }),
      renderer,
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Files');
    expect(output).toContain('0');
    expect(output).toContain('Completed in 0.0s');
    expect(output).not.toContain('NaN');
    expect(output).not.toContain('undefined');
  });
});
