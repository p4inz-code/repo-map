import type { Intelligence, Analysis, ArchitectureAnalysis } from '../src/types.js';
import { CURRENT_SCHEMA_VERSION, CLI_VERSION } from '../src/types.js';

/**
 * Creates a complete mock ArchitectureAnalysis object for use in tests.
 */
export function createMockArchitecture(): ArchitectureAnalysis {
  return {
    patterns: [],
    dependencyGraph: {
      nodes: [],
      edges: [],
      centralModules: [],
      leafModules: [],
      hubModules: [],
      isolatedModules: [],
      sharedUtilities: [],
      coreModules: [],
    },
    circularDependencies: [],
    smells: [],
    importAnalysis: {
      mostImported: [],
      leastImported: [],
      potentialDeadModules: [],
      hotspots: [],
      totalInternalImports: 0,
      totalExternalImports: 0,
    },
    moduleAnalysis: {
      largestFiles: [],
      largestFolders: [],
      warnings: [],
    },
    coupling: {
      level: 'Low',
      score: 0,
      explanation: 'No modules with dependencies found.',
      details: [],
    },
    cohesion: {
      overall: 'Medium',
      score: 50,
      folderDetails: [],
    },
    layerViolations: [],
    complexityScores: [],
    riskReport: {
      technicalDebtRisk: { level: 'Low', detail: 'No architecture smells detected.' },
      maintainabilityRisk: { level: 'Low', detail: 'Low coupling and medium cohesion.' },
      scalabilityRisk: { level: 'Low', detail: 'No large files detected.' },
      onboardingDifficulty: { level: 'Low', detail: 'Small codebase.' },
      releaseRisk: { level: 'Low', detail: 'Low change impact.' },
      overall: { level: 'Low', detail: 'Low risk.' },
    },
    visualDepTree: { tree: '' },
    archScore: {
      overall: 50,
      maxScore: 100,
      coupling: 50,
      cohesion: 50,
      layering: 50,
      organization: 50,
      separation: 50,
      dependencyGraph: 50,
    },
    refactorSuggestions: [],
  };
}

/**
 * Creates a complete mock Intelligence object for use in tests.
 */
export function createMockIntelligence(): Intelligence {
  return {
    classification: {
      category: 'Unknown',
      confidence: 0,
      evidence: ['Test environment — no real files to classify'],
    },
    maturity: {
      level: 'Prototype',
      confidence: 0,
      factors: [],
    },
    health: {
      overall: 50,
      maxOverall: 100,
      categories: [
        { name: 'Documentation', score: 50, maxScore: 100, deductions: [] },
        { name: 'Testing', score: 50, maxScore: 100, deductions: [] },
        { name: 'Architecture', score: 50, maxScore: 100, deductions: [] },
        { name: 'Maintainability', score: 50, maxScore: 100, deductions: [] },
        { name: 'Consistency', score: 50, maxScore: 100, deductions: [] },
        { name: 'Project Structure', score: 50, maxScore: 100, deductions: [] },
        { name: 'Tooling', score: 50, maxScore: 100, deductions: [] },
        { name: 'Release Readiness', score: 50, maxScore: 100, deductions: [] },
      ],
    },
    entryPoints: [],
    directoryRoles: [],
    buildPipeline: {
      buildSystem: [],
      packageManager: [],
      bundler: [],
      compiler: [],
      testFramework: [],
      formatter: [],
      linter: [],
      ci: [],
      releaseAutomation: [],
      publishAutomation: [],
    },
    dependencies: {
      runtimeCount: 0,
      devCount: 0,
      totalCount: 0,
      largestGroups: [],
      possibleUnused: [],
      outdatedWarnings: [],
    },
    strengths: [],
    suggestions: [],
    insights: [],
    architecture: createMockArchitecture(),
  };
}

/**
 * Creates a base Analysis with required intelligence field.
 */
export function createBaseAnalysis(overrides: Partial<Analysis> = {}): Analysis {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    projectName: 'test-project',
    generatedAt: '2025-01-01T00:00:00.000Z',
    cliVersion: CLI_VERSION,
    stats: {
      totalFiles: 5,
      totalDirectories: 2,
      totalSize: 1024,
      scannedPath: '/tmp/test',
      maxDepth: 2,
      avgFilesPerDirectory: 2.5,
      largestDirectory: 'src',
      largestDirectoryFiles: 3,
      largestFile: 'src/index.ts',
      largestFileSize: 512,
    },
    technologies: [],
    intelligence: createMockIntelligence(),
    tree: '',
    architecture: '',
    ...overrides,
  };
}
