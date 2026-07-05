import type { FileEntry } from '../types.js';
import type { DirectoryRole } from './types.js';

/**
 * Classifies top-level directories into roles based on common conventions.
 * Pure function — operates on the scanned file list.
 */
export function classifyDirectoryRoles(files: FileEntry[]): DirectoryRole[] {
  const roles: DirectoryRole[] = [];
  const seen = new Set<string>();

  // Get all top-level directories
  const dirs = new Set<string>();
  for (const f of files) {
    const norm = f.relativePath.replace(/\\/g, '/');
    const parts = norm.split('/');
    if (parts.length >= 1 && parts[0].length > 0) {
      dirs.add(parts[0]);
    }
  }

  // Classify known directory names
  const knownRoles: Record<string, { role: string; description: string }> = {
    src: { role: 'Application Source', description: 'Primary source code directory' },
    lib: { role: 'Library Source', description: 'Library source code' },
    source: { role: 'Application Source', description: 'Source code directory' },
    app: { role: 'Application Source', description: 'Application source code' },
    test: { role: 'Testing', description: 'Test files' },
    tests: { role: 'Testing', description: 'Test files' },
    __tests__: { role: 'Testing', description: 'Test files (Jest convention)' },
    spec: { role: 'Testing', description: 'Specification/test files' },
    specs: { role: 'Testing', description: 'Specification/test files' },
    docs: { role: 'Documentation', description: 'Project documentation' },
    doc: { role: 'Documentation', description: 'Project documentation' },
    documentation: { role: 'Documentation', description: 'Project documentation' },
    wiki: { role: 'Documentation', description: 'Project wiki/documentation' },
    scripts: { role: 'Automation', description: 'Build and automation scripts' },
    script: { role: 'Automation', description: 'Build and automation scripts' },
    bin: { role: 'Automation', description: 'Executable scripts' },
    tools: { role: 'Automation', description: 'Development tools and utilities' },
    dist: { role: 'Build Output', description: 'Compiled/build output files' },
    build: { role: 'Build Output', description: 'Build output directory' },
    out: { role: 'Build Output', description: 'Build output directory' },
    target: { role: 'Build Output', description: 'Compiled output (Rust convention)' },
    '.github': { role: 'CI/CD', description: 'GitHub Actions workflows and templates' },
    '.gitlab': { role: 'CI/CD', description: 'GitLab CI configuration' },
    '.circleci': { role: 'CI/CD', description: 'CircleCI configuration' },
    assets: { role: 'Resources', description: 'Static assets (images, fonts, etc.)' },
    asset: { role: 'Resources', description: 'Static assets' },
    static: { role: 'Resources', description: 'Static files served directly' },
    public: { role: 'Static Files', description: 'Publicly served static files' },
    'public/': { role: 'Static Files', description: 'Publicly served static files' },
    config: { role: 'Configuration', description: 'Application configuration files' },
    cfg: { role: 'Configuration', description: 'Configuration files' },
    conf: { role: 'Configuration', description: 'Configuration files' },
    settings: { role: 'Configuration', description: 'Application settings' },
    examples: { role: 'Examples', description: 'Usage examples and sample code' },
    example: { role: 'Examples', description: 'Usage examples and sample code' },
    samples: { role: 'Examples', description: 'Sample code and projects' },
    sample: { role: 'Examples', description: 'Sample code' },
    benchmarks: { role: 'Performance', description: 'Performance benchmarks' },
    benchmark: { role: 'Performance', description: 'Performance benchmarks' },
    perf: { role: 'Performance', description: 'Performance tests' },
    migrations: { role: 'Database', description: 'Database migration files' },
    migration: { role: 'Database', description: 'Database migration files' },
    db: { role: 'Database', description: 'Database schemas and migrations' },
    database: { role: 'Database', description: 'Database configuration and schemas' },
    docker: { role: 'Container', description: 'Docker configuration files' },
    dockerfiles: { role: 'Container', description: 'Dockerfiles' },
    i18n: { role: 'Internationalization', description: 'Internationalization and locale files' },
    locales: { role: 'Internationalization', description: 'Locale/translation files' },
    lang: { role: 'Internationalization', description: 'Language translation files' },
    translations: { role: 'Internationalization', description: 'Translation files' },
    hooks: { role: 'Git Hooks', description: 'Git hooks' },
    'githooks': { role: 'Git Hooks', description: 'Git hooks' },
    husky: { role: 'Git Hooks', description: 'Husky git hooks' },
    patches: { role: 'Patches', description: 'Patch files for dependencies' },
    patch: { role: 'Patches', description: 'Patch files' },
    vendor: { role: 'Dependencies', description: 'Vendored third-party dependencies' },
    third_party: { role: 'Dependencies', description: 'Third-party code' },
    node_modules: { role: 'Dependencies', description: 'Node.js dependencies (should be ignored)' },
    '.vscode': { role: 'IDE Configuration', description: 'VS Code editor settings' },
    '.idea': { role: 'IDE Configuration', description: 'JetBrains IDE settings' },
    '.devcontainer': { role: 'Development Environment', description: 'Dev container configuration' },
    '.cursor': { role: 'IDE Configuration', description: 'Cursor editor settings' },
    ci: { role: 'CI/CD', description: 'CI configuration and scripts' },
    deployment: { role: 'Deployment', description: 'Deployment configuration' },
    deploy: { role: 'Deployment', description: 'Deployment scripts and config' },
    k8s: { role: 'Kubernetes', description: 'Kubernetes manifests' },
    kubernetes: { role: 'Kubernetes', description: 'Kubernetes manifests' },
    helm: { role: 'Kubernetes', description: 'Helm charts' },
    terraform: { role: 'Infrastructure', description: 'Terraform infrastructure as code' },
    tf: { role: 'Infrastructure', description: 'Terraform configuration' },
    env: { role: 'Environment', description: 'Environment configuration files' },
    environments: { role: 'Environment', description: 'Environment-specific configuration' },
  };

  for (const dir of dirs) {
    const key = dir.toLowerCase();
    const known = knownRoles[key];
    if (known) {
      roles.push({
        path: dir,
        role: known.role,
        description: known.description,
      });
      seen.add(dir);
    }
  }

  // Classify remaining directories heuristically
  for (const dir of dirs) {
    if (seen.has(dir)) continue;

    const allFilesInDir = files.filter((f) => {
      const norm = f.relativePath.replace(/\\/g, '/');
      return norm.startsWith(dir + '/') || norm === dir;
    });
    const fileCount = allFilesInDir.filter((f) => !f.isDirectory).length;

    if (fileCount === 0) continue;

    // Check if it's a custom source directory
    const hasCodeFiles = allFilesInDir.some((f) => {
      const ext = f.relativePath.split('.').pop()?.toLowerCase();
      return ext && ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'kt', 'cs', 'rs', 'go', 'rb', 'php', 'swift', 'dart', 'c', 'cpp', 'h'].includes(ext);
    });
    if (hasCodeFiles) {
      roles.push({
        path: dir,
        role: 'Custom Source Module',
        description: `Source code module: "${dir}" (${fileCount} files)`,
      });
      seen.add(dir);
      continue;
    }

    // Fallback: generic classification
    roles.push({
      path: dir,
      role: 'Other',
      description: `Directory with ${fileCount} file(s)`,
    });
    seen.add(dir);
  }

  // Sort: known roles first, then alphabetical
  roles.sort((a, b) => {
    const aKnown = a.role !== 'Other' ? 0 : 1;
    const bKnown = b.role !== 'Other' ? 0 : 1;
    if (aKnown !== bKnown) return aKnown - bKnown;
    return a.path.localeCompare(b.path);
  });

  return roles;
}
