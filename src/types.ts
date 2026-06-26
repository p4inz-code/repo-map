export const CURRENT_SCHEMA_VERSION = '1.0.0';
export const CLI_VERSION = '0.3.0';

export interface FileEntry {
  path: string;
  relativePath: string;
  size: number;
  isDirectory: boolean;
}

export interface ScanStats {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  maxDepth: number;
  avgFilesPerDirectory: number;
  largestDirectory: string;
  largestDirectoryFiles: number;
  largestFile: string;
  largestFileSize: number;
}

export interface ScanResult {
  rootPath: string;
  files: FileEntry[];
  stats: ScanStats;
}

export interface Technology {
  name: string;
  category: 'language' | 'framework' | 'tool';
  version?: string;
  evidence: string;
  /** Number of files associated with this technology (primarily for languages). */
  count?: number;
}

// --- Phase 2: Project Type Classification ---
export type ProjectCategory =
  | 'Application'
  | 'Library'
  | 'CLI Tool'
  | 'Desktop App'
  | 'Web Application'
  | 'Backend API'
  | 'Full Stack'
  | 'Mobile App'
  | 'Game'
  | 'Game Engine'
  | 'Game Tool'
  | 'Plugin'
  | 'Package'
  | 'Documentation'
  | 'Configuration Repository'
  | 'Monorepo'
  | 'Workspace'
  | 'Template'
  | 'Boilerplate'
  | 'Learning Project'
  | 'Unknown';

export interface ProjectClassification {
  category: ProjectCategory;
  confidence: number;
  evidence: string[];
}

// --- Phase 2: Project Maturity ---
export type MaturityLevel =
  | 'Prototype'
  | 'Early Development'
  | 'Active Development'
  | 'Production Ready'
  | 'Enterprise Grade';

export interface MaturityEstimate {
  level: MaturityLevel;
  confidence: number;
  factors: { factor: string; positive: boolean; detail: string }[];
}

// --- Phase 2: Codebase Health Score ---
export interface HealthScoreCategory {
  name: string;
  score: number;
  maxScore: number;
  deductions: string[];
}

export interface HealthScore {
  overall: number;
  maxOverall: number;
  categories: HealthScoreCategory[];
}

// --- Phase 2: Entry Point Detection ---
export interface EntryPoint {
  type: string;
  path: string;
  description: string;
}

// --- Phase 2: Directory Role ---
export interface DirectoryRole {
  path: string;
  role: string;
  description: string;
}

// --- Phase 2: Build Pipeline ---
export interface BuildPipeline {
  buildSystem: string[];
  packageManager: string[];
  bundler: string[];
  compiler: string[];
  testFramework: string[];
  formatter: string[];
  linter: string[];
  ci: string[];
  releaseAutomation: string[];
  publishAutomation: string[];
}

// --- Phase 2: Dependency Analysis ---
export interface DependencyGroup {
  name: string;
  count: number;
  packages: string[];
}

export interface DependencyAnalysis {
  runtimeCount: number;
  devCount: number;
  totalCount: number;
  largestGroups: DependencyGroup[];
  possibleUnused: string[];
  outdatedWarnings: string[];
}

// --- Phase 2: Strengths & Suggestions ---
export interface Strength {
  title: string;
  detail: string;
  evidence: string[];
}

export interface Suggestion {
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
}

// --- Phase 2: Architecture Insights ---
export interface ArchitectureInsight {
  observation: string;
  detail: string;
}

// --- Extended Analysis ---
export interface Analysis {
  schemaVersion: string;
  projectName: string;
  generatedAt: string;
  cliVersion: string;
  stats: {
    totalFiles: number;
    totalDirectories: number;
    totalSize: number;
    scannedPath: string;
    maxDepth: number;
    avgFilesPerDirectory: number;
    largestDirectory: string;
    largestDirectoryFiles: number;
    largestFile: string;
    largestFileSize: number;
  };
  technologies: Technology[];
  intelligence: Intelligence;
  tree: string;
  architecture: string;
}

// --- Phase 3: Architecture Analysis ---
export interface ArchitecturePattern {
  name: string;
  confidence: number;
  evidence: string[];
}

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

export interface CircularDependency {
  cycle: string[];
  severity: 'low' | 'medium' | 'high';
  fileCount: number;
  recommendation: string;
}

export interface ArchitectureSmell {
  type: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
  location: string;
}

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

export interface LayerViolation {
  violation: string;
  source: string;
  target: string;
  files: string[];
}

export interface ComplexityScore {
  path: string;
  level: 'Simple' | 'Moderate' | 'Complex' | 'Very Complex';
  score: number;
  factors: { name: string; value: number }[];
}

export interface RiskReport {
  technicalDebtRisk: { level: 'Low' | 'Medium' | 'High'; detail: string };
  maintainabilityRisk: { level: 'Low' | 'Medium' | 'High'; detail: string };
  scalabilityRisk: { level: 'Low' | 'Medium' | 'High'; detail: string };
  onboardingDifficulty: { level: 'Low' | 'Medium' | 'High'; detail: string };
  releaseRisk: { level: 'Low' | 'Medium' | 'High'; detail: string };
  overall: { level: 'Low' | 'Medium' | 'High'; detail: string };
}

export interface VisualDepTree {
  tree: string;
}

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

export interface RefactorSuggestion {
  title: string;
  detail: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
}

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

export interface CliOptions {
  path: string;
  format: 'json' | 'markdown';
  depth?: number;
  output?: string;
  useGitignore: boolean;
  exclude?: string[];
  include?: string[];
  stats?: boolean;
  /** Whether ANSI color output is enabled. Defaults to true. */
  color: boolean;
}

export interface Intelligence {
  classification: ProjectClassification;
  maturity: MaturityEstimate;
  health: HealthScore;
  entryPoints: EntryPoint[];
  directoryRoles: DirectoryRole[];
  buildPipeline: BuildPipeline;
  dependencies: DependencyAnalysis;
  strengths: Strength[];
  suggestions: Suggestion[];
  insights: ArchitectureInsight[];
  /** Populated after architecture analysis runs. May be undefined in early pipeline stages. */
  architecture?: ArchitectureAnalysis;
}
