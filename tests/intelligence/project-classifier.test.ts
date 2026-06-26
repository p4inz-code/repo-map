import { describe, it, expect } from 'vitest';
import { classifyProject } from '../../src/intelligence/project-classifier.js';
import type { FileEntry, Technology } from '../../src/types.js';

function file(relativePath: string): FileEntry {
  return { path: `/repo/${relativePath}`, relativePath, size: 100, isDirectory: false };
}

describe('classifyProject', () => {
  it('classifies CLI Tools from bin entry', () => {
    const result = classifyProject([file('src/index.ts')], [], true, true, false);
    expect(result.category).toBe('CLI Tool');
    expect(result.confidence).toBeGreaterThanOrEqual(60);
    expect(result.evidence.some((e) => e.includes('bin entry'))).toBe(true);
  });

  it('classifies Web Application from frameworks', () => {
    const technologies: Technology[] = [
      { name: 'Next.js', category: 'framework', evidence: 'package.json' },
    ];
    const result = classifyProject([file('pages/index.tsx')], technologies, false, false, false);
    expect(result.category).toBe('Web Application');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('classifies Backend API from backend frameworks', () => {
    const technologies: Technology[] = [
      { name: 'Express', category: 'framework', evidence: 'package.json' },
    ];
    const result = classifyProject([file('src/server.ts')], technologies, false, false, false);
    expect(result.category).toBe('Backend API');
    expect(result.evidence.some((e) => e.includes('Express'))).toBe(true);
  });

  it('classifies Desktop App from Electron', () => {
    const technologies: Technology[] = [
      { name: 'Electron', category: 'framework', evidence: 'package.json' },
    ];
    const result = classifyProject([file('src/main.ts')], technologies, false, false, false);
    expect(result.category).toBe('Desktop App');
    expect(result.confidence).toBeGreaterThan(50);
  });

  it('classifies Documentation when mostly markdown files', () => {
    const files = [
      file('README.md'),
      file('docs/guide.md'),
      file('docs/api.md'),
      file('CHANGELOG.md'),
    ];
    const result = classifyProject(files, [], false, false, false);
    expect(result.category).toBe('Documentation');
  });

  it('classifies Monorepo from workspaces', () => {
    const result = classifyProject([file('packages/pkg1/index.ts')], [], true, false, true);
    expect(result.category).toBe('Monorepo');
  });

  it('classifies Unknown for empty repo', () => {
    const result = classifyProject([], [], false, false, false);
    expect(result.category).toBe('Unknown');
  });

  it('returns evidence for classification', () => {
    const result = classifyProject([file('src/index.ts')], [], false, false, false);
    expect(result.evidence.length).toBeGreaterThanOrEqual(0);
    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it('classifies Library for package with main entry and no bin', () => {
    const technologies: Technology[] = [
      { name: 'npm', category: 'tool', evidence: 'package-lock.json' },
    ];
    const result = classifyProject([file('src/index.ts')], technologies, true, false, false);
    expect(result.category).toBe('Library');
  });

  it('classifies Configuration Repository when all files are config', () => {
    const files = [
      file('config/default.yaml'),
      file('config/production.yaml'),
    ];
    const result = classifyProject(files, [], false, false, false);
    expect(result.category).toBe('Configuration Repository');
  });
});
