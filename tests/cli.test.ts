import { describe, it, expect } from 'vitest';
import { parseCliArgs } from '../src/cli.js';

describe('parseCliArgs', () => {
  const baseArgs = ['node', 'repo-map'];

  it('parses path argument', () => {
    const result = parseCliArgs([...baseArgs, '/some/path']);
    expect(result.path).toBe('/some/path');
  });

  it('defaults path to current directory', () => {
    const result = parseCliArgs(baseArgs);
    expect(result.path).toBe('.');
  });

  it('parses --json flag', () => {
    const result = parseCliArgs([...baseArgs, '--json']);
    expect(result.format).toBe('json');
  });

  it('defaults format to markdown', () => {
    const result = parseCliArgs(baseArgs);
    expect(result.format).toBe('markdown');
  });

  it('parses --output', () => {
    const result = parseCliArgs([...baseArgs, '-o', 'output.md']);
    expect(result.output).toBe('output.md');
  });

  it('parses --depth', () => {
    const result = parseCliArgs([...baseArgs, '--depth', '3']);
    expect(result.depth).toBe(3);
  });

  it('parses --no-ignore', () => {
    const result = parseCliArgs([...baseArgs, '--no-ignore']);
    expect(result.useGitignore).toBe(false);
  });

  describe('--exclude', () => {
    it('parses a single exclude pattern', () => {
      const result = parseCliArgs([...baseArgs, '--exclude', 'node_modules']);
      expect(result.exclude).toEqual(['node_modules']);
    });

    it('parses multiple exclude patterns', () => {
      const result = parseCliArgs([
        ...baseArgs,
        '--exclude',
        'node_modules',
        '--exclude',
        'dist',
      ]);
      expect(result.exclude).toEqual(['node_modules', 'dist']);
    });

    it('is undefined when no exclude specified', () => {
      const result = parseCliArgs(baseArgs);
      expect(result.exclude).toBeUndefined();
    });
  });

  describe('--include', () => {
    it('parses a single include pattern', () => {
      const result = parseCliArgs([...baseArgs, '--include', 'src/**']);
      expect(result.include).toEqual(['src/**']);
    });

    it('parses multiple include patterns', () => {
      const result = parseCliArgs([
        ...baseArgs,
        '--include',
        'src/**',
        '--include',
        '*.md',
      ]);
      expect(result.include).toEqual(['src/**', '*.md']);
    });

    it('is undefined when no include specified', () => {
      const result = parseCliArgs(baseArgs);
      expect(result.include).toBeUndefined();
    });
  });

  it('parses both exclude and include together', () => {
    const result = parseCliArgs([
      ...baseArgs,
      '--exclude',
      'dist',
      '--include',
      'src/**',
      'path/to/repo',
    ]);
    expect(result.path).toBe('path/to/repo');
    expect(result.exclude).toEqual(['dist']);
    expect(result.include).toEqual(['src/**']);
  });

  describe('--stats', () => {
    it('parses --stats flag', () => {
      const result = parseCliArgs([...baseArgs, '--stats']);
      expect(result.stats).toBe(true);
    });

    it('is undefined when no --stats specified', () => {
      const result = parseCliArgs(baseArgs);
      expect(result.stats).toBeUndefined();
    });

    it('parses --stats --json together', () => {
      const result = parseCliArgs([...baseArgs, '--stats', '--json']);
      expect(result.stats).toBe(true);
      expect(result.format).toBe('json');
    });

    it('parses --stats with other flags', () => {
      const result = parseCliArgs([
        ...baseArgs,
        '--stats',
        '--depth',
        '2',
        '--exclude',
        'dist',
        '/some/repo',
      ]);
      expect(result.stats).toBe(true);
      expect(result.path).toBe('/some/repo');
      expect(result.depth).toBe(2);
      expect(result.exclude).toEqual(['dist']);
    });
  });

  describe('--interactive', () => {
    it('parses --interactive flag', () => {
      const result = parseCliArgs([...baseArgs, '--interactive']);
      expect(result.interactive).toBe(true);
    });

    it('is undefined when no --interactive specified', () => {
      const result = parseCliArgs(baseArgs);
      expect(result.interactive).toBeUndefined();
    });

    it('parses --interactive with path', () => {
      const result = parseCliArgs([...baseArgs, '--interactive', '/project']);
      expect(result.interactive).toBe(true);
      expect(result.path).toBe('/project');
    });

    it('works alongside other flags', () => {
      const result = parseCliArgs([
        ...baseArgs,
        '--interactive',
        '--depth',
        '3',
        '--exclude',
        'node_modules',
      ]);
      expect(result.interactive).toBe(true);
      expect(result.depth).toBe(3);
      expect(result.exclude).toEqual(['node_modules']);
    });
  });

  describe('--tree', () => {
    it('parses --tree flag', () => {
      const result = parseCliArgs([...baseArgs, '--tree']);
      expect(result.tree).toBe(true);
    });

    it('is undefined when no --tree specified', () => {
      const result = parseCliArgs(baseArgs);
      expect(result.tree).toBeUndefined();
    });

    it('parses --tree with path', () => {
      const result = parseCliArgs([...baseArgs, '--tree', '/project']);
      expect(result.tree).toBe(true);
      expect(result.path).toBe('/project');
    });

    it('parses --tree --json together', () => {
      const result = parseCliArgs([...baseArgs, '--tree', '--json']);
      expect(result.tree).toBe(true);
      expect(result.format).toBe('json');
    });
  });
});
