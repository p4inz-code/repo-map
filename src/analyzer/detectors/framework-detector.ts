import type { Detector } from './types.js';
import type { Technology, FileEntry } from '../../types.js';
import { fileCache } from '../../file-cache.js';
import { processBatch } from '../../batch.js';

const FRAMEWORK_BY_NPM_PACKAGE: Record<string, string> = {
  // Frontend frameworks
  react: 'React',
  next: 'Next.js',
  vue: 'Vue.js',
  '@angular/core': 'Angular',
  svelte: 'Svelte',
  '@sveltejs/kit': 'SvelteKit',
  astro: 'Astro',
  remix: 'Remix',
  '@remix-run/react': 'Remix',
  gatsby: 'Gatsby',
  'gatsby-cli': 'Gatsby',
  nuxt: 'Nuxt.js',
  'nuxt3': 'Nuxt.js',
  '@nuxt/core': 'Nuxt.js',
  '@nuxtjs/kit': 'Nuxt.js',
  '@nuxt/bridge': 'Nuxt.js',
  // Backend frameworks
  express: 'Express',
  '@nestjs/core': 'NestJS',
  fastify: 'Fastify',
  hono: 'Hono',
  '@hono/hono': 'Hono',
  '@hono/node-server': 'Hono',
  koa: 'Koa',
  'socket.io': 'Socket.IO',
  // Desktop
  electron: 'Electron',
  'electron-builder': 'Electron',
  // Auth
  'next-auth': 'NextAuth.js',
  '@auth/core': 'Auth.js',
  // ORM
  prisma: 'Prisma',
  typeorm: 'TypeORM',
  'drizzle-orm': 'Drizzle ORM',
  mongoose: 'Mongoose',
  'sequelize': 'Sequelize',
  // CSS frameworks
  tailwindcss: 'Tailwind CSS',
  bootstrap: 'Bootstrap',
  '@angular/animations': 'Angular',
  '@angular/router': 'Angular',
  '@angular/forms': 'Angular',
  '@angular/common': 'Angular',
  '@angular/compiler': 'Angular',
  '@angular/platform-browser': 'Angular',
  '@angular/platform-browser-dynamic': 'Angular',
};

// For Cargo.toml — simple substring matching
const FRAMEWORK_BY_CARGO_DEP: Record<string, string> = {
  'actix-web': 'Actix',
  rocket: 'Rocket',
  axum: 'Axum',
  tokio: 'Tokio',
};

// For go.mod — substring matching
const FRAMEWORK_BY_GO_DEP: Record<string, string> = {
  'gin-gonic/gin': 'Gin',
  'gorilla/mux': 'Gorilla Mux',
  'gorm.io/gorm': 'GORM',
  'fiber': 'Fiber',
  'echo': 'Echo',
};

// For requirements.txt — line-by-line matching
const FRAMEWORK_BY_PYTHON_PACKAGE: Record<string, string> = {
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  sqlalchemy: 'SQLAlchemy',
  tornado: 'Tornado',
  aiohttp: 'aiohttp',
  bottle: 'Bottle',
  pyramid: 'Pyramid',
  sanic: 'Sanic',
  starlette: 'Starlette',
};

// For Gemfile — line-by-line matching
const FRAMEWORK_BY_RUBY_GEM: Record<string, string> = {
  rails: 'Rails',
  sinatra: 'Sinatra',
  rack: 'Rack',
  devise: 'Devise',
  rspec: 'RSpec',
  'grape': 'Grape API',
};

// For composer.json — JSON-based detection
const FRAMEWORK_BY_PHP_PACKAGE: Record<string, string> = {
  'laravel/framework': 'Laravel',
  'symfony/http-kernel': 'Symfony',
  'symfony/framework-bundle': 'Symfony',
  'cakephp/cakephp': 'CakePHP',
  'codeigniter/framework': 'CodeIgniter',
  'yiisoft/yii2': 'Yii',
  'yiisoft/yii': 'Yii',
  'phalcon/phalcon': 'Phalcon',
};

// For build.gradle / build.gradle.kts — substring matching
const FRAMEWORK_BY_GRADLE_DEP: Record<string, string> = {
  'org.springframework.boot': 'Spring Boot',
  'org.springframework': 'Spring',
  'org.apache.maven': 'Maven',
};

interface ConfigFiles {
  packageJson?: Record<string, unknown>;
  cargoToml?: string;
  goMod?: string;
  requirementsTxt?: string;
  gemfile?: string;
  composerJson?: Record<string, unknown>;
  gradleFile?: string;
}

/**
 * Reads a single config file and populates the ConfigFiles object.
 * Used by readConfigFiles with bounded concurrent processing.
 */
