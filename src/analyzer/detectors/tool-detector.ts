import type { Detector } from './types.js';
import type { Technology, FileEntry } from '../../types.js';

interface ToolPattern {
  name: string;
  /** Function that checks if the tool is present in the file list. */
  check: (files: FileEntry[]) => string | null;
}

const TOOL_PATTERNS: ToolPattern[] = [
  // CI / CD
  {
    name: 'GitHub Actions',
    check: (files) => {
      const match = files.find((f) => {
        const normalized = f.relativePath.replace(/[\\/]/g, '/');
        return normalized.startsWith('.github/workflows/');
      });
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  {
    name: 'GitLab CI',
    check: (files) => {
      const match = files.find(
        (f) => f.relativePath === '.gitlab-ci.yml',
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  {
    name: 'Jenkins',
    check: (files) => {
      const match = files.find((f) => f.relativePath === 'Jenkinsfile');
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  // Container
  {
    name: 'Docker',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath === 'Dockerfile' ||
          f.relativePath.endsWith('.dockerfile') ||
          f.relativePath.includes('/Dockerfile.'),
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  {
    name: 'Docker Compose',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath === 'docker-compose.yml' ||
          f.relativePath === 'docker-compose.yaml' ||
          f.relativePath === 'compose.yml' ||
          f.relativePath === 'compose.yaml',
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  // Build tools
  {
    name: 'Vite',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath === 'vite.config.ts' ||
          f.relativePath === 'vite.config.js' ||
          f.relativePath === 'vite.config.mts' ||
          f.relativePath === 'vite.config.mjs',
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  {
    name: 'Webpack',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath === 'webpack.config.js' ||
          f.relativePath === 'webpack.config.ts' ||
          f.relativePath === 'webpack.common.js' ||
          f.relativePath === 'webpack.dev.js' ||
          f.relativePath === 'webpack.prod.js',
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  {
    name: 'Rollup',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath === 'rollup.config.js' ||
          f.relativePath === 'rollup.config.ts' ||
          f.relativePath === 'rollup.config.mjs',
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  {
    name: 'Parcel',
    check: (files) => {
      const match = files.find(
        (f) => f.relativePath === '.parcelrc' || f.relativePath === 'parcel.config.json',
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  // Package managers
  {
    name: 'npm',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath === 'package-lock.json',
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  {
    name: 'Yarn',
    check: (files) => {
      const match = files.find((f) => f.relativePath === 'yarn.lock');
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  {
    name: 'pnpm',
    check: (files) => {
      const match = files.find(
        (f) => f.relativePath === 'pnpm-lock.yaml',
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  // Monorepo tools
  {
    name: 'Turbo',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath === 'turbo.json',
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  {
    name: 'Nx',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath === 'nx.json',
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  // Linting / Formatting
  {
    name: 'ESLint',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath === '.eslintrc' ||
          f.relativePath === '.eslintrc.js' ||
          f.relativePath === '.eslintrc.cjs' ||
          f.relativePath === '.eslintrc.json' ||
          f.relativePath === '.eslintrc.yaml' ||
          f.relativePath === '.eslintrc.yml' ||
          f.relativePath === 'eslint.config.js' ||
          f.relativePath === 'eslint.config.mjs' ||
          f.relativePath === 'eslint.config.cjs',
      );
      return match
        ? `Found ${match.relativePath}`
        : null;
    },
  },
  {
    name: 'Prettier',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath === '.prettierrc' ||
          f.relativePath === '.prettierrc.js' ||
          f.relativePath === '.prettierrc.json' ||
          f.relativePath === '.prettierrc.yaml' ||
          f.relativePath === '.prettierrc.yml' ||
          f.relativePath === '.prettierrc.toml' ||
          f.relativePath === 'prettier.config.js',
      );
      return match
        ? `Found ${match.relativePath}`
        : null;
    },
  },
  // Testing frameworks
  {
    name: 'Vitest',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath === 'vitest.config.ts' ||
          f.relativePath === 'vitest.config.js' ||
          f.relativePath === 'vitest.config.mts' ||
          f.relativePath === 'vitest.config.mjs',
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  {
    name: 'Jest',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath === 'jest.config.js' ||
          f.relativePath === 'jest.config.ts' ||
          f.relativePath === 'jest.config.mjs' ||
          f.relativePath === 'jest.config.cjs' ||
          f.relativePath === 'jest.config.json',
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  // E2E testing
  {
    name: 'Cypress',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath === 'cypress.config.js' ||
          f.relativePath === 'cypress.config.ts' ||
          f.relativePath === 'cypress.config.mjs' ||
          f.relativePath === 'cypress.config.cjs' ||
          f.relativePath.startsWith('cypress/'),
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  {
    name: 'Playwright',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath === 'playwright.config.ts' ||
          f.relativePath === 'playwright.config.js' ||
          f.relativePath === 'playwright.config.mjs' ||
          f.relativePath === 'playwright.config.mts',
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
  // Storybook
  {
    name: 'Storybook',
    check: (files) => {
      const match = files.find(
        (f) =>
          f.relativePath.endsWith('.stories.ts') ||
          f.relativePath.endsWith('.stories.tsx') ||
          f.relativePath.endsWith('.stories.js') ||
          f.relativePath.endsWith('.stories.jsx') ||
          f.relativePath.endsWith('.story.ts') ||
          f.relativePath.endsWith('.story.tsx') ||
          f.relativePath === '.storybook/main.js' ||
          f.relativePath === '.storybook/main.ts',
      );
      return match ? `Found ${match.relativePath}` : null;
    },
  },
];

/**
 * Pure function — detects tools by checking file presence.
 * No I/O required since file list is already provided by the scanner.
 */
export function detectTools(files: FileEntry[]): Technology[] {
  const technologies: Technology[] = [];

  for (const pattern of TOOL_PATTERNS) {
    const evidence = pattern.check(files);
    if (evidence) {
      technologies.push({
        name: pattern.name,
        category: 'tool',
        evidence,
      });
    }
  }

  return technologies;
}

export class ToolDetector implements Detector {
  name = 'tool';

  async detect(files: FileEntry[], _rootPath: string): Promise<Technology[]> {
    return detectTools(files);
  }
}
