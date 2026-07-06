import fs from 'node:fs/promises';
import path from 'node:path';
import { parseCliArgs } from './cli.js';
import { scanDirectory } from './scanner/index.js';
import { analyze } from './analyzer/index.js';
import { formatJson } from './formatters/json.js';
import { formatMarkdown } from './formatters/markdown.js';
import { formatStats, formatStatsJson } from './formatters/stats.js';
import { fileCache } from './file-cache.js';
import { createUISession } from './ui/index.js';
import { buildTreeNodeData } from './analyzer/tree.js';

/**
 * Main pipeline: scan → analyze → format → output.
 *
 * Orchestrates the full repo-map workflow from CLI arguments to final output.
 * Progress UI is managed by UISession (stderr). Final output is returned as a
 * string (stdout).
 */
export async function run(argv: string[]): Promise<string> {
  const options = parseCliArgs(argv);
  const startTime = performance.now();

  // Apply --no-color
  if (!options.color) {
    process.env.NO_COLOR = '1';
  }

  // Clear file cache from any previous runs (defensive)
  fileCache.clear();

  const rootPath = path.resolve(options.path);

  // Validate that the target path exists and is a directory
  // (handled before UISession — errors are caught in bin.ts)
  let pathStat;
  try {
    pathStat = await fs.stat(rootPath);
  } catch {
    throw new Error(`Path does not exist: ${rootPath}`);
  }

  if (!pathStat.isDirectory()) {
    throw new Error(`Path is not a directory: ${rootPath}`);
  }

  const projectLabel = path.basename(rootPath);

  // Create UISession for progress and output UI
  const ui = createUISession({ color: options.color !== false });

  try {
    // 1. Scan with progress UI
    const updateScanProgress = ui.startScanning(projectLabel);

    const scanResult = await scanDirectory({
      rootPath,
      useGitignore: options.useGitignore,
      maxDepth: options.depth,
      excludePatterns: options.exclude,
      includePatterns: options.include,
      onProgress: updateScanProgress,
    });

    ui.finishScanning(scanResult.stats.totalFiles, scanResult.stats.totalDirectories);

    // 2. Analyze with progress UI
    ui.startAnalyzing();

    const analysis = await analyze({
      files: scanResult.files,
      rootPath,
      stats: scanResult.stats,
      skipOutputGeneration: options.stats,
    });

    const elapsed = ((performance.now() - startTime) / 1000);

    ui.finishAnalyzing(elapsed);

    // 3. Format output
    if (options.stats) {
      // Render stats screen on stderr
      ui.renderStats(analysis, elapsed);

      // Return formatted stats for stdout
      return options.format === 'json'
        ? formatStatsJson(analysis)
        : formatStats(analysis);
    }

    // ── Interactive workspace mode ──────────────────────────
    if (options.interactive) {
      const rootNode = buildTreeNodeData(scanResult.files);
      if (rootNode) {
        ui.setTreeData(rootNode);
      }
      ui.setAnalysisData(analysis);
      await ui.runInteractiveWorkspace();
      return '';
    }

    if (options.suggest) {
      // Render suggestions screen on stderr
      ui.renderSuggest(analysis);

      // Return formatted markdown for stdout
      return options.format === 'json'
        ? formatJson(analysis)
        : formatMarkdown(analysis);
    }

    // ── Tree-only output mode ────────────────────────────────
    if (options.tree) {
      return analysis.tree;
    }

    // Full completion — render summary box on stderr
    const output =
      options.format === 'json'
        ? formatJson(analysis)
        : formatMarkdown(analysis);

    // Write to file or return
    if (options.output) {
      await fs.mkdir(path.dirname(options.output), { recursive: true });
      await fs.writeFile(options.output, output, 'utf-8');
      ui.renderCompletion(analysis, options.output);
      return `Output written to ${options.output}`;
    }

    // No output file — render completion and return the formatted string
    ui.renderCompletion(analysis);
    return output;
  } finally {
    ui.close();
  }
}
