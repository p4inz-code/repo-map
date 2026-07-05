import type { FileEntry } from '../types.js';
import type { CohesionResult, DependencyGraph } from './types.js';

/**
 * Estimates cohesion of major folders based on how files within them relate.
 * Pure function — no I/O.
 */
export function analyzeCohesion(
  files: FileEntry[],
  graph: DependencyGraph,
): CohesionResult {
  // Group files by their top-level directory
  const dirFiles = new Map<string, string[]>();
  for (const node of graph.nodes) {
    const parts = node.path.split('/');
    if (parts.length >= 2) {
      const dir = parts[0];
      const existing = dirFiles.get(dir) || [];
      existing.push(node.path);
      dirFiles.set(dir, existing);
    }
  }

  // Build node lookup map for O(1) access (avoids O(n²) linear scans)
  const nodeMap = new Map<string, (typeof graph.nodes)[number]>();
  for (const node of graph.nodes) {
    nodeMap.set(node.path, node);
  }

  const folderDetails: { path: string; cohesion: 'Low' | 'Medium' | 'High'; issues: string[] }[] = [];

  for (const [dir, filePaths] of dirFiles) {
    if (filePaths.length < 2) continue;

    const issues: string[] = [];
    let intraDirImports = 0;
    let interDirImports = 0;

    // Count imports within the same directory vs outside
    for (const filePath of filePaths) {
      const node = nodeMap.get(filePath);
      if (!node) continue;

      for (const imp of node.imports) {
        if (imp.startsWith(dir + '/')) {
          intraDirImports++;
        } else {
          interDirImports++;
        }
      }
    }

    const totalImports = intraDirImports + interDirImports;

    let cohesion: 'Low' | 'Medium' | 'High';

    if (totalImports === 0) {
      cohesion = 'Low';
      issues.push('Files in this directory have no internal dependencies on each other.');
    } else {
      const ratio = intraDirImports / totalImports;
      if (ratio > 0.6) {
        cohesion = 'High';
      } else if (ratio > 0.3) {
        cohesion = 'Medium';
      } else {
        cohesion = 'Low';
        issues.push('Files import more from outside this directory than from within.');
      }
    }

    // Check for unrelated responsibilities (mixing different types)
    if (totalImports === 0 && filePaths.length > 3) {
      issues.push('Many files with no internal dependencies — may be a collection of unrelated utilities.');
    }

    folderDetails.push({ path: dir, cohesion, issues });
  }

  // Overall cohesion score
  const avgScore = folderDetails.length > 0
    ? Math.round(folderDetails.reduce((sum, f) => {
        const s = f.cohesion === 'High' ? 85 : f.cohesion === 'Medium' ? 55 : 25;
        return sum + s;
      }, 0) / folderDetails.length)
    : 0;

  let overall: 'Low' | 'Medium' | 'High';
  if (avgScore >= 70) overall = 'High';
  else if (avgScore >= 40) overall = 'Medium';
  else overall = 'Low';

  return { overall, score: avgScore, folderDetails };
}
