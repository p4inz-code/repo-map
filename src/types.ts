import type { ArchitectureAnalysis } from './architecture/types.js';
import type {
  ProjectClassification,
  MaturityEstimate,
  HealthScore,
  EntryPoint,
  DirectoryRole,
  BuildPipeline,
  DependencyAnalysis,
  Strength,
  Suggestion,
  ArchitectureInsight,
} from './intelligence/types.js';

export const CURRENT_SCHEMA_VERSION = '1.0.0';
export const CLI_VERSION = '2.2.0';

// ─── Shared Data Types ───────────────────────────────────────────

export interface FileEntry {
  path: string;
  relativePath: string;
  size: number;
  isDirectory: boolean;
}

export interface Technology {
  name: string;
  category: 'language' | 'framework' | 'tool';
  version?: string;
  evidence: string;
  /** Number of files associated with this technology (primarily for languages). */
  count?: number;
}

export interface ScanStats {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  maxDepth: number;
  avgFilesPerDirectory: number;
  largestDirectory: string;
  largestDirectoryFiles: number;
  largestFile: string;
  largestFileSize: number;
}

export interface ScanResult {
  rootPath: string;
  files: FileEntry[];
  stats: ScanStats;
}

// ─── CLI Options ─────────────────────────────────────────────────

export interface CliOptions {
  path: string;
  format: 'json' | 'markdown';
  depth?: number;
  output?: string;
  useGitignore: boolean;
  exclude?: string[];
  include?: string[];
  stats?: boolean;
  suggest?: boolean;
  /** Whether ANSI color output is enabled. Defaults to true. */
  color: boolean;
}

// ─── Intelligence (project-level analysis) ───────────────────────
// Intelligence sub-types are defined in src/intelligence/types.ts

export interface Intelligence {
  classification: ProjectClassification;
  maturity: MaturityEstimate;
  health: HealthScore;
  entryPoints: EntryPoint[];
  directoryRoles: DirectoryRole[];
  buildPipeline: BuildPipeline;
  dependencies: DependencyAnalysis;
  strengths: Strength[];
  suggestions: Suggestion[];
  insights: ArchitectureInsight[];
}

/**
 * FullIntelligence extends Intelligence with architecture analysis.
 *
 * This type is used in the final Analysis output where architecture
 * analysis has been completed. Unlike the mutable `architecture?`
 * pattern, this type encodes the presence of architecture data
 * at the type level — no `if (intelligence.architecture)` checks
 * needed where the pipeline guarantees it's populated.
 */
export interface FullIntelligence extends Intelligence {
  architecture: ArchitectureAnalysis;
}

// ─── Final Analysis Output ───────────────────────────────────────

export interface Analysis {
  schemaVersion: string;
  projectName: string;
  generatedAt: string;
  cliVersion: string;
  stats: {
    totalFiles: number;
    totalDirectories: number;
    totalSize: number;
    scannedPath: string;
    maxDepth: number;
    avgFilesPerDirectory: number;
    largestDirectory: string;
    largestDirectoryFiles: number;
    largestFile: string;
    largestFileSize: number;
  };
  technologies: Technology[];
  intelligence: FullIntelligence;
  tree: string;
  architecture: string;
}
