// Re-export architecture-specific types from the module-scoped types file
export type * from './types.js';

import type { FileEntry } from '../types.js';
import type { ArchitectureAnalysis } from './types.js';
import { parseFileImports } from './import-parser.js';


import { buildDependencyGraph } from './dependency-graph.js';
import { detectArchitecturePatterns } from './pattern-detector.js';
import { detectCircularDependencies } from './circular-deps.js';
import { detectSmells } from './smells.js';
import { analyzeImports } from './import-analysis.js';
import { analyzeModules } from './module-analysis.js';
import { analyzeCoupling } from './coupling.js';
import { analyzeCohesion } from './cohesion.js';
import { detectLayerViolations } from './layer-violations.js';
import { scoreComplexity } from './complexity.js';
import { generateRiskReport } from './risk-report.js';
import { generateVisualDepTree } from './dep-tree.js';
import { calculateArchScore } from './arch-score.js';
import { generateRefactorSuggestions } from './refactor-suggestions.js';

/**
 * Runs the full architecture analysis pipeline.
 * Reuses scan data — reads source files only for import parsing.
 */
export async function runArchitectureAnalysis(files: FileEntry[]): Promise<ArchitectureAnalysis> {
  const norm = (p: string) => p.replace(/\\/g, '/');
  const filePaths = files.filter((f) => !f.isDirectory).map((f) => norm(f.relativePath));
  const allDirs = [...new Set(filePaths.filter((p) => p.includes('/')).map((p) => p.split('/')[0]))];

  // 1. Parse imports from source files (only I/O phase)
  const importResults = await parseFileImports(files);

  // 2. Build dependency graph
  const dependencyGraph = buildDependencyGraph(importResults);

  // 3. Detect architecture patterns
  const patterns = detectArchitecturePatterns(files, dependencyGraph, importResults);

  // 4. Detect circular dependencies
  const circularDependencies = detectCircularDependencies(importResults, dependencyGraph);

  // 5. Detect architecture smells
  const smells = detectSmells(files, dependencyGraph, importResults, allDirs);

  // 6. Analyze imports
  const importAnalysis = analyzeImports(importResults, dependencyGraph);

  // 7. Analyze modules (largest files/folders)
  const moduleAnalysis = analyzeModules(files);

  // 8. Analyze coupling
  const coupling = analyzeCoupling(dependencyGraph);

  // 9. Analyze cohesion
  const cohesion = analyzeCohesion(files, dependencyGraph);

  // 10. Detect layer violations
  const layerViolations = detectLayerViolations(files, dependencyGraph);

  // 11. Score complexity
  const complexityScores = await scoreComplexity(files, dependencyGraph, importResults);

  // 12. Generate risk report
  const riskReport = generateRiskReport(dependencyGraph, smells, moduleAnalysis, coupling, cohesion);

  // 13. Generate visual dependency tree
  const visualDepTree = generateVisualDepTree(dependencyGraph);

  // 14. Calculate architectural score
  const hasLayers = patterns.some((p) => p.name.includes('Layered') || p.name.includes('MVC') || p.name.includes('Hexagonal'));
  const hasGoodOrg = allDirs.length >= 3;
  const hasGoodSeparation = allDirs.length >= 4;
  const archScore = calculateArchScore(coupling, cohesion, hasLayers, hasGoodOrg, hasGoodSeparation, dependencyGraph.hubModules.length);

  // 15. Generate refactor suggestions
  const refactorSuggestions = generateRefactorSuggestions(smells, circularDependencies, layerViolations, moduleAnalysis, dependencyGraph);

  return {
    patterns,
    dependencyGraph,
    circularDependencies,
    smells,
    importAnalysis,
    moduleAnalysis,
    coupling,
    cohesion,
    layerViolations,
    complexityScores,
    riskReport,
    visualDepTree,
    archScore,
    refactorSuggestions,
  };
}
