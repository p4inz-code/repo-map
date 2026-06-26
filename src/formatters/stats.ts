import type { Analysis } from '../types.js';
import { formatSize } from '../utils.js';

/**
 * Formats an Analysis result as a compact statistics summary.
 *
 * Shows file/directory counts, total size, depth, and language breakdown.
 */
export function formatStats(analysis: Analysis): string {
  const { stats, technologies } = analysis;
  const lines: string[] = [];

  // Header
  lines.push(
    `Files: ${stats.totalFiles}  |  Dirs: ${stats.totalDirectories}  |  Size: ${formatSize(stats.totalSize)}  |  Depth: ${stats.maxDepth}`,
  );
  lines.push('');

  // Language breakdown
  const languages = technologies.filter(
    (t): t is typeof t & { count: number } =>
      t.category === 'language' && t.count !== undefined,
  );

  if (languages.length === 0) {
    lines.push('No languages detected.');
  } else {
    for (const lang of languages) {
      const pct =
        stats.totalFiles > 0
          ? ((lang.count / stats.totalFiles) * 100).toFixed(1)
          : '0.0';
      const paddedName = lang.name.padEnd(20);
      const paddedCount = String(lang.count).padStart(6);
      const paddedPct = pct.padStart(5);
      lines.push(`${paddedName}${paddedCount} files  (${paddedPct}%)`);
    }
  }

  lines.push('');

  // Additional stats
  if (stats.largestFile) {
    lines.push(`Largest file:    ${stats.largestFile} (${formatSize(stats.largestFileSize)})`);
  }
  if (stats.largestDirectory) {
    lines.push(`Largest dir:     ${stats.largestDirectory} (${stats.largestDirectoryFiles} files)`);
  }
  if (stats.avgFilesPerDirectory > 0) {
    lines.push(`Avg files/dir:   ${stats.avgFilesPerDirectory}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Formats an Analysis result as structured JSON statistics.
 *
 * Produces a lightweight JSON object with stats and language breakdown,
 * suitable for CI pipelines and programmatic consumers.
 */
export function formatStatsJson(analysis: Analysis): string {
  const { stats, technologies, projectName, generatedAt } = analysis;

  const languages = technologies
    .filter(
      (t): t is typeof t & { count: number } =>
        t.category === 'language' && t.count !== undefined,
    )
    .map((t) => ({
      name: t.name,
      files: t.count,
      percentage:
        stats.totalFiles > 0
          ? Math.round((t.count / stats.totalFiles) * 1000) / 10
          : 0,
    }));

  const output = {
    projectName,
    scannedPath: stats.scannedPath,
    totalFiles: stats.totalFiles,
    totalDirectories: stats.totalDirectories,
    totalSize: stats.totalSize,
    maxDepth: stats.maxDepth,
    avgFilesPerDirectory: stats.avgFilesPerDirectory,
    largestDirectory: stats.largestDirectory,
    largestDirectoryFiles: stats.largestDirectoryFiles,
    largestFile: stats.largestFile,
    largestFileSize: stats.largestFileSize,
    generatedAt,
    languages,
  };

  return JSON.stringify(output, null, 2);
}
