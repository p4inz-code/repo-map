import {
  createGitignoreFilter,
  createAllowAllFilter,
  createExcludeFilter,
  createIncludeFilter,
} from './ignore.js';
import { walkDirectory } from './file-walker.js';
import type { FileEntry, ScanResult, ScanStats } from '../types.js';
import type { WalkProgress } from './file-walker.js';

export interface ScannerOptions {
  rootPath: string;
  useGitignore: boolean;
  maxDepth?: number;
  excludePatterns?: string[];
  includePatterns?: string[];
  /**
   * Optional progress callback forwarded to walkDirectory.
   * Receives cumulative file and directory counts during traversal.
   */
  onProgress?: (progress: WalkProgress) => void;
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

/**
 * Computes enhanced statistics from the scanned file list.
 */
function computeScanStats(files: FileEntry[]): ScanStats {
  const fileEntries = files.filter((f) => !f.isDirectory);
  const dirEntries = files.filter((f) => f.isDirectory);
  const totalFiles = fileEntries.length;
  const totalDirectories = dirEntries.length;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  // Compute max depth
  let maxDepth = 0;
  for (const f of files) {
    const normalized = f.relativePath.replace(/\\/g, '/');
    const depth = normalized.split('/').length - 1;
    if (depth > maxDepth) maxDepth = depth;
  }

  // Compute avg files per directory.
  // When there are file entries but no directory entries (all files at root),
  // treat root as one directory so avg = totalFiles / 1.
  const effectiveDirectories = totalDirectories > 0 ? totalDirectories : (totalFiles > 0 ? 1 : 0);
  const avgFilesPerDirectory =
    effectiveDirectories > 0
      ? Math.round((totalFiles / effectiveDirectories) * 10) / 10
      : 0;

  // Find largest directory (by file count)
  // Build a map of directory paths to file counts
  const dirFileCounts = new Map<string, number>();
  for (const f of fileEntries) {
    const normalized = f.relativePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    // Add a file to every parent directory
    for (let i = 0; i < parts.length - 1; i++) {
      const dirPath = parts.slice(0, i + 1).join('/');
      dirFileCounts.set(dirPath, (dirFileCounts.get(dirPath) || 0) + 1);
    }
  }

  let largestDir = '';
  let largestDirCount = 0;
  for (const [dirPath, count] of dirFileCounts) {
    if (count > largestDirCount) {
      largestDirCount = count;
      largestDir = dirPath;
    }
  }

  // Find largest file
  let largestFile = '';
  let largestFileSize = 0;
  for (const f of fileEntries) {
    if (f.size > largestFileSize) {
      largestFileSize = f.size;
      largestFile = f.relativePath.replace(/\\/g, '/');
    }
  }

  return {
    totalFiles,
    totalDirectories,
    totalSize,
    maxDepth,
    avgFilesPerDirectory,
    largestDirectory: largestDir,
    largestDirectoryFiles: largestDirCount,
    largestFile,
    largestFileSize,
  };
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
    onProgress,
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

  let files = await walkDirectory(rootPath, { filter, maxDepth, rootPath, onProgress });

  // Apply include filter post-walk: only files matching the pattern are kept,
  // directory entries that no longer contain matching files are pruned.
  const includePatternsList = includePatterns ?? [];
  if (includePatternsList.length > 0) {
    const includeFilter = createIncludeFilter(includePatternsList);
    files = applyIncludeFilter(files, includeFilter);
  }

  const stats = computeScanStats(files);

  return {
    rootPath,
    files,
    stats,
  };
}
