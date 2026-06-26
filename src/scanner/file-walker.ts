import fs from 'node:fs/promises';
import path from 'node:path';
import type { FileEntry } from '../types.js';
import type { IgnoreFilter } from './ignore.js';

const BINARY_CHECK_CHUNK = 512;

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

async function isBinaryFile(filePath: string): Promise<boolean> {
  // Fast path: known binary extensions
  if (hasBinaryExtension(filePath)) {
    return true;
  }

  try {
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
          return false;
        }
      }

      // Null byte detection
      return chunk.includes(0);
    } finally {
      await handle.close().catch(() => {});
    }
  } catch {
    return true;
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
      } else if (entry.isFile()) {
        if (await isBinaryFile(fullPath)) continue;

        let size = 0;
        try {
          size = (await fs.stat(fullPath)).size;
        } catch {
          // stat failed — report size as 0
        }

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
