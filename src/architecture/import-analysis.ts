import type { ImportAnalysis, ImportStat, DependencyGraph } from '../types.js';
import type { ImportParseResult } from './import-parser.js';

/**
 * Analyzes import statistics from the dependency graph.
 * Pure function — no I/O.
 */
export function analyzeImports(
  imports: ImportParseResult[],
  graph: DependencyGraph,
): ImportAnalysis {
  const allPaths = new Set(imports.map((i) => i.path));

  // Build import counts: how many other files import each module
  const importCounts = new Map<string, { count: number; importedBy: string[] }>();

  for (const node of graph.nodes) {
    if (node.importedBy.length > 0) {
      importCounts.set(node.path, {
        count: node.importedBy.length,
        importedBy: node.importedBy,
      });
    }
  }

  // Sort by import count
  const sorted = [...importCounts.entries()]
    .map(([path, data]) => ({ path, importedCount: data.count, importedBy: data.importedBy }))
    .sort((a, b) => b.importedCount - a.importedCount);

  // Most imported (top 10)
  const mostImported = sorted.slice(0, 10);

  // Least imported (bottom 10, but only those that ARE imported)
  const leastImported = sorted.slice(-10).reverse().filter((s) => s.importedCount === 1);

  // Potential dead modules (files that are never imported and import nothing internally)
  const potentialDeadModules = graph.nodes
    .filter((n) => n.importedBy.length === 0 && n.internalImports === 0 && !n.isEntryPoint)
    .slice(0, 10)
    .map((n) => n.path);

  // Hotspots (modules imported by many AND have high complexity or size)
  const hotspots = sorted.filter((s) => s.importedCount >= 3).slice(0, 10);

  // Total import counts
  let totalInternal = 0;
  let totalExternal = 0;
  for (const imp of imports) {
    totalInternal += imp.internalImports.length;
    totalExternal += imp.externalImports.length;
  }

  return {
    mostImported,
    leastImported,
    potentialDeadModules,
    hotspots,
    totalInternalImports: totalInternal,
    totalExternalImports: totalExternal,
  };
}
