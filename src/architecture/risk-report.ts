import type { RiskReport, DependencyGraph, ArchitectureSmell, ModuleAnalysis, CouplingResult, CohesionResult } from '../types.js';

/**
 * Generates a repository risk report.
 * Pure function — no I/O.
 */
export function generateRiskReport(
  graph: DependencyGraph,
  smells: ArchitectureSmell[],
  moduleAnalysis: ModuleAnalysis,
  coupling: CouplingResult,
  cohesion: CohesionResult,
): RiskReport {
  // Technical Debt Risk
  const highSmells = smells.filter((s) => s.severity === 'high').length;
  const mediumSmells = smells.filter((s) => s.severity === 'medium').length;
  const warningCount = moduleAnalysis.warnings.length;

  let techDebtLevel: 'Low' | 'Medium' | 'High';
  if (highSmells > 3 || warningCount > 5) techDebtLevel = 'High';
  else if (highSmells > 0 || mediumSmells > 3 || warningCount > 2) techDebtLevel = 'Medium';
  else techDebtLevel = 'Low';

  // Maintainability Risk
  let maintLevel: 'Low' | 'Medium' | 'High';
  if (coupling.level === 'Very High' || cohesion.overall === 'Low') maintLevel = 'High';
  else if (coupling.level === 'High' || cohesion.overall === 'Medium') maintLevel = 'Medium';
  else maintLevel = 'Low';

  // Scalability Risk
  const isolatedModules = graph.isolatedModules.length;
  const totalModules = graph.nodes.length;
  const largeFiles = moduleAnalysis.largestFiles.filter((f) => f.size > 50000).length;
  let scaleLevel: 'Low' | 'Medium' | 'High';
  if (largeFiles > 3 || coupling.level === 'Very High') scaleLevel = 'High';
  else if (largeFiles > 0 || coupling.level === 'High' || isolatedModules > totalModules * 0.3) scaleLevel = 'Medium';
  else scaleLevel = 'Low';

  // Onboarding Difficulty
  let onbLevel: 'Low' | 'Medium' | 'High';
  const totalDirs = [...new Set(graph.nodes.map((n) => n.path.split('/').slice(0, -1).join('/')))].length;
  if (totalModules > 100 && totalDirs > 20) onbLevel = 'High';
  else if (totalModules > 50 || totalDirs > 10) onbLevel = 'Medium';
  else onbLevel = 'Low';

  // Release Risk
  const circularDeps = graph.nodes.filter((n) => {
    // Simple heuristic: files imported by many others are risky to change
    return n.importedBy.length > 5;
  }).length;
  let relLevel: 'Low' | 'Medium' | 'High';
  if (circularDeps > 5 || coupling.level === 'Very High') relLevel = 'High';
  else if (circularDeps > 2 || coupling.level === 'High') relLevel = 'Medium';
  else relLevel = 'Low';

  // Overall
  const scores = [techDebtLevel, maintLevel, scaleLevel, onbLevel, relLevel].map((l) => {
    if (l === 'High') return 3;
    if (l === 'Medium') return 2;
    return 1;
  });
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const overallLevel: 'Low' | 'Medium' | 'High' = avgScore >= 2.5 ? 'High' : avgScore >= 1.5 ? 'Medium' : 'Low';

  return {
    technicalDebtRisk: {
      level: techDebtLevel,
      detail: `${highSmells} high-severity and ${mediumSmells} medium-severity architecture smells. ${warningCount} module warnings.`,
    },
    maintainabilityRisk: {
      level: maintLevel,
      detail: `Coupling is ${coupling.level.toLowerCase()} and cohesion is ${cohesion.overall.toLowerCase()}.`,
    },
    scalabilityRisk: {
      level: scaleLevel,
      detail: `${largeFiles} files exceed 50KB. ${isolatedModules} modules are isolated.`,
    },
    onboardingDifficulty: {
      level: onbLevel,
      detail: `${totalModules} modules across ${totalDirs} directories.`,
    },
    releaseRisk: {
      level: relLevel,
      detail: `${circularDeps} modules have high change impact (imported by 5+ other modules).`,
    },
    overall: {
      level: overallLevel,
      detail: `${overallLevel} risk based on architecture smells, coupling, cohesion, and scale analysis.`,
    },
  };
}
