import { createDefaultRegistry } from './detectors/index.js';
import { generateTree } from './tree.js';
import { generateArchitecture } from './architecture.js';
import { CURRENT_SCHEMA_VERSION, CLI_VERSION } from '../types.js';
import type { FileEntry, Analysis, Technology } from '../types.js';
import path from 'node:path';

export interface AnalyzeOptions {
  files: FileEntry[];
  rootPath: string;
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  projectName?: string;
  /** When true, skip generating tree and architecture text to avoid wasted work. */
  skipOutputGeneration?: boolean;
}

/**
 * Runs all analyzers on the scanned file list and produces a complete Analysis.
 *
 * Pipeline:
 *   1. Detect technologies (via DetectorRegistry)
 *   2. Generate ASCII tree (via TreeBuilder)
 *   3. Generate Markdown architecture summary (via ArchitectureGenerator)
 *
 * No additional scanning or I/O beyond what the detectors perform internally.
 */
export async function analyze(options: AnalyzeOptions): Promise<Analysis> {
  const {
    files,
    rootPath,
    totalFiles,
    totalDirectories,
    totalSize,
    projectName,
    skipOutputGeneration = false,
  } = options;

  const registry = createDefaultRegistry();
  const technologies: Technology[] = await registry.detectAll(
    files,
    rootPath,
  );
  const generatedAt = new Date().toISOString();

  // Skip expensive output generation when only stats are needed
  const tree = skipOutputGeneration ? '' : generateTree(files);
  const architecture = skipOutputGeneration
    ? ''
    : generateArchitecture({
        rootPath,
        totalFiles,
        totalDirectories,
        totalSize,
        technologies,
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
      totalFiles,
      totalDirectories,
      totalSize,
      scannedPath: rootPath,
    },
    technologies,
    tree,
    architecture,
  };
}
