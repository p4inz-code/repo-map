import type { FileEntry, Technology } from '../types.js';
import type { MaturityEstimate, MaturityLevel } from './types.js';

/**
 * Estimates project maturity based on structural indicators.
 * Pure function — no I/O beyond the already-scanned file list.
 */
export function estimateMaturity(
  files: FileEntry[],
  technologies: Technology[],
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
): MaturityEstimate {
  const factors: { factor: string; positive: boolean; detail: string }[] = [];
  const score = { value: 0 };

  // Tests
  const testFiles = files.filter((f) => {
    const r = f.relativePath.replace(/\\/g, '/').toLowerCase();
    return r.includes('/test/') || r.includes('/tests/') || r.includes('.test.') || r.includes('.spec.') || r.includes('__tests__');
  });
  if (testFiles.length > 3) {
    score.value += 20;
    factors.push({ factor: 'Testing', positive: true, detail: `Found ${testFiles.length} test files` });
  } else if (testFiles.length > 0) {
    score.value += 10;
    factors.push({ factor: 'Testing', positive: true, detail: `Found ${testFiles.length} test file(s)` });
  } else if (hasTests) {
    score.value += 5;
    factors.push({ factor: 'Testing', positive: true, detail: 'Test configuration detected' });
  } else {
    factors.push({ factor: 'Testing', positive: false, detail: 'No tests detected' });
  }

  // Documentation
  let docScore = 0;
  if (hasReadme) { docScore += 8; factors.push({ factor: 'Documentation', positive: true, detail: 'README.md present' }); }
  if (hasChangelog) { docScore += 5; factors.push({ factor: 'Documentation', positive: true, detail: 'CHANGELOG present' }); }
  if (hasContributing) { docScore += 4; factors.push({ factor: 'Documentation', positive: true, detail: 'Contributing guidelines present' }); }
  if (hasIssueTemplates) { docScore += 3; factors.push({ factor: 'Documentation', positive: true, detail: 'Issue templates present' }); }
  // Check for docs/ directory
  const hasDocsDir = files.some((f) => f.relativePath.replace(/\\/g, '/').startsWith('docs/'));
  if (hasDocsDir) { docScore += 5; factors.push({ factor: 'Documentation', positive: true, detail: 'Documentation directory present' }); }
  if (docScore === 0) {
    factors.push({ factor: 'Documentation', positive: false, detail: 'No documentation detected' });
  }
  score.value += docScore;

  // CI
  if (hasCi) {
    score.value += 15;
    factors.push({ factor: 'CI/CD', positive: true, detail: 'Continuous integration configured' });
  } else {
    factors.push({ factor: 'CI/CD', positive: false, detail: 'No CI configuration detected' });
  }

  // Linting & Formatting
  if (hasLint) { score.value += 8; factors.push({ factor: 'Code Quality', positive: true, detail: 'Linter configured' }); }
  if (hasFormatter) { score.value += 5; factors.push({ factor: 'Code Quality', positive: true, detail: 'Formatter configured' }); }
  if (!hasLint && !hasFormatter) {
    factors.push({ factor: 'Code Quality', positive: false, detail: 'No linter or formatter configured' });
  }

  // License
  if (hasLicense) {
    score.value += 10;
    factors.push({ factor: 'Licensing', positive: true, detail: 'License file present' });
  } else {
    factors.push({ factor: 'Licensing', positive: false, detail: 'No license file detected' });
  }

  // Release automation
  if (hasReleaseWorkflow) {
    score.value += 10;
    factors.push({ factor: 'Release Process', positive: true, detail: 'Release automation detected' });
  }

  // Project structure (nested directories, organized source)
  const srcDir = files.filter((f) => f.relativePath.replace(/\\/g, '/').startsWith('src/'));
  if (srcDir.length > 5) {
    score.value += 5;
    factors.push({ factor: 'Project Structure', positive: true, detail: 'Organized source directory with multiple files' });
  }

  // Versioned (check for version field in various configs)
  const versioned = technologies.some((t) => t.version);
  if (versioned) {
    score.value += 5;
    factors.push({ factor: 'Versioning', positive: true, detail: 'Project has versioned dependencies' });
  }

  // Determine level
  let level: MaturityLevel;
  if (score.value >= 80) {
    level = 'Enterprise Grade';
  } else if (score.value >= 55) {
    level = 'Production Ready';
  } else if (score.value >= 35) {
    level = 'Active Development';
  } else if (score.value >= 15) {
    level = 'Early Development';
  } else {
    level = 'Prototype';
  }

  // Confidence: based on how many factors were detected vs total possible
  const totalPositive = factors.filter((f) => f.positive).length;
  const totalFactors = factors.length;
  const confidence = totalFactors > 0
    ? Math.min(Math.round((totalPositive / totalFactors) * 100), 100)
    : 0;

  return { level, confidence, factors };
}
