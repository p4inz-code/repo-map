import { describe, it, expect } from 'vitest';
import { walkDirectory } from '../../src/scanner/file-walker.js';
import {
  createAllowAllFilter,
  createExcludeFilter,
  createIncludeFilter,
} from '../../src/scanner/ignore.js';
import path from 'node:path';

function fixturePath(name: string): string {
  return path.resolve('tests/fixtures', name);
}

describe('walkDirectory', () => {
  it('returns all files from a simple repository', async () => {
    const root = fixturePath('simple-repo');
    const files = await walkDirectory(root, {
      rootPath: root,
      filter: createAllowAllFilter(),
    });

    const names = files.map((f) => f.relativePath);
    expect(names).toContain('index.ts');
    expect(names).toContain('package.json');
    expect(names).toContain(path.join('src', 'app.ts'));
  });

  it('excludes files matching exclude filter', async () => {
    const root = fixturePath('simple-repo');
    const filter = createExcludeFilter(['*.ts']);
    const files = await walkDirectory(root, {
      rootPath: root,
      filter,
    });

    const names = files.map((f) => f.relativePath);
    expect(names).not.toContain('index.ts');
    expect(names).not.toContain(path.join('src', 'app.ts'));
    expect(names).toContain('package.json');
  });

  it('only includes files matching include filter', async () => {
    const root = fixturePath('simple-repo');
    const filter = createIncludeFilter(['*.json']);
    const files = await walkDirectory(root, {
      rootPath: root,
      filter,
    });

    const names = files.map((f) => f.relativePath);
    expect(names).toContain('package.json');
    expect(names).not.toContain('index.ts');
  });

  it('combines exclude and include filters', async () => {
    const root = fixturePath('simple-repo');
    const excludeFilter = createExcludeFilter(['*.json']);
    const includeFilter = createIncludeFilter(['**']);
    const combined = (path: string) => excludeFilter(path) && includeFilter(path);

    const files = await walkDirectory(root, {
      rootPath: root,
      filter: combined,
    });

    const names = files.map((f) => f.relativePath);
    expect(names).toContain('index.ts');
    expect(names).toContain(path.join('src', 'app.ts'));
    expect(names).not.toContain('package.json');
  });

  it('includes directory entries in the result', async () => {
    const root = fixturePath('simple-repo');
    const files = await walkDirectory(root, {
      rootPath: root,
      filter: createAllowAllFilter(),
    });

    const directories = files.filter((f) => f.isDirectory);
    const dirNames = directories.map((f) => f.relativePath);
    expect(dirNames).toContain('src');
  });

  it('respects maxDepth of 0 (root only)', async () => {
    const root = fixturePath('multi-lang-repo');
    const files = await walkDirectory(root, {
      rootPath: root,
      filter: createAllowAllFilter(),
      maxDepth: 0,
    });

    // Depth 0 includes root-level files and directory entries,
    // but NOT files inside subdirectories
    const names = files.map((f) => f.relativePath);
    expect(names).toContain('package.json');
    expect(names).toContain('README.md');
    expect(names).toContain('src');
    expect(names).not.toContain(path.join('src', 'main.py'));
  });

  it('respects maxDepth of 1 (root and one level deeper)', async () => {
    const root = fixturePath('multi-lang-repo');
    const files = await walkDirectory(root, {
      rootPath: root,
      filter: createAllowAllFilter(),
      maxDepth: 1,
    });

    // Depth 1 includes root-level entries AND files inside subdirectories
    const names = files.map((f) => f.relativePath);
    expect(names).toContain('package.json');
    expect(names).toContain('README.md');
    expect(names).toContain('src');
    expect(names).toContain(path.join('src', 'main.py'));
    expect(names).toContain(path.join('src', 'app.js'));
    expect(names).toContain(path.join('src', 'styles.css'));
  });

  it('returns empty array for empty directory', async () => {
    const root = fixturePath('empty-repo');
    const files = await walkDirectory(root, { rootPath: root });
    expect(files).toEqual([]);
  });

  it('applies filter to exclude files', async () => {
    const root = fixturePath('simple-repo');
    // Create a filter that rejects everything
    const rejectAll = () => false;
    const files = await walkDirectory(root, {
      rootPath: root,
      filter: rejectAll,
    });

    expect(files).toEqual([]);
  });

  it('sets isDirectory correctly for directories and files', async () => {
    const root = fixturePath('simple-repo');
    const files = await walkDirectory(root, {
      rootPath: root,
      filter: createAllowAllFilter(),
    });

    for (const f of files) {
      if (f.relativePath === 'src') {
        expect(f.isDirectory).toBe(true);
        expect(f.size).toBe(0);
      }
      if (f.relativePath === 'index.ts') {
        expect(f.isDirectory).toBe(false);
        expect(f.size).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
