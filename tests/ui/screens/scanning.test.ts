import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Renderer } from '../../../src/ui/renderer.js';
import { AnimationManager } from '../../../src/ui/animation/index.js';
import {
  renderScanPhase,
  completeScanPhase,
} from '../../../src/ui/screens/scanning.js';
import type { Theme, TextStyle, ColorToken, SymbolToken, BorderStyle, BorderChars } from '../../../src/ui/theme/index.js';
import type { WidthInfo } from '../../../src/ui/layout/width.js';

// ─── Mock Theme ──────────────────────────────────────────────────

const MOCK_ANSI_GREEN = '\x1b[32m';
const MOCK_ANSI_BOLD = '\x1b[1m';
const MOCK_ANSI_RESET = '\x1b[0m';

function makeMockTheme(): Theme {
  return {
    name: 'test',
    color: (token: ColorToken) => {
      if (token === 'success') return MOCK_ANSI_GREEN;
      return '';
    },
    style: (text: string, style?: TextStyle) => {
      if (!style || (!style.bold && !style.dim && !style.color)) return text;
      let prefix = '';
      if (style.bold) prefix += MOCK_ANSI_BOLD;
      if (style.color === 'success') prefix += MOCK_ANSI_GREEN;
      if (!prefix) return text;
      return `${prefix}${text}${MOCK_ANSI_RESET}`;
    },
    symbol: (token: SymbolToken) => token === 'check' ? '✓' : token,
    border: (_style: BorderStyle): BorderChars => ({
      tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│',
    }),
    colors: { primary: '', success: MOCK_ANSI_GREEN, error: '', warning: '', info: '', dim: '', muted: '', text: '', bg: '', heading: '', code: '', link: '', border: '' },
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
// renderScanPhase
// =================================================================

describe('renderScanPhase', () => {
  let renderer: Renderer;
  let manager: AnimationManager;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    renderer = new Renderer(makeMockTheme(), makeWidthInfo());
    manager = new AnimationManager({ interval: 80, enabled: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    stderrSpy.mockRestore();
  });

  it('renders an initial spinner line to stderr', () => {
    renderScanPhase(renderer, manager, { projectName: 'my-project' });

    // Two writes: cursorHide() + initial spinner line
    expect(stderrSpy).toHaveBeenCalledTimes(2);
    // First call is cursorHide
    expect(stderrSpy.mock.calls[0][0] as string).toBe('\x1b[?25l');
    // Second call is the spinner line
    const output = stderrSpy.mock.calls[1][0] as string;
    expect(output).toContain('Scanning my-project');
    // Should end with a newline (it's a complete line write)
    expect(output).toMatch(/\n$/);
  });

  it('starts the animation manager', () => {
    renderScanPhase(renderer, manager, { projectName: 'test' });
    expect(manager.running).toBe(true);
  });

  it('returns a done promise that resolves when completeScanPhase is called', async () => {
    const { done } = renderScanPhase(renderer, manager, { projectName: 'p' });

    completeScanPhase(renderer, manager, 42, 12, 'p');

    const result = await done;
    expect(result).toEqual({ files: 42, dirs: 12 });
  });

  it('renders updated spinner frames via animation callback', () => {
    renderScanPhase(renderer, manager, { projectName: 'test' });

    // Clear initial call count
    stderrSpy.mockClear();

    // Advance one animation tick
    vi.advanceTimersByTime(80);

    // The animation callback should have written an update to stderr.
    // First element is cursor-up (no newline), second is content line.
    expect(stderrSpy).toHaveBeenCalledTimes(2);
    const cursorUp = stderrSpy.mock.calls[0][0] as string;
    const content = stderrSpy.mock.calls[1][0] as string;
    // First write is cursor-up sequence (no newline)
    expect(cursorUp).toBe('\x1b[1A');
    // Second write is the content line with newline
    expect(content).toContain('Scanning test');
  });

  // ── MEDIUM 3: Progress reporting ──

  it('updateProgress updates the spinner text with file/dir counts', () => {
    const { updateProgress } = renderScanPhase(renderer, manager, { projectName: 'my-project' });
    stderrSpy.mockClear();

    // Simulate progress update
    updateProgress({ files: 42, dirs: 12 });

    // Advance one animation tick so the spinner renders with updated text
    vi.advanceTimersByTime(80);

    const content = stderrSpy.mock.calls[1]?.[0] as string;
    expect(content).toContain('42 files');
    expect(content).toContain('12 directories');
    expect(content).toContain('Scanning my-project');
  });

  it('updateProgress can be called multiple times for incremental updates', () => {
    const { updateProgress } = renderScanPhase(renderer, manager, { projectName: 'test' });
    stderrSpy.mockClear();

    updateProgress({ files: 10, dirs: 2 });
    updateProgress({ files: 50, dirs: 5 });
    updateProgress({ files: 100, dirs: 8 });

    vi.advanceTimersByTime(80);

    const content = stderrSpy.mock.calls[1]?.[0] as string;
    // Should show latest counts
    expect(content).toContain('100 files');
    expect(content).toContain('8 directories');
  });
});

// =================================================================
// completeScanPhase
// =================================================================

describe('completeScanPhase', () => {
  let renderer: Renderer;
  let manager: AnimationManager;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    renderer = new Renderer(makeMockTheme(), makeWidthInfo());
    manager = new AnimationManager({ interval: 80, enabled: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    stderrSpy.mockRestore();
  });

  it('renders the completion line with files and directories', () => {
    renderScanPhase(renderer, manager, { projectName: 'my-project' });
    stderrSpy.mockClear();

    completeScanPhase(renderer, manager, 42, 12, 'my-project');

    // The completion line should contain the stats
    const calls = stderrSpy.mock.calls;
    const allOutput = calls.map((c) => c[0] as string).join('');
    expect(allOutput).toContain('42 files');
    expect(allOutput).toContain('12 directories');
    expect(allOutput).toContain('Scanned my-project');
  });

  it('stops the animation manager', () => {
    renderScanPhase(renderer, manager, { projectName: 'test' });
    expect(manager.running).toBe(true);

    completeScanPhase(renderer, manager, 10, 5, 'test');
    expect(manager.running).toBe(false);
  });

  it('disposes the spinner animation on stop', () => {
    renderScanPhase(renderer, manager, { projectName: 'test' });
    stderrSpy.mockClear();

    completeScanPhase(renderer, manager, 10, 5, 'test');

    // After stop, no more frames should arrive
    vi.advanceTimersByTime(200);
    // No additional writes beyond the completion
    expect(stderrSpy).toHaveBeenCalledTimes(1); // 1 completion line
  });

  it('does not throw if called without a pending scan phase', () => {
    expect(() => {
      completeScanPhase(renderer, manager, 0, 0, 'nonexistent');
    }).not.toThrow();
  });
});

// =================================================================
// Integration: full lifecycle
// =================================================================

describe('full lifecycle', () => {
  let renderer: Renderer;
  let manager: AnimationManager;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    renderer = new Renderer(makeMockTheme(), makeWidthInfo());
    manager = new AnimationManager({ interval: 80, enabled: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    stderrSpy.mockRestore();
  });

  it('produces initial spinner, animation updates, then completion', () => {
    const { done } = renderScanPhase(renderer, manager, { projectName: 'demo' });

    // Clear initial render output
    stderrSpy.mockClear();

    // Advance a few animation ticks
    vi.advanceTimersByTime(240); // 3 ticks

    // Complete
    completeScanPhase(renderer, manager, 100, 20, 'demo');

    // The promise should resolve
    return expect(done).resolves.toEqual({ files: 100, dirs: 20 });
  });

  it('can be started and completed twice in sequence', async () => {
    // First scan cycle
    const { done: d1 } = renderScanPhase(renderer, manager, { projectName: 'first' });
    completeScanPhase(renderer, manager, 10, 2, 'first');
    const r1 = await d1;
    expect(r1).toEqual({ files: 10, dirs: 2 });

    // Second scan cycle — create fresh manager
    const manager2 = new AnimationManager({ interval: 80, enabled: true });
    const { done: d2 } = renderScanPhase(renderer, manager2, { projectName: 'second' });
    completeScanPhase(renderer, manager2, 20, 4, 'second');
    const r2 = await d2;
    expect(r2).toEqual({ files: 20, dirs: 4 });
  });
});
