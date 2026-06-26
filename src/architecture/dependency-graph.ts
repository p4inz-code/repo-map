import type { DependencyGraph, ModuleNode } from '../types.js';
import type { ImportParseResult } from './import-parser.js';

/**
 * Builds a module dependency graph from parsed import data.
 * Pure function — no I/O.
 */
export function buildDependencyGraph(imports: ImportParseResult[]): DependencyGraph {
  const nodeMap = new Map<string, ModuleNode>();
  const edges: { from: string; to: string; isExternal: boolean }[] = [];
  const allPaths = new Set(imports.map((i) => i.path));

  // Initialize nodes
  for (const imp of imports) {
    nodeMap.set(imp.path, {
      name: imp.path.split('/').pop() || imp.path,
      path: imp.path,
      imports: [],
      importedBy: [],
      internalImports: imp.internalImports.length,
      externalImports: imp.externalImports.length,
      isEntryPoint: false,
    });
  }

  // Build edges from internal imports
  for (const imp of imports) {
    const fromNode = nodeMap.get(imp.path);
    if (!fromNode) continue;

    for (const target of imp.internalImports) {
      // Try to match the import to an actual file in the project
      let resolvedPath = target;

      // Try exact match first — no basename-only fallback is performed.
      // Ambiguous module name matching would create incorrect dependency edges.
      // Unresolved imports are preserved as diagnostics rather than becoming
      // speculative edges. See Repository Intelligence Principle #1.
      if (allPaths.has(target)) {
        resolvedPath = target;
      } else if (allPaths.has(target + '.ts')) {
        resolvedPath = target + '.ts';
      } else if (allPaths.has(target + '.tsx')) {
        resolvedPath = target + '.tsx';
      } else if (allPaths.has(target + '.js')) {
        resolvedPath = target + '.js';
      } else if (allPaths.has(target + '.jsx')) {
        resolvedPath = target + '.jsx';
      } else if (allPaths.has(target + '/index.ts')) {
        resolvedPath = target + '/index.ts';
      } else if (allPaths.has(target + '/index.js')) {
        resolvedPath = target + '/index.js';
      } else if (allPaths.has(target + '.py')) {
        resolvedPath = target + '.py';
      } else if (allPaths.has(target + '.rs')) {
        resolvedPath = target + '.rs';
      } else if (allPaths.has(target + '.go')) {
        resolvedPath = target + '.go';
      } else if (allPaths.has(target + '.kt')) {
        resolvedPath = target + '.kt';
      } else if (allPaths.has(target + '.mjs')) {
        resolvedPath = target + '.mjs';
      } else if (allPaths.has(target + '.cjs')) {
        resolvedPath = target + '.cjs';
      }
      // NOTE: No basename-only fallback here by design.
      // Ambiguous module name matching (e.g., matching 'helper' to any file named
      // 'helper.ts' in the project) would create incorrect dependency edges.
      // Unresolved imports are preserved as diagnostics rather than becoming
      // speculative edges. See Repository Intelligence Principle #1.

      // Skip self-imports and imports that couldn't be resolved
      if (resolvedPath === imp.path) continue;
      if (!allPaths.has(resolvedPath)) continue;

      fromNode.imports.push(resolvedPath);
      edges.push({ from: imp.path, to: resolvedPath, isExternal: false });

      const targetNode = nodeMap.get(resolvedPath);
      if (targetNode) {
        targetNode.importedBy.push(imp.path);
      }
    }
  }

  const nodes = [...nodeMap.values()];

  // Mark entry points (files with no importers)
  for (const node of nodes) {
    if (node.importedBy.length === 0 && node.internalImports > 0) {
      node.isEntryPoint = true;
    }
  }

  // Find central modules (most imported by others)
  const sortedByImported = [...nodes].sort((a, b) => b.importedBy.length - a.importedBy.length);
  const centralModules = sortedByImported
    .filter((n) => n.importedBy.length > 0 && n.importedBy.length >= Math.max(2, nodes.length * 0.05))
    .slice(0, 5)
    .map((n) => n.path);

  // Leaf modules (import others but are not imported themselves)
  const leafModules = nodes
    .filter((n) => n.internalImports > 0 && n.importedBy.length === 0)
    .sort((a, b) => b.internalImports - a.internalImports)
    .slice(0, 5)
    .map((n) => n.path);

  // Hub modules (high out-degree, many internal imports)
  const hubModules = [...nodes]
    .filter((n) => n.internalImports > 2)
    .sort((a, b) => b.internalImports - a.internalImports)
    .slice(0, 5)
    .map((n) => n.path);

  // Isolated modules (no imports, no importers)
  const isolatedModules = nodes
    .filter((n) => n.internalImports === 0 && n.importedBy.length === 0 && !n.isEntryPoint)
    .slice(0, 5)
    .map((n) => n.path);

  // Shared utilities (imported by many, but they don't import much themselves)
  const sharedUtilities = [...nodes]
    .filter((n) => n.importedBy.length > 1 && n.internalImports <= 2)
    .sort((a, b) => b.importedBy.length - a.importedBy.length)
    .slice(0, 5)
    .map((n) => n.path);

  // Core modules (imported by many and import from many)
  const coreModules = [...nodes]
    .filter((n) => n.importedBy.length > 1 && n.internalImports > 1)
    .sort((a, b) => (b.importedBy.length + b.internalImports) - (a.importedBy.length + a.internalImports))
    .slice(0, 5)
    .map((n) => n.path);

  return {
    nodes,
    edges,
    centralModules,
    leafModules,
    hubModules,
    isolatedModules,
    sharedUtilities,
    coreModules,
  };
}
