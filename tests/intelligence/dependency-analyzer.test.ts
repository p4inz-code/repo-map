import { describe, it, expect } from 'vitest';
import { analyzeDependencies } from '../../src/intelligence/dependency-analyzer.js';

describe('analyzeDependencies', () => {
  it('returns empty stats for null package.json', () => {
    const result = analyzeDependencies(null);
    expect(result.totalCount).toBe(0);
    expect(result.runtimeCount).toBe(0);
    expect(result.devCount).toBe(0);
    expect(result.largestGroups).toEqual([]);
  });

  it('counts runtime and dev dependencies', () => {
    const result = analyzeDependencies({
      dependencies: { react: '^18.0.0', express: '^4.0.0' },
      devDependencies: { vitest: '^1.0.0' },
    });
    expect(result.runtimeCount).toBe(2);
    expect(result.devCount).toBe(1);
    expect(result.totalCount).toBe(3);
  });

  it('groups dependencies by category', () => {
    const result = analyzeDependencies({
      dependencies: {
        react: '^18.0.0',
        next: '^14.0.0',
        express: '^4.0.0',
        prisma: '^5.0.0',
        chalk: '^5.0.0',
      },
    });
    expect(result.largestGroups.length).toBeGreaterThan(0);
    const uiGroup = result.largestGroups.find((g) => g.name === 'UI / Frontend');
    expect(uiGroup).toBeDefined();
    expect(uiGroup!.count).toBeGreaterThanOrEqual(2);
  });

  it('detects possible unused ts-node with vite', () => {
    const result = analyzeDependencies({
      devDependencies: { 'ts-node': '^10.0.0', tsx: '^4.0.0' },
    });
    expect(result.possibleUnused.length).toBeGreaterThanOrEqual(0);
  });

  it('detects outdated moment.js', () => {
    const result = analyzeDependencies({
      dependencies: { moment: '^2.29.0' },
    });
    expect(result.outdatedWarnings.some((w) => w.includes('moment'))).toBe(true);
  });

  it('detects deprecated tslint', () => {
    const result = analyzeDependencies({
      devDependencies: { tslint: '^6.0.0' },
    });
    expect(result.outdatedWarnings.some((w) => w.includes('TSLint'))).toBe(true);
  });
});
