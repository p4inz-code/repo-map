import { describe, it, expect } from 'vitest';
import { detectEntryPoints } from '../../src/intelligence/entry-point-detector.js';
import type { FileEntry, Technology } from '../../src/types.js';

function file(relativePath: string): FileEntry {
  return { path: `/repo/${relativePath}`, relativePath, size: 100, isDirectory: false };
}

describe('detectEntryPoints', () => {
  it('detects CLI entry from package.json bin string', () => {
    const pkg = { bin: 'dist/cli.js' };
    const result = detectEntryPoints([], [], pkg);
    expect(result).toContainEqual(
      expect.objectContaining({ type: 'CLI Entry', path: 'dist/cli.js' }),
    );
  });

  it('detects CLI entry from package.json bin object', () => {
    const pkg = { bin: { 'my-cli': './bin/my-cli.js' } };
    const result = detectEntryPoints([], [], pkg);
    expect(result).toContainEqual(
      expect.objectContaining({ type: 'CLI Entry', path: './bin/my-cli.js' }),
    );
  });

  it('detects library entry from package.json main', () => {
    const pkg = { main: 'dist/index.js' };
    const result = detectEntryPoints([], [], pkg);
    expect(result).toContainEqual(
      expect.objectContaining({ type: 'Library Entry', path: 'dist/index.js' }),
    );
  });

  it('detects common app entries from file paths', () => {
    const files = [file('src/index.ts')];
    const result = detectEntryPoints(files, [], null);
    expect(result).toContainEqual(
      expect.objectContaining({ type: 'Application Entry', path: 'src/index.ts' }),
    );
  });

  it('detects server entry from file paths', () => {
    const files = [file('src/server.ts')];
    const result = detectEntryPoints(files, [], null);
    expect(result).toContainEqual(
      expect.objectContaining({ type: 'Server Entry' }),
    );
  });

  it('detects Next.js entry from pages directory', () => {
    const files = [file('pages/index.tsx')];
    const technologies: Technology[] = [
      { name: 'Next.js', category: 'framework', evidence: 'package.json' },
    ];
    const result = detectEntryPoints(files, technologies, null);
    expect(result).toContainEqual(
      expect.objectContaining({ type: 'Next.js Entry' }),
    );
  });

  it('returns empty array for empty input', () => {
    const result = detectEntryPoints([], [], null);
    expect(result).toEqual([]);
  });

  it('detects Vite entry from index.html', () => {
    const files = [file('index.html')];
    const result = detectEntryPoints(files, [], null);
    expect(result).toContainEqual(
      expect.objectContaining({ type: 'Vite Entry', path: 'index.html' }),
    );
  });
});
