import type { FileEntry, Technology, BuildPipeline, DirectoryRole, ArchitectureInsight } from '../types.js';

/**
 * Generates architecture insights based on repository structure.
 * Pure function — analyzes patterns in the scanned file list.
 */
export function generateInsights(
  files: FileEntry[],
  technologies: Technology[],
  pipeline: BuildPipeline,
  directoryRoles: DirectoryRole[],
): ArchitectureInsight[] {
  const insights: ArchitectureInsight[] = [];
  const norm = (p: string) => p.replace(/\\/g, '/');
  const filePaths = files.filter((f) => !f.isDirectory).map((f) => norm(f.relativePath));

  // Detect layering: separate dirs for UI, logic, data
  const hasUiDir = filePaths.some((p) => p.startsWith('components/') || p.startsWith('ui/') || p.startsWith('views/') || p.startsWith('pages/'));
  const hasDataDir = filePaths.some((p) => p.startsWith('data/') || p.startsWith('models/') || p.startsWith('store/') || p.startsWith('repositories/'));
  const hasUtilsDir = filePaths.some((p) => p.startsWith('utils/') || p.startsWith('helpers/') || p.startsWith('lib/'));
  const hasApiDir = filePaths.some((p) => p.startsWith('api/') || p.startsWith('routes/') || p.startsWith('controllers/') || p.startsWith('endpoints/'));

  if (hasUiDir && hasDataDir && hasApiDir) {
    insights.push({
      observation: 'Layered Architecture',
      detail: 'Presentation, data access, and API layers are separated into distinct directories — good separation of concerns.',
    });
  } else if (hasUiDir && hasDataDir) {
    insights.push({
      observation: 'Feature Separation',
      detail: 'UI and data layers are separated, though API layer is not clearly isolated.',
    });
  } else if (hasUtilsDir) {
    insights.push({
      observation: 'Utilities Organized',
      detail: 'Shared utilities and helpers are consolidated in dedicated directories.',
    });
  }

  // Modular vs monolithic
  const topDirs = [...new Set(filePaths.filter((p) => p.includes('/')).map((p) => p.split('/')[0]))];
  if (topDirs.length > 6 && filePaths.length > 20) {
    insights.push({
      observation: 'Modular Architecture',
      detail: `Codebase is organized into ${topDirs.length} top-level modules/directories — promotes reusability and separation.`,
    });
  } else if (topDirs.length <= 3 && filePaths.length > 15) {
    insights.push({
      observation: 'Monolithic Layout',
      detail: 'Most files are concentrated in few directories — may benefit from further modularization as the project grows.',
    });
  }

  // Feature-based vs type-based
  const hasFeatureDirs = topDirs.some((d) => {
    const filesInDir = filePaths.filter((p) => p.startsWith(d + '/'));
    const subFiles = filesInDir.filter((p) => p.split('/').length > 2);
    return subFiles.length > 0 && new Set(subFiles.map((p) => p.split('/')[1])).size > 2;
  });
  if (hasFeatureDirs) {
    insights.push({
      observation: 'Feature-Based Organization',
      detail: 'Directories appear organized by feature/domain rather than file type — scales well for large teams.',
    });
  }

  // Plugin architecture indicators
  const hasPluginPattern = files.some((f) => {
    const r = norm(f.relativePath).toLowerCase();
    return r.startsWith('plugins/') || r.includes('/plugins/') || r.startsWith('extensions/') || r.includes('/extensions/') || r.startsWith('addons/') || r.includes('/addons/') || r.startsWith('modules/') || r.includes('/modules/');
  });
  if (hasPluginPattern) {
    insights.push({
      observation: 'Plugin Architecture',
      detail: 'Extensible design with plugin/module system detected — supports extensibility and decoupling.',
    });
  }

  // Event-driven indicators
  const hasEmitter = technologies.some((t) => t.name === 'Socket.IO' || t.name === 'EventEmitter');
  const hasEventsDir = filePaths.some((p) => p.startsWith('events/') || p.startsWith('listeners/') || p.includes('/events/'));
  if (hasEmitter || hasEventsDir) {
    insights.push({
      observation: 'Event-Driven Patterns',
      detail: 'Event handling infrastructure detected — supports asynchronous and decoupled communication.',
    });
  }

  // Monorepo structure
  const hasPackagesDir = filePaths.some((p) => p.startsWith('packages/'));
  if (hasPackagesDir) {
    insights.push({
      observation: 'Monorepo Structure',
      detail: 'Multiple packages managed in a single repository — common for shared libraries and micro-frontends.',
    });
  }

  // Testing organization
  const hasColocatedTests = filePaths.some((p) => p.includes('.test.') || p.includes('.spec.'));
  const hasSeparateTestDir = filePaths.some((p) => p.startsWith('test/') || p.startsWith('tests/') || p.startsWith('__tests__/'));
  if (hasColocatedTests && hasSeparateTestDir) {
    insights.push({
      observation: 'Mixed Test Organization',
      detail: 'Tests are both colocated with source and in separate test directories — consider standardizing one approach.',
    });
  } else if (hasColocatedTests) {
    insights.push({
      observation: 'Colocated Tests',
      detail: 'Tests are placed alongside source files — keeps related code together and makes it easy to find tests.',
    });
  } else if (hasSeparateTestDir) {
    insights.push({
      observation: 'Separated Tests',
      detail: 'Tests are in a dedicated directory — keeps the source tree clean and makes test discovery predictable.',
    });
  }

  // CI pipeline insight
  if (pipeline.ci.length > 0) {
    insights.push({
      observation: 'Automated Quality Gates',
      detail: `${pipeline.ci.join(', ')} pipeline${pipeline.ci.length > 1 ? 's' : ''} configured — code changes are validated automatically.`,
    });
  }

  // Full build pipeline insight
  const pipelineStages = [
    pipeline.linter.length > 0 ? 'linting' : null,
    pipeline.testFramework.length > 0 ? 'testing' : null,
    pipeline.bundler.length > 0 ? 'bundling' : null,
  ].filter(Boolean);
  if (pipelineStages.length >= 2) {
    insights.push({
      observation: 'Complete Build Pipeline',
      detail: `Build pipeline includes ${pipelineStages.join(', ')} — indicates mature development workflow.`,
    });
  }

  return insights;
}
