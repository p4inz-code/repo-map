import { describe, it, expect } from 'vitest';
import { detectLayerViolations } from '../../src/architecture/layer-violations.js';
import type { FileEntry, DependencyGraph } from '../../src/types.js';

describe('detectLayerViolations', () => {
  it('detects UI importing infrastructure', () => {
    const graph: DependencyGraph = {
      nodes: [
        { name: 'Button.tsx', path: 'components/Button.tsx', imports: ['data/api.ts'], importedBy: [], internalImports: 1, externalImports: 0, isEntryPoint: false },
        { name: 'api.ts', path: 'data/api.ts', imports: [], importedBy: ['components/Button.tsx'], internalImports: 0, externalImports: 0, isEntryPoint: false },
      ],
      edges: [{ from: 'components/Button.tsx', to: 'data/api.ts', isExternal: false }],
      centralModules: [], leafModules: [], hubModules: [], isolatedModules: [], sharedUtilities: [], coreModules: [],
    };
    const result = detectLayerViolations([], graph);
    expect(result.some((v) => v.source === 'presentation' && v.target === 'infrastructure')).toBe(true);
  });

  it('returns empty for no violations', () => {
    const graph: DependencyGraph = {
      nodes: [
        { name: 'a.ts', path: 'a.ts', imports: [], importedBy: [], internalImports: 0, externalImports: 0, isEntryPoint: false },
      ],
      edges: [],
      centralModules: [], leafModules: [], hubModules: [], isolatedModules: [], sharedUtilities: [], coreModules: [],
    };
    const result = detectLayerViolations([], graph);
    expect(result).toEqual([]);
  });
});
