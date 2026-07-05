import type { FileEntry } from '../types.js';
import type { ModuleAnalysis, LargestModule } from './types.js';

/**
 * Analyzes the largest files and folders in the codebase.
 * Pure function — no I/O.
 */
export function analyzeModules(files: FileEntry[]): ModuleAnalysis {
  const norm = (p: string) => p.replace(/\\/g, '/');
  const fileEntries = files.filter((f) => !f.isDirectory);

  // Largest files
  const largestFiles: LargestModule[] = fileEntries
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
    .map((f) => ({
      path: norm(f.relativePath),
      size: f.size,
      type: 'file' as const,
    }));

  // Largest folders (by file count)
  const dirCounts = new Map<string, { count: number; totalSize: number }>();
  for (const f of fileEntries) {
    const p = norm(f.relativePath);
    const dir = p.includes('/') ? p.split('/').slice(0, -1).join('/') : '(root)';
    const existing = dirCounts.get(dir) || { count: 0, totalSize: 0 };
    existing.count++;
    existing.totalSize += f.size;
    dirCounts.set(dir, existing);
  }

  const largestFolders: LargestModule[] = [...dirCounts.entries()]
    .filter(([dir]) => dir !== '(root)')
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([path, data]) => ({
      path,
      size: data.totalSize,
      type: 'folder' as const,
      fileCount: data.count,
    }));

  // Warnings
  const warnings: string[] = [];

  for (const folder of largestFolders) {
    if (folder.fileCount && folder.fileCount > 30) {
      warnings.push(`"${folder.path}" has ${folder.fileCount} files — consider splitting into subdirectories.`);
    }
  }

  const largeFiles = largestFiles.filter((f) => f.size > 50000); // > 50KB
  for (const f of largeFiles) {
    warnings.push(`"${f.path}" is ${(f.size / 1024).toFixed(0)} KB — large files may indicate too many responsibilities.`);
  }

  return { largestFiles, largestFolders, warnings };
}
