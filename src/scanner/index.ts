import {
  createGitignoreFilter,
  createAllowAllFilter,
  createExcludeFilter,
  createIncludeFilter,
} from './ignore.js';
import { walkDirectory } from './file-walker.js';
import type { FileEntry, ScanResult } from '../types.js';

export interface ScannerOptions {
  rootPath: string;
  useGitignore: boolean;
  maxDepth?: number;
  excludePatterns?: string[];
  includePatterns?: string[];
}

/**
 * Filters file entries against include patterns after directory traversal.
 * File entries not matching the include pattern are removed, and directory
 * entries that no longer contain any matching files are pruned.
 *
 * The include filter is intentionally separated from the traversal filter
 * so that directory traversal is not blocked by file-level patterns
 * like `*.ts` — directories must be traversable to discover files that
 * match the include pattern deeper in the tree.
 */
function applyIncludeFilter(
  files: FileEntry[],
  includeFilter: (path: string) => boolean,
): FileEntry[] {
  // Keep directories (for tree reconstruction) and files matching the include pattern
  const filtered = files.filter(
    (f) => f.isDirectory || includeFilter(f.relativePath),
  );

  // Prune directories that have no matching file descendants.
  // Normalize both directory and file paths to forward slashes so the
  // prefix check works correctly on all platforms (Windows uses \).
  const keptFilePaths = new Set(
    filtered
      .filter((f) => !f.isDirectory)
      .map((f) => f.relativePath.replace(/\\/g, '/')),
  );

  return filtered.filter((f) => {
    if (!f.isDirectory) return true;
    const dirPrefix = f.relativePath.replace(/\\/g, '/') + '/';
    return [...keptFilePaths].some((fp) => fp.startsWith(dirPrefix));
  });
}

export async function scanDirectory(
  options: ScannerOptions,
): Promise<ScanResult> {
  const {
    rootPath,
    useGitignore,
    maxDepth,
    excludePatterns,
    includePatterns,
  } = options;

  // Build the composite traversal filter: gitignore → exclude
  // NOTE: includeFilter is intentionally excluded here so that directory
  // traversal is not blocked by file-level patterns like `*.ts`.
  const gitignoreFilter = useGitignore
    ? await createGitignoreFilter(rootPath)
    : createAllowAllFilter();

  const excludeFilter = createExcludeFilter(excludePatterns ?? []);

  const filter = (relativePath: string): boolean => {
    return (
      gitignoreFilter(relativePath) &&
      excludeFilter(relativePath)
    );
  };

  let files = await walkDirectory(rootPath, { filter, maxDepth, rootPath });

  // Apply include filter post-walk: only files matching the pattern are kept,
  // directory entries that no longer contain matching files are pruned.
  const includePatternsList = includePatterns ?? [];
  if (includePatternsList.length > 0) {
    const includeFilter = createIncludeFilter(includePatternsList);
    files = applyIncludeFilter(files, includeFilter);
  }

  const totalFiles = files.filter((f) => !f.isDirectory).length;
  const totalDirectories = files.filter((f) => f.isDirectory).length;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return {
    rootPath,
    files,
    ignoredPatterns: [],
    stats: { totalFiles, totalDirectories, totalSize },
  };
}
