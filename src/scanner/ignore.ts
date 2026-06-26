import ignore from 'ignore';
import fs from 'node:fs/promises';
import path from 'node:path';

export type IgnoreFilter = (relativePath: string) => boolean;

export async function createGitignoreFilter(
  rootPath: string,
): Promise<IgnoreFilter> {
  const ig = ignore().add('.git');

  try {
    // Read all .gitignore files from root to build the filter
    const gitignorePath = path.join(rootPath, '.gitignore');
    const content = await fs.readFile(gitignorePath, 'utf-8');
    ig.add(content);
  } catch {
    // No .gitignore found — .git exclusion is sufficient
  }

  return (relativePath: string) => !ig.ignores(relativePath);
}

export function createAllowAllFilter(): IgnoreFilter {
  return () => true;
}

/**
 * Creates a filter that rejects paths matching any of the given exclude patterns.
 * Patterns use .gitignore-style glob matching.
 * Returns allow-all filter when no patterns are provided.
 */
export function createExcludeFilter(patterns: string[]): IgnoreFilter {
  if (patterns.length === 0) return createAllowAllFilter();
  const ig = ignore().add(patterns);
  return (relativePath: string) => !ig.ignores(relativePath);
}

/**
 * Creates a filter that only allows paths matching at least one include pattern.
 * Patterns use .gitignore-style glob matching.
 * Returns allow-all filter when no patterns are provided.
 */
export function createIncludeFilter(patterns: string[]): IgnoreFilter {
  if (patterns.length === 0) return createAllowAllFilter();
  const ig = ignore().add(patterns);
  // ignore().ignores(path) returns true if the path matches any registered pattern.
  // For include semantics, we want to allow paths that match at least one pattern.
  return (relativePath: string) => ig.ignores(relativePath);
}

