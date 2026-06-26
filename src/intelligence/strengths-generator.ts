import type { FileEntry, Technology, Strength, MaturityEstimate, HealthScore } from '../types.js';

/**
 * Generates project strengths based on detected features.
 * Pure function — no I/O.
 */
export function generateStrengths(
  files: FileEntry[],
  technologies: Technology[],
  maturity: MaturityEstimate,
  health: HealthScore,
  hasLicense: boolean,
  hasReadme: boolean,
  hasCi: boolean,
  hasTests: boolean,
): Strength[] {
  const strengths: Strength[] = [];
  const norm = (p: string) => p.replace(/\\/g, '/');

  // Documentation
  if (hasReadme) {
    strengths.push({
      title: 'Excellent Documentation',
      detail: 'README.md provides project documentation',
      evidence: ['Found README.md at project root'],
    });
  }

  // License
  if (hasLicense) {
    strengths.push({
      title: 'Clear Licensing',
      detail: 'Project has a license file, clarifying usage terms',
      evidence: ['License file present'],
    });
  }

  // Testing
  if (hasTests) {
    const testCount = files.filter((f) => {
      const r = norm(f.relativePath).toLowerCase();
      return r.includes('.test.') || r.includes('.spec.');
    }).length;
    if (testCount > 0) {
      strengths.push({
        title: 'Strong Testing',
        detail: `Project has ${testCount} test file${testCount > 1 ? 's' : ''}`,
        evidence: [`Found ${testCount} test file(s)`],
      });
    } else {
      strengths.push({
        title: 'Testing Configured',
        detail: 'Test framework is configured and ready',
        evidence: ['Test configuration detected'],
      });
    }
  }

  // CI/CD
  if (hasCi) {
    const ciName = technologies.find((t) => t.category === 'tool' && ['GitHub Actions', 'GitLab CI', 'CircleCI', 'Jenkins'].includes(t.name));
    strengths.push({
      title: 'Continuous Integration',
      detail: ciName ? `Automated CI via ${ciName.name}` : 'CI pipeline configured',
      evidence: ciName ? [`${ciName.name} configured`] : ['CI workflow detected'],
    });
  }

  // Modern tooling
  const hasModernBundler = technologies.some((t) => t.category === 'tool' && ['Vite', 'esbuild', 'SWC', 'tsup'].includes(t.name));
  if (hasModernBundler) {
    const bundler = technologies.find((t) => ['Vite', 'esbuild', 'SWC', 'tsup'].includes(t.name));
    strengths.push({
      title: 'Modern Tooling',
      detail: bundler ? `Uses ${bundler.name} for fast builds and development` : 'Modern build tooling',
      evidence: bundler ? [`${bundler.name} detected`] : ['Modern bundler configuration'],
    });
  }

  // TypeScript
  const hasTypeScript = technologies.some((t) => t.name === 'TypeScript');
  if (hasTypeScript) {
    strengths.push({
      title: 'Type Safety',
      detail: 'TypeScript provides static type checking across the codebase',
      evidence: ['TypeScript configuration detected (tsconfig.json)'],
    });
  }

  // Organized structure
  const hasSrcDir = files.some((f) => norm(f.relativePath).startsWith('src/'));
  if (hasSrcDir) {
    strengths.push({
      title: 'Well Organized',
      detail: 'Source code is organized under a dedicated src/ directory',
      evidence: ['src/ directory present'],
    });
  }

  // Linting
  const hasLinter = files.some((f) => {
    const r = f.relativePath;
    return r.includes('.eslintrc') || r.includes('eslint.config.') || r === '.rubocop.yml' || r === 'pylintrc';
  });
  if (hasLinter) {
    strengths.push({
      title: 'Code Quality',
      detail: 'Linter enforces consistent code style and catches potential issues',
      evidence: ['Linter configuration detected'],
    });
  }

  // Formatter
  const hasFormatter = files.some((f) => {
    const r = f.relativePath;
    return r.includes('.prettierrc') || r.includes('prettier.config.') || r === '.editorconfig';
  });
  if (hasFormatter) {
    strengths.push({
      title: 'Consistent Formatting',
      detail: 'Automatic code formatting ensures consistent style across the codebase',
      evidence: ['Formatter configuration detected'],
    });
  }

  // Project structure organization
  if (health.categories.some((c) => c.name === 'Architecture' && c.score >= 80)) {
    strengths.push({
      title: 'Well-Architected',
      detail: 'Project exhibits good separation of concerns and modular organization',
      evidence: ['Architecture health score >= 80/100'],
    });
  }

  // Maturity-based strengths
  if (maturity.level === 'Production Ready' || maturity.level === 'Enterprise Grade') {
    strengths.push({
      title: 'Production Ready',
      detail: 'Project maturity indicates production readiness with testing, CI, and documentation',
      evidence: [`Maturity level: ${maturity.level}`],
    });
  }

  // Docker support
  const hasDocker = technologies.some((t) => t.name === 'Docker');
  if (hasDocker) {
    strengths.push({
      title: 'Containerized',
      detail: 'Docker support enables consistent development and deployment environments',
      evidence: ['Dockerfile detected'],
    });
  }

  // Limit to top 8 strengths
  return strengths.slice(0, 8);
}
