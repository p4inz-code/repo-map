import type { FileEntry } from '../types.js';
import type { ComplexityScore, DependencyGraph } from './types.js';
import type { ImportParseResult } from './import-parser.js';
import { fileCache } from '../file-cache.js';
import { processBatch } from '../batch.js';

const ANALYZABLE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts',
  'py', 'go', 'rs', 'java', 'kt', 'rb', 'php',
]);

async function scoreSingleFile(
  file: FileEntry,
  graph: DependencyGraph,
  imports: ImportParseResult[],
): Promise<ComplexityScore | null> {
  if (file.isDirectory) return null;
  const ext = file.relativePath.split('.').pop()?.toLowerCase();
  if (!ext || !ANALYZABLE_EXTENSIONS.has(ext)) return null;

  const normalizedPath = file.relativePath.replace(/\\/g, '/');
  const imp = imports.find((i) => i.path === normalizedPath);

  const factors: { name: string; value: number }[] = [];

  const sizeKB = file.size / 1024;
  factors.push({ name: 'Size', value: Math.round(sizeKB * 10) / 10 });

  const importCount = imp ? imp.internalImports.length + imp.externalImports.length : 0;
  factors.push({ name: 'Imports', value: importCount });

  let exportCount = 0;
  let functionCount = 0;
  let classCount = 0;
  try {
    const content = await fileCache.read(file.path);
    if (!content) return null;
    const exportMatches = content.match(/^export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+/gm);
    exportCount = exportMatches ? exportMatches.length : 0;
    const funcMatches = content.match(/(?:^|\s)(?:function|async function)\s+\w+/gm);
    functionCount = funcMatches ? funcMatches.length : 0;
    const classMatches = content.match(/(?:^|\s)class\s+\w+/gm);
    classCount = classMatches ? classMatches.length : 0;
  } catch {
    return null;
  }
  factors.push({ name: 'Exports', value: exportCount });
  factors.push({ name: 'Functions', value: functionCount });
  factors.push({ name: 'Classes', value: classCount });

  const rawScore =
    (sizeKB * 0.3) +
    (importCount * 1.5) +
    (exportCount * 2) +
    (functionCount * 3) +
    (classCount * 5);

  let level: 'Simple' | 'Moderate' | 'Complex' | 'Very Complex';
  if (rawScore < 15) level = 'Simple';
  else if (rawScore < 35) level = 'Moderate';
  else if (rawScore < 70) level = 'Complex';
  else level = 'Very Complex';

  return {
    path: normalizedPath,
    level,
    score: Math.round(rawScore),
    factors,
  };
}

/**
 * Estimates complexity for source files using bounded concurrency.
 * Uses size, import count, and structural heuristics.
 */
export async function scoreComplexity(
  files: FileEntry[],
  graph: DependencyGraph,
  imports: ImportParseResult[],
): Promise<ComplexityScore[]> {
  const sourceFiles = files.filter((f) => {
    if (f.isDirectory) return false;
    const ext = f.relativePath.split('.').pop()?.toLowerCase();
    return ext && ANALYZABLE_EXTENSIONS.has(ext);
  });

  const results = await processBatch(
    sourceFiles,
    (file) => scoreSingleFile(file, graph, imports),
    50,
  );

  const scores = results.filter((r): r is ComplexityScore => r !== null);
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, 20);
}
