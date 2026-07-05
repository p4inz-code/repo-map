// ─── Architecture Pattern Detection ──────────────────────────────

export interface ArchitecturePattern {
  name: string;
  confidence: number;
  evidence: string[];
}

// ─── Dependency Graph ────────────────────────────────────────────

export interface ModuleNode {
  name: string;
  path: string;
  imports: string[];
  importedBy: string[];
  internalImports: number;
  externalImports: number;
  isEntryPoint: boolean;
}

export interface DependencyGraph {
  nodes: ModuleNode[];
  edges: { from: string; to: string; isExternal: boolean }[];
  centralModules: string[];
  leafModules: string[];
  hubModules: string[];
  isolatedModules: string[];
  sharedUtilities: string[];
  coreModules: string[];
}

// ─── Circular Dependencies ───────────────────────────────────────

export interface CircularDependency {
  cycle: string[];
  severity: 'low' | 'medium' | 'high';
  fileCount: number;
  recommendation: string;
}

// ─── Architecture Smells ─────────────────────────────────────────

export interface ArchitectureSmell {
  type: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
  location: string;
}

// ─── Import Analysis ─────────────────────────────────────────────

export interface ImportStat {
  path: string;
  importedCount: number;
  importedBy: string[];
}

export interface ImportAnalysis {
  mostImported: ImportStat[];
  leastImported: ImportStat[];
  potentialDeadModules: string[];
  hotspots: ImportStat[];
  totalInternalImports: number;
  totalExternalImports: number;
}

// ─── Module Analysis ─────────────────────────────────────────────

export interface LargestModule {
  path: string;
  size: number;
  type: 'file' | 'folder';
  fileCount?: number;
}

export interface ModuleAnalysis {
  largestFiles: LargestModule[];
  largestFolders: LargestModule[];
  warnings: string[];
}

// ─── Coupling & Cohesion ─────────────────────────────────────────

export interface CouplingResult {
  level: 'Low' | 'Medium' | 'High' | 'Very High';
  score: number;
  explanation: string;
  details: { module: string; coupledCount: number }[];
}

export interface CohesionResult {
  overall: 'Low' | 'Medium' | 'High';
  score: number;
  folderDetails: { path: string; cohesion: 'Low' | 'Medium' | 'High'; issues: string[] }[];
}

// ─── Layer Violations ────────────────────────────────────────────

export interface LayerViolation {
  violation: string;
  source: string;
  target: string;
  files: string[];
}

// ─── Complexity Scoring ──────────────────────────────────────────

export interface ComplexityScore {
  path: string;
  level: 'Simple' | 'Moderate' | 'Complex' | 'Very Complex';
  score: number;
  factors: { name: string; value: number }[];
}

// ─── Risk Report ─────────────────────────────────────────────────

export interface RiskReport {
  technicalDebtRisk: { level: 'Low' | 'Medium' | 'High'; detail: string };
  maintainabilityRisk: { level: 'Low' | 'Medium' | 'High'; detail: string };
  scalabilityRisk: { level: 'Low' | 'Medium' | 'High'; detail: string };
  onboardingDifficulty: { level: 'Low' | 'Medium' | 'High'; detail: string };
  releaseRisk: { level: 'Low' | 'Medium' | 'High'; detail: string };
  overall: { level: 'Low' | 'Medium' | 'High'; detail: string };
}

// ─── Visual Dependency Tree ──────────────────────────────────────

export interface VisualDepTree {
  tree: string;
}

// ─── Architecture Score ──────────────────────────────────────────

export interface ArchScore {
  overall: number;
  maxScore: number;
  coupling: number;
  cohesion: number;
  layering: number;
  organization: number;
  separation: number;
  dependencyGraph: number;
}

// ─── Refactor Suggestions ────────────────────────────────────────

export interface RefactorSuggestion {
  title: string;
  detail: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
}

// ─── Aggregated Architecture Analysis ────────────────────────────

export interface ArchitectureAnalysis {
  patterns: ArchitecturePattern[];
  dependencyGraph: DependencyGraph;
  circularDependencies: CircularDependency[];
  smells: ArchitectureSmell[];
  importAnalysis: ImportAnalysis;
  moduleAnalysis: ModuleAnalysis;
  coupling: CouplingResult;
  cohesion: CohesionResult;
  layerViolations: LayerViolation[];
  complexityScores: ComplexityScore[];
  riskReport: RiskReport;
  visualDepTree: VisualDepTree;
  archScore: ArchScore;
  refactorSuggestions: RefactorSuggestion[];
}
