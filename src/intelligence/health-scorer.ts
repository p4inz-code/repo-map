import type { FileEntry, HealthScore, HealthScoreCategory } from '../types.js';
import { hasLinterConfig, hasFormatterConfig, hasTestFiles } from '../utils.js';

/**
 * Calculates codebase health score across 8 categories.
 * Pure function — operates on scanned file data only.
 */
export function calculateHealth(files: FileEntry[]): HealthScore {
  const categories: HealthScoreCategory[] = [];

  // Helper to normalize path
  const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase();

  // 1. Documentation (max 100)
  {
    const deductions: string[] = [];
    let score = 100;
    const hasReadme = files.some((f) => f.relativePath === 'README.md');
    if (!hasReadme) { score -= 30; deductions.push('No README.md found'); }

    const hasDocsDir = files.some((f) => norm(f.relativePath).startsWith('docs/'));
    if (!hasDocsDir && files.length > 5) { score -= 15; deductions.push('No docs/ directory for a project of this size'); }

    const hasChangelog = files.some((f) => {
      const r = f.relativePath;
      return r === 'CHANGELOG.md' || r === 'CHANGELOG' || r === 'HISTORY.md';
    });
    if (!hasChangelog) { score -= 10; deductions.push('No changelog found'); }

    const mdFiles = files.filter((f) => f.relativePath.endsWith('.md')).length;
    if (mdFiles === 0 && files.length > 3) { score -= 10; deductions.push('No Markdown documentation files'); }

    const hasContributing = files.some((f) => {
      const r = norm(f.relativePath);
      return r === 'contributing.md' || r === 'contributing';
    });
    if (!hasContributing && files.length > 10) { score -= 5; deductions.push('No contributing guide for a project of this size'); }

    categories.push({
      name: 'Documentation',
      score: Math.max(0, score),
      maxScore: 100,
      deductions,
    });
  }

  // 2. Testing (max 100)
  //
  // Uses a tiered model rather than a linear formula:
  //   - 0 files:     0  (no tests)
  //   - 1-3 files:  30  (minimal test presence)
  //   - 4-10 files: 60  (moderate test coverage across features)
  //   - 11-30 files:80  (substantial test suite)
  //   - 30+ files:  95  (comprehensive testing — near max)
  //
  // The tiers are designed so that a small number of test files can't
  // max out the score, while acknowledging that raw file count alone
  // is an incomplete signal. Future iterations should incorporate
  // test quality signals (coverage tooling, CI execution, test type
  // distribution) as additional independent dimensions.
  {
    const deductions: string[] = [];
    let score = 0;
    const testFiles = files.filter((f) => {
      const r = norm(f.relativePath);
      return r.includes('.test.') || r.includes('.spec.') || r.includes('/test/') || r.includes('/tests/') || r.includes('__tests__');
    });

    if (testFiles.length > 0) {
      // Tiered scoring based on test file count
      if (testFiles.length >= 30) {
        score = 95;
      } else if (testFiles.length >= 11) {
        score = 80;
      } else if (testFiles.length >= 4) {
        score = 60;
      } else {
        score = 30;
      }
    } else {
      deductions.push('No test files detected');
    }

    // Bonus for test configuration presence (vitest, jest, cypress, playwright config)
    const hasTestConfig = files.some((f) => {
      const r = f.relativePath;
      return r === 'vitest.config.ts' || r === 'vitest.config.js' ||
             r === 'jest.config.js' || r === 'jest.config.ts' ||
             r === 'cypress.config.js' || r === 'playwright.config.ts';
    });

    // Bonus for coverage configuration (dedicated coverage config files)
    // Note: vitest.config.* is NOT checked here — it is already covered by
    // hasTestConfig to avoid double-counting the same config file.
    // A true coverage config check would need to inspect file content for
    // coverage settings (e.g., `--coverage` flag, `istanbul` configuration).
    const hasCoverageConfig = files.some((f) => {
      const r = f.relativePath;
      return r === '.nycrc' || r === '.nycrc.json' || r === '.nycrc.yaml' ||
             r === '.c8rc' || r === '.c8rc.json' || r === '.istanbul.yml';
    });

    if (hasTestConfig && testFiles.length === 0) {
      // Config exists but no tests yet — project is set up but hasn't written tests
      score = 20;
      deductions.length = 0;
      deductions.push('Test configuration found but no test files detected');
    } else if (hasTestConfig) {
      score = Math.min(100, score + 5);
    }

    if (hasCoverageConfig && testFiles.length > 0) {
      score = Math.min(100, score + 10);
    }

    categories.push({
      name: 'Testing',
      score: Math.max(0, score),
      maxScore: 100,
      deductions,
    });
  }

  // 3. Architecture (max 100) — based on project structure organization
  {
    const deductions: string[] = [];
    let score = 100;
    const filePaths = files.filter((f) => !f.isDirectory).map((f) => norm(f.relativePath));

    // Deep nesting penalty
    const depths = filePaths.map((p) => p.split('/').length - 1);
    const maxDepth = Math.max(0, ...depths);
    if (maxDepth > 7) { score -= 20; deductions.push(`Deep directory nesting detected (max depth: ${maxDepth})`); }
    else if (maxDepth > 5) { score -= 10; deductions.push(`Moderate directory nesting (max depth: ${maxDepth})`); }

    // Flat structure penalty (all files at root or depth 1)
    const avgDepth = depths.reduce((a, b) => a + b, 0) / (depths.length || 1);
    if (avgDepth < 0.5 && filePaths.length > 5) {
      score -= 15;
      deductions.push('Very flat structure — consider organizing into directories');
    }

    // Source directory organization
    const hasSrcDir = filePaths.some((p) => p.startsWith('src/'));
    if (!hasSrcDir && filePaths.length > 5) {
      score -= 10;
      deductions.push('No src/ directory — source files are scattered at root');
    }

    // Mixed responsibilities in root (too many root-level files)
    const rootFiles = filePaths.filter((p) => !p.includes('/')).length;
    if (rootFiles > 15) {
      score -= 15;
      deductions.push(`${rootFiles} files at root level — consider organizing into subdirectories`);
    } else if (rootFiles > 8) {
      score -= 5;
      deductions.push(`Many files at root level (${rootFiles})`);
    }

    // No clearly separated concerns (only one directory level)
    const topDirs = new Set(filePaths.filter((p) => p.includes('/')).map((p) => p.split('/')[0]));
    if (topDirs.size <= 1 && filePaths.length > 10) {
      score -= 10;
      deductions.push('All source files in a single directory — limited modularization');
    }

    categories.push({
      name: 'Architecture',
      score: Math.max(0, score),
      maxScore: 100,
      deductions,
    });
  }

  // 4. Maintainability (max 100)
  {
    const deductions: string[] = [];
    let score = 100;

    // Too many files in a single directory
    const dirFileCount = new Map<string, number>();
    for (const f of files) {
      if (f.isDirectory) continue;
      const dir = norm(f.relativePath).split('/').slice(0, -1).join('/') || '(root)';
      dirFileCount.set(dir, (dirFileCount.get(dir) || 0) + 1);
    }
    for (const [dir, count] of dirFileCount) {
      if (count > 30) {
        score -= 15;
        deductions.push(`Directory "${dir}" has ${count} files — consider splitting`);
        break;
      } else if (count > 15) {
        score -= 5;
        deductions.push(`Directory "${dir}" has ${count} files`);
        break;
      }
    }

    // Total file count vs. organization
    const totalFiles = files.filter((f) => !f.isDirectory).length;
    const dirCount = new Set(files.filter((f) => !f.isDirectory).map((f) => {
      const dirs = norm(f.relativePath).split('/');
      return dirs.length > 1 ? dirs.slice(0, -1).join('/') : '(root)';
    })).size;

    if (totalFiles > 100 && dirCount < totalFiles / 20) {
      score -= 10;
      deductions.push('Large number of files with few directories — low modularization');
    }

    categories.push({
      name: 'Maintainability',
      score: Math.max(0, score),
      maxScore: 100,
      deductions,
    });
  }

  // 5. Consistency (max 100)
  {
    const deductions: string[] = [];
    let score = 100;

    // Check for linter config
    const hasLinter = files.some((f) => {
      const r = f.relativePath;
      return r.includes('.eslintrc') || r.includes('eslint.config.') ||
             r === '.jshintrc' || r === '.rubocop.yml' ||
             r === 'pylintrc' || r === '.pylintrc';
    });
    if (!hasLinter) {
      score -= 25;
      deductions.push('No linter configuration found');
    }

    // Check for formatter
    const hasFormatter = files.some((f) => {
      const r = f.relativePath;
      return r.includes('.prettierrc') || r === '.editorconfig' ||
             r === 'prettier.config.js';
    });
    if (!hasFormatter) {
      score -= 20;
      deductions.push('No formatter configuration found');
    }

    // Check for TypeScript (implies type consistency)
    const hasTsConfig = files.some((f) => f.relativePath === 'tsconfig.json');
    if (hasTsConfig) {
      score += 10;
    }

    categories.push({
      name: 'Consistency',
      score: Math.max(0, score),
      maxScore: 100,
      deductions,
    });
  }

  // 6. Project Structure (max 100)
  {
    const deductions: string[] = [];
    let score = 100;

    const filePaths = files.filter((f) => !f.isDirectory).map((f) => norm(f.relativePath));

    // Check for standard directory conventions
    const hasSrc = filePaths.some((p) => p.startsWith('src/'));
    const hasTest = filePaths.some((p) => p.startsWith('test/') || p.startsWith('tests/') || p.includes('/__tests__/'));
    const hasConfig = filePaths.some((p) => p.startsWith('config/'));
    const hasScripts = filePaths.some((p) => p.startsWith('scripts/'));
    const hasDist = filePaths.some((p) => p.startsWith('dist/') || p.startsWith('build/') || p.startsWith('out/'));

    if (!hasSrc && filePaths.length > 3) { score -= 15; deductions.push('No src/ directory for source code'); }
    if (!hasTest && filePaths.length > 5) { score -= 10; deductions.push('No tests/ directory'); }
    if (!hasScripts && filePaths.some((p) => p.endsWith('.sh') || p.endsWith('.bat') || p.endsWith('.ps1'))) {
      score -= 5;
      deductions.push('Scripts found without a scripts/ directory');
    }

    // Check for .gitignore
    const hasGitignore = files.some((f) => f.relativePath === '.gitignore');
    if (!hasGitignore) {
      score -= 15;
      deductions.push('No .gitignore file');
    }

    categories.push({
      name: 'Project Structure',
      score: Math.max(0, score),
      maxScore: 100,
      deductions,
    });
  }

  // 7. Tooling (max 100)
  {
    const deductions: string[] = [];
    let score = 0;

    // Package manager
    if (files.some((f) => f.relativePath === 'package.json' || f.relativePath === 'Cargo.toml' || f.relativePath === 'go.mod' || f.relativePath === 'requirements.txt' || f.relativePath === 'Gemfile' || f.relativePath === 'composer.json' || f.relativePath === 'build.gradle')) {
      score += 15;
    } else { deductions.push('No package manager configuration detected'); }

    // Lock file
    if (files.some((f) => {
      const r = f.relativePath;
      return r === 'package-lock.json' || r === 'yarn.lock' || r === 'pnpm-lock.yaml' || r === 'Cargo.lock' || r === 'go.sum' || r === 'Gemfile.lock' || r === 'composer.lock';
    })) {
      score += 10;
    } else { deductions.push('No lock file — dependency versions not pinned'); }

    // Build tooling
    if (files.some((f) => {
      const r = f.relativePath;
      return r.includes('vite.config') || r.includes('webpack.config') || r.includes('rollup.config') || r === 'tsconfig.json' || r === 'Makefile';
    })) {
      score += 15;
    } else { deductions.push('No build configuration detected'); }

    // Linter
    if (hasLinterConfig(files)) { score += 10; } else { deductions.push('No linter configured'); }
    // Formatter
    if (hasFormatterConfig(files)) { score += 10; } else { deductions.push('No formatter configured'); }
    // Test framework
    if (files.some((f) => {
      const r = f.relativePath;
      return r.includes('vitest.config') || r.includes('jest.config') || r.includes('cypress.config') || r.includes('playwright.config');
    })) { score += 15; } else if (hasTestFiles(files)) { score += 5; } else { deductions.push('No test framework configured'); }

    // CI
    if (files.some((f) => norm(f.relativePath).startsWith('.github/workflows/') || f.relativePath === '.gitlab-ci.yml' || f.relativePath === '.circleci/config.yml')) {
      score += 15;
    } else { deductions.push('No CI configuration detected'); }

    // Docker
    if (files.some((f) => f.relativePath === 'Dockerfile' || f.relativePath.endsWith('.dockerfile'))) { score += 5; }
    // Docker Compose
    if (files.some((f) => f.relativePath === 'docker-compose.yml' || f.relativePath === 'compose.yml')) { score += 5; }

    categories.push({
      name: 'Tooling',
      score: Math.min(100, score),
      maxScore: 100,
      deductions,
    });
  }

  // 8. Release Readiness (max 100)
  {
    const deductions: string[] = [];
    let score = 0;

    if (files.some((f) => f.relativePath === 'LICENSE' || f.relativePath === 'LICENSE.md' || f.relativePath === 'LICENSE.txt' || f.relativePath === 'COPYING')) {
      score += 20;
    } else { deductions.push('No license file'); }

    if (files.some((f) => f.relativePath === 'README.md')) { score += 15; } else { deductions.push('No README.md'); }

    if (files.some((f) => {
      const r = norm(f.relativePath);
      return r === 'changelog.md' || r === 'history.md';
    })) { score += 10; } else { deductions.push('No changelog'); }

    // Versioning
    const hasVersion = files.filter((f) => !f.isDirectory).some((f) => {
      const r = f.relativePath;
      return r === 'package.json' || r === 'Cargo.toml' || r === 'pyproject.toml' || r === 'VERSION';
    });
    if (hasVersion) { score += 15; } else { deductions.push('No version management detected'); }

    // CI (bonus)
    if (files.some((f) => norm(f.relativePath).startsWith('.github/workflows/'))) { score += 15; }

    // GitHub-specific: issue templates, contributing
    if (files.some((f) => norm(f.relativePath).startsWith('.github/ISSUE_TEMPLATE/'))) { score += 10; }
    if (files.some((f) => norm(f.relativePath) === 'contributing.md')) { score += 10; }

    // Release workflow
    if (files.some((f) => norm(f.relativePath).includes('release') || norm(f.relativePath).includes('publish'))) { score += 5; }

    categories.push({
      name: 'Release Readiness',
      score: Math.min(100, score),
      maxScore: 100,
      deductions,
    });
  }

  // Calculate overall
  const overall = Math.round(
    categories.reduce((sum, c) => sum + c.score, 0) / categories.length,
  );

  return { overall, maxOverall: 100, categories };
}