async function readSingleConfigFile(
  file: FileEntry,
  configs: ConfigFiles,
): Promise<void> {
  const rel = file.relativePath.replace(/\\/g, '/');

  if (rel === 'package.json' || rel.endsWith('/package.json')) {
    try {
      const content = await fileCache.read(file.path);
      if (content) configs.packageJson = JSON.parse(content);
    } catch {
      // Invalid JSON or unreadable — skip
    }
  } else if (rel === 'Cargo.toml') {
    configs.cargoToml = await fileCache.read(file.path) || undefined;
  } else if (rel === 'go.mod') {
    configs.goMod = await fileCache.read(file.path) || undefined;
  } else if (rel === 'requirements.txt') {
    configs.requirementsTxt = await fileCache.read(file.path) || undefined;
  } else if (rel === 'Gemfile' || rel === 'gems.rb') {
    configs.gemfile = await fileCache.read(file.path) || undefined;
  } else if (rel === 'composer.json') {
    try {
      const content = await fileCache.read(file.path);
      if (content) configs.composerJson = JSON.parse(content);
    } catch {
      // skip
    }
  } else if (rel === 'build.gradle' || rel === 'build.gradle.kts') {
    configs.gradleFile = await fileCache.read(file.path) || undefined;
  }
}

async function readConfigFiles(
  files: FileEntry[],
): Promise<ConfigFiles> {
  const configs: ConfigFiles = {};

  // Filter to only config-like files for efficient batch processing
  const configExtensions = new Set([
    'package.json', 'Cargo.toml', 'go.mod', 'requirements.txt',
    'Gemfile', 'gems.rb', 'composer.json', 'build.gradle', 'build.gradle.kts',
  ]);

  const configFiles = files.filter((f) => {
    const name = f.relativePath.split(/[/\\]/).pop() || '';
    return configExtensions.has(name);
  });

  // Process with bounded concurrency
  await processBatch(configFiles, async (file) => {
    await readSingleConfigFile(file, configs);
  }, 20);

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
      ...((pkg.peerDependencies as Record<string, string>) ?? {}),
    };

    for (const [packageName, frameworkName] of Object.entries(
      FRAMEWORK_BY_NPM_PACKAGE,
    )) {
      if (dependencies[packageName] !== undefined) {
        // Check if already added (e.g., Angular packages)
        if (!technologies.some((t) => t.name === frameworkName)) {
          technologies.push({
            name: frameworkName,
            category: 'framework',
            version: dependencies[packageName],
            evidence: `Found in package.json dependencies`,
          });
        }
      }
    }
  }

  // --- Cargo.toml (string matching) ---
  if (configs.cargoToml) {
    for (const [dep, frameworkName] of Object.entries(
      FRAMEWORK_BY_CARGO_DEP,
    )) {
      if (
        configs.cargoToml.includes(dep) &&
        !technologies.some((t) => t.name === frameworkName)
      ) {
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
      if (
        configs.goMod.includes(dep) &&
        !technologies.some((t) => t.name === frameworkName)
      ) {
        technologies.push({
          name: frameworkName,
          category: 'framework',
          evidence: `Found in go.mod dependencies`,
        });
      }
    }
  }

  // --- requirements.txt (regex matching) ---
  if (configs.requirementsTxt) {
    for (const [pkg, frameworkName] of Object.entries(
      FRAMEWORK_BY_PYTHON_PACKAGE,
    )) {
      if (technologies.some((t) => t.name === frameworkName)) continue;
      const pattern = new RegExp(`^${pkg}[\\\\s=<>!~#]`, 'im');
      if (pattern.test(configs.requirementsTxt)) {
        technologies.push({
          name: frameworkName,
          category: 'framework',
          evidence: `Found in requirements.txt`,
        });
      }
    }
  }

  // --- Gemfile (string matching) ---
  if (configs.gemfile) {
    for (const [gem, frameworkName] of Object.entries(
      FRAMEWORK_BY_RUBY_GEM,
    )) {
      if (technologies.some((t) => t.name === frameworkName)) continue;
      const pattern = new RegExp(`gem ['"]${gem}['"]`, 'i');
      if (pattern.test(configs.gemfile)) {
        technologies.push({
          name: frameworkName,
          category: 'framework',
          evidence: `Found in Gemfile`,
        });
      }
    }
  }

  // --- composer.json (JSON.parse) ---
  if (configs.composerJson) {
    const pkg = configs.composerJson;
    const require: Record<string, string> = {
      ...((pkg.require as Record<string, string>) ?? {}),
      ...((pkg['require-dev'] as Record<string, string>) ?? {}),
    };

    for (const [packageName, frameworkName] of Object.entries(
      FRAMEWORK_BY_PHP_PACKAGE,
    )) {
      if (technologies.some((t) => t.name === frameworkName)) continue;
      if (require[packageName] !== undefined) {
        technologies.push({
          name: frameworkName,
          category: 'framework',
          version: require[packageName],
          evidence: `Found in composer.json`,
        });
      }
    }
  }

  // --- build.gradle / build.gradle.kts (string matching) ---
  if (configs.gradleFile) {
    for (const [dep, frameworkName] of Object.entries(
      FRAMEWORK_BY_GRADLE_DEP,
    )) {
      if (technologies.some((t) => t.name === frameworkName)) continue;
      if (configs.gradleFile.includes(dep)) {
        technologies.push({
          name: frameworkName,
          category: 'framework',
          evidence: `Found in build.gradle`,
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
