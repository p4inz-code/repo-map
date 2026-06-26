export const CURRENT_SCHEMA_VERSION = '1.0.0';
export const CLI_VERSION = '0.2.0';

export interface FileEntry {
  path: string;
  relativePath: string;
  size: number;
  isDirectory: boolean;
}

export interface ScanResult {
  rootPath: string;
  files: FileEntry[];
  ignoredPatterns: string[];
  stats: {
    totalFiles: number;
    totalDirectories: number;
    totalSize: number;
  };
}

export interface Technology {
  name: string;
  category: 'language' | 'framework' | 'tool';
  version?: string;
  evidence: string;
  /** Number of files associated with this technology (primarily for languages). */
  count?: number;
}

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
  };
  technologies: Technology[];
  tree: string;
  architecture: string;
}

export interface CliOptions {
  path: string;
  format: 'json' | 'markdown';
  depth?: number;
  output?: string;
  useGitignore: boolean;
  exclude?: string[];
  include?: string[];
  stats?: boolean;
}
