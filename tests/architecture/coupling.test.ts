import { describe, it, expect } from 'vitest';
import { analyzeCoupling } from '../../src/architecture/coupling.js';
import type { DependencyGraph } from '../../src/types.js';

function makeGraph(nodes: { path: string; importedBy: number; imports: number }[]): DependencyGraph {
  return {
    nodes: nodes.map((n) => ({
      name: n.path.split('/').pop() || n.path,
      path: n.path,
      imports: Array.from({ length: n.imports }, (_, i) => `dep${i}.ts`),
      importedBy: Array.from({ length: n.importedBy }, (_, i) => `importer${i}.ts`),
      internalImports: n.imports,
      externalImports: 0,
      isEntryPoint: n.importedBy === 0 && n.imports > 0,
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

describe('analyzeCoupling', () => {
  it('returns Low coupling for empty graph', () => {
    const result = analyzeCoupling(makeGraph([]));
    expect(result.level).toBe('Low');
  });

  it('returns Low coupling when most modules have no dependencies', () => {
    const graph = makeGraph([
      { path: 'a.ts', importedBy: 0, imports: 0 },
      { path: 'b.ts', importedBy: 0, imports: 0 },
      { path: 'c.ts', importedBy: 0, imports: 0 },
    ]);
    const result = analyzeCoupling(graph);
    expect(result.level).toBe('Low');
  });

  it('returns expected coupling level', () => {
    const graph = makeGraph([
      { path: 'a.ts', importedBy: 0, imports: 0 },
      { path: 'b.ts', importedBy: 0, imports: 0 },
    ]);
    const result = analyzeCoupling(graph);
    expect(result.level).toBe('Low');
    expect(result.details).toHaveLength(0);
  });

  it('includes details about most coupled modules', () => {
    const graph = makeGraph([
      { path: 'hub.ts', importedBy: 10, imports: 5 },
      { path: 'a.ts', importedBy: 0, imports: 1 },
    ]);
    const result = analyzeCoupling(graph);
    expect(result.details.length).toBeGreaterThan(0);
    expect(result.details[0].module).toBe('hub.ts');
  });

  it('provides explanation text', () => {
    const graph = makeGraph([
      { path: 'a.ts', importedBy: 1, imports: 1 },
    ]);
    const result = analyzeCoupling(graph);
    expect(result.explanation.length).toBeGreaterThan(0);
  });
});
