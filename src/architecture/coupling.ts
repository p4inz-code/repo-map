import type { CouplingResult, DependencyGraph } from '../types.js';

/**
 * Estimates module coupling based on the dependency graph.
 * Pure function — no I/O.
 */
export function analyzeCoupling(graph: DependencyGraph): CouplingResult {
  const { nodes } = graph;

  // Calculate average incoming dependencies
  const totalNodes = nodes.length;
  if (totalNodes === 0) {
    return {
      level: 'Low',
      score: 0,
      explanation: 'No modules with dependencies found.',
      details: [],
    };
  }

  // Count how many modules have dependencies
  const modulesWithIncoming = nodes.filter((n) => n.importedBy.length > 0).length;
  const modulesWithOutgoing = nodes.filter((n) => n.internalImports > 0).length;
  const coupledModules = nodes.filter((n) => n.importedBy.length > 0 || n.internalImports > 0).length;

  // Calculate coupling metrics
  const avgIncoming = nodes.reduce((sum, n) => sum + n.importedBy.length, 0) / totalNodes;
  const avgOutgoing = nodes.reduce((sum, n) => sum + n.internalImports, 0) / totalNodes;
  const couplingRatio = coupledModules / totalNodes;

  // Find most coupled modules
  const details = [...nodes]
    .filter((n) => n.importedBy.length > 0 || n.internalImports > 0)
    .sort((a, b) => (b.importedBy.length + b.internalImports) - (a.importedBy.length + a.internalImports))
    .slice(0, 10)
    .map((n) => ({
      module: n.path,
      coupledCount: n.importedBy.length + n.internalImports,
    }));

  // Determine level
  let level: 'Low' | 'Medium' | 'High' | 'Very High';
  let score: number;

  const compositeScore = (avgIncoming * 3) + (avgOutgoing * 2) + (couplingRatio * 5);

  if (compositeScore < 2) {
    level = 'Low';
    score = 25;
  } else if (compositeScore < 5) {
    level = 'Medium';
    score = 50;
  } else if (compositeScore < 10) {
    level = 'High';
    score = 75;
  } else {
    level = 'Very High';
    score = 95;
  }

  // Generate explanation
  const explanations: string[] = [];
  explanations.push(`Average ${avgIncoming.toFixed(1)} incoming and ${avgOutgoing.toFixed(1)} outgoing dependencies per module.`);
  explanations.push(`${coupledModules} of ${totalNodes} modules (${(couplingRatio * 100).toFixed(0)}%) have at least one dependency.`);

  if (level === 'Low' || level === 'Medium') {
    explanations.push('Modules have relatively few interconnections, which is good for maintainability.');
  } else {
    explanations.push('Modules are highly interconnected — changes may propagate widely.');
  }

  return {
    level,
    score,
    explanation: explanations.join(' '),
    details,
  };
}
