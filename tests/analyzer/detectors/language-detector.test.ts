import { describe, it, expect } from 'vitest';
import { detectLanguagesFromFiles } from '../../../src/analyzer/detectors/language-detector.js';
import type { FileEntry } from '../../../src/types.js';

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

describe('detectLanguagesFromFiles', () => {
  it('detects TypeScript from .ts files', () => {
    const files = [file('src/index.ts')];
    const result = detectLanguagesFromFiles(files);
    expect(result).toContainEqual(
      expect.objectContaining({
        name: 'TypeScript',
        category: 'language',
      }),
    );
  });

  it('detects multiple languages', () => {
    const files = [file('app.ts'), file('styles.css'), file('index.html')];
    const result = detectLanguagesFromFiles(files);
    const names = result.map((r) => r.name);
    expect(names).toContain('TypeScript');
    expect(names).toContain('CSS');
    expect(names).toContain('HTML');
  });

  it('sorts languages by frequency (most common first)', () => {
    const files = [
      file('a.ts'),
      file('b.ts'),
      file('c.ts'),
      file('d.py'),
      file('e.py'),
      file('f.js'),
    ];
    const result = detectLanguagesFromFiles(files);
    expect(result[0].name).toBe('TypeScript');
    expect(result[1].name).toBe('Python');
    expect(result[2].name).toBe('JavaScript');
  });

  it('detects Docker from Dockerfile filename', () => {
    const files = [file('Dockerfile')];
    const result = detectLanguagesFromFiles(files);
    expect(result).toContainEqual(
      expect.objectContaining({
        name: 'Docker',
        category: 'language',
      }),
    );
  });

  it('detects Make from Makefile', () => {
    const files = [file('Makefile')];
    const result = detectLanguagesFromFiles(files);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Make', category: 'language' }),
    );
  });

  it('skips directories', () => {
    const files = [dir('src')];
    const result = detectLanguagesFromFiles(files);
    expect(result).toEqual([]);
  });

  it('returns empty array for unknown extensions', () => {
    const files = [file('data.bin'), file('archive.xyz')];
    const result = detectLanguagesFromFiles(files);
    expect(result).toEqual([]);
  });

  it('handles mixed case extensions', () => {
    const files = [file('App.TS'), file('Style.CSS')];
    const result = detectLanguagesFromFiles(files);
    const names = result.map((r) => r.name);
    expect(names).toContain('TypeScript');
    expect(names).toContain('CSS');
  });

  it('populates evidence with file count', () => {
    const files = [
      file('a.ts'),
      file('b.ts'),
      file('c.tsx'),
    ];
    const result = detectLanguagesFromFiles(files);
    const ts = result.find((r) => r.name === 'TypeScript');
    expect(ts?.evidence).toMatch(/found/i);
  });

  it('populates count for extension-based languages', () => {
    const files = [
      file('a.ts'),
      file('b.ts'),
      file('c.tsx'),
      file('d.py'),
    ];
    const result = detectLanguagesFromFiles(files);
    const ts = result.find((r) => r.name === 'TypeScript');
    expect(ts?.count).toBe(3);
    const py = result.find((r) => r.name === 'Python');
    expect(py?.count).toBe(1);
  });

  it('populates count of 1 for filename-based languages', () => {
    const files = [file('Dockerfile'), file('Makefile')];
    const result = detectLanguagesFromFiles(files);
    const docker = result.find((r) => r.name === 'Docker');
    expect(docker?.count).toBe(1);
    const make = result.find((r) => r.name === 'Make');
    expect(make?.count).toBe(1);
  });

  it('does not populate count for unknown file types', () => {
    const files = [file('data.bin')];
    const result = detectLanguagesFromFiles(files);
    expect(result).toEqual([]);
  });
});
