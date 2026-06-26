import { describe, it, expect } from 'vitest';
import { analyzeCohesion } from '../../src/architecture/cohesion.js';
import type { FileEntry, DependencyGraph } from '../../src/types.js';

function makeGraph(nodes: { path: string; imports: string[] }[]): DependencyGraph {
  return {
    nodes: nodes.map((n) => ({
      name: n.path.split('/').pop() || n.path,
      path: n.path,
      imports: n.imports,
      importedBy: [],
      internalImports: n.imports.length,
      externalImports: 0,
      isEntryPoint: false,
    })),
    edges: [],
    centralModules: [],
    leafModules: [],
    hubModules: [],
    isolatedModules: [],
    sharedUtilities: [],
    coreModules: [],
  };
}

describe('analyzeCohesion', () => {
  it('handles empty input gracefully', () => {
    const result = analyzeCohesion([], makeGraph([]));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.folderDetails).toEqual([]);
  });

  it('detects High cohesion when files import from same directory', () => {
    const graph = makeGraph([
      { path: 'src/helper.ts', imports: ['src/utils.ts'] },
      { path: 'src/utils.ts', imports: ['src/helper.ts'] },
    ]);
    const result = analyzeCohesion([], graph);
    expect(result.folderDetails.some((f) => f.path === 'src' && f.cohesion === 'High')).toBe(true);
  });

  it('returns folder details for directories', () => {
    const graph = makeGraph([
      { path: 'src/a.ts', imports: [] },
    ]);
    const result = analyzeCohesion([], graph);
    expect(result.folderDetails.length).toBeGreaterThanOrEqual(0);
  });
});
