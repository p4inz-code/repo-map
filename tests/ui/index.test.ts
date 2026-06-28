import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createUISession, type UISessionOptions, type UISession } from '../../src/ui/index.js';
import { clearThemeCache } from '../../src/ui/theme/index.js';
import { setForcedWidth } from '../../src/ui/layout/width.js';
import { createBaseAnalysis, createMockIntelligence, createMockArchitecture } from '../helpers.js';

// =================================================================
// createUISession
// =================================================================

describe('createUISession', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    clearThemeCache();
    setForcedWidth(80);
  });

  afterEach(() => {
    vi.useRealTimers();
    stderrSpy.mockRestore();
    setForcedWidth(null);
  });

  it('returns a session with all expected methods', () => {
    const ui = createUISession({ color: false });
    expect(ui).toBeDefined();
    expect(typeof ui.startScanning).toBe('function');
    expect(typeof ui.finishScanning).toBe('function');
    expect(typeof ui.startAnalyzing).toBe('function');
    expect(typeof ui.finishAnalyzing).toBe('function');
    expect(typeof ui.renderCompletion).toBe('function');
    expect(typeof ui.renderStats).toBe('function');
    expect(typeof ui.renderSuggest).toBe('function');
    expect(typeof ui.renderHelp).toBe('function');
    expect(typeof ui.reportError).toBe('function');
    expect(typeof ui.close).toBe('function');
  });

  it('close() does not throw when no animations are running', () => {
    const ui = createUISession({ color: false });
    expect(() => ui.close()).not.toThrow();
  });

  // ── Lifecycle: startScanning / finishScanning ──────────────────

  it('startScanning renders an initial spinner line', () => {
    const ui = createUISession({ color: false });
    ui.startScanning('test-project');
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Scanning test-project');
  });

  it('finishScanning renders the completion stats line', () => {
    const ui = createUISession({ color: false });
    ui.startScanning('test-project');
    stderrSpy.mockClear();
    ui.finishScanning(42, 12);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('42 files');
    expect(output).toContain('12 directories');
  });

  // ── Lifecycle: startAnalyzing / finishAnalyzing ────────────────

  it('startAnalyzing renders an analyzing spinner line', () => {
    const ui = createUISession({ color: false });
    ui.startAnalyzing();
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Analyzing');
  });

  it('finishAnalyzing renders the elapsed time line', () => {
    const ui = createUISession({ color: false });
    ui.startAnalyzing();
    stderrSpy.mockClear();
    ui.finishAnalyzing(1.5);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Done in');
    expect(output).toContain('1.5s');
  });

  // ── renderCompletion ───────────────────────────────────────────

  it('renderCompletion renders completion screen with analysis data', () => {
    const analysis = createBaseAnalysis({
      projectName: 'test-project',
      stats: {
        totalFiles: 42,
        totalDirectories: 12,
        totalSize: 15000,
        maxDepth: 4,
        scannedPath: '/tmp/test',
        avgFilesPerDirectory: 3.5,
        largestDirectory: 'src',
        largestDirectoryFiles: 15,
        largestFile: 'src/index.ts',
        largestFileSize: 5000,
      },
      technologies: [
        { name: 'TypeScript', category: 'language', count: 30, evidence: '.ts' },
        { name: 'Vitest', category: 'testing', count: 5, evidence: 'test' },
      ],
    });

    const ui = createUISession({ color: false });
    stderrSpy.mockClear();
    ui.renderCompletion(analysis);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Files');
    expect(output).toContain('42');
    expect(output).toContain('TypeScript');
    expect(output).toContain('30 files');
    expect(output).toContain('Classification');
  });

  it('renderCompletion with outputPath renders the output message', () => {
    const analysis = createBaseAnalysis();
    const ui = createUISession({ color: false });
    stderrSpy.mockClear();
    ui.renderCompletion(analysis, 'report.md');
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Output written to report.md');
  });

  // ── renderStats ────────────────────────────────────────────────

  it('renderStats renders stats screen with analysis data', () => {
    const analysis = createBaseAnalysis({
      projectName: 'test-stats',
      stats: {
        totalFiles: 30,
        totalDirectories: 8,
        totalSize: 10000,
        maxDepth: 3,
        scannedPath: '/tmp/test',
        avgFilesPerDirectory: 3.75,
        largestDirectory: 'src',
        largestDirectoryFiles: 10,
        largestFile: 'src/main.ts',
        largestFileSize: 2000,
      },
      technologies: [
        { name: 'TypeScript', category: 'language', count: 25, evidence: '.ts' },
        { name: 'JSON', category: 'language', count: 5, evidence: '.json' },
      ],
    });

    const ui = createUISession({ color: false });
    stderrSpy.mockClear();
    ui.renderStats(analysis, 1.5);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Files');
    expect(output).toContain('30');
    expect(output).toContain('TypeScript');
    expect(output).toContain('Completed in 1.5s');
  });

  // ── renderSuggest ──────────────────────────────────────────────

  it('renderSuggest renders suggest screen with strengths and suggestions', () => {
    const analysis = createBaseAnalysis({
      projectName: 'test-suggest',
      intelligence: {
        ...createMockIntelligence(),
        strengths: [
          { title: 'Clean project structure', detail: '', evidence: [] },
          { title: 'Comprehensive test coverage', detail: '', evidence: [] },
        ],
        suggestions: [
          { title: 'Add CI/CD pipeline', detail: '', priority: 'high' },
          { title: 'Upgrade dependencies', detail: '', priority: 'medium' },
          { title: 'Add API docs', detail: '', priority: 'low' },
        ],
      },
    });

    const ui = createUISession({ color: false });
    stderrSpy.mockClear();
    ui.renderSuggest(analysis);
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Strengths');
    expect(output).toContain('Clean project structure');
    expect(output).toContain('Suggestions');
    expect(output).toContain('Add CI/CD pipeline');
  });

  // ── renderHelp ─────────────────────────────────────────────────

  it('renderHelp renders help screen with version', () => {
    const ui = createUISession({ color: false });
    stderrSpy.mockClear();
    ui.renderHelp();
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('repo-map');
    expect(output).toContain('USAGE');
    expect(output).toContain('OPTIONS');
    expect(output).toContain('EXAMPLES');
  });

  // ── reportError ────────────────────────────────────────────────

  it('reportError renders error screen with message and suggestion', () => {
    const ui = createUISession({ color: false });
    stderrSpy.mockClear();
    ui.reportError('Something went wrong', 'Try again');
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('Something went wrong');
    expect(output).toContain('Try again');
  });

  // ── close ──────────────────────────────────────────────────────

  it('close restores the cursor', () => {
    const ui = createUISession({ color: false });
    stderrSpy.mockClear();
    ui.close();
    const output = stderrSpy.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('\x1b[?25h'); // cursorShow
  });

  it('close stops the animation manager', () => {
    const ui = createUISession({ color: false, noAnimation: false });
    // Start scanning to activate the animation manager
    ui.startScanning('test');
    stderrSpy.mockClear();
    ui.close();
    // Clear the cursorShow() that close() itself writes
    stderrSpy.mockClear();
    // After close, further timer ticks should produce no output
    vi.advanceTimersByTime(200);
    expect(stderrSpy).not.toHaveBeenCalled();
  });
});
