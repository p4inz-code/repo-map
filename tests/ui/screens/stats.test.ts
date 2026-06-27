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

function makeMockTheme(): Theme {
  return {
    name: 'test',
    color: () => '',
    style: (text: string, style?: TextStyle) => {
      if (!style || (!style.bold && !style.dim && !style.color)) return text;
      return text;
    },
    symbol: (token: SymbolToken) => {
      if (token === 'check') return '✓';
      return token;
    },
    border: (style: BorderStyle): BorderChars => ({
      tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│',
    }),
    colors: { primary: '', success: '', error: '', warning: '', info: '', dim: '', muted: '', text: '', bg: '', heading: '', code: '', link: '', border: '' },
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
    ...overrides,
  };
}

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

  it('renders a box with stats title', () => {
    renderStats(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('╭');
    expect(output).toContain('repo-map · my-project · stats');
    expect(output).toContain('╰');
  });

  it('shows all key metrics', () => {
    renderStats(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Files: 42');
    expect(output).toContain('Dirs: 12');
    expect(output).toContain('Size: 15.3 KB');
    expect(output).toContain('Depth: 4');
  });

  it('shows language breakdown with percentages', () => {
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

  it('shows largest file and directory info', () => {
    renderStats(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Largest file');
    expect(output).toContain('src/app.ts');
    expect(output).toContain('2.5 KB');
    expect(output).toContain('Largest dir');
    expect(output).toContain('src/components');
    expect(output).toContain('15 files');
  });

  it('shows avg files per directory', () => {
    renderStats(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Avg files/dir');
    expect(output).toContain('3.5');
  });

  it('renders without box borders on narrow terminals', () => {
    const narrowWidth = makeWidthInfo({ columns: 50, contentWidth: 46, isNarrow: true, breakpoint: 'compact' });
    renderer = new Renderer(makeMockTheme(), narrowWidth);
    renderStats(makeDefaultOptions(), renderer);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).not.toContain('╭');
    expect(output).not.toContain('╰');
    expect(output).toContain('Files: 42');
  });

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
    expect(output).not.toContain('Avg files/dir');
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
      }),
      renderer,
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Files: 0');
    expect(output).toContain('0 B');
    expect(output).not.toContain('NaN');
    expect(output).not.toContain('undefined');
  });
});
