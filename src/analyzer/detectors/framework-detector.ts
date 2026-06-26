import type { Detector } from './types.js';
import type { Technology, FileEntry } from '../../types.js';
import fs from 'node:fs/promises';

const FRAMEWORK_BY_NPM_PACKAGE: Record<string, string> = {
  react: 'React',
  next: 'Next.js',
  vue: 'Vue.js',
  '@angular/core': 'Angular',
  svelte: 'Svelte',
  '@sveltejs/kit': 'SvelteKit',
  astro: 'Astro',
  gatsby: 'Gatsby',
  'gatsby-cli': 'Gatsby',
  nuxt: 'Nuxt.js',
  'nuxt3': 'Nuxt.js',
  remix: 'Remix',
  '@remix-run/react': 'Remix',
  '@nestjs/core': 'NestJS',
  express: 'Express',
  fastify: 'Fastify',
  hono: 'Hono',
  '@hono/hono': 'Hono',
  'next-auth': 'NextAuth.js',
  prisma: 'Prisma',
  'typeorm': 'TypeORM',
  'drizzle-orm': 'Drizzle ORM',
};

// For Cargo.toml, go.mod, requirements.txt — simple substring matching
const FRAMEWORK_BY_CARGO_DEP: Record<string, string> = {
  'actix-web': 'Actix',
  rocket: 'Rocket',
  axum: 'Axum',
  'tokio': 'Tokio',
};

const FRAMEWORK_BY_GO_DEP: Record<string, string> = {
  'gin-gonic/gin': 'Gin',
  'gorilla/mux': 'Gorilla Mux',
  'gorm.io/gorm': 'GORM',
};

const FRAMEWORK_BY_PYTHON_PACKAGE: Record<string, string> = {
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  sqlalchemy: 'SQLAlchemy',
};

interface ConfigFiles {
  packageJson?: Record<string, unknown>;
  cargoToml?: string;
  goMod?: string;
  requirementsTxt?: string;
}

async function readConfigFiles(
  files: FileEntry[],
): Promise<ConfigFiles> {
  const configs: ConfigFiles = {};

  for (const file of files) {
    const rel = file.relativePath.replace(/\\/g, '/');

    if (rel === 'package.json') {
      try {
        const content = await fs.readFile(file.path, 'utf-8');
        configs.packageJson = JSON.parse(content);
      } catch {
        // Invalid JSON or unreadable — skip
      }
    } else if (rel === 'Cargo.toml') {
      try {
        configs.cargoToml = await fs.readFile(file.path, 'utf-8');
      } catch {
        // skip
      }
    } else if (rel === 'go.mod') {
      try {
        configs.goMod = await fs.readFile(file.path, 'utf-8');
      } catch {
        // skip
      }
    } else if (rel === 'requirements.txt') {
      try {
        configs.requirementsTxt = await fs.readFile(file.path, 'utf-8');
      } catch {
        // skip
      }
    }
  }

  return configs;
}

/**
 * Pure detection logic — no I/O, easily testable.
 * Takes parsed config data and returns detected technologies.
 */
export function detectFrameworksFromConfigs(
  configs: ConfigFiles,
): Technology[] {
  const technologies: Technology[] = [];

  // --- package.json (JSON.parse) ---
  if (configs.packageJson) {
    const pkg = configs.packageJson;
    const dependencies: Record<string, string> = {
      ...((pkg.dependencies as Record<string, string>) ?? {}),
      ...((pkg.devDependencies as Record<string, string>) ?? {}),
    };

    for (const [packageName, frameworkName] of Object.entries(
      FRAMEWORK_BY_NPM_PACKAGE,
    )) {
      if (dependencies[packageName] !== undefined) {
        technologies.push({
          name: frameworkName,
          category: 'framework',
          version: dependencies[packageName],
          evidence: `Found in package.json dependencies`,
        });
      }
    }
  }

  // --- Cargo.toml (string matching) ---
  if (configs.cargoToml) {
    for (const [dep, frameworkName] of Object.entries(
      FRAMEWORK_BY_CARGO_DEP,
    )) {
      if (configs.cargoToml.includes(dep)) {
        technologies.push({
          name: frameworkName,
          category: 'framework',
          evidence: `Found in Cargo.toml dependencies`,
        });
      }
    }
  }

  // --- go.mod (string matching) ---
  if (configs.goMod) {
    for (const [dep, frameworkName] of Object.entries(FRAMEWORK_BY_GO_DEP)) {
      if (configs.goMod.includes(dep)) {
        technologies.push({
          name: frameworkName,
          category: 'framework',
          evidence: `Found in go.mod dependencies`,
        });
      }
    }
  }

  // --- requirements.txt (string matching) ---
  if (configs.requirementsTxt) {
    for (const [pkg, frameworkName] of Object.entries(
      FRAMEWORK_BY_PYTHON_PACKAGE,
    )) {
      // Match package names at line start, possibly with version specifiers
      const pattern = new RegExp(`^${pkg}[\\s=<>!~]`, 'im');
      if (pattern.test(configs.requirementsTxt)) {
        technologies.push({
          name: frameworkName,
          category: 'framework',
          evidence: `Found in requirements.txt`,
        });
      }
    }
  }

  return technologies;
}

export class FrameworkDetector implements Detector {
  name = 'framework';

  async detect(files: FileEntry[], _rootPath: string): Promise<Technology[]> {
    const configs = await readConfigFiles(files);
    return detectFrameworksFromConfigs(configs);
  }
}
