import type { ArchitecturePattern, FileEntry, DependencyGraph } from '../types.js';
import type { ImportParseResult } from './import-parser.js';

/**
 * Detects architecture patterns from project structure and module dependencies.
 * Pure function — no I/O.
 */
export function detectArchitecturePatterns(
  files: FileEntry[],
  graph: DependencyGraph,
  imports: ImportParseResult[],
): ArchitecturePattern[] {
  const patterns: ArchitecturePattern[] = [];
  const norm = (p: string) => p.replace(/\\/g, '/');
  const filePaths = files.filter((f) => !f.isDirectory).map((f) => norm(f.relativePath));
  const allDirs = [...new Set(filePaths.filter((p) => p.includes('/')).map((p) => p.split('/')[0]))];

  // 1. Layered Architecture
  const hasPresentation = allDirs.some((d) => ['components', 'views', 'pages', 'ui', 'screens'].includes(d));
  const hasBusiness = allDirs.some((d) => ['services', 'usecases', 'use-cases', 'business', 'domain'].includes(d));
  const hasData = allDirs.some((d) => ['data', 'repositories', 'models', 'store', 'api', 'network'].includes(d));

  if (hasPresentation && hasBusiness && hasData) {
    const evidence: string[] = [];
    if (hasPresentation) evidence.push('Presentation layer: components/views/pages directories');
    if (hasBusiness) evidence.push('Business layer: services/domain directories');
    if (hasData) evidence.push('Data layer: data/repositories directories');
    patterns.push({
      name: 'Layered Architecture',
      confidence: 80,
      evidence,
    });
  } else if ((hasPresentation && hasBusiness) || (hasPresentation && hasData)) {
    patterns.push({
      name: 'Layered Architecture',
      confidence: 50,
      evidence: ['Partial layering detected — some layers are present but not all three'],
    });
  }

  // 2. Feature-Based
  const featureDirs = new Set<string>();
  for (const f of files) {
    const p = norm(f.relativePath);
    const parts = p.split('/');
    if (parts.length >= 3) {
      // Check for feature grouping like src/feature/subfeature/file.ts
      const feature = parts.slice(0, 2).join('/');
      featureDirs.add(feature);
    }
  }
  if (featureDirs.size > 4) {
    patterns.push({
      name: 'Feature-Based',
      confidence: Math.min(85, featureDirs.size * 10),
      evidence: [`Codebase organized into ${featureDirs.size} feature directories`],
    });
  }

  // 3. MVC
  const hasModels = allDirs.some((d) => ['models', 'model'].includes(d));
  const hasViews = allDirs.some((d) => ['views', 'view', 'templates'].includes(d));
  const hasControllers = allDirs.some((d) => ['controllers', 'controller'].includes(d));

  if (hasModels && hasViews && hasControllers) {
    patterns.push({
      name: 'MVC',
      confidence: 90,
      evidence: ['Models, views, and controllers directories detected — classic MVC pattern'],
    });
  } else if ((hasModels && hasViews) || (hasModels && hasControllers) || (hasViews && hasControllers)) {
    patterns.push({
      name: 'MVC',
      confidence: 50,
      evidence: ['Partial MVC structure — some MVC components detected'],
    });
  }

  // 3b. MVVM
  const hasViewModels = allDirs.some((d) => ['viewmodels', 'view-models', 'view_models'].includes(d));
  if (hasViewModels) {
    patterns.push({
      name: 'MVVM',
      confidence: 80,
      evidence: ['ViewModels directory detected — MVVM (Model-View-ViewModel) pattern in use'],
    });
  }

  // 4. Clean Architecture / Hexagonal
  const hasDomain = allDirs.some((d) => ['domain', 'entities', 'aggregates', 'value-objects'].includes(d));
  const hasUseCases = allDirs.some((d) => ['usecases', 'use-cases', 'interactors', 'application'].includes(d));
  const hasAdapters = allDirs.some((d) => ['adapters', 'infrastructure', 'gateways'].includes(d));
  const hasPorts = allDirs.some((d) => ['ports', 'interfaces', 'contracts'].includes(d));

  if (hasDomain && hasUseCases && (hasAdapters || hasPorts)) {
    patterns.push({
      name: 'Hexagonal Architecture (Ports & Adapters)',
      confidence: 85,
      evidence: [
        hasDomain ? 'Domain layer separated from infrastructure' : '',
        hasUseCases ? 'Use cases/interactors as application boundary' : '',
        hasAdapters ? 'Adapters/infrastructure layer for external concerns' : '',
        hasPorts ? 'Ports/interfaces defined for dependency inversion' : '',
      ].filter(Boolean),
    });
  }

  if (hasDomain && !hasAdapters && !hasPorts) {
    patterns.push({
      name: 'DDD (Domain-Driven Design) Indicators',
      confidence: 40,
      evidence: ['Domain layer detected — possible DDD influence'],
    });
  }

  // 5. Plugin Architecture
  const hasPluginDirs = files.some((f) => {
    const p = norm(f.relativePath);
    return p.startsWith('plugins/') || p.startsWith('extensions/') || p.startsWith('addons/');
  });
  if (hasPluginDirs) {
    patterns.push({
      name: 'Plugin Architecture',
      confidence: 75,
      evidence: ['Plugin/extension directories detected — extensible architecture'],
    });
  }

  // 6. Monolith
  const nonConfigDirs = allDirs.filter((d) => !['.github', '.vscode', '.idea', 'node_modules'].includes(d));
  if (nonConfigDirs.length <= 2 && filePaths.length > 10) {
    patterns.push({
      name: 'Monolith',
      confidence: 70,
      evidence: [`${nonConfigDirs.length} main directories for ${filePaths.length} files — highly concentrated code`],
    });
  }

  // 7. Microservice Indicators
  if (allDirs.some((d) => d.startsWith('service-') || d.endsWith('-service') || d.startsWith('micro-'))) {
    patterns.push({
      name: 'Microservice Indicators',
      confidence: 60,
      evidence: ['Multiple service directories detected — possible microservice architecture'],
    });
  }
  const hasDockerCompose = files.some((f) => {
    const r = norm(f.relativePath);
    return r === 'docker-compose.yml' || r === 'docker-compose.yaml';
  });
  if (allDirs.length > 5 && hasDockerCompose && filePaths.length > 50) {
    patterns.push({
      name: 'Microservice Indicators',
      confidence: 40,
      evidence: ['Many directories with Docker Compose — possible multi-service setup'],
    });
  }

  // 8. Event-Driven Indicators
  const hasEventDirs = allDirs.some((d) => ['events', 'listeners', 'handlers', 'queues', 'messages'].includes(d));
  if (hasEventDirs) {
    patterns.push({
      name: 'Event-Driven Indicators',
      confidence: 65,
      evidence: ['Event/listener/queue directories detected — event-driven patterns in use'],
    });
  }

  // 9. Component-Based
  const hasComponentBased = files.some((f) => {
    const p = norm(f.relativePath);
    // Check for component-based structure: components/ with self-contained directories
    return p.startsWith('components/') && p.split('/').length >= 3;
  });
  if (hasComponentBased) {
    patterns.push({
      name: 'Component-Based',
      confidence: 70,
      evidence: ['Components directory with nested component subdirectories — modular component structure'],
    });
  }

  // 10. Pipeline
  const hasPipelineStages = ['build', 'test', 'deploy', 'release'].some((s) => allDirs.includes(s));
  if (hasPipelineStages) {
    patterns.push({
      name: 'Pipeline',
      confidence: 50,
      evidence: ['Pipeline stage directories (build/test/deploy) detected'],
    });
  }

  // 11. Hybrid — when multiple patterns are detected
  if (patterns.length >= 3) {
    patterns.push({
      name: 'Hybrid',
      confidence: Math.min(90, patterns.length * 20),
      evidence: [`Combines elements of ${patterns.slice(0, 4).map((p) => p.name).join(', ')}`],
    });
  }

  // Sort by confidence descending
  patterns.sort((a, b) => b.confidence - a.confidence);

  return patterns;
}
