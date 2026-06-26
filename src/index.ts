import fs from 'node:fs/promises';
import path from 'node:path';
import { parseCliArgs } from './cli.js';
import { scanDirectory } from './scanner/index.js';
import { analyze } from './analyzer/index.js';
import { formatJson } from './formatters/json.js';
import { formatMarkdown } from './formatters/markdown.js';
import { formatStats, formatStatsJson } from './formatters/stats.js';

/**
 * Main pipeline: scan → analyze → format → output.
 *
 * Orchestrates the full repo-map workflow from CLI arguments to final output.
 */
export async function run(argv: string[]): Promise<string> {
  const options = parseCliArgs(argv);

  const rootPath = path.resolve(options.path);

  // Validate that the target path exists and is a directory
  let pathStat;
  try {
    pathStat = await fs.stat(rootPath);
  } catch {
    throw new Error(
      `Path does not exist: ${rootPath}\n` +
        `Provide a valid path to a directory to scan, or run 'repo-map .' to scan the current directory.`,
    );
  }

  if (!pathStat.isDirectory()) {
    throw new Error(
      `Path is not a directory: ${rootPath}\n` +
        `repo-map scans directories, not individual files. Provide a directory path.`,
    );
  }

  // 1. Scan directory
  const scanResult = await scanDirectory({
    rootPath,
    useGitignore: options.useGitignore,
    maxDepth: options.depth,
    excludePatterns: options.exclude,
    includePatterns: options.include,
  });

  // 2. Analyze (skip tree/architecture when only stats are needed)
  const analysis = await analyze({
    files: scanResult.files,
    rootPath,
    totalFiles: scanResult.stats.totalFiles,
    totalDirectories: scanResult.stats.totalDirectories,
    totalSize: scanResult.stats.totalSize,
    skipOutputGeneration: options.stats,
  });

  // 3. Format
  // --stats takes precedence over --json and --output
  if (options.stats) {
    return options.format === 'json'
      ? formatStatsJson(analysis)
      : formatStats(analysis);
  }

  const output =
    options.format === 'json'
      ? formatJson(analysis)
      : formatMarkdown(analysis);

  // 4. Write to file or return
  if (options.output) {
    await fs.mkdir(path.dirname(options.output), { recursive: true });
    await fs.writeFile(options.output, output, 'utf-8');
    return `Output written to ${options.output}`;
  }

  return output;
}

