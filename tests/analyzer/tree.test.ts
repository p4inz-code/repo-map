import { describe, it, expect } from 'vitest';
import { generateTree } from '../../src/analyzer/tree.js';
import type { FileEntry } from '../../src/types.js';

function file(relativePath: string): FileEntry {
  return {
    path: `/repo/${relativePath}`,
    relativePath,
    size: 100,
    isDirectory: false,
  };
}

function dir(relativePath: string): FileEntry {
  return {
    path: `/repo/${relativePath}`,
    relativePath,
    size: 0,
    isDirectory: true,
  };
}

describe('generateTree', () => {
  it('returns empty string for empty input', () => {
    expect(generateTree([])).toBe('');
  });

  it('returns empty string for directory-only input without files', () => {
    expect(generateTree([dir('empty-dir')])).toBe('');
  });

  it('renders a single root file without box-drawing', () => {
    const result = generateTree([file('README.md')]);
    expect(result).toBe('README.md\n');
  });

  it('renders root files without box-drawing prefixes', () => {
    const result = generateTree([file('README.md'), file('package.json')]);
    const lines = result.trim().split('\n');
    expect(lines).toContain('README.md');
    expect(lines).toContain('package.json');
    expect(lines[0]).not.toMatch(/^[├└]/);
  });

  it('renders files and directories at root level', () => {
    const result = generateTree([
      file('README.md'),
      file('src/index.ts'),
      file('package.json'),
    ]);
    // src/ appears first (directory), then files sorted alphabetically
    expect(result).toMatch(/^src\//);
    expect(result).toContain('package.json');
    expect(result).toContain('README.md');
    expect(result).toContain('└── index.ts');
  });

  it('renders nested files with box-drawing inside directories', () => {
    const result = generateTree([
      file('src/index.ts'),
      file('src/cli.ts'),
    ]);
    expect(result).toContain('src/');
    expect(result).toContain('├── cli.ts');
    expect(result).toContain('└── index.ts');
  });

  it('uses └── for the last child and ├── for others inside dirs', () => {
    // a.txt and b.txt must be inside a directory for connectors
    const result = generateTree([
      file('dir/a.txt'),
      file('dir/b.txt'),
    ]);
    expect(result).toContain('├── a.txt');
    expect(result).toContain('└── b.txt');
  });

  it('renders deeply nested directories', () => {
    const result = generateTree([
      file('src/a/deep/file.ts'),
    ]);
    // a/ is a direct child of src/, so it uses └── at root-child level
    expect(result).toContain('src/');
    expect(result).toContain('└── a/');
    expect(result).toContain('    └── deep/');
    expect(result).toContain('        └── file.ts');
  });

  it('sorts files alphabetically within the same directory', () => {
    const result = generateTree([
      file('src/zebra.ts'),
      file('src/alpha.ts'),
      file('src/beta.ts'),
    ]);
    const lines = result.trim().split('\n');
    // First child: alpha.ts, last child: zebra.ts (last gets └──)
    expect(lines[1]).toMatch(/alpha/);
    expect(lines[2]).toMatch(/beta/);
    expect(lines[3]).toMatch(/zebra/);
    expect(lines[1]).toContain('├──');
    expect(lines[3]).toContain('└──');
  });

  it('handles directories with trailing content', () => {
    const result = generateTree([
      file('.gitignore'),
      file('src/app.ts'),
      file('tests/test.test.ts'),
    ]);
    expect(result).toContain('.gitignore');
    expect(result).toContain('src/');
    expect(result).toContain('tests/');
    expect(result).toContain('└── app.ts');
    expect(result).toContain('└── test.test.ts');
  });

  it('renders a complex tree structure correctly', () => {
    const result = generateTree([
      file('README.md'),
      file('src/index.ts'),
      file('src/cli.ts'),
      file('src/utils/helper.ts'),
      file('tests/test.test.ts'),
      file('package.json'),
    ]);

    const normalized = result.trim();
    expect(normalized).toContain('src/');
    expect(normalized).toContain('tests/');
    expect(normalized).toContain('README.md');
    expect(normalized).toContain('package.json');
    expect(normalized).toContain('utils/');
    expect(normalized).toContain('helper.ts');
  });

  it('normalizes backslashes to forward slashes', () => {
    const result = generateTree([
      file('src\\index.ts'),
      file('src\\cli.ts'),
    ]);
    expect(result).toContain('src/');
    expect(result).toContain('cli.ts');
    expect(result).toContain('index.ts');
  });

  it('does not duplicate directory entries', () => {
    const result = generateTree([
      file('src/index.ts'),
      file('src/cli.ts'),
    ]);
    // src/ should appear exactly once
    const matches = result.match(/src\//g);
    expect(matches).toHaveLength(1);
  });
});
