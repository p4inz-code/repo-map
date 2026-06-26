import type { CircularDependency } from '../types.js';
import type { DependencyGraph } from '../types.js';
import type { ImportParseResult } from './import-parser.js';

/**
 * Detects circular dependencies in the module dependency graph.
 * Uses DFS-based cycle detection.
 * Pure function — no I/O.
 */
export function detectCircularDependencies(
  imports: ImportParseResult[],
  graph: DependencyGraph,
): CircularDependency[] {
  const adjList = new Map<string, string[]>();
  const allPaths = new Set(imports.map((i) => i.path));

  // Build adjacency list
  for (const node of graph.nodes) {
    adjList.set(node.path, node.imports);
  }

  const cycles: CircularDependency[] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const pathStack: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    recStack.add(node);
    pathStack.push(node);

    const neighbors = adjList.get(node) || [];
    for (const neighbor of neighbors) {
      if (!allPaths.has(neighbor)) continue; // Skip unresolved imports
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        // Found a cycle — extract the cycle path
        const cycleStart = pathStack.indexOf(neighbor);
        const cycle = pathStack.slice(cycleStart);
        if (cycle.length >= 2) {
          cycles.push({
            cycle: [...cycle, neighbor], // Close the cycle
            severity: cycle.length <= 3 ? 'low' : cycle.length <= 5 ? 'medium' : 'high',
            fileCount: cycle.length,
            recommendation: generateCycleRecommendation(cycle),
          });
        }
      }
    }

    pathStack.pop();
    recStack.delete(node);
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.path)) {
      dfs(node.path);
    }
  }

  // Deduplicate cycles (same set of files in different order)
  const uniqueCycles = deduplicateCycles(cycles);

  return uniqueCycles;
}

function generateCycleRecommendation(cycle: string[]): string {
  const names = cycle.map((p) => p.split('/').pop() || p);

  if (cycle.length <= 3) {
    return `Extract the shared dependency from ${names[0]} and ${names[1]} into a separate module that both can import without creating a cycle.`;
  }
  if (cycle.length <= 5) {
    return `Consider introducing an interface or abstract layer that breaks the dependency chain: ${names.join(' → ')}. A dependency inversion principle (DIP) approach would help here.`;
  }
  return `Large cycle detected across ${cycle.length} modules (${names.join(' → ')}). Consider restructuring the architecture to eliminate the circular dependency by extracting shared logic into a common module.`;
}

function deduplicateCycles(cycles: CircularDependency[]): CircularDependency[] {
  const seen = new Set<string>();
  return cycles.filter((c) => {
    const key = [...c.cycle].sort().join(',');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
