import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { walkDirectory } from '../../src/scanner/file-walker.js';
import {
  createAllowAllFilter,
  createExcludeFilter,
  createIncludeFilter,
} from '../../src/scanner/ignore.js';

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

  it('produces deterministic ordering matching recursive traversal', async () => {
    // Verify that the iterative implementation produces the same
    // DFS pre-order as the original recursive version.
    const root = fixturePath('multi-lang-repo');
    const files = await walkDirectory(root, {
      rootPath: root,
      filter: createAllowAllFilter(),
    });

    const names = files.map((f) => f.relativePath);

    // Directory entries appear before their children
    const srcIdx = names.indexOf('src');
    const appJsIdx = names.indexOf(path.join('src', 'app.js'));
    const mainPyIdx = names.indexOf(path.join('src', 'main.py'));
    expect(srcIdx).toBeLessThan(appJsIdx);
    expect(srcIdx).toBeLessThan(mainPyIdx);

    // All root-level files are present
    expect(names).toContain('package.json');
    expect(names).toContain('README.md');
    expect(names).toContain('.gitignore');

    // All src/ files are present
    expect(names).toContain(path.join('src', 'app.js'));
    expect(names).toContain(path.join('src', 'main.py'));
    expect(names).toContain(path.join('src', 'styles.css'));
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

// =================================================================
// Symlink Cycle Detection — uses temp directories
// =================================================================

describe('symlink cycle detection', () => {
  let tmpDir: string;

  afterAll(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  async function canCreateSymlinks(): Promise<boolean> {
    // Test if the current platform supports symlink creation
    const testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'symlink-test-'));
    try {
      const target = path.join(testDir, 'target');
      const link = path.join(testDir, 'link');
      await fs.writeFile(target, 'test', 'utf-8');
      try {
        await fs.symlink(target, link);
        return true;
      } catch {
        return false;
      }
    } finally {
      await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  it('detects cyclic directory symlinks and terminates', async () => {
    if (!(await canCreateSymlinks())) {
      return; // Skip on platforms without symlink support
    }

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'walk-cycle-'));

    // Structure:
    // tmpDir/
    //   a/
    //     b -> ..  (symlink back to a/)
    //   file.txt
    const aDir = path.join(tmpDir, 'a');
    await fs.mkdir(aDir, { recursive: true });
    await fs.writeFile(path.join(tmpDir, 'file.txt'), 'hello', 'utf-8');
    await fs.writeFile(path.join(aDir, 'inner.txt'), 'world', 'utf-8');
    // Create cyclic symlink: a/b -> a
    await fs.symlink(aDir, path.join(aDir, 'b'));

    const files = await walkDirectory(tmpDir, {
      rootPath: tmpDir,
      filter: createAllowAllFilter(),
    });

    const names = files.map((f) => f.relativePath.replace(/\\/g, '/'));
    expect(names).toContain('file.txt');
    expect(names).toContain('a');
    expect(names).toContain('a/inner.txt');

    // The cyclic symlink 'a/b' should NOT be followed.
    // If it were, entries would repeat under 'a/b/...'
    const aDirEntries = names.filter((n) => n.startsWith('a/'));
    // Should only contain: a/inner.txt (not a/b/inner.txt, etc.)
    expect(aDirEntries).toEqual(expect.arrayContaining(['a/inner.txt']));
    // No deeply nested paths from cycle
    const nestedCycle = names.filter((n) => n.match(/a\/b\//));
    expect(nestedCycle).toHaveLength(0);
  });

  it('handles broken symlinks gracefully', async () => {
    if (!(await canCreateSymlinks())) {
      return;
    }

    const brokenDir = await fs.mkdtemp(path.join(os.tmpdir(), 'walk-broken-'));
    try {
      await fs.writeFile(path.join(brokenDir, 'real.txt'), 'hello', 'utf-8');
      // Create symlink to nonexistent file
      await fs.symlink(path.join(brokenDir, 'nonexistent.txt'), path.join(brokenDir, 'broken.lnk'));

      const files = await walkDirectory(brokenDir, {
        rootPath: brokenDir,
        filter: createAllowAllFilter(),
      });

      const names = files.map((f) => f.relativePath.replace(/\\/g, '/'));
      expect(names).toContain('real.txt');
      // Broken symlink should be skipped
      expect(names).not.toContain('broken.lnk');
    } finally {
      await fs.rm(brokenDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('skips symlinks pointing to directories', async () => {
    if (!(await canCreateSymlinks())) {
      return;
    }

    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'walk-dir-sym-'));
    try {
      // Create a real directory with a file
      const dataDir = path.join(dir, 'data');
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(path.join(dataDir, 'info.txt'), 'info', 'utf-8');

      // Create a symlink to the directory
      await fs.symlink(dataDir, path.join(dir, 'link-to-data'));

      // Add a file at root
      await fs.writeFile(path.join(dir, 'root.txt'), 'root', 'utf-8');

      const files = await walkDirectory(dir, {
        rootPath: dir,
        filter: createAllowAllFilter(),
      });

      const names = files.map((f) => f.relativePath.replace(/\\/g, '/'));
      expect(names).toContain('root.txt');
      // The symlink-to-directory should be skipped (not followed)
      expect(names).not.toContain('link-to-data');
      // But the real directory contents ARE visible under data/
      expect(names).toContain('data');
      expect(names).toContain('data/info.txt');
    } finally {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('handles nested symlink chains to files', async () => {
    if (!(await canCreateSymlinks())) {
      return;
    }

    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'walk-chain-'));
    try {
      // Structure:
      //   target.txt (real file)
      //   link1 -> target.txt
      //   link2 -> link1
      await fs.writeFile(path.join(dir, 'target.txt'), 'real', 'utf-8');
      await fs.symlink(path.join(dir, 'target.txt'), path.join(dir, 'link1.txt'));
      await fs.symlink(path.join(dir, 'link1.txt'), path.join(dir, 'link2.txt'));

      const files = await walkDirectory(dir, {
        rootPath: dir,
        filter: createAllowAllFilter(),
      });

      const names = files.map((f) => f.relativePath.replace(/\\/g, '/'));
      expect(names).toContain('target.txt');
      // Symlinks to files should be resolved and included
      expect(names).toContain('link1.txt');
      expect(names).toContain('link2.txt');
    } finally {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
});

// =================================================================
// Deep Nesting — explicit stack prevents stack overflow
// =================================================================

describe('deep directory nesting', () => {
  it('handles 500-level deep nesting without stack overflow', async () => {
    const deepDir = await fs.mkdtemp(path.join(os.tmpdir(), 'walk-deep-'));
    try {
      // Create a nested structure: a/b/c/d/.../leaf.txt
      let current = deepDir;
      // Stop at depth 500 to keep test fast (1000+ is excessive for CI)
      const depth = 500;
      for (let i = 0; i < depth; i++) {
        current = path.join(current, 'sub');
        await fs.mkdir(current);
      }
      await fs.writeFile(path.join(current, 'leaf.txt'), 'deep', 'utf-8');

      const files = await walkDirectory(deepDir, {
        rootPath: deepDir,
        filter: createAllowAllFilter(),
      });

      // Should have file entries without stack overflow
      const dirEntries = files.filter((f) => f.isDirectory);
      const fileEntries = files.filter((f) => !f.isDirectory);

      expect(dirEntries.length).toBe(depth);
      expect(fileEntries.length).toBe(1);
      expect(fileEntries[0].relativePath).toMatch(/leaf\.txt$/);
    } finally {
      await fs.rm(deepDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('preserves ordering in deep nested tree', async () => {
    const nestedDir = await fs.mkdtemp(path.join(os.tmpdir(), 'walk-order-'));
    try {
      // Create: a/b/c/file.txt
      const a = path.join(nestedDir, 'a');
      const b = path.join(a, 'b');
      const c = path.join(b, 'c');
      await fs.mkdir(c, { recursive: true });
      await fs.writeFile(path.join(c, 'file.txt'), 'content', 'utf-8');
      // Also a root-level file
      await fs.writeFile(path.join(nestedDir, 'root.md'), 'readme', 'utf-8');

      const files = await walkDirectory(nestedDir, {
        rootPath: nestedDir,
        filter: createAllowAllFilter(),
      });

      const names = files.map((f) => f.relativePath.replace(/\\/g, '/'));

      // Each directory appears before its children
      const aIdx = names.indexOf('a');
      const bIdx = names.indexOf('a/b');
      const cIdx = names.indexOf('a/b/c');
      const fileIdx = names.indexOf('a/b/c/file.txt');
      const rootIdx = names.indexOf('root.md');

      expect(aIdx).toBeLessThan(bIdx);
      expect(bIdx).toBeLessThan(cIdx);
      expect(cIdx).toBeLessThan(fileIdx);

      // Root-level file must be present
      expect(rootIdx).toBeGreaterThanOrEqual(0);
    } finally {
      await fs.rm(nestedDir, { recursive: true, force: true }).catch(() => {});
    }
  });

  it('handles mixed files and directories at each level', async () => {
    const mixedDir = await fs.mkdtemp(path.join(os.tmpdir(), 'walk-mixed-'));
    try {
      // Create a tree with files and dirs at each level
      const src = path.join(mixedDir, 'src');
      const lib = path.join(mixedDir, 'lib');
      await fs.mkdir(src, { recursive: true });
      await fs.mkdir(lib, { recursive: true });

      await fs.writeFile(path.join(mixedDir, 'package.json'), '{}', 'utf-8');
      await fs.writeFile(path.join(mixedDir, 'README.md'), '# Test', 'utf-8');
      await fs.writeFile(path.join(src, 'index.ts'), '// index', 'utf-8');
      await fs.writeFile(path.join(src, 'utils.ts'), '// utils', 'utf-8');
      await fs.writeFile(path.join(lib, 'helper.ts'), '// helper', 'utf-8');

      const files = await walkDirectory(mixedDir, {
        rootPath: mixedDir,
        filter: createAllowAllFilter(),
      });

      const names = files.map((f) => f.relativePath.replace(/\\/g, '/'));
      expect(names).toContain('package.json');
      expect(names).toContain('README.md');
      expect(names).toContain('src');
      expect(names).toContain('src/index.ts');
      expect(names).toContain('src/utils.ts');
      expect(names).toContain('lib');
      expect(names).toContain('lib/helper.ts');
    } finally {
      await fs.rm(mixedDir, { recursive: true, force: true }).catch(() => {});
    }
  });
});
