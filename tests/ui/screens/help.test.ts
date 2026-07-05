import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Renderer } from '../../../src/ui/renderer.js';
import { setForcedWidth } from '../../../src/ui/layout/width.js';
import { renderHelp } from '../../../src/ui/screens/help.js';
import type { Theme, TextStyle, SymbolToken, BorderStyle, BorderChars } from '../../../src/ui/theme/index.js';
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
    symbol: (token: SymbolToken) => token,
    border: (_style: BorderStyle): BorderChars => ({
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

// =================================================================
// renderHelp
// =================================================================

describe('renderHelp', () => {
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

  it('displays the CLI name', () => {
    renderHelp(renderer, '2.1.0');
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('repo-map');
  });

  it('displays the version', () => {
    renderHelp(renderer, '2.1.0');
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('v2.1.0');
  });

  it('displays the description', () => {
    renderHelp(renderer, '2.1.0');
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Scan any codebase');
    expect(output).toContain('comprehensive architecture reports');
  });

  it('contains a USAGE section', () => {
    renderHelp(renderer, '1.0.0');
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('USAGE');
    expect(output).toContain('$ repo-map [path] [options]');
  });

  it('contains an ARGUMENTS section', () => {
    renderHelp(renderer, '1.0.0');
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('ARGUMENTS');
    expect(output).toContain('[path]');
    expect(output).toContain('[default: .]');
  });

  it('lists all CLI options', () => {
    renderHelp(renderer, '1.0.0');
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('OPTIONS');
    expect(output).toContain('--json');
    expect(output).toContain('--output');
    expect(output).toContain('--depth');
    expect(output).toContain('--no-ignore');
    expect(output).toContain('--exclude');
    expect(output).toContain('--include');
    expect(output).toContain('--stats');
    expect(output).toContain('--suggest');
    expect(output).toContain('--no-color');
  });

  it('contains an EXAMPLES section', () => {
    renderHelp(renderer, '1.0.0');
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('EXAMPLES');
    expect(output).toContain('$ repo-map .');
    expect(output).toContain('$ repo-map --json -o report.json');
    expect(output).toContain('$ repo-map --stats --exclude dist');
  });

  it('contains the documentation link', () => {
    renderHelp(renderer, '1.0.0');
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('codebuff.com/docs');
    expect(output).toContain('Full documentation');
  });

  // ── Narrow terminal ───────────────────────────────────────────

  it('renders narrow layout with compact options on narrow terminals', () => {
    const narrowWidth = makeWidthInfo({ columns: 50, contentWidth: 46, isNarrow: true, breakpoint: 'compact' });
    const narrowRenderer = new Renderer(makeMockTheme(), narrowWidth);
    renderHelp(narrowRenderer, '2.2.0');
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    // Should still contain all sections
    expect(output).toContain('repo-map');
    expect(output).toContain('USAGE');
    expect(output).toContain('OPTIONS');
    expect(output).toContain('EXAMPLES');
    // Narrow mode uses compact option descriptions
    expect(output).toContain('JSON output');
    expect(output).toContain('Write to file');
    expect(output).toContain('v2.2.0');
  });
});
