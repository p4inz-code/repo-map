import { describe, it, expect } from 'vitest';
import { formatMarkdown } from '../../src/formatters/markdown.js';
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
    technologies: [],
    tree: 'src/\n├── index.ts\n└── cli.ts\n',
    architecture: '# Project Architecture: test-project\n\nA sample architecture.',
    ...overrides,
  };
}

describe('formatMarkdown', () => {
  it('returns the architecture field', () => {
    const analysis = createMockAnalysis();
    const result = formatMarkdown(analysis);
    expect(result).toBe(analysis.architecture);
  });

  it('returns empty string for empty architecture', () => {
    const analysis = createMockAnalysis({ architecture: '' });
    const result = formatMarkdown(analysis);
    expect(result).toBe('');
  });

  it('preserves markdown formatting', () => {
    const analysis = createMockAnalysis({
      architecture: '# Title\n\n## Section\n\n- item 1\n- item 2',
    });
    const result = formatMarkdown(analysis);
    expect(result).toContain('# Title');
    expect(result).toContain('## Section');
    expect(result).toContain('- item 1');
  });

  it('handles complex architecture with code blocks', () => {
    const arch = '## Structure\n\n```\nsrc/\n├── index.ts\n└── cli.ts\n```';
    const analysis = createMockAnalysis({ architecture: arch });
    const result = formatMarkdown(analysis);
    expect(result).toContain('```');
    expect(result).toContain('src/');
  });
});
