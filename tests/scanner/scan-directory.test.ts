import { describe, it, expect } from 'vitest';
import { scanDirectory } from '../../src/scanner/index.js';
import path from 'node:path';

function fixturePath(name: string): string {
  return path.resolve('tests/fixtures', name);
}

describe('scanDirectory with --include', () => {
  it('includes files matching a glob pattern in subdirectories', async () => {
    const result = await scanDirectory({
      rootPath: fixturePath('simple-repo'),
      useGitignore: false,
      includePatterns: ['*.ts'],
    });

    const filePaths = result.files
      .filter((f) => !f.isDirectory)
      .map((f) => f.relativePath);

    // Should find .ts files in subdirectories
    expect(filePaths).toContain('index.ts');
    expect(filePaths).toContain(path.join('src', 'app.ts'));
    // Should exclude non-matching files
    expect(filePaths).not.toContain('package.json');
  });

  it('includes files matching multiple include patterns', async () => {
    const result = await scanDirectory({
      rootPath: fixturePath('multi-lang-repo'),
      useGitignore: false,
      includePatterns: ['*.py', '*.json'],
    });

    const filePaths = result.files
      .filter((f) => !f.isDirectory)
      .map((f) => f.relativePath);

    expect(filePaths).toContain(path.join('src', 'main.py'));
    expect(filePaths).toContain('package.json');
    // Should exclude non-matching files
    expect(filePaths).not.toContain(path.join('src', 'app.js'));
    expect(filePaths).not.toContain(path.join('src', 'styles.css'));
    expect(filePaths).not.toContain('README.md');
  });

  it('includes files matching exact path patterns', async () => {
    const result = await scanDirectory({
      rootPath: fixturePath('multi-lang-repo'),
      useGitignore: false,
      includePatterns: ['src/main.py'],
    });

    const filePaths = result.files
      .filter((f) => !f.isDirectory)
      .map((f) => f.relativePath);

    expect(filePaths).toContain(path.join('src', 'main.py'));
    expect(filePaths).not.toContain(path.join('src', 'app.js'));
    expect(filePaths).not.toContain('package.json');
  });

  it('prunes directories that contain no matching files', async () => {
    const result = await scanDirectory({
      rootPath: fixturePath('multi-lang-repo'),
      useGitignore: false,
      includePatterns: ['*.py'],
    });

    // Only .py files should be kept
    const filePaths = result.files
      .filter((f) => !f.isDirectory)
      .map((f) => f.relativePath);
    expect(filePaths).toEqual([path.join('src', 'main.py')]);

    // src/ directory should still appear (it contains the matching file)
    const dirs = result.files
      .filter((f) => f.isDirectory)
      .map((f) => f.relativePath);
    expect(dirs).toContain('src');

    // Stats should reflect only matching files
    expect(result.stats.totalFiles).toBe(1);
    expect(result.stats.totalDirectories).toBe(1);
  });

  it('returns empty result when no files match', async () => {
    const result = await scanDirectory({
      rootPath: fixturePath('simple-repo'),
      useGitignore: false,
      includePatterns: ['*.xyz'],
    });

    const filePaths = result.files.filter((f) => !f.isDirectory);
    expect(filePaths).toHaveLength(0);

    // All directories should be pruned
    const dirs = result.files.filter((f) => f.isDirectory);
    expect(dirs).toHaveLength(0);

    expect(result.stats.totalFiles).toBe(0);
    expect(result.stats.totalDirectories).toBe(0);
  });

  it('allows all files when no include patterns given', async () => {
    const result = await scanDirectory({
      rootPath: fixturePath('simple-repo'),
      useGitignore: false,
    });

    const filePaths = result.files
      .filter((f) => !f.isDirectory)
      .map((f) => f.relativePath);

    expect(filePaths).toContain('index.ts');
    expect(filePaths).toContain('package.json');
    expect(filePaths).toContain(path.join('src', 'app.ts'));
  });

  it('allows all files with empty include patterns', async () => {
    const result = await scanDirectory({
      rootPath: fixturePath('simple-repo'),
      useGitignore: false,
      includePatterns: [],
    });

    const filePaths = result.files
      .filter((f) => !f.isDirectory)
      .map((f) => f.relativePath);

    expect(filePaths.length).toBeGreaterThan(0);
    expect(filePaths).toContain('index.ts');
    expect(filePaths).toContain('package.json');
  });

  it('interacts correctly with --exclude', async () => {
    const result = await scanDirectory({
      rootPath: fixturePath('multi-lang-repo'),
      useGitignore: false,
      includePatterns: ['*.js'],           // Only include .js files
      excludePatterns: ['src/styles.css'],  // Exclude a specific file (but it's not .js anyway)
    });

    const filePaths = result.files
      .filter((f) => !f.isDirectory)
      .map((f) => f.relativePath);

    // include selects .js files only
    expect(filePaths).toContain(path.join('src', 'app.js'));
    expect(filePaths).not.toContain(path.join('src', 'main.py'));
    expect(filePaths).not.toContain(path.join('src', 'styles.css'));
  });

  it('interacts correctly with .gitignore', async () => {
    // simple-repo has a .gitignore with node_modules/
    const result = await scanDirectory({
      rootPath: fixturePath('simple-repo'),
      useGitignore: true,
      includePatterns: ['*.ts'],
    });

    const filePaths = result.files
      .filter((f) => !f.isDirectory)
      .map((f) => f.relativePath);

    // Should only include .ts files that aren't gitignored
    expect(filePaths).toContain('index.ts');
    expect(filePaths).toContain(path.join('src', 'app.ts'));
    expect(filePaths).not.toContain('package.json');
  });

  it('preserves directory tree structure with nested matches', async () => {
    // multi-lang-repo has: src/app.js, src/main.py, src/styles.css
    // Include *.py — only main.py should match
    const result = await scanDirectory({
      rootPath: fixturePath('multi-lang-repo'),
      useGitignore: false,
      includePatterns: ['*.py'],
    });

    // Verify the directory tree is preserved
    const filePaths = result.files
      .filter((f) => !f.isDirectory)
      .map((f) => f.relativePath);

    expect(filePaths).toHaveLength(1);
    expect(filePaths[0]).toBe(path.join('src', 'main.py'));

    // src/ should be the only directory kept
    const dirs = result.files
      .filter((f) => f.isDirectory)
      .map((f) => f.relativePath);
    expect(dirs).toEqual(['src']);
  });

  it('handles patterns with ** globstar', async () => {
    const result = await scanDirectory({
      rootPath: fixturePath('multi-lang-repo'),
      useGitignore: false,
      includePatterns: ['src/**/*.py'],
    });

    const filePaths = result.files
      .filter((f) => !f.isDirectory)
      .map((f) => f.relativePath);

    expect(filePaths).toContain(path.join('src', 'main.py'));
    expect(filePaths).not.toContain(path.join('src', 'app.js'));
  });
});
