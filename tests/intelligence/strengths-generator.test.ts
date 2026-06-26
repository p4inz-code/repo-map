import { describe, it, expect } from 'vitest';
import { generateStrengths } from '../../src/intelligence/strengths-generator.js';
import type { FileEntry, Technology, MaturityEstimate, HealthScore } from '../../src/types.js';

function file(relativePath: string): FileEntry {
  return { path: `/repo/${relativePath}`, relativePath, size: 100, isDirectory: false };
}

describe('generateStrengths', () => {
  const mockMaturity: MaturityEstimate = {
    level: 'Early Development',
    confidence: 50,
    factors: [],
  };

  const mockHealth: HealthScore = {
    overall: 70,
    maxOverall: 100,
    categories: [
      { name: 'Documentation', score: 70, maxScore: 100, deductions: [] },
      { name: 'Testing', score: 70, maxScore: 100, deductions: [] },
      { name: 'Architecture', score: 85, maxScore: 100, deductions: [] },
      { name: 'Maintainability', score: 70, maxScore: 100, deductions: [] },
      { name: 'Consistency', score: 70, maxScore: 100, deductions: [] },
      { name: 'Project Structure', score: 70, maxScore: 100, deductions: [] },
      { name: 'Tooling', score: 70, maxScore: 100, deductions: [] },
      { name: 'Release Readiness', score: 70, maxScore: 100, deductions: [] },
    ],
  };

  it('includes README as a strength when present', () => {
    const result = generateStrengths(
      [file('README.md')], [], mockMaturity, mockHealth,
      false, true, false, false,
    );
    expect(result.some((s) => s.title === 'Excellent Documentation')).toBe(true);
  });

  it('includes license as a strength when present', () => {
    const result = generateStrengths(
      [], [], mockMaturity, mockHealth,
      true, false, false, false,
    );
    expect(result.some((s) => s.title === 'Clear Licensing')).toBe(true);
  });

  it('includes testing strength when test files exist', () => {
    const files = [file('src/app.test.ts'), file('src/utils.test.ts')];
    const result = generateStrengths(
      files, [], mockMaturity, mockHealth,
      false, false, false, true,
    );
    expect(result.some((s) => s.title === 'Strong Testing')).toBe(true);
  });

  it('includes CI strength when CI is configured', () => {
    const technologies: Technology[] = [
      { name: 'GitHub Actions', category: 'tool', evidence: '.github/workflows/ci.yml' },
    ];
    const result = generateStrengths(
      [], technologies, mockMaturity, mockHealth,
      false, false, true, false,
    );
    expect(result.some((s) => s.title === 'Continuous Integration')).toBe(true);
  });

  it('returns at most 8 strengths', () => {
    const result = generateStrengths(
      [file('README.md'), file('LICENSE'), file('src/app.test.ts')],
      [{ name: 'TypeScript', category: 'language', evidence: 'tsconfig.json' }],
      mockMaturity, mockHealth,
      true, true, true, true,
    );
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it('includes TypeScript strength when TypeScript detected', () => {
    const technologies: Technology[] = [
      { name: 'TypeScript', category: 'language', evidence: 'tsconfig.json' },
    ];
    const result = generateStrengths(
      [], technologies, mockMaturity, mockHealth,
      false, false, false, false,
    );
    expect(result.some((s) => s.title === 'Type Safety')).toBe(true);
  });
});
