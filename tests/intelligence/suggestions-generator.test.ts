import { describe, it, expect } from 'vitest';
import { generateSuggestions } from '../../src/intelligence/suggestions-generator.js';
import type { BuildPipeline, DependencyAnalysis } from '../../src/types.js';

function emptyPipeline(): BuildPipeline {
  return {
    buildSystem: [], packageManager: [], bundler: [], compiler: [],
    testFramework: [], formatter: [], linter: [], ci: [],
    releaseAutomation: [], publishAutomation: [],
  };
}

function emptyDeps(): DependencyAnalysis {
  return {
    runtimeCount: 0, devCount: 0, totalCount: 0,
    largestGroups: [], possibleUnused: [], outdatedWarnings: [],
  };
}

describe('generateSuggestions', () => {
  const allFalse = {
    hasLicense: false, hasReadme: false, hasChangelog: false,
    hasContributing: false, hasIssueTemplates: false, hasCi: false,
    hasTests: false, hasLint: false, hasFormatter: false,
    hasReleaseWorkflow: false, hasLockFile: false, hasGitignore: false,
  };

  it('suggests adding CI when missing', () => {
    const result = generateSuggestions(
      [], [], emptyPipeline(), emptyDeps(), ...Object.values(allFalse),
    );
    expect(result.some((s) => s.title === 'Add CI/CD Pipeline')).toBe(true);
    expect(result.some((s) => s.title === 'Add a License')).toBe(true);
  });

  it('does not suggest CI when it exists', () => {
    const result = generateSuggestions(
      [], [], emptyPipeline(), emptyDeps(),
      false, false, false, false, false, true, false, false, false,
      false, false, false,
    );
    expect(result.some((s) => s.title === 'Add CI/CD Pipeline')).toBe(false);
  });

  it('suggests adding a license when missing', () => {
    const result = generateSuggestions(
      [], [], emptyPipeline(), emptyDeps(), ...Object.values(allFalse),
    );
    expect(result.some((s) => s.title === 'Add a License')).toBe(true);
  });

  it('suggests adding tests when missing', () => {
    const files = [
      { path: '/repo/src/index.ts', relativePath: 'src/index.ts', size: 100, isDirectory: false },
      { path: '/repo/src/app.ts', relativePath: 'src/app.ts', size: 100, isDirectory: false },
      { path: '/repo/src/utils.ts', relativePath: 'src/utils.ts', size: 100, isDirectory: false },
      { path: '/repo/README.md', relativePath: 'README.md', size: 100, isDirectory: false },
    ];
    const result = generateSuggestions(
      files, [], emptyPipeline(), emptyDeps(), ...Object.values(allFalse),
    );
    expect(result.some((s) => s.title === 'Add Tests')).toBe(true);
  });

  it('suggests adding a lock file when package.json exists', () => {
    const files = [{ path: '/repo/package.json', relativePath: 'package.json', size: 100, isDirectory: false }];
    const result = generateSuggestions(
      files, [], emptyPipeline(), emptyDeps(), ...Object.values(allFalse),
    );
    expect(result.some((s) => s.title === 'Commit Lock File')).toBe(true);
  });

  it('sorts by priority (high first)', () => {
    const result = generateSuggestions(
      [{ path: '/repo/src/index.ts', relativePath: 'src/index.ts', size: 100, isDirectory: false }],
      [], emptyPipeline(), emptyDeps(), ...Object.values(allFalse),
    );
    if (result.length >= 2) {
      expect(result[0].priority).toBe('high');
    }
  });

  it('returns at most 12 suggestions', () => {
    const result = generateSuggestions(
      [{ path: '/repo/src/index.ts', relativePath: 'src/index.ts', size: 100, isDirectory: false }],
      [], emptyPipeline(), emptyDeps(), ...Object.values(allFalse),
    );
    expect(result.length).toBeLessThanOrEqual(12);
  });

  it('suggests adding a README when missing', () => {
    const files = [{ path: '/repo/src/index.ts', relativePath: 'src/index.ts', size: 100, isDirectory: false }];
    const result = generateSuggestions(
      files, [], emptyPipeline(), emptyDeps(),
      false, false, false, false, false, false, false, false, false,
      false, false, false,
    );
    expect(result.some((s) => s.title === 'Create a README')).toBe(true);
  });
});
