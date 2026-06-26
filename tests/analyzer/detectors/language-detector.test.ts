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

  // New tests for expanded language detection
  it('detects Python from .py files', () => {
    const result = detectLanguagesFromFiles([file('main.py')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Python', category: 'language' }),
    );
  });

  it('detects Java from .java files', () => {
    const result = detectLanguagesFromFiles([file('Main.java')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Java', category: 'language' }),
    );
  });

  it('detects Kotlin from .kt files', () => {
    const result = detectLanguagesFromFiles([file('app.kt')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Kotlin', category: 'language' }),
    );
  });

  it('detects C from .c files', () => {
    const result = detectLanguagesFromFiles([file('main.c')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'C', category: 'language' }),
    );
  });

  it('detects C++ from .cpp files', () => {
    const result = detectLanguagesFromFiles([file('main.cpp')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'C++', category: 'language' }),
    );
  });

  it('detects C# from .cs files', () => {
    const result = detectLanguagesFromFiles([file('Program.cs')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'C#', category: 'language' }),
    );
  });

  it('detects Rust from .rs files', () => {
    const result = detectLanguagesFromFiles([file('main.rs')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Rust', category: 'language' }),
    );
  });

  it('detects Go from .go files', () => {
    const result = detectLanguagesFromFiles([file('main.go')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Go', category: 'language' }),
    );
  });

  it('detects PHP from .php files', () => {
    const result = detectLanguagesFromFiles([file('index.php')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'PHP', category: 'language' }),
    );
  });

  it('detects Ruby from .rb files', () => {
    const result = detectLanguagesFromFiles([file('app.rb')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Ruby', category: 'language' }),
    );
  });

  it('detects Swift from .swift files', () => {
    const result = detectLanguagesFromFiles([file('App.swift')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Swift', category: 'language' }),
    );
  });

  it('detects Dart from .dart files', () => {
    const result = detectLanguagesFromFiles([file('main.dart')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Dart', category: 'language' }),
    );
  });

  it('detects SCSS from .scss files', () => {
    const result = detectLanguagesFromFiles([file('style.scss')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'SCSS', category: 'language' }),
    );
  });

  it('detects Less from .less files', () => {
    const result = detectLanguagesFromFiles([file('style.less')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Less', category: 'language' }),
    );
  });

  it('detects SQL from .sql files', () => {
    const result = detectLanguagesFromFiles([file('query.sql')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'SQL', category: 'language' }),
    );
  });

  it('detects Shell from .sh files', () => {
    const result = detectLanguagesFromFiles([file('script.sh')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Shell', category: 'language' }),
    );
  });

  it('detects PowerShell from .ps1 files', () => {
    const result = detectLanguagesFromFiles([file('script.ps1')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'PowerShell', category: 'language' }),
    );
  });

  it('detects YAML from .yaml files', () => {
    const result = detectLanguagesFromFiles([file('config.yaml')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'YAML', category: 'language' }),
    );
  });

  it('detects TOML from .toml files', () => {
    const result = detectLanguagesFromFiles([file('config.toml')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'TOML', category: 'language' }),
    );
  });

  it('detects JSON from .json files', () => {
    const result = detectLanguagesFromFiles([file('data.json')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'JSON', category: 'language' }),
    );
  });

  it('detects Markdown from .md files', () => {
    const result = detectLanguagesFromFiles([file('README.md')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Markdown', category: 'language' }),
    );
  });

  it('detects Vue from .vue files', () => {
    const result = detectLanguagesFromFiles([file('App.vue')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Vue', category: 'language' }),
    );
  });

  it('detects Svelte from .svelte files', () => {
    const result = detectLanguagesFromFiles([file('App.svelte')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Svelte', category: 'language' }),
    );
  });

  it('detects Astro from .astro files', () => {
    const result = detectLanguagesFromFiles([file('index.astro')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Astro', category: 'language' }),
    );
  });

  it('detects HTML from .html files', () => {
    const result = detectLanguagesFromFiles([file('index.html')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'HTML', category: 'language' }),
    );
  });

  it('detects CSS from .css files', () => {
    const result = detectLanguagesFromFiles([file('style.css')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'CSS', category: 'language' }),
    );
  });

  it('detects environment files from .env filename', () => {
    const result = detectLanguagesFromFiles([file('.env')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Environment Variables', category: 'language' }),
    );
  });
});
