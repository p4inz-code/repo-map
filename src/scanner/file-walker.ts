import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
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

export interface WalkProgress {
  files: number;
  dirs: number;
}

export interface WalkOptions {
  filter?: IgnoreFilter;
  maxDepth?: number;
  rootPath: string;
  /**
   * Optional progress callback invoked periodically during traversal.
   * Receives cumulative file and directory counts.
   * Useful for showing live progress in the UI without measurable slowdown.
   */
  onProgress?: (progress: WalkProgress) => void;
}

/**
 * Represents a directory being traversed in the explicit stack.
 * Each frame corresponds to one `readdir` call in the original recursion.
 *
 * - When `entries` is undefined, the frame has just been pushed and
 *   needs its real path resolved and directory read.
 * - `nextIndex` tracks the next entry to process within `entries`.
 */
interface WalkFrame {
  dirPath: string;
  depth: number;
  entries?: Dirent[];
  nextIndex: number;
}

/**
 * Walk a directory tree using an explicit stack instead of recursion.
 *
 * Benefits over recursive traversal:
 * - No stack overflow risk for deeply nested directories (10k+ levels).
 * - Built-in symlink cycle detection via realpath tracking.
 * - Same DFS pre-order output as the original recursive implementation.
 *
 * Cycle detection: before reading a directory, its real path is resolved
 * via `fs.realpath.native()`. If the real path has been visited before,
 * the directory is skipped — this breaks symlink cycles and prevents
 * infinite traversal.
 */
export async function walkDirectory(
  dirPath: string,
  options: WalkOptions,
  currentDepth = 0,
): Promise<FileEntry[]> {
  const { filter, maxDepth, rootPath, onProgress } = options;
  const result: FileEntry[] = [];
  const visitedRealPaths = new Set<string>();

  // Track file/dir counts for progress reporting
  let progressFiles = 0;
  let progressDirs = 0;
  let lastProgressReport = 0;

  const frames: WalkFrame[] = [{ dirPath, depth: currentDepth, nextIndex: 0 }];

  while (frames.length > 0) {
    const frame = frames[frames.length - 1];

    // Depth check
    if (maxDepth !== undefined && frame.depth > maxDepth) {
      frames.pop();
      continue;
    }

    // First visit to this frame: resolve realpath (cycle detection) and read dir
    if (frame.entries === undefined) {
      // Resolve real path for cycle detection
      try {
        const realPath = await fs.realpath(frame.dirPath);
        if (visitedRealPaths.has(realPath)) {
          // Already visited this physical directory via another path — skip to break cycle
          frames.pop();
          continue;
        }
        visitedRealPaths.add(realPath);
      } catch {
        // Permission denied, broken symlink, or inaccessible — skip silently
        frames.pop();
        continue;
      }

      // Read directory entries
      try {
        frame.entries = await fs.readdir(frame.dirPath, { withFileTypes: true });
      } catch {
        // Permission denied or inaccessible — skip silently
        frames.pop();
        continue;
      }
    }

    // Process entries one at a time to maintain DFS pre-order
    while (frame.nextIndex < frame.entries.length) {
      const entry = frame.entries[frame.nextIndex];
      frame.nextIndex++;

      const fullPath = path.join(frame.dirPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);

      if (filter && !filter(relativePath)) continue;

      if (entry.isDirectory()) {
        // Add directory entry FIRST, then push subdirectory as a new frame.
        // The new frame will be processed before we continue with the current
        // frame's remaining entries (DFS pre-order).
        result.push({
          path: fullPath,
          relativePath,
          size: 0,
          isDirectory: true,
        });
        progressDirs++;

        // Report progress periodically (every 100 new items or after each dir)
        const totalItems = progressFiles + progressDirs;
        if (onProgress && totalItems - lastProgressReport >= 100) {
          lastProgressReport = totalItems;
          onProgress({ files: progressFiles, dirs: progressDirs });
        }

        frames.push({ dirPath: fullPath, depth: frame.depth + 1, nextIndex: 0 });

        // Stop processing the current frame — let the outer loop pick up
        // the new subdirectory frame on top of the stack.
        break;
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        if (entry.isSymbolicLink()) {
          // Resolve symlink and verify it points to a regular file.
          // Symlinks to directories are NOT followed (prevents cycles).
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

        result.push({
          path: fullPath,
          relativePath,
          size,
          isDirectory: false,
        });
        progressFiles++;

        // Report progress periodically
        const totalItems = progressFiles + progressDirs;
        if (onProgress && totalItems - lastProgressReport >= 100) {
          lastProgressReport = totalItems;
          onProgress({ files: progressFiles, dirs: progressDirs });
        }
      }
    }

    // If all entries have been processed, pop this frame.
    // IMPORTANT: only pop if this frame is still the top of the stack.
    // When we push a subdirectory frame (above), `frames.pop()` would
    // remove that newly pushed frame instead of the current one.
    if (frame.nextIndex >= frame.entries.length && frames[frames.length - 1] === frame) {
      frames.pop();
    }
  }

  // Final progress report with complete counts
  if (onProgress) {
    onProgress({ files: progressFiles, dirs: progressDirs });
  }

  return result;
}
