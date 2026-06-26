import { describe, it, expect } from 'vitest';
import { analyzeModules } from '../../src/architecture/module-analysis.js';
import type { FileEntry } from '../../src/types.js';

function file(relativePath: string, size = 100): FileEntry {
  return { path: `/repo/${relativePath}`, relativePath, size, isDirectory: false };
}

function dir(relativePath: string): FileEntry {
  return { path: `/repo/${relativePath}`, relativePath, size: 0, isDirectory: true };
}

describe('analyzeModules', () => {
  it('finds largest files sorted by size', () => {
    const files = [
      file('src/app.ts', 1000),
      file('src/index.ts', 500),
      file('src/utils.ts', 200),
    ];
    const result = analyzeModules(files);
    expect(result.largestFiles[0].path).toBe('src/app.ts');
    expect(result.largestFiles[0].size).toBe(1000);
  });

  it('finds largest folders by file count', () => {
    const files = [
      file('src/a.ts'), file('src/b.ts'), file('src/c.ts'),
      file('lib/x.ts'),
      file('index.ts'),
      dir('src'), dir('lib'),
    ];
    const result = analyzeModules(files);
    const srcFolder = result.largestFolders.find((f) => f.path === 'src');
    expect(srcFolder).toBeDefined();
    expect(srcFolder!.fileCount).toBe(3);
  });

  it('warns when file exceeds 50KB', () => {
    const files = [file('src/huge.ts', 60000)];
    const result = analyzeModules(files);
    expect(result.warnings.some((w) => w.includes('huge.ts'))).toBe(true);
  });

  it('warns when directory exceeds 30 files', () => {
    const files = Array.from({ length: 35 }, (_, i) => file(`src/file${i}.ts`, 100));
    files.push(dir('src'));
    const result = analyzeModules(files);
    expect(result.warnings.some((w) => w.includes('src'))).toBe(true);
  });

  it('handles empty input', () => {
    const result = analyzeModules([]);
    expect(result.largestFiles).toEqual([]);
    expect(result.largestFolders).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
