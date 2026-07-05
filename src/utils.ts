import type { FileEntry } from './types.js';

/**
 * Centralized color decision logic.
 * Returns `false` if NO_COLOR is set (via env var or `--no-color` flag).
 *
 * This is the SINGLE source of truth for color decisions across the
 * entire CLI. Every renderer and every error path must use this helper.
 *
 * @param argv - Optional CLI args to check for `--no-color` flag.
 *               Used by early error paths before CLI options are parsed.
 */
export function isColorEnabled(argv?: string[]): boolean {
  if (process.env.NO_COLOR === '1' || process.env.NO_COLOR === 'true') return false;
  if (argv && argv.includes('--no-color')) return false;
  return true;
}

/**
 * Formats byte size into a human-readable string.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Check if any file has a linter configuration. */
export function hasLinterConfig(files: FileEntry[]): boolean {
  return files.some((f) => {
    const r = f.relativePath;
    return r.includes('.eslintrc') || r.includes('eslint.config.') ||
           r === '.jshintrc' || r === '.rubocop.yml' ||
           r === 'pylintrc' || r === '.pylintrc';
  });
}

/** Check if any file has a formatter configuration. */
export function hasFormatterConfig(files: FileEntry[]): boolean {
  return files.some((f) => {
    const r = f.relativePath;
    return r.includes('.prettierrc') || r === '.editorconfig' ||
           r === 'prettier.config.js';
  });
}

/** Check if any file is a test file. */
export function hasTestFiles(files: FileEntry[]): boolean {
  return files.some((f) => {
    const r = f.relativePath.replace(/\\/g, '/').toLowerCase();
    return r.includes('.test.') || r.includes('.spec.');
  });
}
