import type { FileEntry, Technology, Intelligence, BuildPipeline, DependencyAnalysis } from '../types.js';
import { classifyProject } from './project-classifier.js';
import { estimateMaturity } from './maturity-estimator.js';
import { calculateHealth } from './health-scorer.js';
import { detectEntryPoints } from './entry-point-detector.js';
import { classifyDirectoryRoles } from './directory-role-classifier.js';
import { analyzeBuildPipeline } from './build-pipeline-analyzer.js';
import { analyzeDependencies } from './dependency-analyzer.js';
import { generateStrengths } from './strengths-generator.js';
import { generateSuggestions } from './suggestions-generator.js';
import { generateInsights } from './insights-generator.js';

/**
 * Runs the full intelligence pipeline.
 * All modules run in sequence, sharing the same scan data — no duplicate I/O.
 */
export async function runIntelligence(
  files: FileEntry[],
  technologies: Technology[],
  packageJsonContent: Record<string, unknown> | null,
): Promise<Intelligence> {
  // Pre-compute common flags used across multiple modules
  const norm = (p: string) => p.replace(/\\/g, '/');
  const filePaths = files.filter((f) => !f.isDirectory).map((f) => norm(f.relativePath));

  const hasLicense = files.some((f) => {
    const r = f.relativePath;
    return r === 'LICENSE' || r === 'LICENSE.md' || r === 'LICENSE.txt' || r === 'COPYING' || r === 'COPYING.md';
  });
  const hasReadme = files.some((f) => f.relativePath === 'README.md');
  const hasChangelog = files.some((f) => {
    const r = norm(f.relativePath).toLowerCase();
    return r === 'changelog.md' || r === 'history.md';
  });
  const hasContributing = files.some((f) => norm(f.relativePath).toLowerCase() === 'contributing.md');
  const hasIssueTemplates = files.some((f) => norm(f.relativePath).startsWith('.github/issue_template/'));
  const hasCi = files.some((f) => {
    const r = norm(f.relativePath);
    return r.startsWith('.github/workflows/') || r === '.gitlab-ci.yml' || r === '.circleci/config.yml' || r === 'Jenkinsfile';
  });
  const hasTests = files.some((f) => {
    const r = norm(f.relativePath).toLowerCase();
    return r.includes('.test.') || r.includes('.spec.');
  });
  const hasLint = files.some((f) => {
    const r = f.relativePath;
    return r.includes('.eslintrc') || r.includes('eslint.config.') || r === '.jshintrc' || r === '.rubocop.yml';
  });
  const hasFormatter = files.some((f) => {
    const r = f.relativePath;
    return r.includes('.prettierrc') || r === '.editorconfig' || r === 'prettier.config.js';
  });
  const hasReleaseWorkflow = files.some((f) => {
    const r = norm(f.relativePath);
    return r.startsWith('.github/workflows/') && (r.includes('release') || r.includes('publish') || r.includes('deploy'));
  });
  const hasLockFile = files.some((f) => {
    const r = f.relativePath;
    return r === 'package-lock.json' || r === 'yarn.lock' || r === 'pnpm-lock.yaml' || r === 'Cargo.lock' || r === 'go.sum';
  });
  const hasGitignore = files.some((f) => f.relativePath === '.gitignore');

  // Package.json analysis
  let hasPackageJson = false;
  let hasBinEntry = false;
  let hasWorkspaces = false;
  let packageJsonDeps: Record<string, string> = {};
  let packageJsonDevDeps: Record<string, string> = {};

  if (packageJsonContent) {
    hasPackageJson = true;
    hasBinEntry = !!packageJsonContent.bin;
    const ws = packageJsonContent.workspaces;
    if (Array.isArray(ws)) {
      hasWorkspaces = ws.length > 0;
    } else if (ws && typeof ws === 'object') {
      hasWorkspaces = !!(ws as Record<string, unknown>).packages;
    }
    packageJsonDeps = (packageJsonContent.dependencies as Record<string, string>) ?? {};
    packageJsonDevDeps = (packageJsonContent.devDependencies as Record<string, string>) ?? {};
  }

  // 1. Project Classification
  const classification = classifyProject(files, technologies, hasPackageJson, hasBinEntry, hasWorkspaces);

  // 2. Maturity Estimation
  const maturity = estimateMaturity(
    files, technologies, hasLicense, hasReadme, hasChangelog, hasContributing,
    hasIssueTemplates, hasCi, hasTests, hasLint, hasFormatter, hasReleaseWorkflow,
  );

  // 3. Health Score
  const health = calculateHealth(files);

  // 4. Entry Points
  const entryPoints = detectEntryPoints(files, technologies, packageJsonContent);

  // 5. Directory Roles
  const directoryRoles = classifyDirectoryRoles(files);

  // 6. Build Pipeline
  const pipeline = analyzeBuildPipeline(files, technologies, packageJsonDeps, packageJsonDevDeps);

  // 7. Dependency Analysis
  const dependencies = analyzeDependencies(packageJsonContent);

  // 8. Strengths
  const strengths = generateStrengths(files, technologies, maturity, health, hasLicense, hasReadme, hasCi, hasTests);

  // 9. Suggestions
  const suggestions = generateSuggestions(
    files, technologies, pipeline, dependencies,
    hasLicense, hasReadme, hasChangelog, hasContributing, hasIssueTemplates,
    hasCi, hasTests, hasLint, hasFormatter, hasReleaseWorkflow, hasLockFile, hasGitignore,
  );

  // 10. Architecture Insights
  const insights = generateInsights(files, technologies, pipeline, directoryRoles);

  return {
    classification,
    maturity,
    health,
    entryPoints,
    directoryRoles,
    buildPipeline: pipeline,
    dependencies,
    strengths,
    suggestions,
    insights,
  };
}
