import type { ArchScore, CouplingResult, CohesionResult } from '../types.js';

/**
 * Calculates an architectural quality score from multiple dimensions.
 * Pure function — no I/O.
 */
export function calculateArchScore(
  coupling: CouplingResult,
  cohesion: CohesionResult,
  hasLayers: boolean,
  hasGoodOrg: boolean,
  hasGoodSeparation: boolean,
  dependencyCount: number,
): ArchScore {
  // Coupling score (inverted: lower coupling = higher score)
  const couplingScore = 100 - coupling.score;

  // Cohesion score
  const cohesionScore = cohesion.score;

  // Layering score
  const layeringScore = hasLayers ? 85 : hasGoodSeparation ? 50 : 20;

  // Organization score
  const orgScore = hasGoodOrg ? 85 : hasGoodSeparation ? 55 : 30;

  // Separation score
  const sepScore = hasGoodSeparation ? 85 : 50;

  // Dependency graph score (based on hub/leaf ratio)
  const hubLeafRatio = dependencyCount > 0 ? Math.min(1, 1 / (dependencyCount || 1)) : 1;
  const graphScore = Math.round(hubLeafRatio * 100);

  // Overall (weighted average)
  const overall = Math.round(
    (couplingScore * 0.2) +
    (cohesionScore * 0.2) +
    (layeringScore * 0.2) +
    (orgScore * 0.15) +
    (sepScore * 0.15) +
    (graphScore * 0.1),
  );

  return {
    overall,
    maxScore: 100,
    coupling: couplingScore,
    cohesion: cohesionScore,
    layering: layeringScore,
    organization: orgScore,
    separation: sepScore,
    dependencyGraph: graphScore,
  };
}
