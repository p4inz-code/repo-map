import { describe, it, expect } from 'vitest';
import { estimateMaturity } from '../../src/intelligence/maturity-estimator.js';
import type { FileEntry, Technology } from '../../src/types.js';

function file(relativePath: string): FileEntry {
  return { path: `/repo/${relativePath}`, relativePath, size: 100, isDirectory: false };
}

describe('estimateMaturity', () => {
  const noFlags = {
    hasLicense: false, hasReadme: false, hasChangelog: false,
    hasContributing: false, hasIssueTemplates: false, hasCi: false,
    hasTests: false, hasLint: false, hasFormatter: false, hasReleaseWorkflow: false,
  };

  it('returns Prototype when nothing is configured', () => {
    const result = estimateMaturity([], [], false, false, false, false, false, false, false, false, false);
    expect(result.level).toBe('Prototype');
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it('returns Production Ready with tests, docs, CI, and linting', () => {
    const files = [
      file('src/index.ts'),
      file('src/app.test.ts'),
      file('src/utils.test.ts'),
      file('README.md'),
      file('.github/workflows/ci.yml'),
    ];
    const result = estimateMaturity(
      files, [], true, true, true, true, true, true, true, true, true,
    );
    expect(['Production Ready', 'Enterprise Grade', 'Active Development']).toContain(result.level);
    expect(result.confidence).toBeGreaterThan(50);
  });

  it('detects test files in multiple locations', () => {
    const files = [
      file('tests/unit.test.ts'),
      file('tests/integration.test.ts'),
    ];
    const result = estimateMaturity(files, [], ...Object.values(noFlags));
    expect(result.factors.some((f) => f.factor === 'Testing' && f.positive)).toBe(true);
  });

  it('detects CI configuration', () => {
    const files = [file('.github/workflows/ci.yml')];
    const result = estimateMaturity(files, [], ...Object.values(noFlags));
    expect(result.factors.some((f) => f.factor === 'CI/CD')).toBe(true);
  });

  it('detects missing license as a gap', () => {
    const result = estimateMaturity([], [], false, false, false, false, false, false, false, false, false);
    expect(result.factors.some((f) => f.factor === 'Licensing' && !f.positive)).toBe(true);
  });

  it('returns confidence percentage', () => {
    const result = estimateMaturity([], [], ...Object.values(noFlags));
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });
});
