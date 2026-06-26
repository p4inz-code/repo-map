import { describe, it, expect } from 'vitest';
import {
  createGitignoreFilter,
  createAllowAllFilter,
  createExcludeFilter,
  createIncludeFilter,
} from '../../src/scanner/ignore.js';

describe('createAllowAllFilter', () => {
  it('allows every path', () => {
    const filter = createAllowAllFilter();
    expect(filter('.git/config')).toBe(true);
    expect(filter('node_modules/foo.js')).toBe(true);
    expect(filter('src/index.ts')).toBe(true);
  });
});

describe('createGitignoreFilter', () => {
  it('excludes .git directory even without a .gitignore file', async () => {
    const filter = await createGitignoreFilter('tests/fixtures/empty-repo');
    expect(filter('.git/config')).toBe(false);
    expect(filter('.git/HEAD')).toBe(false);
  });

  it('excludes paths matching .gitignore patterns', async () => {
    const filter = await createGitignoreFilter('tests/fixtures/simple-repo');
    // node_modules is listed in simple-repo/.gitignore
    expect(filter('node_modules/lodash.js')).toBe(false);
    // src files should be included
    expect(filter('src/index.ts')).toBe(true);
    expect(filter('index.ts')).toBe(true);
  });

  it('allows non-ignored paths in a repo without .gitignore', async () => {
    const filter = await createGitignoreFilter('tests/fixtures/empty-repo');
    expect(filter('some-file.ts')).toBe(true);
    expect(filter('src/app.ts')).toBe(true);
  });
});

describe('createExcludeFilter', () => {
  it('allows all paths when no patterns provided', () => {
    const filter = createExcludeFilter([]);
    expect(filter('node_modules/foo.js')).toBe(true);
    expect(filter('src/index.ts')).toBe(true);
  });

  it('excludes paths matching a single pattern', () => {
    const filter = createExcludeFilter(['node_modules']);
    expect(filter('node_modules/foo.js')).toBe(false);
    expect(filter('src/index.ts')).toBe(true);
  });

  it('excludes paths matching multiple patterns', () => {
    const filter = createExcludeFilter(['node_modules', 'dist']);
    expect(filter('node_modules/foo.js')).toBe(false);
    expect(filter('dist/bundle.js')).toBe(false);
    expect(filter('src/index.ts')).toBe(true);
  });

  it('supports glob patterns', () => {
    const filter = createExcludeFilter(['*.test.ts']);
    expect(filter('src/foo.test.ts')).toBe(false);
    expect(filter('src/foo.ts')).toBe(true);
  });

  it('excludes nested paths', () => {
    const filter = createExcludeFilter(['src/generated']);
    expect(filter('src/generated/types.ts')).toBe(false);
    expect(filter('src/index.ts')).toBe(true);
  });
});

describe('createIncludeFilter', () => {
  it('allows all paths when no patterns provided', () => {
    const filter = createIncludeFilter([]);
    expect(filter('node_modules/foo.js')).toBe(true);
    expect(filter('src/index.ts')).toBe(true);
  });

  it('only allows paths matching a single pattern', () => {
    const filter = createIncludeFilter(['src/**']);
    expect(filter('src/index.ts')).toBe(true);
    expect(filter('README.md')).toBe(false);
  });

  it('allows paths matching any of multiple patterns', () => {
    const filter = createIncludeFilter(['src/**', '*.md']);
    expect(filter('src/index.ts')).toBe(true);
    expect(filter('README.md')).toBe(true);
    expect(filter('package.json')).toBe(false);
  });

  it('supports glob patterns', () => {
    const filter = createIncludeFilter(['*.ts']);
    expect(filter('src/foo.ts')).toBe(true);
    expect(filter('src/foo.js')).toBe(false);
  });
});
