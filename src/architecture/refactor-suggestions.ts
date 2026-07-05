import type { RefactorSuggestion, ArchitectureSmell, CircularDependency, LayerViolation, ModuleAnalysis, DependencyGraph } from './types.js';

/**
 * Generates actionable refactor suggestions based on analysis results.
 * Pure function — no I/O.
 */
export function generateRefactorSuggestions(
  smells: ArchitectureSmell[],
  circularDeps: CircularDependency[],
  layerViolations: LayerViolation[],
  moduleAnalysis: ModuleAnalysis,
  _graph: DependencyGraph,
): RefactorSuggestion[] {
  const suggestions: RefactorSuggestion[] = [];

  // Smell-based suggestions
  for (const smell of smells) {
    if (smell.type === 'God Module') {
      suggestions.push({
        title: `Split ${smell.location}`,
        detail: smell.detail,
        impact: smell.severity === 'high' ? 'high' : 'medium',
        effort: 'medium',
      });
    }

    if (smell.type === 'Large Utility Folder') {
      suggestions.push({
        title: `Organize ${smell.location}`,
        detail: smell.detail,
        impact: 'medium',
        effort: 'medium',
      });
    }

    if (smell.type === 'Feature Leakage') {
      suggestions.push({
        title: `Decouple ${smell.location}`,
        detail: smell.detail,
        impact: 'medium',
        effort: 'medium',
      });
    }

    if (smell.type === 'Huge Directory') {
      suggestions.push({
        title: `Split ${smell.location}`,
        detail: smell.detail,
        impact: 'medium',
        effort: 'small',
      });
    }
  }

  // Circular dependency suggestions
  for (const cycle of circularDeps.slice(0, 3)) {
    suggestions.push({
      title: `Break circular dependency: ${cycle.cycle[0]} ↔ ${cycle.cycle[1]}`,
      detail: cycle.recommendation,
      impact: cycle.severity === 'high' ? 'high' : 'medium',
      effort: cycle.fileCount <= 3 ? 'small' : 'medium',
    });
  }

  // Layer violation suggestions
  for (const violation of layerViolations.slice(0, 3)) {
    suggestions.push({
      title: `Fix layer violation: ${violation.source} → ${violation.target}`,
      detail: `${violation.files.length} files violate layering: ${violation.violation}`,
      impact: 'medium',
      effort: 'medium',
    });
  }

  // Module analysis warnings
  for (const warning of moduleAnalysis.warnings.slice(0, 3)) {
    suggestions.push({
      title: warning.split(' — ')[0],
      detail: warning,
      impact: 'low',
      effort: 'small',
    });
  }

  // Limit to top 8, sorted by impact
  suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.impact] - order[b.impact];
  });

  return suggestions.slice(0, 8);
}
