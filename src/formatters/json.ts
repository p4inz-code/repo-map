import type { Analysis } from '../types.js';
import { CURRENT_SCHEMA_VERSION, CLI_VERSION } from '../types.js';

/**
 * Internal options for controlling JSON output.
 * All options default to `true` for backward compatibility.
 */
export interface JsonFormatOptions {
  /**
   * Include the full architecture markdown string.
   * When `false`, the top-level `architecture` field is omitted
   * (reducing payload size when only structured data is needed).
   * Default: `true`.
   */
  includeArchitectureString?: boolean;

  /**
   * Include the full dependency graph (nodes with imports/importedBy,
   * and all edges) instead of just summary counts.
   * Default: `false` to keep default output compact.
   */
  includeFullGraph?: boolean;
}

/**
 * Formats an Analysis result as a stable, well-structured JSON string.
 *
 * Exports structured objects for every analysis component, including
 * all intelligence data — everything is machine-readable.
 *
 * @param analysis - The analysis result to format.
 * @param opts     - Optional formatting options (all default to backward-compatible values).
 */
export function formatJson(analysis: Analysis, opts?: JsonFormatOptions): string {
  const { technologies, intelligence } = analysis;

  // Options with defaults
  const includeArch = opts?.includeArchitectureString ?? true;
  const includeGraph = opts?.includeFullGraph ?? false;

  // Sort technologies by category then name
  const sortedTechnologies = [...technologies].sort((a, b) => {
    const catOrder: Record<string, number> = {
      language: 0,
      framework: 1,
      tool: 2,
    };
    const catDiff =
      (catOrder[a.category] ?? 99) - (catOrder[b.category] ?? 99);
    if (catDiff !== 0) return catDiff;
    return a.name.localeCompare(b.name);
  });

  const output = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    cliVersion: CLI_VERSION,
    generatedAt: analysis.generatedAt,
    projectName: analysis.projectName,
    tree: analysis.tree,
    stats: {
      totalFiles: analysis.stats.totalFiles,
      totalDirectories: analysis.stats.totalDirectories,
      totalSize: analysis.stats.totalSize,
      scannedPath: analysis.stats.scannedPath,
      maxDepth: analysis.stats.maxDepth,
      avgFilesPerDirectory: analysis.stats.avgFilesPerDirectory,
      largestDirectory: analysis.stats.largestDirectory,
      largestDirectoryFiles: analysis.stats.largestDirectoryFiles,
      largestFile: analysis.stats.largestFile,
      largestFileSize: analysis.stats.largestFileSize,
    },
    technologies: sortedTechnologies,
    intelligence: {
      classification: intelligence.classification,
      maturity: intelligence.maturity,
      health: {
        overall: intelligence.health.overall,
        maxOverall: intelligence.health.maxOverall,
        categories: intelligence.health.categories,
      },
      entryPoints: intelligence.entryPoints,
      directoryRoles: intelligence.directoryRoles,
      buildPipeline: intelligence.buildPipeline,
      dependencies: intelligence.dependencies,
      strengths: intelligence.strengths,
      suggestions: intelligence.suggestions,
      insights: intelligence.insights,
      architecture: {
        patterns: intelligence.architecture.patterns,
        dependencyGraph: includeGraph
          ? intelligence.architecture.dependencyGraph
          : {
              nodes: intelligence.architecture.dependencyGraph.nodes.length,
              edges: intelligence.architecture.dependencyGraph.edges.length,
              centralModules: intelligence.architecture.dependencyGraph.centralModules,
              leafModules: intelligence.architecture.dependencyGraph.leafModules,
              hubModules: intelligence.architecture.dependencyGraph.hubModules,
              isolatedModules: intelligence.architecture.dependencyGraph.isolatedModules,
              sharedUtilities: intelligence.architecture.dependencyGraph.sharedUtilities,
              coreModules: intelligence.architecture.dependencyGraph.coreModules,
            },
        circularDependencies: intelligence.architecture.circularDependencies,
        smells: intelligence.architecture.smells,
        importAnalysis: intelligence.architecture.importAnalysis,
        moduleAnalysis: intelligence.architecture.moduleAnalysis,
        coupling: intelligence.architecture.coupling,
        cohesion: intelligence.architecture.cohesion,
        layerViolations: intelligence.architecture.layerViolations,
        complexityScores: intelligence.architecture.complexityScores,
        riskReport: intelligence.architecture.riskReport,
        visualDepTree: intelligence.architecture.visualDepTree,
        archScore: intelligence.architecture.archScore,
        refactorSuggestions: intelligence.architecture.refactorSuggestions,
      },
    },
    ...(includeArch ? { architecture: analysis.architecture } : {}),
  };

  return JSON.stringify(output, null, 2);
}
