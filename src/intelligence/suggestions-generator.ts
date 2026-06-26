import type { Suggestion, BuildPipeline, DependencyAnalysis, FileEntry, Technology } from '../types.js';

/**
 * Generates intelligent improvement suggestions based on detected gaps.
 * Every suggestion is backed by actual evidence from the scan.
 * No generic/placeholder suggestions.
 */
export function generateSuggestions(
  files: FileEntry[],
  technologies: Technology[],
  pipeline: BuildPipeline,
  dependencies: DependencyAnalysis,
  hasLicense: boolean,
  hasReadme: boolean,
  hasChangelog: boolean,
  hasContributing: boolean,
  hasIssueTemplates: boolean,
  hasCi: boolean,
  hasTests: boolean,
  hasLint: boolean,
  hasFormatter: boolean,
  hasReleaseWorkflow: boolean,
  hasLockFile: boolean,
  hasGitignore: boolean,
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const fileCount = files.filter((f) => !f.isDirectory).length;

  // CI
  if (!hasCi) {
    suggestions.push({
      title: 'Add CI/CD Pipeline',
      detail: 'No continuous integration detected. Adding CI (e.g., GitHub Actions) would automate testing and linting on every push.',
      priority: 'high',
    });
  }

  // License
  if (!hasLicense) {
    suggestions.push({
      title: 'Add a License',
      detail: 'No license file found. Adding an open-source license clarifies how others can use, modify, and distribute the project.',
      priority: 'high',
    });
  }

  // README quality (present but possibly lacking content)
  if (!hasReadme && fileCount > 0) {
    suggestions.push({
      title: 'Create a README',
      detail: 'No README.md found. A README helps users understand the project purpose, installation, and usage.',
      priority: 'high',
    });
  }

  // Gitignore
  if (!hasGitignore && fileCount > 5) {
    suggestions.push({
      title: 'Add .gitignore',
      detail: 'No .gitignore file detected. This helps prevent committing build artifacts, dependencies, and sensitive files.',
      priority: 'high',
    });
  }

  // Testing
  if (!hasTests && fileCount > 3) {
    suggestions.push({
      title: 'Add Tests',
      detail: 'No test files detected. Adding tests (unit, integration) improves reliability and makes refactoring safer.',
      priority: 'high',
    });
  }

  // Linting
  if (!hasLint && fileCount > 3) {
    suggestions.push({
      title: 'Configure a Linter',
      detail: 'No linter detected. A linter (e.g., ESLint) enforces code quality and catches potential bugs.',
      priority: 'medium',
    });
  }

  // Formatter
  if (!hasFormatter && fileCount > 3) {
    suggestions.push({
      title: 'Configure a Formatter',
      detail: 'No code formatter detected. A formatter (e.g., Prettier) ensures consistent code style across the team.',
      priority: 'medium',
    });
  }

  // Changelog
  if (!hasChangelog && fileCount > 5) {
    suggestions.push({
      title: 'Maintain a Changelog',
      detail: 'No changelog found. A CHANGELOG.md helps users track what changed between versions.',
      priority: 'medium',
    });
  }

  // Contributing guide
  if (!hasContributing && fileCount > 10) {
    suggestions.push({
      title: 'Add Contributing Guidelines',
      detail: 'No CONTRIBUTING.md found. Contributing guidelines help onboard new contributors.',
      priority: 'medium',
    });
  }

  // Issue templates
  if (!hasIssueTemplates && files.some((f) => f.relativePath.replace(/\\/g, '/').startsWith('.github/'))) {
    suggestions.push({
      title: 'Add Issue Templates',
      detail: 'GitHub directory found but no issue templates configured. Issue templates standardize bug reports and feature requests.',
      priority: 'low',
    });
  }

  // Lock file
  if (!hasLockFile && files.some((f) => f.relativePath === 'package.json')) {
    suggestions.push({
      title: 'Commit Lock File',
      detail: 'No package-lock.json, yarn.lock, or pnpm-lock.yaml found. Lock files ensure reproducible installs across environments.',
      priority: 'high',
    });
  }

  // Release automation
  if (!hasReleaseWorkflow && hasCi) {
    suggestions.push({
      title: 'Add Release Automation',
      detail: 'CI is configured but no release workflow detected. Automating releases reduces manual effort and errors.',
      priority: 'medium',
    });
  }

  // Dependency-specific suggestions
  if (dependencies.possibleUnused.length > 0) {
    for (const warning of dependencies.possibleUnused.slice(0, 3)) {
      suggestions.push({
        title: 'Review Unused Dependencies',
        detail: warning,
        priority: 'low',
      });
    }
  }

  if (dependencies.outdatedWarnings.length > 0) {
    for (const warning of dependencies.outdatedWarnings.slice(0, 3)) {
      suggestions.push({
        title: 'Architecture Modernization',
        detail: warning,
        priority: 'medium',
      });
    }
  }

  // Directory depth suggestion
  const depths = files.filter((f) => !f.isDirectory).map((f) => f.relativePath.replace(/\\/g, '/').split('/').length - 1);
  const maxDepth = Math.max(0, ...depths);
  if (maxDepth > 8) {
    suggestions.push({
      title: 'Reduce Directory Nesting',
      detail: `Maximum directory depth is ${maxDepth}. Deep nesting can reduce maintainability — consider flattening the structure.`,
      priority: 'medium',
    });
  }

  // Empty CI workflow files?
  const hasEmptyWorkflows = files.some((f) => {
    const r = f.relativePath.replace(/\\/g, '/');
    return r.startsWith('.github/workflows/') && f.size < 50;
  });
  if (hasEmptyWorkflows) {
    suggestions.push({
      title: 'Complete CI Workflow Files',
      detail: 'Detected very small workflow files that may be templates or incomplete.',
      priority: 'medium',
    });
  }

  // Sorting: high priority first
  suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  return suggestions.slice(0, 12);
}
