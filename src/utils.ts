import type { FileEntry } from './types.js';

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
