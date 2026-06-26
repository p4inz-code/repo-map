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
      const match = files.find((f) =>
        f.relativePath.replace(/\\/g, '/').startsWith('.github/workflows/'),
      );
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
  // Package managers
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
  // Documentation
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
          f.relativePath.endsWith('.story.tsx'),
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
