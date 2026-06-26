import { describe, it, expect } from 'vitest';
import { analyzeBuildPipeline } from '../../src/intelligence/build-pipeline-analyzer.js';
import type { FileEntry, Technology } from '../../src/types.js';

function file(relativePath: string): FileEntry {
  return { path: `/repo/${relativePath}`, relativePath, size: 100, isDirectory: false };
}

describe('analyzeBuildPipeline', () => {
  it('detects npm package manager', () => {
    const technologies: Technology[] = [
      { name: 'npm', category: 'tool', evidence: 'package-lock.json' },
    ];
    const result = analyzeBuildPipeline([file('package-lock.json')], technologies, {}, {});
    expect(result.packageManager).toContain('npm');
  });

  it('detects Vite bundler', () => {
    const technologies: Technology[] = [
      { name: 'Vite', category: 'tool', evidence: 'vite.config.ts' },
    ];
    const result = analyzeBuildPipeline([file('vite.config.ts')], technologies, {}, {});
    expect(result.bundler).toContain('Vite');
  });

  it('detects TypeScript compiler from tsconfig', () => {
    const result = analyzeBuildPipeline([file('tsconfig.json')], [], {}, {});
    expect(result.compiler).toContain('TypeScript');
  });

  it('detects GitHub Actions CI', () => {
    const technologies: Technology[] = [
      { name: 'GitHub Actions', category: 'tool', evidence: '.github/workflows/ci.yml' },
    ];
    const result = analyzeBuildPipeline([file('.github/workflows/ci.yml')], technologies, {}, {});
    expect(result.ci).toContain('GitHub Actions');
  });

  it('detects ESLint linter', () => {
    const technologies: Technology[] = [
      { name: 'ESLint', category: 'tool', evidence: 'eslint.config.js' },
    ];
    const result = analyzeBuildPipeline([file('eslint.config.js')], technologies, {}, {});
    expect(result.linter).toContain('ESLint');
  });

  it('detects multiple tools simultaneously', () => {
    const technologies: Technology[] = [
      { name: 'Vite', category: 'tool', evidence: 'vite.config.ts' },
      { name: 'GitHub Actions', category: 'tool', evidence: '.github/workflows/ci.yml' },
      { name: 'ESLint', category: 'tool', evidence: 'eslint.config.js' },
    ];
    const files = [
      file('vite.config.ts'),
      file('.github/workflows/ci.yml'),
      file('eslint.config.js'),
    ];
    const result = analyzeBuildPipeline(files, technologies, {}, {});
    expect(result.bundler).toContain('Vite');
    expect(result.ci).toContain('GitHub Actions');
    expect(result.linter).toContain('ESLint');
  });

  it('does not detect anything for empty input', () => {
    const result = analyzeBuildPipeline([], [], {}, {});
    expect(result.buildSystem).toEqual([]);
    expect(result.packageManager).toEqual([]);
    expect(result.bundler).toEqual([]);
    expect(result.testFramework).toEqual([]);
    expect(result.ci).toEqual([]);
  });
});
