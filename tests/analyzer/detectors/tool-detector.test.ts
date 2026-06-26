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

  // New tests for expanded tool detection
  it('detects Vite from vite.config.ts', () => {
    const result = detectTools([file('vite.config.ts')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Vite', category: 'tool' }),
    );
  });

  it('detects Webpack from webpack.config.js', () => {
    const result = detectTools([file('webpack.config.js')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Webpack', category: 'tool' }),
    );
  });

  it('detects Rollup from rollup.config.js', () => {
    const result = detectTools([file('rollup.config.js')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Rollup', category: 'tool' }),
    );
  });

  it('detects Parcel from .parcelrc', () => {
    const result = detectTools([file('.parcelrc')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Parcel', category: 'tool' }),
    );
  });

  it('detects Vitest from vitest.config.ts', () => {
    const result = detectTools([file('vitest.config.ts')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Vitest', category: 'tool' }),
    );
  });

  it('detects Jest from jest.config.js', () => {
    const result = detectTools([file('jest.config.js')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Jest', category: 'tool' }),
    );
  });

  it('detects Cypress from cypress.config.js', () => {
    const result = detectTools([file('cypress.config.js')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Cypress', category: 'tool' }),
    );
  });

  it('detects Playwright from playwright.config.ts', () => {
    const result = detectTools([file('playwright.config.ts')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Playwright', category: 'tool' }),
    );
  });

  it('detects npm from package-lock.json', () => {
    const result = detectTools([file('package-lock.json')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'npm', category: 'tool' }),
    );
  });

  it('detects Turbo from turbo.json', () => {
    const result = detectTools([file('turbo.json')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Turbo', category: 'tool' }),
    );
  });

  it('detects Nx from nx.json', () => {
    const result = detectTools([file('nx.json')]);
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'Nx', category: 'tool' }),
    );
  });

  it('detects multiple tools simultaneously', () => {
    const result = detectTools([
      file('.github/workflows/ci.yml'),
      file('vitest.config.ts'),
      file('Dockerfile'),
      file('eslint.config.js'),
    ]);
    const names = result.map((r) => r.name);
    expect(names).toContain('GitHub Actions');
    expect(names).toContain('Vitest');
    expect(names).toContain('Docker');
    expect(names).toContain('ESLint');
  });
});
