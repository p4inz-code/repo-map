import { describe, it, expect } from 'vitest';
import { formatJson } from '../../src/formatters/json.js';
import type { Analysis } from '../../src/types.js';

function createMockAnalysis(overrides: Partial<Analysis> = {}): Analysis {
  return {
    schemaVersion: '1.0.0',
    projectName: 'test-project',
    generatedAt: '2025-01-01T00:00:00.000Z',
    cliVersion: '0.1.0',
    stats: {
      totalFiles: 5,
      totalDirectories: 2,
      totalSize: 1024,
      scannedPath: '/tmp/test',
    },
    technologies: [
      {
        name: 'TypeScript',
        category: 'language',
        version: '5.0.0',
        evidence: 'tsconfig.json',
      },
    ],
    tree: 'src/\n├── index.ts\n└── cli.ts\n',
    architecture: '# Test Project\n\nA test project.',
    ...overrides,
  };
}

describe('formatJson', () => {
  it('returns valid JSON', () => {
    const analysis = createMockAnalysis();
    const result = formatJson(analysis);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('includes all Analysis fields', () => {
    const analysis = createMockAnalysis();
    const result = formatJson(analysis);
    const parsed = JSON.parse(result);

    expect(parsed.schemaVersion).toBe('1.0.0');
    expect(parsed.projectName).toBe('test-project');
    expect(parsed.generatedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(parsed.cliVersion).toBe('0.1.0');
    expect(parsed.stats).toBeDefined();
    expect(parsed.technologies).toHaveLength(1);
    expect(parsed.tree).toBeDefined();
    expect(parsed.architecture).toBeDefined();
  });

  it('pretty-prints with 2-space indentation', () => {
    const analysis = createMockAnalysis();
    const result = formatJson(analysis);
    expect(result).toContain('  "schemaVersion"');
    expect(result).toContain('  "projectName"');
  });

  it('handles empty technologies array', () => {
    const analysis = createMockAnalysis({ technologies: [] });
    const result = formatJson(analysis);
    const parsed = JSON.parse(result);
    expect(parsed.technologies).toEqual([]);
  });

  it('preserves nested structures', () => {
    const analysis = createMockAnalysis();
    const result = formatJson(analysis);
    const parsed = JSON.parse(result);
    expect(parsed.stats.totalFiles).toBe(5);
    expect(parsed.stats.scannedPath).toBe('/tmp/test');
  });
});
