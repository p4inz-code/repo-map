import type { FileEntry, Technology } from '../types.js';
import type { EntryPoint } from './types.js';

/**
 * Detects entry points in the repository.
 * Pure function — operates on scan data and detected technologies.
 */
export function detectEntryPoints(
  files: FileEntry[],
  technologies: Technology[],
  packageJsonContent: Record<string, unknown> | null,
): EntryPoint[] {
  const entries: EntryPoint[] = [];
  const norm = (p: string) => p.replace(/\\/g, '/');
  const filePaths = files.filter((f) => !f.isDirectory).map((f) => norm(f.relativePath));
  const frameworkNames = technologies.filter((t) => t.category === 'framework').map((t) => t.name);

  // 1. Package.json bin entry (CLI entry)
  if (packageJsonContent && typeof packageJsonContent.bin === 'string') {
    entries.push({
      type: 'CLI Entry',
      path: packageJsonContent.bin as string,
      description: 'Package.json bin entry — executable CLI command',
    });
  } else if (packageJsonContent && packageJsonContent.bin && typeof packageJsonContent.bin === 'object') {
    const bin = packageJsonContent.bin as Record<string, string>;
    for (const [name, binPath] of Object.entries(bin)) {
      entries.push({
        type: 'CLI Entry',
        path: binPath,
        description: `Package.json bin entry: "${name}"`,
      });
    }
  }

  // 2. Package.json main entry (library entry)
  if (packageJsonContent && typeof packageJsonContent.main === 'string') {
    entries.push({
      type: 'Library Entry',
      path: packageJsonContent.main as string,
      description: 'Package.json main entry point',
    });
  }

  // 3. Package.json exports
  if (packageJsonContent && packageJsonContent.exports) {
    entries.push({
      type: 'Library Entry',
      path: '(package.json exports)',
      description: 'Package.json exports field — module entry points',
    });
  }

  // 4. Common entry point files
  const commonEntries = [
    { type: 'Application Entry', paths: ['src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js', 'index.ts', 'index.js', 'lib/index.ts', 'lib/index.js'] },
    { type: 'Server Entry', paths: ['src/server.ts', 'src/server.js', 'src/app.ts', 'src/app.js', 'server.ts', 'server.js', 'app.ts', 'app.js'] },
    { type: 'Electron Entry', paths: ['src/main/main.ts', 'src/main/index.ts', 'electron/main.ts', 'electron/index.ts'] },
    { type: 'Next.js Entry', paths: ['pages/index.tsx', 'pages/index.jsx', 'pages/index.ts', 'app/page.tsx', 'app/page.jsx', 'src/pages/index.tsx', 'src/app/page.tsx'] },
    { type: 'Vite Entry', paths: ['index.html'] },
    { type: 'React Entry', paths: ['src/App.tsx', 'src/App.jsx', 'App.tsx', 'App.jsx'] },
  ];

  for (const entry of commonEntries) {
    for (const ep of entry.paths) {
      if (filePaths.includes(ep)) {
        // Avoid duplicates
        if (!entries.some((e) => e.path === ep)) {
          entries.push({
            type: entry.type,
            path: ep,
            description: `Detected ${entry.type.toLowerCase()}`,
          });
        }
        break;
      }
    }
  }

  // 5. Framework-specific detection
  if (frameworkNames.includes('Next.js') && !entries.some((e) => e.type === 'Next.js Entry')) {
    // Next.js doesn't need a traditional entry, but pages/app directory is the entry
    const hasPagesDir = files.some((f) => norm(f.relativePath).startsWith('pages/'));
    const hasAppDir = files.some((f) => norm(f.relativePath).startsWith('app/'));
    if (hasPagesDir) {
      entries.push({ type: 'Next.js Entry', path: 'pages/', description: 'Next.js pages directory (file-based routing)' });
    } else if (hasAppDir) {
      entries.push({ type: 'Next.js Entry', path: 'app/', description: 'Next.js App Router entry' });
    }
  }

  return entries;
}
