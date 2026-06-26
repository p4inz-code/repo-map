import { fileCache } from '../file-cache.js';
import { processBatch } from '../batch.js';
import type { FileEntry } from '../types.js';

/** Result of parsing a single file's imports. */
export interface ImportParseResult {
  /** Relative file path (normalized) */
  path: string;
  /** Internal imports (relative paths starting with ./ or ../) */
  internalImports: string[];
  /** External imports (bare module names like 'react', 'lodash') */
  externalImports: string[];
  /** Absolute file path for reading */
  absolutePath: string;
}

/**
 * Supported language file extensions for import parsing.
 */
const PARSEABLE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts',
  '.py', '.java', '.kt', '.go', '.rs', '.rb', '.php', '.cs',
]);

/**
 * Parse import/require statements from a source file.
 */
function parseImports(content: string, filePath: string): { internal: string[]; external: string[] } {
  const internal: string[] = [];
  const external: string[] = [];
  const ext = filePath.split('.').pop()?.toLowerCase();

  // TypeScript / JavaScript: import statements and require calls
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts'].includes(ext || '')) {
    // Static imports: import ... from 'module'
    const importRegex = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const moduleName = match[1];
      classifyImport(moduleName, internal, external);
    }

    // Dynamic imports: import('module')
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      const moduleName = match[1];
      classifyImport(moduleName, internal, external);
    }

    // require calls: require('module')
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const moduleName = match[1];
      classifyImport(moduleName, internal, external);
    }
  }

  // Python: import statements
  if (ext === 'py') {
    // import module
    const importRegex = /^import\s+(\S+)/gm;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const fullName = match[1];
      // Relative imports in Python: import .module or import ..module
      if (fullName.startsWith('.')) {
        internal.push(fullName);
      } else {
        const moduleName = fullName.split('.')[0]; // Just the top-level module
        external.push(moduleName);
      }
    }

    // from module import ...
    const fromRegex = /^from\s+(\S+)\s+import/gm;
    while ((match = fromRegex.exec(content)) !== null) {
      const fullName = match[1];
      if (fullName.startsWith('.')) {
        internal.push(fullName);
      } else {
        const moduleName = fullName.split('.')[0];
        external.push(moduleName);
      }
    }
  }

  // Java: import statements
  if (ext === 'java' || ext === 'kt') {
    const importRegex = /^import\s+(\S+)/gm;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const full = match[1];
      // Check if it's an internal project import (package starting with project name)
      // For simplicity, treat all as external since we can't determine internal packages
      external.push(full);
    }
  }

  // Go: import statements
  if (ext === 'go') {
    const importRegex = /['"]((?:[^'"]+\/)+[^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const moduleName = match[1];
      // Relative internal imports in Go
      if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
        internal.push(moduleName);
      } else {
        external.push(moduleName);
      }
    }
  }

  // Rust: use statements
  if (ext === 'rs') {
    const useRegex = /^use\s+(\S+)/gm;
    let match;
    while ((match = useRegex.exec(content)) !== null) {
      const moduleName = match[1].split('::')[0];
      // crate:: or self:: or super:: are internal
      if (moduleName === 'crate' || moduleName === 'self' || moduleName === 'super') {
        internal.push(match[1]);
      } else {
        external.push(moduleName);
      }
    }
  }

  // Ruby: require statements
  if (ext === 'rb') {
    const requireRegex = /^(?:require|require_relative)\s+['"]([^'"]+)['"]/gm;
    let match;
    while ((match = requireRegex.exec(content)) !== null) {
      const moduleName = match[1];
      if (moduleName.startsWith('./') || moduleName.startsWith('../') || match[0].startsWith('require_relative')) {
        internal.push(moduleName);
      } else {
        external.push(moduleName);
      }
    }
  }

  // PHP: use/require statements
  if (ext === 'php') {
    const useRegex = /^use\s+(\S+)/gm;
    let match;
    while ((match = useRegex.exec(content)) !== null) {
      external.push(match[1]);
    }
    const requireRegex = /(?:require|require_once|include|include_once)\s+['"]([^'"]+)['"]/gm;
    while ((match = requireRegex.exec(content)) !== null) {
      const moduleName = match[1];
      if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
        internal.push(moduleName);
      } else {
        external.push(moduleName);
      }
    }
  }

  return { internal: [...new Set(internal)], external: [...new Set(external)] };
}

/**
 * Classify an import as internal (relative) or external (bare module name).
 */
function classifyImport(moduleName: string, internal: string[], external: string[]): void {
  if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
    // Resolve relative path to a normalized path
    internal.push(moduleName);
  } else {
    // External bare import (or potentially internal if it matches a local directory)
    external.push(moduleName);
  }
}

/**
 * Resolve a relative import path against the source file to get the target path.
 * E.g., if file is src/utils/helper.ts and import is '../index.ts', result is 'src/index.ts'.
 */
function resolveRelativeImport(importPath: string, sourceFile: string): string {
  const sourceDir = sourceFile.split('/').slice(0, -1).join('/');
  const parts = importPath.split('/');
  const result: string[] = sourceDir ? sourceDir.split('/') : [];

  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      if (result.length > 0) result.pop();
    } else {
      result.push(part);
    }
  }

  return result.join('/');
}

async function parseSingleFile(file: FileEntry): Promise<ImportParseResult | null> {
  if (file.isDirectory) return null;
  const ext = file.relativePath.split('.').pop()?.toLowerCase();
  if (!ext || !PARSEABLE_EXTENSIONS.has('.' + ext)) return null;

  try {
    const content = await fileCache.read(file.path);
    if (!content) return null;
    const { internal, external } = parseImports(content, file.relativePath);

    // Resolve relative imports to normalized paths
    const resolvedInternal = internal.map((imp) => {
      if (imp.startsWith('./') || imp.startsWith('../')) {
        const normalized = file.relativePath.replace(/\\/g, '/');
        return resolveRelativeImport(imp, normalized);
      }
      return imp;
    });

    return {
      path: file.relativePath.replace(/\\/g, '/'),
      internalImports: resolvedInternal,
      externalImports: external,
      absolutePath: file.path,
    };
  } catch {
    return null;
  }
}

/**
 * Parse imports from multiple source files.
 * Reads file contents and extracts import statements using bounded concurrency.
 */
export async function parseFileImports(files: FileEntry[]): Promise<ImportParseResult[]> {
  const sourceFiles = files.filter((f) => {
    if (f.isDirectory) return false;
    const ext = f.relativePath.split('.').pop()?.toLowerCase();
    return ext && PARSEABLE_EXTENSIONS.has('.' + ext);
  });

  const results = await processBatch(sourceFiles, parseSingleFile, 50);
  return results.filter((r): r is ImportParseResult => r !== null);
}

/**
 * Parse imports from file content (synchronous, for testing).
 */
export function parseImportsFromContent(content: string, filePath: string): { internal: string[]; external: string[] } {
  return parseImports(content, filePath);
}
