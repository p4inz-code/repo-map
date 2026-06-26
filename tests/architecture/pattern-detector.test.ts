import { describe, it, expect } from 'vitest';
import { detectArchitecturePatterns } from '../../src/architecture/pattern-detector.js';
import type { FileEntry, DependencyGraph } from '../../src/types.js';

function file(relativePath: string): FileEntry {
  return { path: `/repo/${relativePath}`, relativePath, size: 100, isDirectory: false };
}

function emptyGraph(): DependencyGraph {
  return { nodes: [], edges: [], centralModules: [], leafModules: [], hubModules: [], isolatedModules: [], sharedUtilities: [], coreModules: [] };
}

describe('detectArchitecturePatterns', () => {
  it('detects Layered Architecture with presentation, business, data dirs', () => {
    const files = [
      file('components/Button.tsx'),
      file('services/auth.ts'),
      file('data/users.ts'),
    ];
    const result = detectArchitecturePatterns(files, emptyGraph(), []);
    expect(result.some((p) => p.name === 'Layered Architecture')).toBe(true);
  });

  it('detects MVC pattern with models, views, controllers', () => {
    const files = [
      file('models/User.ts'),
      file('views/user/show.tsx'),
      file('controllers/users.ts'),
    ];
    const result = detectArchitecturePatterns(files, emptyGraph(), []);
    expect(result.some((p) => p.name === 'MVC')).toBe(true);
  });

  it('detects MVVM pattern with viewmodels directory', () => {
    const files = [file('viewmodels/user.ts')];
    const result = detectArchitecturePatterns(files, emptyGraph(), []);
    expect(result.some((p) => p.name === 'MVVM')).toBe(true);
  });

  it('detects Plugin Architecture with plugins directory', () => {
    const files = [file('plugins/analytics.ts')];
    const result = detectArchitecturePatterns(files, emptyGraph(), []);
    expect(result.some((p) => p.name === 'Plugin Architecture')).toBe(true);
  });

  it('detects Monolith for few directories with many files', () => {
    const files = Array.from({ length: 15 }, (_, i) => file(`src/file${i}.ts`));
    const result = detectArchitecturePatterns(files, emptyGraph(), []);
    expect(result.some((p) => p.name === 'Monolith')).toBe(true);
  });

  it('detects Hexagonal Architecture with domain and adapters', () => {
    const files = [
      file('domain/User.ts'),
      file('usecases/CreateUser.ts'),
      file('adapters/UserRepository.ts'),
    ];
    const result = detectArchitecturePatterns(files, emptyGraph(), []);
    expect(result.some((p) => p.name.includes('Hexagonal'))).toBe(true);
  });

  it('detects Event-Driven with events directory', () => {
    const files = [file('events/user-created.ts')];
    const result = detectArchitecturePatterns(files, emptyGraph(), []);
    expect(result.some((p) => p.name.includes('Event-Driven'))).toBe(true);
  });

  it('returns empty for empty input', () => {
    const result = detectArchitecturePatterns([], emptyGraph(), []);
    expect(result).toEqual([]);
  });

  it('sorts patterns by confidence descending', () => {
    const files = [
      file('components/Button.tsx'),
      file('services/auth.ts'),
      file('data/users.ts'),
      file('models/User.ts'),
      file('views/user.tsx'),
      file('controllers/user.ts'),
    ];
    const result = detectArchitecturePatterns(files, emptyGraph(), []);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].confidence).toBeLessThanOrEqual(result[i - 1].confidence);
    }
  });
});
