// ─── Project Classification ──────────────────────────────────────

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

// ─── Project Maturity ────────────────────────────────────────────

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

// ─── Codebase Health Score ───────────────────────────────────────

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

// ─── Entry Point Detection ───────────────────────────────────────

export interface EntryPoint {
  type: string;
  path: string;
  description: string;
}

// ─── Directory Role ──────────────────────────────────────────────

export interface DirectoryRole {
  path: string;
  role: string;
  description: string;
}

// ─── Build Pipeline ──────────────────────────────────────────────

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

// ─── Dependency Analysis ─────────────────────────────────────────

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

// ─── Strengths & Suggestions ─────────────────────────────────────

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

// ─── Architecture Insights ───────────────────────────────────────

export interface ArchitectureInsight {
  observation: string;
  detail: string;
}
