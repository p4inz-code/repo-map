import fs from 'node:fs/promises';
import path from 'node:path';
import type { FileEntry } from '../types.js';
import type { IgnoreFilter } from './ignore.js';

const BINARY_CHECK_CHUNK = 512;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB — skip files larger than this

// Known binary extensions — skip file content check entirely
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico',
  '.woff', '.woff2', '.ttf', '.eot',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.zip', '.gz', '.tar', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib',
  '.mp3', '.mp4', '.avi', '.mov', '.wav',
  '.o', '.a', '.class', '.pyc',
]);

function hasBinaryExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Checks if a file is binary and returns its size.
 * Returns { isBinary: true, size: 0 } for binary or unreadable files.
 * Returns { isBinary: false, size: <fileSize> } for text files.
 */
async function checkBinaryFile(filePath: string): Promise<{ isBinary: boolean; size: number }> {
  // Fast path: known binary extensions
  if (hasBinaryExtension(filePath)) {
    return { isBinary: true, size: 0 };
  }

  try {
    const stat = await fs.stat(filePath);

    // Skip files over max size
    if (stat.size > MAX_FILE_SIZE) {
      return { isBinary: true, size: 0 };
    }

    const handle = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(BINARY_CHECK_CHUNK);
      const { bytesRead } = await handle.read(buffer, 0, BINARY_CHECK_CHUNK, 0);

      const chunk = buffer.subarray(0, bytesRead);

      // Check for UTF-16 BOMs (treat as text)
      if (bytesRead >= 2) {
        const b0 = chunk[0];
        const b1 = chunk[1];
        if (
          (b0 === 0xff && b1 === 0xfe) ||
          (b0 === 0xfe && b1 === 0xff)
        ) {
          return { isBinary: false, size: stat.size };
        }
      }

      // Null byte detection
      const isBinary = chunk.includes(0);
      return { isBinary, size: stat.size };
    } finally {
      await handle.close().catch(() => {});
    }
  } catch {
    return { isBinary: true, size: 0 };
  }
}

export interface WalkOptions {
  filter?: IgnoreFilter;
  maxDepth?: number;
  rootPath: string;
}

export async function walkDirectory(
  dirPath: string,
  options: WalkOptions,
  currentDepth = 0,
): Promise<FileEntry[]> {
  const { filter, maxDepth, rootPath } = options;

  if (maxDepth !== undefined && currentDepth > maxDepth) {
    return [];
  }

  const entries: FileEntry[] = [];

  try {
    const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of dirEntries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);

      if (filter && !filter(relativePath)) continue;

      if (entry.isDirectory()) {
        entries.push({
          path: fullPath,
          relativePath,
          size: 0,
          isDirectory: true,
        });

        const sub = await walkDirectory(fullPath, options, currentDepth + 1);
        entries.push(...sub);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        if (entry.isSymbolicLink()) {
          // Resolve symlink and verify it points to a regular file
          try {
            const linkTarget = await fs.stat(fullPath);
            if (!linkTarget.isFile()) continue;
          } catch {
            // Broken symlink — skip
            continue;
          }
        }

        const { isBinary, size } = await checkBinaryFile(fullPath);
        if (isBinary) continue;

        entries.push({
          path: fullPath,
          relativePath,
          size,
          isDirectory: false,
        });
      }
    }
  } catch {
    // Permission denied or inaccessible — skip silently
  }

  return entries;
}
