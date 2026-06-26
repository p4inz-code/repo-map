import { describe, it, expect } from 'vitest';
import { detectTools } from '../../../src/analyzer/detectors/tool-detector.js';
import type { FileEntry } from '../../../src/types.js';

function file(relativePath: string): FileEntry {
  return {
    path: `/repo/${relativePath}`,
    relativePath,
    size: 100,
    isDirectory: false,
  };
}

describe('detectTools', () => {
  it('detects GitHub Actions from workflow files', () => {
    const files = [file('.github/workflows/ci.yml')];
    const result = detectTools(files);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'GitHub Actions', category: 'tool' }),
    );
  });

  it('detects Docker from Dockerfile', () => {
    const files = [file('Dockerfile')];
    const result = detectTools(files);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Docker', category: 'tool' }),
    );
  });

  it('detects Docker Compose from compose.yml', () => {
    const files = [file('compose.yml')];
    const result = detectTools(files);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Docker Compose' }),
    );
  });

  it('detects Yarn from yarn.lock', () => {
    const files = [file('yarn.lock')];
    const result = detectTools(files);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Yarn' }),
    );
  });

  it('detects pnpm from pnpm-lock.yaml', () => {
    const files = [file('pnpm-lock.yaml')];
    const result = detectTools(files);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'pnpm' }),
    );
  });

  it('detects ESLint from flat config', () => {
    const files = [file('eslint.config.js')];
    const result = detectTools(files);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'ESLint' }),
    );
  });

  it('detects Prettier from .prettierrc', () => {
    const files = [file('.prettierrc')];
    const result = detectTools(files);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Prettier' }),
    );
  });

  it('detects Storybook from .stories files', () => {
    const files = [file('src/Button.stories.tsx')];
    const result = detectTools(files);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Storybook' }),
    );
  });

  it('returns empty array for no matching tools', () => {
    const files = [file('src/index.ts'), file('README.md')];
    const result = detectTools(files);
    expect(result).toEqual([]);
  });

  it('populates evidence with file path', () => {
    const files = [file('.github/workflows/deploy.yml')];
    const result = detectTools(files);
    expect(result[0].evidence).toContain('.github/workflows/deploy.yml');
  });

  it('handles forward and backslash paths', () => {
    const files = [file('.github\\workflows\\test.yml')];
    const result = detectTools(files);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'GitHub Actions' }),
    );
  });
});
