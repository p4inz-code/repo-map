import { describe, it, expect } from 'vitest';
import { generateArchitecture } from '../../src/analyzer/architecture.js';
import { formatSize } from '../../src/utils.js';
import { createMockIntelligence } from '../helpers.js';
import type { Technology, Intelligence } from '../../src/types.js';

describe('formatSize', () => {
  it('formats bytes', () => {
    expect(formatSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatSize(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatSize(2_621_440)).toBe('2.5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatSize(3_221_225_472)).toBe('3.0 GB');
  });

  it('handles zero', () => {
    expect(formatSize(0)).toBe('0 B');
  });
});

describe('generateArchitecture', () => {
  const baseInput = {
    rootPath: '/repo/my-project',
    totalFiles: 10,
    totalDirectories: 3,
    totalSize: 10240,
    generatedAt: '2026-06-24T12:00:00.000Z',
    cliVersion: '0.3.0',
    tree: 'src/\n├── index.ts\n└── cli.ts\n',
    stats: {
      totalFiles: 10,
      totalDirectories: 3,
      totalSize: 10240,
      maxDepth: 2,
      avgFilesPerDirectory: 3.3,
      largestDirectory: 'src',
      largestDirectoryFiles: 2,
      largestFile: 'src/index.ts',
      largestFileSize: 100,
    },
    intelligence: createMockIntelligence(),
  };

  function makeInput(overrides: Partial<typeof baseInput> & { technologies?: Technology[]; intelligence?: Intelligence }) {
    return { ...baseInput, technologies: overrides.technologies ?? [], ...overrides };
  }

  it('includes project name from rootPath', () => {
    const result = generateArchitecture(makeInput({}));
    expect(result).toContain('my-project');
  });

  it('includes file and directory counts', () => {
    const result = generateArchitecture(makeInput({}));
    expect(result).toContain('> **10** files · **3** directories · **10.0 KB** total');
  });

  it('includes the ASCII tree in a code block', () => {
    const result = generateArchitecture(makeInput({}));
    expect(result).toContain('```');
    expect(result).toContain('src/');
    expect(result).toContain('index.ts');
    expect(result).toContain('```');
  });

  it('renders technologies table when technologies exist', () => {
    const technologies: Technology[] = [
      { name: 'TypeScript', category: 'language', evidence: 'Found 5 .ts files' },
      { name: 'Docker', category: 'tool', evidence: 'Found Dockerfile' },
    ];
    const result = generateArchitecture(makeInput({ technologies }));
    expect(result).toContain('Technology Stack');
    expect(result).toContain('| TypeScript | language | Found 5 .ts files |');
    expect(result).toContain('| Docker | tool | Found Dockerfile |');
  });

  it('skips technology stack section when no technologies', () => {
    const result = generateArchitecture(makeInput({ technologies: [] }));
    expect(result).not.toContain('Technology Stack');
  });

  it('sorts technologies: languages first, then frameworks, then tools', () => {
    const technologies: Technology[] = [
      { name: 'Docker', category: 'tool', evidence: 'a' },
      { name: 'TypeScript', category: 'language', evidence: 'b' },
      { name: 'React', category: 'framework', evidence: 'c' },
    ];
    const result = generateArchitecture(makeInput({ technologies }));
    const tableLines = result
      .split('\n')
      .filter((line) => line.startsWith('| ') && !line.startsWith('|---'));
    expect(tableLines[0]).toContain('| Technology');
    expect(tableLines[1]).toContain('TypeScript');
    expect(tableLines[2]).toContain('React');
    expect(tableLines[3]).toContain('Docker');
  });

  it('includes version in technology table when available', () => {
    const technologies: Technology[] = [
      { name: 'React', category: 'framework', version: '^18.0.0', evidence: 'in package.json' },
    ];
    const result = generateArchitecture(makeInput({ technologies }));
    expect(result).toContain('React (^18.0.0)');
  });

  it('handles many technologies gracefully', () => {
    const technologies: Technology[] = Array.from({ length: 20 }, (_, i) => ({
      name: `Tech${i}`,
      category: i < 10 ? 'language' as const : 'tool' as const,
      evidence: `found`,
    }));
    const result = generateArchitecture(makeInput({ technologies }));
    expect(result).toContain('Tech0');
    expect(result).toContain('Tech19');
  });

  it('includes project classification section', () => {
    const result = generateArchitecture(makeInput({}));
    expect(result).toContain('## 1. Project Classification');
  });

  it('includes health score section', () => {
    const result = generateArchitecture(makeInput({}));
    expect(result).toContain('Codebase Health Score');
    expect(result).toContain('50/100');
  });
});
