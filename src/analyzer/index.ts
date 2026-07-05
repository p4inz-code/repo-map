import { createDefaultRegistry } from './detectors/index.js';
import { generateTree } from './tree.js';
import { generateArchitecture } from './architecture.js';
import { CURRENT_SCHEMA_VERSION, CLI_VERSION } from '../types.js';
import type { FileEntry, Analysis, Technology, FullIntelligence } from '../types.js';
import type { ScanStats } from '../types.js';
import path from 'node:path';
import { runIntelligence } from '../intelligence/index.js';
import { runArchitectureAnalysis } from '../architecture/index.js';
import { fileCache } from '../file-cache.js';

export interface AnalyzeOptions {
  files: FileEntry[];
  rootPath: string;
  stats: ScanStats;
  projectName?: string;
  /** When true, skip generating tree and architecture text to avoid wasted work. */
  skipOutputGeneration?: boolean;
}

/**
 * Runs all analyzers on the scanned file list and produces a complete Analysis.
 *
 * Pipeline:
 *   1. Detect technologies (via DetectorRegistry)
 *   2. Run intelligence engine (classification, maturity, health, etc.)
 *   3. Run architecture analysis (patterns, dependency graph, coupling, etc.)
 *   4. Generate ASCII tree (via TreeBuilder)
 *   5. Generate professional audit report (via ArchitectureGenerator)
 *
 * All modules share the same scan data — no duplicate I/O.
 */
export async function analyze(options: AnalyzeOptions): Promise<Analysis> {
  const {
    files,
    rootPath,
    stats,
    projectName,
    skipOutputGeneration = false,
  } = options;

  const registry = createDefaultRegistry();
  const technologies: Technology[] = await registry.detectAll(
    files,
    rootPath,
  );

  // Read package.json for intelligence analysis (reused across modules)
  let packageJsonContent: Record<string, unknown> | null = null;
  const pkgFile = files.find((f) => {
    const rel = f.relativePath.replace(/\\/g, '/');
    return rel === 'package.json';
  });
  if (pkgFile) {
    try {
      const content = await fileCache.read(pkgFile.path);
      if (content) packageJsonContent = JSON.parse(content);
    } catch {
      // Invalid or unreadable — proceed without
    }
  }

  // Pre-compute coverage config flag for health scoring
  // (lightweight static file content inspection)
  let hasCoverageConfig = false;
  if (packageJsonContent) {
    // Check package.json scripts and config for coverage keywords
    const scripts = packageJsonContent.scripts as Record<string, string> | undefined;
    if (scripts) {
      for (const cmd of Object.values(scripts)) {
        if (typeof cmd === 'string' && (cmd.includes('--coverage') || cmd.includes('coverage'))) {
          hasCoverageConfig = true;
          break;
        }
      }
    }
    const config = packageJsonContent.config as Record<string, unknown> | undefined;
    if (config && !hasCoverageConfig) {
      if ('coverage' in config || 'nyc' in config || 'c8' in config || 'istanbul' in config) {
        hasCoverageConfig = true;
      }
    }
  }
  if (!hasCoverageConfig) {
    // Check vitest.config.*, vite.config.*, jest.config.* for coverage keywords
    for (const pattern of ['vitest.config.', 'vite.config.', 'jest.config.']) {
      const configFile = files.find((f) => f.relativePath.startsWith(pattern));
      if (configFile) {
        try {
          const content = await fileCache.read(configFile.path);
          if (content && (content.includes('coverage') || content.includes('istanbul') || content.includes('c8') || content.includes('nyc'))) {
            hasCoverageConfig = true;
            break;
          }
        } catch {
          // Ignore read errors
        }
      }
    }
  }

  // Intelligence engine (classification, maturity, health, etc.)
  const baseIntelligence = await runIntelligence(files, technologies, packageJsonContent, { hasCoverageConfig });

  // Architecture analysis (patterns, dependency graph, smells, etc.)
  // Always run — all data is in-memory cached, no additional I/O.
  const architectureAnalysis = await runArchitectureAnalysis(files);

  // Construct the final intelligence with type-safe architecture presence
  const intelligence: FullIntelligence = {
    ...baseIntelligence,
    architecture: architectureAnalysis,
  };

  const generatedAt = new Date().toISOString();

  // Skip expensive output generation when only stats are needed
  const tree = skipOutputGeneration ? '' : generateTree(files);
  const architecture = skipOutputGeneration
    ? ''
    : generateArchitecture({
        rootPath,
        totalFiles: stats.totalFiles,
        totalDirectories: stats.totalDirectories,
        totalSize: stats.totalSize,
        stats,
        technologies,
        intelligence,
        tree,
        generatedAt,
        cliVersion: CLI_VERSION,
      });

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    projectName: projectName ?? path.basename(rootPath),
    generatedAt,
    cliVersion: CLI_VERSION,
    stats: {
      totalFiles: stats.totalFiles,
      totalDirectories: stats.totalDirectories,
      totalSize: stats.totalSize,
      scannedPath: rootPath,
      maxDepth: stats.maxDepth,
      avgFilesPerDirectory: stats.avgFilesPerDirectory,
      largestDirectory: stats.largestDirectory,
      largestDirectoryFiles: stats.largestDirectoryFiles,
      largestFile: stats.largestFile,
      largestFileSize: stats.largestFileSize,
    },
    technologies,
    intelligence,
    tree,
    architecture,
  };
}
