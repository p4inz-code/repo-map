import { describe, it, expect } from 'vitest';
import { DetectorRegistry } from '../../../src/analyzer/detectors/registry.js';
import type { Detector } from '../../../src/analyzer/detectors/types.js';
import type { Technology } from '../../../src/types.js';

function makeDetector(name: string, technologies: Technology[]): Detector {
  return {
    name,
    async detect() {
      return technologies;
    },
  };
}

describe('DetectorRegistry', () => {
  it('returns empty array when no detectors registered', async () => {
    const registry = new DetectorRegistry();
    const result = await registry.detectAll([], '/repo');
    expect(result).toEqual([]);
  });

  it('collects technologies from all detectors', async () => {
    const registry = new DetectorRegistry();
    registry.register(
      makeDetector('lang', [
        { name: 'TypeScript', category: 'language', evidence: 'found .ts' },
      ]),
    );
    registry.register(
      makeDetector('tool', [
        { name: 'Docker', category: 'tool', evidence: 'found Dockerfile' },
      ]),
    );

    const result = await registry.detectAll([], '/repo');
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toContain('TypeScript');
    expect(result.map((r) => r.name)).toContain('Docker');
  });

  it('deduplicates by name (first detector wins)', async () => {
    const registry = new DetectorRegistry();
    registry.register(
      makeDetector('lang', [
        { name: 'TypeScript', category: 'language', evidence: 'from lang' },
      ]),
    );
    registry.register(
      makeDetector('framework', [
        { name: 'TypeScript', category: 'framework', evidence: 'from framework' },
      ]),
    );

    const result = await registry.detectAll([], '/repo');
    expect(result).toHaveLength(1);
    // First detector's category wins
    expect(result[0].category).toBe('language');
    expect(result[0].evidence).toBe('from lang');
  });

  it('preserves registration order in results', async () => {
    const registry = new DetectorRegistry();
    registry.register(
      makeDetector('first', [
        { name: 'A', category: 'language', evidence: 'first' },
      ]),
    );
    registry.register(
      makeDetector('second', [
        { name: 'B', category: 'framework', evidence: 'second' },
      ]),
    );

    const result = await registry.detectAll([], '/repo');
    expect(result[0].name).toBe('A');
    expect(result[1].name).toBe('B');
  });

  it('handles detectors that return multiple technologies', async () => {
    const registry = new DetectorRegistry();
    registry.register(
      makeDetector('all', [
        { name: 'TypeScript', category: 'language', evidence: 'a' },
        { name: 'JavaScript', category: 'language', evidence: 'b' },
        { name: 'React', category: 'framework', evidence: 'c' },
      ]),
    );

    const result = await registry.detectAll([], '/repo');
    expect(result).toHaveLength(3);
  });

  it('handles detectors that return empty arrays', async () => {
    const registry = new DetectorRegistry();
    registry.register(makeDetector('empty', []));
    registry.register(
      makeDetector('has-stuff', [
        { name: 'Python', category: 'language', evidence: 'found .py' },
      ]),
    );

    const result = await registry.detectAll([], '/repo');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Python');
  });
});
