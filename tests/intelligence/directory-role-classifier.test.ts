import { describe, it, expect } from 'vitest';
import { classifyDirectoryRoles } from '../../src/intelligence/directory-role-classifier.js';
import type { FileEntry } from '../../src/types.js';

function file(relativePath: string): FileEntry {
  return { path: `/repo/${relativePath}`, relativePath, size: 100, isDirectory: false };
}

function dir(relativePath: string): FileEntry {
  return { path: `/repo/${relativePath}`, relativePath, size: 0, isDirectory: true };
}

describe('classifyDirectoryRoles', () => {
  it('classifies src/ as Application Source', () => {
    const files = [file('src/index.ts'), dir('src')];
    const result = classifyDirectoryRoles(files);
    expect(result).toContainEqual(
      expect.objectContaining({ path: 'src', role: 'Application Source' }),
    );
  });

  it('classifies tests/ as Testing', () => {
    const files = [file('tests/index.test.ts'), dir('tests')];
    const result = classifyDirectoryRoles(files);
    expect(result).toContainEqual(
      expect.objectContaining({ path: 'tests', role: 'Testing' }),
    );
  });

  it('classifies docs/ as Documentation', () => {
    const files = [file('docs/guide.md'), dir('docs')];
    const result = classifyDirectoryRoles(files);
    expect(result).toContainEqual(
      expect.objectContaining({ path: 'docs', role: 'Documentation' }),
    );
  });

  it('classifies .github/ as CI/CD', () => {
    const files = [file('.github/workflows/ci.yml')];
    const result = classifyDirectoryRoles(files);
    expect(result).toContainEqual(
      expect.objectContaining({ path: '.github', role: 'CI/CD' }),
    );
  });

  it('classifies dist/ as Build Output', () => {
    const files = [file('dist/bundle.js'), dir('dist')];
    const result = classifyDirectoryRoles(files);
    expect(result).toContainEqual(
      expect.objectContaining({ path: 'dist', role: 'Build Output' }),
    );
  });

  it('classifies scripts/ as Automation', () => {
    const files = [file('scripts/build.sh'), dir('scripts')];
    const result = classifyDirectoryRoles(files);
    expect(result).toContainEqual(
      expect.objectContaining({ path: 'scripts', role: 'Automation' }),
    );
  });

  it('classifies public/ as Static Files', () => {
    const files = [file('public/index.html'), dir('public')];
    const result = classifyDirectoryRoles(files);
    expect(result).toContainEqual(
      expect.objectContaining({ path: 'public', role: 'Static Files' }),
    );
  });

  it('classifies assets/ as Resources', () => {
    const files = [file('assets/logo.png'), dir('assets')];
    const result = classifyDirectoryRoles(files);
    expect(result).toContainEqual(
      expect.objectContaining({ path: 'assets', role: 'Resources' }),
    );
  });

  it('classifies config/ as Configuration', () => {
    const files = [file('config/app.json'), dir('config')];
    const result = classifyDirectoryRoles(files);
    expect(result).toContainEqual(
      expect.objectContaining({ path: 'config', role: 'Configuration' }),
    );
  });

  it('classifies unknown dirs as Custom Source Module when they contain code', () => {
    const files = [file('mymodule/foo.ts'), dir('mymodule')];
    const result = classifyDirectoryRoles(files);
    expect(result).toContainEqual(
      expect.objectContaining({ path: 'mymodule', role: 'Custom Source Module' }),
    );
  });

  it('returns empty array for empty input', () => {
    const result = classifyDirectoryRoles([]);
    expect(result).toEqual([]);
  });
});
