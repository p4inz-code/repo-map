import type { FileEntry } from '../types.js';
import type { ArchitectureSmell, DependencyGraph } from './types.js';
import type { ImportParseResult } from './import-parser.js';

/**
 * Detects architecture smells in the codebase.
 * Pure function — no I/O.
 */
export function detectSmells(
  files: FileEntry[],
  graph: DependencyGraph,
  imports: ImportParseResult[],
  allDirs: string[],
): ArchitectureSmell[] {
  const smells: ArchitectureSmell[] = [];
  const norm = (p: string) => p.replace(/\\/g, '/');

  // 1. God modules (files with too many imports)
  const sortedByImports = [...graph.nodes].sort((a, b) => b.internalImports - a.internalImports);
  for (const node of sortedByImports.slice(0, 3)) {
    if (node.internalImports >= 10) {
      smells.push({
        type: 'God Module',
        detail: `"${node.path}" imports ${node.internalImports} internal modules — it may have too many responsibilities. Consider splitting.`,
        severity: node.internalImports >= 20 ? 'high' : 'medium',
        location: node.path,
      });
    }
  }

  // 2. Large utility folders (utils/helpers with many files)
  const utilDirs = allDirs.filter((d) => ['utils', 'helpers', 'utility', 'helper', 'util'].includes(d));
  for (const dir of utilDirs) {
    const filesInDir = files.filter((f) => norm(f.relativePath).startsWith(dir + '/') && !f.isDirectory);
    if (filesInDir.length > 8) {
      smells.push({
        type: 'Large Utility Folder',
        detail: `"${dir}/" contains ${filesInDir.length} files — consider organizing into subdirectories by concern.`,
        severity: filesInDir.length > 15 ? 'high' : 'medium',
        location: dir + '/',
      });
    }
  }

  // 3. Mixed responsibilities (a directory with files of different types)
  for (const dir of allDirs.slice(0, 10)) {
    const filesInDir = files.filter((f) => {
      const p = norm(f.relativePath);
      return p.startsWith(dir + '/') && !f.isDirectory && !p.includes('/components/') && !p.includes('/pages/');
    });
    if (filesInDir.length > 5) {
      const hasComponents = filesInDir.some((f) => f.relativePath.endsWith('.tsx') || f.relativePath.endsWith('.jsx'));
      const hasLogic = filesInDir.some((f) => f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.js'));
      const hasStyles = filesInDir.some((f) => f.relativePath.endsWith('.css') || f.relativePath.endsWith('.scss'));
      if (hasComponents && hasLogic && hasStyles) {
        smells.push({
          type: 'Mixed Responsibilities',
          detail: `"${dir}/" contains components, logic, and styles — consider separating by concern.`,
          severity: 'medium',
          location: dir + '/',
        });
      }
    }
  }

  // 4. Feature leakage (imports across feature boundaries)
  const featureDirs = [...new Set(imports
    .filter((i) => i.path.includes('/'))
    .map((i) => i.path.split('/')[0]))]
    .filter((d) => !['utils', 'helpers', 'lib', 'shared', 'common', 'types', 'config'].includes(d));

  for (const imp of imports) {
    for (const target of imp.internalImports) {
      const sourceFeature = imp.path.split('/')[0];
      const targetFeature = target.split('/')[0];
      if (sourceFeature !== targetFeature && featureDirs.includes(sourceFeature) && featureDirs.includes(targetFeature)) {
        // Cross-feature dependency
        const existing = smells.find(
          (s) => s.type === 'Feature Leakage' && s.location === `${sourceFeature} → ${targetFeature}`,
        );
        if (existing) {
          continue; // Already reported this cross-feature dependency
        } else {
          smells.push({
            type: 'Feature Leakage',
            detail: `"${sourceFeature}" imports directly from "${targetFeature}" — features should be independent, not coupled.`,
            severity: 'medium',
            location: `${sourceFeature} → ${targetFeature}`,
          });
        }
      }
    }
  }

  // 5. Excessive nesting
  const depths = files.filter((f) => !f.isDirectory).map((f) => norm(f.relativePath).split('/').length - 1);
  const maxDepth = Math.max(0, ...depths);
  if (maxDepth >= 8) {
    smells.push({
      type: 'Excessive Nesting',
      detail: `Maximum directory depth is ${maxDepth} — deeply nested structures reduce navigability. Consider flattening.`,
      severity: maxDepth >= 10 ? 'high' : 'medium',
      location: '(project root)',
    });
  }

  // 6. Huge directories (too many files in one directory)
  const dirFileCounts = new Map<string, number>();
  for (const f of files) {
    if (f.isDirectory) continue;
    const dir = norm(f.relativePath).split('/').slice(0, -1).join('/') || '(root)';
    dirFileCounts.set(dir, (dirFileCounts.get(dir) || 0) + 1);
  }
  for (const [dir, count] of dirFileCounts) {
    if (count > 30) {
      smells.push({
        type: 'Huge Directory',
        detail: `"${dir}/" contains ${count} files — consider splitting into subdirectories.`,
        severity: count > 50 ? 'high' : 'medium',
        location: dir + '/',
      });
    }
  }

  // 7. Configuration sprawl (too many config files at root)
  const configFiles = files.filter((f) => {
    const r = norm(f.relativePath);
    return !r.includes('/') && (r.endsWith('.json') || r.endsWith('.yaml') || r.endsWith('.yml') || r.endsWith('.config.js') || r.endsWith('.config.ts'));
  });
  if (configFiles.length > 10) {
    smells.push({
      type: 'Configuration Sprawl',
      detail: `${configFiles.length} configuration files at project root — consider consolidating into a config/ directory.`,
      severity: 'low',
      location: '(project root)',
    });
  }

  // 8. Overloaded entry points
  const entryPoints = graph.nodes.filter((n) => n.isEntryPoint);
  for (const ep of entryPoints) {
    if (ep.internalImports > 15) {
      smells.push({
        type: 'Overloaded Entry Point',
        detail: `"${ep.path}" directly imports ${ep.internalImports} modules — entry points should delegate, not centralize.`,
        severity: ep.internalImports > 25 ? 'high' : 'medium',
        location: ep.path,
      });
    }
  }

  return smells;
}
