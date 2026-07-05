import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Renderer } from '../../../src/ui/renderer.js';
import { AnimationManager } from '../../../src/ui/animation/index.js';
import {
  renderAnalyzePhase,
  completeAnalyzePhase,
} from '../../../src/ui/screens/analyzing.js';
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
// renderAnalyzePhase
// =================================================================

describe('renderAnalyzePhase', () => {
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

  it('renders an initial spinner line to stderr with "Analyzing..."', () => {
    renderAnalyzePhase(renderer, manager);

    // Two writes: cursorHide() + initial spinner line
    expect(stderrSpy).toHaveBeenCalledTimes(2);
    // First call is cursorHide
    expect(stderrSpy.mock.calls[0][0] as string).toBe('\x1b[?25l');
    // Second call is the spinner line
    const output = stderrSpy.mock.calls[1][0] as string;
    expect(output).toContain('Analyzing');
    expect(output).toMatch(/\n$/);
  });

  it('starts the animation manager', () => {
    renderAnalyzePhase(renderer, manager);
    expect(manager.running).toBe(true);
  });

  it('returns a promise that resolves when completeAnalyzePhase is called', async () => {
    const promise = renderAnalyzePhase(renderer, manager);

    completeAnalyzePhase(renderer, manager, 1.2);

    const result = await promise;
    expect(result).toBe(1.2);
  });

  it('renders updated spinner frames via animation callback', () => {
    renderAnalyzePhase(renderer, manager);

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
    expect(content).toContain('Analyzing');
  });
});

// =================================================================
// completeAnalyzePhase
// =================================================================

describe('completeAnalyzePhase', () => {
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

  it('renders the completion line with elapsed time', () => {
    renderAnalyzePhase(renderer, manager);
    stderrSpy.mockClear();

    completeAnalyzePhase(renderer, manager, 2.5);

    const calls = stderrSpy.mock.calls;
    const allOutput = calls.map((c) => c[0] as string).join('');
    expect(allOutput).toContain('Done in');
    expect(allOutput).toContain('2.5s');
  });

  it('stops the animation manager', () => {
    renderAnalyzePhase(renderer, manager);
    expect(manager.running).toBe(true);

    completeAnalyzePhase(renderer, manager, 0.8);
    expect(manager.running).toBe(false);
  });

  it('disposes the spinner animation on stop', () => {
    renderAnalyzePhase(renderer, manager);
    stderrSpy.mockClear();

    completeAnalyzePhase(renderer, manager, 1.0);

    // After stop, no more frames should arrive
    vi.advanceTimersByTime(200);
    expect(stderrSpy).toHaveBeenCalledTimes(1); // 1 completion line
  });

  it('does not throw if called without a pending analyze phase', () => {
    expect(() => {
      completeAnalyzePhase(renderer, manager, 0.0);
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

  it('produces initial spinner, animation updates, then completion with elapsed', () => {
    const promise = renderAnalyzePhase(renderer, manager);

    // Clear initial render output
    stderrSpy.mockClear();

    // Advance animation ticks
    vi.advanceTimersByTime(160); // 2 ticks

    // Complete with elapsed time
    completeAnalyzePhase(renderer, manager, 3.7);

    return expect(promise).resolves.toBe(3.7);
  });

  it('can be started and completed multiple times', async () => {
    // First analyze cycle
    const p1 = renderAnalyzePhase(renderer, manager);
    completeAnalyzePhase(renderer, manager, 0.5);
    expect(await p1).toBe(0.5);

    // Second analyze cycle
    const p2 = renderAnalyzePhase(renderer, manager);
    completeAnalyzePhase(renderer, manager, 1.8);
    expect(await p2).toBe(1.8);
  });

  it('completes in sequence after multiple analyze phases', async () => {
    const p1 = renderAnalyzePhase(renderer, manager);
    completeAnalyzePhase(renderer, manager, 1.2);
    expect(await p1).toBe(1.2);

    const p2 = renderAnalyzePhase(renderer, manager);
    completeAnalyzePhase(renderer, manager, 2.3);
    expect(await p2).toBe(2.3);
  });
});
