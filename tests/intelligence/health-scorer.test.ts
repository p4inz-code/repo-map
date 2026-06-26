import { describe, it, expect } from 'vitest';
import { calculateHealth } from '../../src/intelligence/health-scorer.js';
import type { FileEntry } from '../../src/types.js';

function file(relativePath: string): FileEntry {
  return { path: `/repo/${relativePath}`, relativePath, size: 100, isDirectory: false };
}

function dir(relativePath: string): FileEntry {
  return { path: `/repo/${relativePath}`, relativePath, size: 0, isDirectory: true };
}

describe('calculateHealth', () => {
  it('returns all 8 health categories', () => {
    const result = calculateHealth([]);
    expect(result.categories).toHaveLength(8);
    expect(result.categories.map((c) => c.name)).toEqual([
      'Documentation', 'Testing', 'Architecture', 'Maintainability',
      'Consistency', 'Project Structure', 'Tooling', 'Release Readiness',
    ]);
  });

  it('deducts for missing README', () => {
    const result = calculateHealth([file('src/index.ts')]);
    const docs = result.categories.find((c) => c.name === 'Documentation');
    expect(docs!.deductions.some((d) => d.includes('README'))).toBe(true);
  });

  it('awards high documentation score with README and docs dir', () => {
    const result = calculateHealth([
      file('README.md'),
      file('docs/guide.md'),
      file('CHANGELOG.md'),
    ]);
    const docs = result.categories.find((c) => c.name === 'Documentation');
    expect(docs!.score).toBeGreaterThan(50);
  });

  it('detects test files in testing score', () => {
    const result = calculateHealth([file('src/app.test.ts'), file('src/utils.spec.ts')]);
    const testing = result.categories.find((c) => c.name === 'Testing');
    expect(testing!.score).toBeGreaterThan(0);
    expect(testing!.deductions).toHaveLength(0);
  });

  it('penalizes deep nesting in architecture score', () => {
    const files = [
      file('a/b/c/d/e/f/g/h/deep.ts'),
    ];
    const result = calculateHealth(files);
    const arch = result.categories.find((c) => c.name === 'Architecture');
    expect(arch!.score).toBeLessThan(100);
    expect(arch!.deductions.some((d) => d.includes('nesting'))).toBe(true);
  });

  it('penalizes flat structure with many root files', () => {
    const files = Array.from({ length: 10 }, (_, i) => file(`file${i}.ts`));
    const result = calculateHealth(files);
    const arch = result.categories.find((c) => c.name === 'Architecture');
    expect(arch!.deductions.some((d) => d.includes('flat'))).toBe(true);
  });

  it('penalizes missing .gitignore', () => {
    const result = calculateHealth([file('src/index.ts')]);
    const structure = result.categories.find((c) => c.name === 'Project Structure');
    expect(structure!.deductions.some((d) => d.includes('.gitignore'))).toBe(true);
  });

  it('calculates overall score between 0-100', () => {
    const result = calculateHealth([file('src/index.ts')]);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it('detects linter configuration', () => {
    const result = calculateHealth([file('.eslintrc.json')]);
    const consistency = result.categories.find((c) => c.name === 'Consistency');
    expect(consistency!.deductions.length).toBeLessThan(2);
  });
});
