import { describe, it, expect } from 'vitest';
import { formatJson } from '../../src/formatters/json.js';
import { formatMarkdown } from '../../src/formatters/markdown.js';
import { createBaseAnalysis, createMockIntelligence } from '../helpers.js';
import type { Analysis } from '../../src/types.js';

/**
 * Integration tests for the formatter pipeline.
 *
 * Uses a realistic Analysis object to verify that both formatters
 * produce valid, consistent output from the same data.
 */

const MOCK_ANALYSIS: Analysis = createBaseAnalysis({
  schemaVersion: '1.0.0',
  projectName: 'repo-map',
  generatedAt: '2025-01-01T00:00:00.000Z',
  cliVersion: '0.2.3',
  stats: {
    totalFiles: 42,
    totalDirectories: 12,
    totalSize: 15360,
    scannedPath: '/home/user/repo-map',
    maxDepth: 4,
    avgFilesPerDirectory: 3.5,
    largestDirectory: 'src/analyzer',
    largestDirectoryFiles: 2,
    largestFile: 'src/index.ts',
    largestFileSize: 1024,
  },
  technologies: [
    {
      name: 'TypeScript',
      category: 'language',
      version: '5.3.0',
      evidence: 'tsconfig.json',
    },
    {
      name: 'Node.js',
      category: 'tool',
      version: '20.10.0',
      evidence: 'package.json (engines)',
    },
  ],
  tree: `src/
├── analyzer/
│   ├── index.ts
│   └── tree.ts
├── cli.ts
└── index.ts
`,
  intelligence: createMockIntelligence(),
  architecture: `# Repository Audit Report

**Project:** repo-map  
**Generated:** 2025-01-01T00:00:00.000Z  
**Tool:** repo-map v0.2.3  

> **42** files · **12** directories · **15.0 KB** total  
`,
});

describe('E2E: formatter pipeline', () => {
  it('JSON and Markdown produce different but valid outputs', () => {
    const jsonOutput = formatJson(MOCK_ANALYSIS);
    const mdOutput = formatMarkdown(MOCK_ANALYSIS);

    // Both non-empty
    expect(jsonOutput.length).toBeGreaterThan(0);
    expect(mdOutput.length).toBeGreaterThan(0);

    // They produce different formats
    expect(jsonOutput).not.toBe(mdOutput);
  });

  it('JSON output is parseable and lossless', () => {
    const jsonOutput = formatJson(MOCK_ANALYSIS);
    const parsed: Analysis = JSON.parse(jsonOutput);

    // Roundtrip preserves all fields
    expect(parsed.schemaVersion).toBe(MOCK_ANALYSIS.schemaVersion);
    expect(parsed.projectName).toBe(MOCK_ANALYSIS.projectName);
    expect(parsed.stats.totalFiles).toBe(MOCK_ANALYSIS.stats.totalFiles);
    expect(parsed.technologies).toHaveLength(2);
    expect(parsed.tree).toBe(MOCK_ANALYSIS.tree);
    expect(parsed.architecture).toBe(MOCK_ANALYSIS.architecture);
    expect(parsed.intelligence).toBeDefined();
    expect(parsed.intelligence!.classification).toBeDefined();
  });

  it('Markdown output matches architecture field', () => {
    const mdOutput = formatMarkdown(MOCK_ANALYSIS);
    expect(mdOutput).toBe(MOCK_ANALYSIS.architecture);
  });

  it('JSON contains all technology details', () => {
    const parsed = JSON.parse(formatJson(MOCK_ANALYSIS)) as Analysis;
    const ts = parsed.technologies.find((t) => t.name === 'TypeScript');
    expect(ts).toBeDefined();
    expect(ts!.version).toBe('5.3.0');
    expect(ts!.category).toBe('language');
  });

  it('Markdown includes project structure', () => {
    const mdOutput = formatMarkdown(MOCK_ANALYSIS);
    expect(mdOutput).toContain('repo-map');
  });
});
