import { describe, it, expect } from 'vitest';
import { formatJson } from '../../src/formatters/json.js';
import { createBaseAnalysis } from '../helpers.js';
import type { Analysis } from '../../src/types.js';

function createMockAnalysis(overrides: Partial<Analysis> = {}): Analysis {
  return createBaseAnalysis({
    schemaVersion: '1.0.0',
    projectName: 'test-project',
    generatedAt: '2025-01-01T00:00:00.000Z',
    cliVersion: '0.2.3',
    stats: {
      totalFiles: 5,
      totalDirectories: 2,
      totalSize: 1024,
      scannedPath: '/tmp/test',
      maxDepth: 2,
      avgFilesPerDirectory: 2.5,
      largestDirectory: 'src',
      largestDirectoryFiles: 3,
      largestFile: 'src/index.ts',
      largestFileSize: 512,
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
  });
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
    expect(parsed.cliVersion).toBe('2.2.7');
    expect(parsed.stats).toBeDefined();
    expect(parsed.technologies).toHaveLength(1);
    expect(parsed.tree).toBeDefined();
    expect(parsed.architecture).toBeDefined();
    expect(parsed.intelligence).toBeDefined();
    expect(parsed.intelligence.classification).toBeDefined();
    expect(parsed.intelligence.health).toBeDefined();
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

  // ── MEDIUM 4: Architecture string option ──

  it('includes architecture string by default', () => {
    const analysis = createMockAnalysis();
    const result = formatJson(analysis);
    const parsed = JSON.parse(result);
    expect(parsed.architecture).toBe('# Test Project\n\nA test project.');
  });

  it('omits architecture string when includeArchitectureString is false', () => {
    const analysis = createMockAnalysis();
    const result = formatJson(analysis, { includeArchitectureString: false });
    const parsed = JSON.parse(result);
    expect(parsed.architecture).toBeUndefined();
    // All other fields should still be present
    expect(parsed.projectName).toBe('test-project');
    expect(parsed.stats).toBeDefined();
    expect(parsed.intelligence).toBeDefined();
  });

  // ── MEDIUM 5: Full graph option ──

  it('outputs summary dependency graph by default', () => {
    const analysis = createMockAnalysis();
    const result = formatJson(analysis);
    const parsed = JSON.parse(result);
    const graph = parsed.intelligence.architecture.dependencyGraph;
    // Default: summary counts (numbers), not full nodes/edges
    expect(typeof graph.nodes).toBe('number');
    expect(typeof graph.edges).toBe('number');
  });

  it('includes full dependency graph when includeFullGraph is true', () => {
    const analysis = createMockAnalysis();
    const result = formatJson(analysis, { includeFullGraph: true });
    const parsed = JSON.parse(result);
    const graph = parsed.intelligence.architecture.dependencyGraph;
    // Full graph: nodes is an array, edges is an array
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);
    // Summary properties should NOT be present as numbers
    // (they're either inside the node objects or available as array length)
    expect(typeof graph.centralModules).toBe('object');
  });
});
