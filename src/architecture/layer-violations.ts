import type { LayerViolation, DependencyGraph, FileEntry } from '../types.js';

/**
 * Detects layer violations based on directory naming conventions and import patterns.
 * Pure function — no I/O.
 */
export function detectLayerViolations(
  files: FileEntry[],
  graph: DependencyGraph,
): LayerViolation[] {
  const violations: LayerViolation[] = [];
  const foundFiles = new Map<string, string[]>();

  // Define layer boundaries based on directory names
  function classifyLayer(path: string): string | null {
    const dir = path.split('/')[0];

    // Presentation / UI layer
    if (['components', 'views', 'pages', 'ui', 'screens', 'presentation'].includes(dir)) {
      return 'presentation';
    }

    // Application / use-case layer
    if (['usecases', 'use-cases', 'application', 'interactors', 'services'].includes(dir)) {
      return 'application';
    }

    // Domain / business logic layer
    if (['domain', 'entities', 'models', 'business', 'core'].includes(dir)) {
      return 'domain';
    }

    // Data / infrastructure layer
    if (['data', 'repositories', 'infrastructure', 'api', 'network', 'database', 'db', 'store'].includes(dir)) {
      return 'infrastructure';
    }

    return null;
  }

  // Map files to layers
  const fileLayers = new Map<string, string | null>();
  for (const node of graph.nodes) {
    fileLayers.set(node.path, classifyLayer(node.path));
  }

  // Define allowed dependencies between layers
  const allowedDeps: Record<string, string[]> = {
    'presentation': ['application', 'domain', 'shared'],
    'application': ['domain', 'shared'],
    'domain': ['shared'],
    'infrastructure': ['domain', 'shared'],
  };

  // Check for violations
  for (const node of graph.nodes) {
    const sourceLayer = fileLayers.get(node.path);
    if (!sourceLayer) continue;

    for (const imp of node.imports) {
      const targetLayer = fileLayers.get(imp);
      if (!targetLayer) continue;

      const allowed = allowedDeps[sourceLayer] || [];
      if (!allowed.includes(targetLayer)) {
        // This is a violation
        const violationKey = `${sourceLayer} → ${targetLayer}`;
        const existing = foundFiles.get(violationKey) || [];
        existing.push(node.path);
        foundFiles.set(violationKey, existing);
      }
    }
  }

  // Build violation descriptions
  const violationNames: Record<string, string> = {
    'presentation → infrastructure': 'UI layer importing infrastructure directly (bypassing domain/application layers)',
    'presentation → domain': 'UI layer importing domain entities directly (consider using application services)',
    'application → infrastructure': 'Application layer importing infrastructure directly (use dependency inversion)',
    'domain → presentation': 'Domain layer importing from UI (domain should have no UI dependencies)',
    'domain → infrastructure': 'Domain layer importing from infrastructure (domain should be infrastructure-agnostic)',
    'infrastructure → presentation': 'Infrastructure layer importing from UI (infrastructure should not depend on presentation)',
  };

  for (const [violationKey, fileList] of foundFiles) {
    const violation = violationNames[violationKey] || `Layer violation: ${violationKey}`;
    const [from, to] = violationKey.split(' → ');
    violations.push({
      violation,
      source: from,
      target: to,
      files: fileList.slice(0, 10), // Top 10 examples
    });
  }

  return violations;
}
