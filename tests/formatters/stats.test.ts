import { describe, it, expect } from 'vitest';
import { formatStats, formatStatsJson } from '../../src/formatters/stats.js';
import { createBaseAnalysis } from '../helpers.js';
import type { Analysis, Technology } from '../../src/types.js';

function makeAnalysis(overrides: Partial<Analysis> = {}): Analysis {
  return createBaseAnalysis({
    stats: {
      totalFiles: 100,
      totalDirectories: 20,
      totalSize: 1024000,
      scannedPath: '/tmp/test',
      maxDepth: 4,
      avgFilesPerDirectory: 5,
      largestDirectory: 'src',
      largestDirectoryFiles: 50,
      largestFile: 'src/index.ts',
      largestFileSize: 10240,
    },
    technologies: [],
    ...overrides,
  });
}

function lang(name: string, count: number): Technology {
  return { name, category: 'language', count, evidence: `Found ${count} files` };
}

describe('formatStats', () => {
  it('includes file, directory, and size counts', () => {
    const result = formatStats(makeAnalysis());
    expect(result).toContain('Files: 100');
    expect(result).toContain('Dirs: 20');
    expect(result).toContain('Size:');
  });

  it('shows no languages detected when none found', () => {
    const result = formatStats(makeAnalysis({ technologies: [] }));
    expect(result).toContain('No languages detected.');
  });

  it('shows no languages detected when technologies have no count', () => {
    const technologies: Technology[] = [
      { name: 'Unknown', category: 'language', evidence: 'found' },
    ];
    const result = formatStats(makeAnalysis({ technologies }));
    expect(result).toContain('No languages detected.');
  });

  it('shows language breakdown with percentages', () => {
    const technologies = [lang('TypeScript', 60), lang('Python', 40)];
    const result = formatStats(makeAnalysis({ technologies }));
    expect(result).toContain('TypeScript');
    expect(result).toContain('Python');
    expect(result).toContain('60.0%');
    expect(result).toContain('40.0%');
  });

  it('shows 100% for single language', () => {
    const technologies = [lang('TypeScript', 100)];
    const result = formatStats(makeAnalysis({ technologies }));
    expect(result).toContain('TypeScript');
    expect(result).toContain('100.0%');
  });

  it('handles zero files gracefully', () => {
    const analysis = makeAnalysis({
      stats: {
        totalFiles: 0, totalDirectories: 0, totalSize: 0, scannedPath: '/tmp/test',
        maxDepth: 0, avgFilesPerDirectory: 0, largestDirectory: '', largestDirectoryFiles: 0,
        largestFile: '', largestFileSize: 0,
      },
      technologies: [],
    });
    const result = formatStats(analysis);
    expect(result).toContain('Files: 0');
    expect(result).toContain('No languages detected.');
  });

  it('excludes framework and tool technologies from breakdown', () => {
    const technologies: Technology[] = [
      lang('TypeScript', 80),
      { name: 'React', category: 'framework', version: '^18.0.0', evidence: 'in package.json' },
      { name: 'Docker', category: 'tool', evidence: 'Found Dockerfile' },
    ];
    const result = formatStats(makeAnalysis({ technologies }));
    expect(result).toContain('TypeScript');
    expect(result).not.toContain('React');
    expect(result).not.toContain('Docker');
  });
});

describe('formatStatsJson', () => {
  it('returns valid JSON', () => {
    const result = formatStatsJson(makeAnalysis());
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('includes project name and scan info', () => {
    const result = formatStatsJson(makeAnalysis());
    const parsed = JSON.parse(result);
    expect(parsed.projectName).toBe('test-project');
    expect(parsed.totalFiles).toBe(100);
    expect(parsed.totalDirectories).toBe(20);
    expect(parsed.totalSize).toBe(1024000);
    expect(parsed.generatedAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('includes language breakdown', () => {
    const technologies = [lang('TypeScript', 60), lang('Python', 40)];
    const result = formatStatsJson(makeAnalysis({ technologies }));
    const parsed = JSON.parse(result);
    expect(parsed.languages).toHaveLength(2);
    expect(parsed.languages[0].name).toBe('TypeScript');
    expect(parsed.languages[0].files).toBe(60);
    expect(parsed.languages[0].percentage).toBe(60);
  });

  it('returns empty languages array when none detected', () => {
    const result = formatStatsJson(makeAnalysis({ technologies: [] }));
    const parsed = JSON.parse(result);
    expect(parsed.languages).toEqual([]);
  });

  it('excludes frameworks and tools from language list', () => {
    const technologies: Technology[] = [
      lang('TypeScript', 80),
      { name: 'React', category: 'framework', version: '^18.0.0', evidence: 'in package.json' },
    ];
    const result = formatStatsJson(makeAnalysis({ technologies }));
    const parsed = JSON.parse(result);
    expect(parsed.languages).toHaveLength(1);
    expect(parsed.languages[0].name).toBe('TypeScript');
  });
});
