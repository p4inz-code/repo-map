import type { FileEntry, Technology, ProjectClassification, ProjectCategory } from '../types.js';

/**
 * Classifies a repository into a project category with confidence score and evidence.
 * Pure function — uses only the scanned file list and detected technologies.
 */
export function classifyProject(
  files: FileEntry[],
  technologies: Technology[],
  hasPackageJson: boolean,
  hasBinEntry: boolean,
  hasWorkspaces: boolean,
): ProjectClassification {
  const evidence: string[] = [];
  const frameworkNames = technologies
    .filter((t) => t.category === 'framework')
    .map((t) => t.name);
  const toolNames = technologies
    .filter((t) => t.category === 'tool')
    .map((t) => t.name);
  const langNames = technologies
    .filter((t) => t.category === 'language')
    .map((t) => t.name);

  // Score each category
  const scores = new Map<ProjectCategory, number>();
  const catEvidence = new Map<ProjectCategory, string[]>();

  function score(cat: ProjectCategory, points: number, reason: string) {
    scores.set(cat, (scores.get(cat) || 0) + points);
    const ev = catEvidence.get(cat) || [];
    ev.push(reason);
    catEvidence.set(cat, ev);
  }

  // Monorepo / Workspace
  if (hasWorkspaces) {
    score('Monorepo', 50, 'Package manager workspaces configured');
  }
  if (hasPackageJson) {
    // Check for monorepo tools
    if (toolNames.includes('Turbo') || toolNames.includes('Nx')) {
      score('Monorepo', 40, `Monorepo tool detected: ${toolNames.find((t) => t === 'Turbo' || t === 'Nx')}`);
    }
  }

  // CLI Tool
  if (hasBinEntry) {
    score('CLI Tool', 60, 'Package.json has bin entry — executable CLI tool');
  }
  // Check for CLI-specific dependencies
  if (frameworkNames.includes('Commander') || toolNames.includes('commander')) {
    score('CLI Tool', 30, 'Uses commander for CLI argument parsing');
  }

  // Web Application
  if (frameworkNames.some((n) => ['Next.js', 'Nuxt.js', 'Remix', 'Astro', 'Gatsby'].includes(n))) {
    score('Web Application', 50, `Web framework detected: ${frameworkNames.filter((n) => ['Next.js', 'Nuxt.js', 'Remix', 'Astro', 'Gatsby'].includes(n)).join(', ')}`);
  }

  // Backend API
  if (frameworkNames.some((n) => ['Express', 'NestJS', 'Fastify', 'Flask', 'Django', 'FastAPI', 'Spring Boot', 'Laravel', 'Rails', 'Koa', 'Hono', 'Actix', 'Rocket', 'Axum', 'Gin', 'Fiber'].includes(n))) {
    score('Backend API', 50, `Backend framework detected: ${frameworkNames.filter((n) => ['Express', 'NestJS', 'Fastify', 'Flask', 'Django', 'FastAPI', 'Spring Boot', 'Laravel', 'Rails', 'Koa', 'Hono', 'Actix', 'Rocket', 'Axum', 'Gin', 'Fiber'].includes(n)).join(', ')}`);
  }

  // Full Stack (both frontend AND backend frameworks)
  const hasFrontend = frameworkNames.some((n) => ['React', 'Next.js', 'Vue.js', 'Nuxt.js', 'Angular', 'Svelte', 'SvelteKit', 'Astro', 'Remix'].includes(n));
  const hasBackend = frameworkNames.some((n) => ['Express', 'NestJS', 'Fastify', 'Flask', 'Django', 'FastAPI', 'Next.js', 'Nuxt.js', 'Remix', 'Astro', 'Spring Boot', 'Laravel', 'Rails'].includes(n));
  if (hasFrontend && hasBackend && !frameworkNames.includes('Next.js') && !frameworkNames.includes('Nuxt.js') && !frameworkNames.includes('Remix') && !frameworkNames.includes('Astro')) {
    // Separate frontend + backend (not a full-stack meta-framework)
    score('Full Stack', 40, 'Separate frontend and backend frameworks detected');
  }

  // Desktop App
  if (frameworkNames.includes('Electron') || frameworkNames.includes('Tauri')) {
    score('Desktop App', 60, `Desktop framework detected: ${frameworkNames.find((n) => n === 'Electron' || n === 'Tauri')}`);
  }

  // Mobile App
  if (frameworkNames.includes('React Native') || frameworkNames.some((n) => n === 'Flutter')) {
    score('Mobile App', 60, `Mobile framework detected`);
  }

  // Library / Package
  if (hasPackageJson) {
    const hasLibEntry = files.some((f) => {
      const r = f.relativePath.replace(/\\/g, '/');
      return r === 'src/index.ts' || r === 'src/index.js' || r === 'lib/index.ts' || r === 'lib/index.js' || r === 'index.ts' || r === 'index.js';
    });
    if (!hasBinEntry && hasLibEntry && toolNames.includes('npm')) {
      score('Library', 30, 'Package.json with library entry point and no bin entry');
    }
  }

  // Frontend Application (standalone frontend)
  if (hasFrontend && !hasBackend) {
    score('Web Application', 20, 'Frontend framework without backend framework');
  }

  // Game
  if (frameworkNames.includes('Unity') || frameworkNames.includes('Unreal') || frameworkNames.includes('Godot') || frameworkNames.includes('Phaser') || frameworkNames.includes('PixiJS')) {
    score('Game', 60, `Game framework detected`);
  }

  // Documentation
  const docFiles = files.filter((f) => {
    const r = f.relativePath.replace(/\\/g, '/').toLowerCase();
    return r.startsWith('docs/') || r === 'README.md' || r.endsWith('.md') && !r.includes('node_modules');
  });
  const nonDocFiles = files.filter((f) => {
    if (f.isDirectory) return false;
    const r = f.relativePath.replace(/\\/g, '/').toLowerCase();
    return !r.startsWith('docs/') && r !== 'README.md' && !r.endsWith('.md');
  });
  if (docFiles.length > 0 && nonDocFiles.length === 0) {
    score('Documentation', 80, 'All files are documentation/markdown');
  } else if (files.length > 0 && docFiles.length / files.length > 0.5) {
    score('Documentation', 40, 'More than half of files are documentation');
  }

  // Configuration Repository
  const configFiles = files.filter((f) => {
    const r = f.relativePath.replace(/\\/g, '/').toLowerCase();
    return r.endsWith('.json') || r.endsWith('.yaml') || r.endsWith('.yml') || r.endsWith('.toml') || r.endsWith('.ini') || r.endsWith('.cfg');
  });
  if (configFiles.length > 0 && nonDocFiles.length === configFiles.length && configFiles.length > 0) {
    score('Configuration Repository', 60, 'All non-documentation files are configuration files');
  }

  // Template / Boilerplate
  if (toolNames.includes('create-react-app') || toolNames.includes('vue-cli') || files.some((f) => f.relativePath === 'template.json' || f.relativePath === 'boilerplate.json')) {
    score('Template', 40, 'Template or boilerplate indicators detected');
  }

  // Plugin
  if (frameworkNames.includes('WordPress') || files.some((f) => f.relativePath.includes('plugin.php') || f.relativePath.includes('plugin.ts'))) {
    score('Plugin', 40, 'Plugin structure detected');
  }

  // Application (generic fallback if nothing specific detected)
  if (!hasBinEntry && !hasFrontend && !hasBackend && frameworkNames.length === 0) {
    if (files.some((f) => !f.isDirectory)) {
      score('Application', 10, 'Generic repository with source files');
    }
  }

  // Determine winner
  let bestCategory: ProjectCategory = 'Unknown';
  let bestScore = 0;
  for (const [cat, catScore] of scores) {
    if (catScore > bestScore) {
      bestScore = catScore;
      bestCategory = cat;
    }
  }

  // Handle ties: if 'Application' is tied with something more specific, prefer the specific one
  for (const [cat, catScore] of scores) {
    if (catScore === bestScore && cat !== 'Application' && bestCategory === 'Application') {
      bestCategory = cat;
    }
  }

  // Calculate confidence (cap at 100)
  const confidence = Math.min(Math.round((bestScore / 80) * 100), 100);

  // Gather all evidence for the winning category
  const winEvidence = catEvidence.get(bestCategory) || [];

  // If no evidence, provide generic reason
  if (winEvidence.length === 0) {
    if (langNames.length > 0) {
      winEvidence.push(`Written in ${langNames.join(', ')}`);
    }
    if (files.length === 0) {
      winEvidence.push('Empty repository');
      bestCategory = 'Unknown';
    }
  }

  return {
    category: bestCategory,
    confidence,
    evidence: winEvidence,
  };
}
