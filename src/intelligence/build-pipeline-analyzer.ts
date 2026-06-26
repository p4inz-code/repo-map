import type { FileEntry, Technology, BuildPipeline } from '../types.js';

/**
 * Analyzes the build pipeline from scanned files and technologies.
 * Pure function — no additional I/O.
 */
export function analyzeBuildPipeline(
  files: FileEntry[],
  technologies: Technology[],
  packageJsonDeps: Record<string, string>,
  packageJsonDevDeps: Record<string, string>,
): BuildPipeline {
  const pipeline: BuildPipeline = {
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
  };

  const norm = (p: string) => p.replace(/\\/g, '/');
  const toolNames = technologies.filter((t) => t.category === 'tool').map((t) => t.name);

  // Package managers
  if (toolNames.includes('npm')) pipeline.packageManager.push('npm');
  if (toolNames.includes('Yarn')) pipeline.packageManager.push('Yarn');
  if (toolNames.includes('pnpm')) pipeline.packageManager.push('pnpm');
  if (files.some((f) => f.relativePath === 'Cargo.toml')) pipeline.packageManager.push('Cargo');
  if (files.some((f) => f.relativePath === 'go.mod')) pipeline.packageManager.push('Go Modules');
  if (files.some((f) => f.relativePath === 'requirements.txt' || f.relativePath === 'pyproject.toml')) pipeline.packageManager.push('pip');
  if (files.some((f) => f.relativePath === 'Gemfile')) pipeline.packageManager.push('Bundler');
  if (files.some((f) => f.relativePath === 'composer.json')) pipeline.packageManager.push('Composer');
  if (files.some((f) => f.relativePath === 'build.gradle' || f.relativePath === 'build.gradle.kts')) pipeline.packageManager.push('Gradle');

  // Build systems
  if (files.some((f) => f.relativePath === 'Makefile')) pipeline.buildSystem.push('Make');
  if (files.some((f) => f.relativePath === 'justfile' || f.relativePath === 'Justfile')) pipeline.buildSystem.push('Just');
  if (packageJsonDeps['turbo'] || packageJsonDevDeps['turbo'] || files.some((f) => f.relativePath === 'turbo.json')) pipeline.buildSystem.push('Turborepo');
  if (packageJsonDeps['nx'] || packageJsonDevDeps['nx'] || files.some((f) => f.relativePath === 'nx.json')) pipeline.buildSystem.push('Nx');
  if (files.some((f) => f.relativePath === 'build.gradle' || f.relativePath === 'build.gradle.kts')) pipeline.buildSystem.push('Gradle');
  if (files.some((f) => f.relativePath === 'pom.xml')) pipeline.buildSystem.push('Maven');
  if (packageJsonDeps['ts-node'] || packageJsonDevDeps['ts-node']) pipeline.buildSystem.push('ts-node');
  if (packageJsonDeps['tsx'] || packageJsonDevDeps['tsx']) pipeline.buildSystem.push('tsx');

  // Compilers
  if (files.some((f) => f.relativePath === 'tsconfig.json')) pipeline.compiler.push('TypeScript');
  if (packageJsonDeps['typescript'] || packageJsonDevDeps['typescript']) {
    if (!pipeline.compiler.includes('TypeScript')) pipeline.compiler.push('TypeScript');
  }
  if (files.some((f) => f.relativePath === 'Cargo.toml')) pipeline.compiler.push('rustc');
  if (files.some((f) => f.relativePath === 'go.mod')) pipeline.compiler.push('Go Compiler');
  if (files.some((f) => f.relativePath.endsWith('.java'))) pipeline.compiler.push('javac');
  if (packageJsonDeps['babel'] || packageJsonDevDeps['babel'] || packageJsonDeps['@babel/core'] || packageJsonDevDeps['@babel/core']) pipeline.compiler.push('Babel');
  if (packageJsonDeps['swc'] || packageJsonDevDeps['swc'] || packageJsonDevDeps['@swc/core']) pipeline.compiler.push('SWC');
  if (packageJsonDeps['esbuild'] || packageJsonDevDeps['esbuild']) pipeline.compiler.push('esbuild');

  // Bundlers
  if (toolNames.includes('Vite')) pipeline.bundler.push('Vite');
  if (toolNames.includes('Webpack')) pipeline.bundler.push('Webpack');
  if (toolNames.includes('Rollup')) pipeline.bundler.push('Rollup');
  if (toolNames.includes('Parcel')) pipeline.bundler.push('Parcel');
  if (packageJsonDeps['esbuild'] || packageJsonDevDeps['esbuild']) pipeline.bundler.push('esbuild');
  if (files.some((f) => f.relativePath === 'tsup.config.ts' || f.relativePath === 'tsup.config.js')) pipeline.bundler.push('tsup');
  if (files.some((f) => f.relativePath === '.parcelrc')) pipeline.bundler.push('Parcel');

  // Testing frameworks
  if (toolNames.includes('Vitest')) pipeline.testFramework.push('Vitest');
  if (toolNames.includes('Jest')) pipeline.testFramework.push('Jest');
  if (toolNames.includes('Cypress')) pipeline.testFramework.push('Cypress');
  if (toolNames.includes('Playwright')) pipeline.testFramework.push('Playwright');
  if (toolNames.includes('Storybook')) pipeline.testFramework.push('Storybook');
  if (packageJsonDevDeps['mocha']) pipeline.testFramework.push('Mocha');
  if (packageJsonDevDeps['ava']) pipeline.testFramework.push('AVA');
  if (packageJsonDevDeps['tape']) pipeline.testFramework.push('Tape');
  if (packageJsonDeps['pytest'] || files.some((f) => f.relativePath === 'pytest.ini')) pipeline.testFramework.push('pytest');
  if (packageJsonDeps['unittest'] || files.some((f) => f.relativePath.startsWith('test_') && f.relativePath.endsWith('.py'))) pipeline.testFramework.push('unittest');
  if (files.some((f) => f.relativePath === 'Rakefile' || f.relativePath === 'Gemfile')) pipeline.testFramework.push('RSpec');
  if (files.some((f) => f.relativePath.endsWith('_test.go'))) pipeline.testFramework.push('Go Test');
  if (files.some((f) => f.relativePath.endsWith('_test.rs'))) pipeline.testFramework.push('cargo test');
  if (files.some((f) => f.relativePath.endsWith('Test.java') || f.relativePath.endsWith('Tests.java'))) pipeline.testFramework.push('JUnit');

  // Linters
  if (toolNames.includes('ESLint')) pipeline.linter.push('ESLint');
  if (files.some((f) => f.relativePath === '.rubocop.yml')) pipeline.linter.push('RuboCop');
  if (files.some((f) => f.relativePath === 'pylintrc' || f.relativePath === '.pylintrc')) pipeline.linter.push('Pylint');
  if (packageJsonDevDeps['tslint']) pipeline.linter.push('TSLint');
  if (files.some((f) => f.relativePath === '.golangci.yml' || f.relativePath === '.golangci.yaml')) pipeline.linter.push('golangci-lint');
  if (files.some((f) => f.relativePath === 'clippy.toml' || f.relativePath === '.clippy.toml')) pipeline.linter.push('Clippy');

  // Formatters
  if (toolNames.includes('Prettier')) pipeline.formatter.push('Prettier');
  if (files.some((f) => f.relativePath === '.editorconfig')) pipeline.formatter.push('EditorConfig');
  if (packageJsonDevDeps['dprint'] || files.some((f) => f.relativePath === 'dprint.json')) pipeline.formatter.push('dprint');
  if (packageJsonDevDeps['rustfmt'] || files.some((f) => f.relativePath === 'rustfmt.toml')) pipeline.formatter.push('rustfmt');
  if (files.some((f) => f.relativePath === 'go.mod')) pipeline.formatter.push('gofmt');

  // CI
  if (toolNames.includes('GitHub Actions')) pipeline.ci.push('GitHub Actions');
  if (toolNames.includes('GitLab CI')) pipeline.ci.push('GitLab CI');
  if (files.some((f) => f.relativePath === '.circleci/config.yml')) pipeline.ci.push('CircleCI');
  if (files.some((f) => f.relativePath === 'Jenkinsfile')) pipeline.ci.push('Jenkins');
  if (files.some((f) => f.relativePath === '.travis.yml')) pipeline.ci.push('Travis CI');
  if (files.some((f) => f.relativePath === '.drone.yml')) pipeline.ci.push('Drone');
  if (files.some((f) => f.relativePath === 'azure-pipelines.yml' || f.relativePath === 'azure-pipelines.yaml')) pipeline.ci.push('Azure Pipelines');

  // Release automation
  if (files.some((f) => {
    const r = norm(f.relativePath);
    return r.startsWith('.github/workflows/') && (r.includes('release') || r.includes('publish') || r.includes('deploy'));
  })) {
    pipeline.releaseAutomation.push('GitHub Actions (release workflow)');
  }
  if (packageJsonDevDeps['semantic-release'] || packageJsonDevDeps['@semantic-release']) pipeline.releaseAutomation.push('semantic-release');
  if (files.some((f) => f.relativePath === 'release.sh' || f.relativePath === 'publish.sh')) pipeline.releaseAutomation.push('Shell scripts');
  if (files.some((f) => f.relativePath === 'Makefile' && f.relativePath.includes('release'))) pipeline.releaseAutomation.push('Make (release target)');

  // Publish automation
  if (files.some((f) => {
    const r = norm(f.relativePath);
    return r.startsWith('.github/workflows/') && r.includes('publish');
  })) {
    pipeline.publishAutomation.push('GitHub Actions (publish workflow)');
  }
  if (packageJsonDevDeps['np'] || packageJsonDeps['np']) pipeline.publishAutomation.push('np (npm publish)');
  if (packageJsonDevDeps['release-it'] || packageJsonDeps['release-it']) pipeline.publishAutomation.push('release-it');

  return pipeline;
}
