import { describe, it, expect } from 'vitest';
import { buildDependencyGraph } from '../../src/architecture/dependency-graph.js';
import type { ImportParseResult } from '../../src/architecture/import-parser.js';

describe('buildDependencyGraph', () => {
  it('creates nodes from import results', () => {
    const imports: ImportParseResult[] = [
      { path: 'src/index.ts', internalImports: [], externalImports: ['react'], absolutePath: '/repo/src/index.ts' },
      { path: 'src/app.ts', internalImports: ['src/utils/helper'], externalImports: [], absolutePath: '/repo/src/app.ts' },
    ];
    const graph = buildDependencyGraph(imports);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes.find((n) => n.path === 'src/index.ts')).toBeDefined();
  });

  it('builds edges from exact path matches', () => {
    const imports: ImportParseResult[] = [
      { path: 'src/app.ts', internalImports: ['src/utils/helper.ts'], externalImports: [], absolutePath: '/repo/src/app.ts' },
      { path: 'src/utils/helper.ts', internalImports: [], externalImports: [], absolutePath: '/repo/src/utils/helper.ts' },
    ];
    const graph = buildDependencyGraph(imports);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].from).toBe('src/app.ts');
    expect(graph.edges[0].to).toBe('src/utils/helper.ts');
  });

  it('resolves imports with implicit extension (.ts)', () => {
    // Internal imports that have been path-resolved but lack a file extension
    // should be resolved by trying common extensions.
    const imports: ImportParseResult[] = [
      { path: 'src/app.ts', internalImports: ['src/utils/helper'], externalImports: [], absolutePath: '/repo/src/app.ts' },
      { path: 'src/utils/helper.ts', internalImports: [], externalImports: [], absolutePath: '/repo/src/utils/helper.ts' },
    ];
    const graph = buildDependencyGraph(imports);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].to).toBe('src/utils/helper.ts');
  });

  it('resolves imports via index.ts for directory paths', () => {
    const imports: ImportParseResult[] = [
      { path: 'src/app.ts', internalImports: ['src/utils'], externalImports: [], absolutePath: '/repo/src/app.ts' },
      { path: 'src/utils/index.ts', internalImports: [], externalImports: [], absolutePath: '/repo/src/utils/index.ts' },
    ];
    const graph = buildDependencyGraph(imports);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].to).toBe('src/utils/index.ts');
  });

  it('does NOT resolve basename-only ambiguous imports', () => {
    // A file that imports './wrong/path/helper' should NOT create an edge
    // to a differently-located 'helper.ts' via basename matching alone.
    const imports: ImportParseResult[] = [
      { path: 'src/app.ts', internalImports: ['src/wrong/path/helper'], externalImports: [], absolutePath: '/repo/src/app.ts' },
      { path: 'src/utils/helper.ts', internalImports: [], externalImports: [], absolutePath: '/repo/src/utils/helper.ts' },
    ];
    const graph = buildDependencyGraph(imports);
    // The import should remain unresolved — no edge created
    expect(graph.edges).toHaveLength(0);
    // The app module should have no resolved imports
    const appNode = graph.nodes.find((n) => n.path === 'src/app.ts');
    expect(appNode!.imports).toHaveLength(0);
  });

  it('handles empty imports', () => {
    const graph = buildDependencyGraph([]);
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it('identifies isolated modules', () => {
    const imports: ImportParseResult[] = [
      { path: 'src/app.ts', internalImports: [], externalImports: [], absolutePath: '/repo/src/app.ts' },
    ];
    const graph = buildDependencyGraph(imports);
    expect(graph.isolatedModules).toContain('src/app.ts');
  });

  it('does not create self-import edges', () => {
    const imports: ImportParseResult[] = [
      { path: 'src/app.ts', internalImports: ['src/app'], externalImports: [], absolutePath: '/repo/src/app.ts' },
    ];
    const graph = buildDependencyGraph(imports);
    // Even if 'src/app.ts' could match itself, no self-edge should be created
    expect(graph.edges).toHaveLength(0);
  });

  // ── New resolution patterns (MEDIUM 2 fix) ──

  it('resolves imports with .mjs extension', () => {
    const imports: ImportParseResult[] = [
      { path: 'src/app.ts', internalImports: ['src/utils/helper'], externalImports: [], absolutePath: '/repo/src/app.ts' },
      { path: 'src/utils/helper.mjs', internalImports: [], externalImports: [], absolutePath: '/repo/src/utils/helper.mjs' },
    ];
    const graph = buildDependencyGraph(imports);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].to).toBe('src/utils/helper.mjs');
  });

  it('resolves imports with .cjs extension', () => {
    const imports: ImportParseResult[] = [
      { path: 'src/app.ts', internalImports: ['src/utils/helper'], externalImports: [], absolutePath: '/repo/src/app.ts' },
      { path: 'src/utils/helper.cjs', internalImports: [], externalImports: [], absolutePath: '/repo/src/utils/helper.cjs' },
    ];
    const graph = buildDependencyGraph(imports);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].to).toBe('src/utils/helper.cjs');
  });

  it('resolves imports via index.tsx for directory paths', () => {
    const imports: ImportParseResult[] = [
      { path: 'src/app.ts', internalImports: ['src/components'], externalImports: [], absolutePath: '/repo/src/app.ts' },
      { path: 'src/components/index.tsx', internalImports: [], externalImports: [], absolutePath: '/repo/src/components/index.tsx' },
    ];
    const graph = buildDependencyGraph(imports);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].to).toBe('src/components/index.tsx');
  });

  it('resolves imports via index.mjs for directory paths', () => {
    const imports: ImportParseResult[] = [
      { path: 'src/app.mjs', internalImports: ['src/utils'], externalImports: [], absolutePath: '/repo/src/app.mjs' },
      { path: 'src/utils/index.mjs', internalImports: [], externalImports: [], absolutePath: '/repo/src/utils/index.mjs' },
    ];
    const graph = buildDependencyGraph(imports);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].to).toBe('src/utils/index.mjs');
  });

  it('resolves imports via index.cjs for directory paths', () => {
    const imports: ImportParseResult[] = [
      { path: 'src/app.cjs', internalImports: ['src/utils'], externalImports: [], absolutePath: '/repo/src/app.cjs' },
      { path: 'src/utils/index.cjs', internalImports: [], externalImports: [], absolutePath: '/repo/src/utils/index.cjs' },
    ];
    const graph = buildDependencyGraph(imports);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].to).toBe('src/utils/index.cjs');
  });

  it('resolves imports with .jsx extension', () => {
    const imports: ImportParseResult[] = [
      { path: 'src/app.ts', internalImports: ['src/components/Button'], externalImports: [], absolutePath: '/repo/src/app.ts' },
      { path: 'src/components/Button.jsx', internalImports: [], externalImports: [], absolutePath: '/repo/src/components/Button.jsx' },
    ];
    const graph = buildDependencyGraph(imports);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].to).toBe('src/components/Button.jsx');
  });
});
