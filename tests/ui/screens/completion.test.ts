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
const MOCK_ANSI_BOLD = '\x1b[1m';

function makeMockTheme(): Theme {
  return {
    name: 'test',
    color: (token: ColorToken) => {
      if (token === 'success' || token === 'bar-fill') return MOCK_ANSI_GREEN;
      if (token === 'dim' || token === 'bar-empty') return MOCK_ANSI_DIM;
      return '';
    },
    style: (text: string, style?: TextStyle) => {
      if (!style || (!style.bold && !style.dim && !style.color)) return text;
      let prefix = '';
      let suffix = '';
      if (style.bold) { prefix += MOCK_ANSI_BOLD; suffix = MOCK_ANSI_RESET; }
      if (style.dim) { prefix += MOCK_ANSI_DIM; suffix = MOCK_ANSI_RESET; }
      if (style.color === 'success' || style.color === 'bar-fill') { prefix += MOCK_ANSI_GREEN; suffix = MOCK_ANSI_RESET; }
      if (style.color === 'bar-empty') { prefix += MOCK_ANSI_DIM; suffix = MOCK_ANSI_RESET; }
      if (!prefix) return text;
      return `${prefix}${text}${suffix}`;
    },
    symbol: (token: SymbolToken) => token === 'check' ? '✓' : token,
    border: (_style: BorderStyle): BorderChars => ({
      tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│',
    }),
    colors: { primary: '', success: MOCK_ANSI_GREEN, error: '', warning: '', info: '', dim: MOCK_ANSI_DIM, muted: '', text: '', bg: '', heading: '', code: '', link: '', border: '', 'bar-fill': MOCK_ANSI_GREEN, 'bar-empty': MOCK_ANSI_DIM },
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

/** Strip ANSI escape sequences for visible-text assertions. */
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

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

    // Box corners present (title follows corner directly)
    expect(output).toContain('╭ repo-map · my-project');
    expect(output).toContain('╰─');
    expect(output).toContain('│');
  });

  // ── Classification (focal point) ──────────────────────────────

  it('shows classification with confidence as right-aligned suffix', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Classification');
    expect(output).toContain('CLI Tool');
    expect(output).toContain('87%');
  });

  it('applies bold style to classification label', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain(MOCK_ANSI_BOLD);
    expect(output).toContain('Classification');
  });

  // ── Maturity ──────────────────────────────────────────────────

  it('shows maturity', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Maturity');
    expect(output).toContain('Active Development');
  });

  // ── Health bar ────────────────────────────────────────────────

  it('shows health bar with filled and empty characters', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Health');
    expect(output).toContain('█');
    expect(output).toContain('░');
    expect(output).toContain('65/100');
  });

  it('renders full bar for health score of 100', () => {
    renderCompletion(makeDefaultOptions({ healthScore: 100 }), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    // Should have 24 filled characters and no empty characters
    expect(output).toContain('█'.repeat(24));
    expect(output).not.toContain('░');
    expect(output).toContain('100/100');
  });

  it('renders empty bar for health score of 0', () => {
    renderCompletion(makeDefaultOptions({ healthScore: 0 }), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    // Should have 24 empty characters and no filled characters
    expect(output).toContain('░'.repeat(24));
    expect(output).not.toContain('█');
    expect(output).toContain('0/100');
  });

  it('applies bar-fill semantic color to filled blocks', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain(MOCK_ANSI_GREEN);
    expect(output).toContain('█');
  });

  it('applies bar-empty semantic color to empty blocks', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain(MOCK_ANSI_DIM);
    expect(output).toContain('░');
  });

  // ── Metrics line ──────────────────────────────────────────────

  it('shows compact metrics line with all values', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Files');
    expect(output).toContain('42');
    expect(output).toContain('Dirs');
    expect(output).toContain('12');
    expect(output).toContain('Size');
    expect(output).toContain('15.3 KB');
    expect(output).toContain('Depth');
    expect(output).toContain('4');
  });

  // ── Language breakdown ────────────────────────────────────────

  it('renders language breakdown with file counts and integer percentages', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');

    expect(output).toContain('TypeScript');
    expect(output).toContain('30 files');
    expect(output).toContain('71%');

    expect(output).toContain('JavaScript');
    expect(output).toContain('8 files');
    expect(output).toContain('19%');

    expect(output).toContain('JSON');
    expect(output).toContain('4 files');
    expect(output).toContain('10%');
  });

  // ── Strengths and Suggestions (MUST NOT appear) ───────────────

  it('does not show strengths in the default dashboard', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).not.toContain('strengths identified');
  });

  it('does not show suggestions in the default dashboard', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).not.toContain('improvement suggestions');
    expect(output).not.toContain('high priority');
  });

  // ── Elapsed time (MUST NOT appear) ────────────────────────────

  it('does not show elapsed time in the default dashboard', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).not.toContain('Completed in');
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

  // ── Breathing whitespace ──────────────────────────────────────

  it('includes breathing whitespace between sections', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');

    // There should be blank lines inside the box (between sections)
    // The box content has blank lines between: top border and classification,
    // health and metrics, metrics and languages, languages and bottom border
    const lines = output.split('\n');
    // Find lines that are just box border + padding (empty content lines)
    const emptyContentLines = lines.filter((line) =>
      line.includes('│') && line.trim().replace(/│/g, '').trim() === '',
    );
    expect(emptyContentLines.length).toBeGreaterThanOrEqual(3);
  });

  // ── Label column alignment ────────────────────────────────────

  it('uses 20-character label column for Classification', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');

    // Strip ANSI codes for alignment checks
    const classLine = output.split('\n').find((l) => l.includes('Classification'));
    expect(classLine).toBeDefined();
    const visible = stripAnsi(classLine!);
    // "Classification" is 14 chars, padded to 20 with 6 spaces
    expect(visible).toContain('Classification      CLI Tool');
  });

  it('uses 20-character label column for Maturity', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');

    const matLine = output.split('\n').find((l) => l.includes('Maturity'));
    expect(matLine).toBeDefined();
    const visible = stripAnsi(matLine!);
    // "Maturity" is 8 chars, padded to 20 with 12 spaces
    expect(visible).toContain('Maturity            Active Development');
  });

  it('uses 20-character label column for Health', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');

    const healthLine = output.split('\n').find((l) => l.includes('Health'));
    expect(healthLine).toBeDefined();
    const visible = stripAnsi(healthLine!);
    // "Health" is 6 chars, padded to 20 with 14 spaces
    expect(visible).toContain('Health              ');
  });

  it('classification suffix is dim (not bold)', () => {
    renderCompletion(makeDefaultOptions(), renderer, makeWidthInfo());
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    // The suffix "87%" should be wrapped in dim, not bold
    const classLine = output.split('\n').find((l) => l.includes('Classification'))!;
    // Find the position of "87%" in the line
    const suffixIdx = classLine.indexOf('87%');
    // The 5 chars before "87%" should include a dim code but not a bold code
    const beforeSuffix = classLine.substring(Math.max(0, suffixIdx - 10), suffixIdx);
    expect(beforeSuffix).toContain(MOCK_ANSI_DIM);
    expect(beforeSuffix).not.toContain(MOCK_ANSI_BOLD);
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
    expect(output).toContain('Classification:');
    expect(output).toContain('CLI Tool');
    expect(output).toContain('TypeScript');
  });

  it('renders health as text (no bar) on narrow terminals', () => {
    const narrowWidth = makeWidthInfo({ columns: 50, contentWidth: 46, isNarrow: true, breakpoint: 'compact' });
    renderCompletion(makeDefaultOptions(), renderer, narrowWidth);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');

    // Should show health score as text, not bar characters
    expect(output).toContain('Health:');
    expect(output).toContain('65/100');
    expect(output).not.toContain('█');
    expect(output).not.toContain('░');
  });

  it('shows project name header on narrow terminals', () => {
    const narrowWidth = makeWidthInfo({ columns: 50, contentWidth: 46, isNarrow: true, breakpoint: 'compact' });
    renderCompletion(makeDefaultOptions(), renderer, narrowWidth);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('repo-map · my-project');
  });

  // ── Language truncation (12-line budget) ────────────────────

  it('truncates languages to 3 when more than 3 are present', () => {
    renderCompletion(
      makeDefaultOptions({
        technologies: [
          { name: 'TypeScript', category: 'language', count: 30 },
          { name: 'JavaScript', category: 'language', count: 8 },
          { name: 'JSON', category: 'language', count: 4 },
          { name: 'Python', category: 'language', count: 3 },
          { name: 'Go', category: 'language', count: 2 },
          { name: 'Rust', category: 'language', count: 1 },
        ],
      }),
      renderer,
      makeWidthInfo(),
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    const visible = stripAnsi(output);
    // Top 3 languages shown
    expect(visible).toContain('TypeScript');
    expect(visible).toContain('JavaScript');
    expect(visible).toContain('JSON');
    // Overflow indicator shown
    expect(visible).toContain('+3 more languages');
    // 4th, 5th, 6th languages NOT shown
    expect(visible).not.toContain('  Python ');
    expect(visible).not.toContain('  Go ');
    expect(visible).not.toContain('  Rust ');
  });

  it('does not truncate when 3 or fewer languages', () => {
    renderCompletion(
      makeDefaultOptions({
        technologies: [
          { name: 'TypeScript', category: 'language', count: 30 },
          { name: 'JavaScript', category: 'language', count: 8 },
          { name: 'JSON', category: 'language', count: 4 },
        ],
      }),
      renderer,
      makeWidthInfo(),
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    const visible = stripAnsi(output);
    expect(visible).toContain('TypeScript');
    expect(visible).toContain('JavaScript');
    expect(visible).toContain('JSON');
    expect(visible).not.toContain('more languages');
  });

  it('respects 12-line content budget with truncation', () => {
    renderCompletion(
      makeDefaultOptions({
        technologies: [
          { name: 'TypeScript', category: 'language', count: 30 },
          { name: 'JavaScript', category: 'language', count: 8 },
          { name: 'JSON', category: 'language', count: 4 },
          { name: 'Python', category: 'language', count: 3 },
          { name: 'Go', category: 'language', count: 2 },
          { name: 'Rust', category: 'language', count: 1 },
        ],
      }),
      renderer,
      makeWidthInfo(),
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    const lines = output.split('\n');
    // Count content lines inside the box (between top and bottom border)
    const topBorder = lines.findIndex((l) => l.includes('╭'));
    const bottomBorder = lines.findIndex((l) => l.includes('╰'));
    // Budget: 12 content lines (between borders, exclusive)
    // Fixed: 7 (breathing, class, maturity, health, gap, metrics, gap)
    // + up to 3 lang lines + 1 overflow + 1 breathing = 12 max
    expect(bottomBorder - topBorder - 1).toBeLessThanOrEqual(12);
  });

  // ── Zero values ───────────────────────────────────────────────

  it('handles zero files without crashing', () => {
    renderCompletion(
      makeDefaultOptions({
        totalFiles: 0,
        totalDirectories: 0,
        totalSize: 0,
        technologies: [],
      }),
      renderer,
      makeWidthInfo(),
    );
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Files');
    expect(output).toContain('0');
    expect(output).toContain('No languages detected');
    expect(output).not.toContain('NaN');
    expect(output).not.toContain('undefined');
  });
});
