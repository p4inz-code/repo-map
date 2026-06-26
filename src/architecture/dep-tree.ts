import type { VisualDepTree, DependencyGraph } from '../types.js';

/**
 * Generates a visual dependency tree in markdown format.
 * Pure function — no I/O.
 */
export function generateVisualDepTree(graph: DependencyGraph): VisualDepTree {
  if (graph.nodes.length === 0) {
    return { tree: '*(No internal dependencies detected)*\n' };
  }

  const lines: string[] = [];
  lines.push('```');
  lines.push('Module Dependency Tree');
  lines.push('');

  // Find top-level hub modules and build a tree
  const topModules = graph.hubModules.length > 0
    ? graph.hubModules
    : graph.coreModules.length > 0
      ? graph.coreModules
      : graph.nodes.filter((n) => n.isEntryPoint).map((n) => n.path);

  // Show top 5 modules as roots
  const roots = topModules.slice(0, 5);

  for (let i = 0; i < roots.length; i++) {
    const root = roots[i];
    const node = graph.nodes.find((n) => n.path === root);
    if (!node) continue;

    const isLast = i === roots.length - 1;
    const prefix = isLast ? '└── ' : '├── ';
    const name = formatModuleName(root);
    lines.push(`${prefix}${name}`);

    // Show direct dependencies
    const deps = node.imports.slice(0, 8);
    for (let j = 0; j < deps.length; j++) {
      const depIsLast = j === deps.length - 1;
      const depPrefix = isLast ? '    ' : '│   ';
      const connector = depIsLast ? '└── ' : '├── ';
      lines.push(`${depPrefix}${connector}${formatModuleName(deps[j])}`);
    }
    if (node.imports.length > 8) {
      const depPrefix = isLast ? '    ' : '│   ';
      lines.push(`${depPrefix}└── … (${node.imports.length - 8} more)`);
    }
  }

  lines.push('```');
  lines.push('');

  // Summary stats
  lines.push('**Dependency Graph Summary**');
  lines.push('');
  lines.push(`- **${graph.nodes.length}** modules analyzed`);
  lines.push(`- **${graph.edges.length}** internal dependencies`);
  lines.push(`- **${graph.hubModules.length}** hub modules (import many others)`);
  lines.push(`- **${graph.leafModules.length}** leaf modules (imported by none)`);
  lines.push(`- **${graph.centralModules.length}** central modules (imported by many)`);
  lines.push(`- **${graph.isolatedModules.length}** isolated modules (no dependencies)`);

  return { tree: lines.join('\n') };
}

function formatModuleName(path: string): string {
  // Strip extension and show last 2 path components
  const name = path.replace(/\.[a-z]+$/i, '');
  const parts = name.split('/');
  if (parts.length <= 2) return name;
  return '.../' + parts.slice(-2).join('/');
}
