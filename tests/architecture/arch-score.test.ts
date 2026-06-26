import { describe, it, expect } from 'vitest';
import { calculateArchScore } from '../../src/architecture/arch-score.js';
import type { CouplingResult, CohesionResult } from '../../src/types.js';

describe('calculateArchScore', () => {
  const goodCoupling: CouplingResult = { level: 'Low', score: 25, explanation: '', details: [] };
  const badCoupling: CouplingResult = { level: 'Very High', score: 95, explanation: '', details: [] };
  const goodCohesion: CohesionResult = { overall: 'High', score: 85, folderDetails: [] };
  const badCohesion: CohesionResult = { overall: 'Low', score: 20, folderDetails: [] };

  it('returns higher score for good coupling and cohesion', () => {
    const good = calculateArchScore(goodCoupling, goodCohesion, true, true, true, 2);
    const bad = calculateArchScore(badCoupling, badCohesion, false, false, false, 10);
    expect(good.overall).toBeGreaterThan(bad.overall);
  });

  it('returns score between 0 and 100', () => {
    const result = calculateArchScore(goodCoupling, goodCohesion, true, true, true, 2);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.maxScore).toBe(100);
  });

  it('includes all 6 dimensions', () => {
    const result = calculateArchScore(goodCoupling, goodCohesion, true, true, true, 2);
    expect(result.coupling).toBeDefined();
    expect(result.cohesion).toBeDefined();
    expect(result.layering).toBeDefined();
    expect(result.organization).toBeDefined();
    expect(result.separation).toBeDefined();
    expect(result.dependencyGraph).toBeDefined();
  });

  it('returns higher organization score with good organization', () => {
    const organized = calculateArchScore(goodCoupling, goodCohesion, false, true, false, 2);
    const unorganized = calculateArchScore(goodCoupling, goodCohesion, false, false, false, 2);
    expect(organized.organization).toBeGreaterThan(unorganized.organization);
  });
});
