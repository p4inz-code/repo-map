import type { Detector } from './types.js';
import type { Technology, FileEntry } from '../../types.js';
import path from 'node:path';

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.mts': 'TypeScript',
  '.cts': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.astro': 'Astro',
  '.py': 'Python',
  '.rs': 'Rust',
  '.go': 'Go',
  '.java': 'Java',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.kts': 'Kotlin',
  '.scala': 'Scala',
  '.c': 'C',
  '.h': 'C/C++ Header',
  '.cpp': 'C++',
  '.hpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.hh': 'C++',
  '.dart': 'Dart',
  '.ex': 'Elixir',
  '.exs': 'Elixir',
  '.erl': 'Erlang',
  '.hs': 'Haskell',
  '.lhs': 'Haskell',
  '.clj': 'Clojure',
  '.cljs': 'ClojureScript',
  '.fs': 'F#',
  '.fsx': 'F#',
  '.sql': 'SQL',
  '.r': 'R',
  '.rmd': 'R',
  '.lua': 'Lua',
  '.zig': 'Zig',
  '.nim': 'Nim',
  '.pl': 'Perl',
  '.pm': 'Perl',
  '.t': 'Perl',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.json': 'JSON',
  '.jsonc': 'JSON',
  '.xml': 'XML',
  '.md': 'Markdown',
  '.mdx': 'Markdown',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'Sass',
  '.less': 'Less',
  '.html': 'HTML',
  '.htm': 'HTML',
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.zsh': 'Shell',
  '.ps1': 'PowerShell',
  '.bat': 'Batch',
  '.cmd': 'Batch',
  '.tf': 'Terraform',
  '.tfstate': 'Terraform',
  '.dockerfile': 'Docker',
  '.proto': 'Protocol Buffers',
  '.graphql': 'GraphQL',
  '.gql': 'GraphQL',
  '.prisma': 'Prisma',
};

const LANGUAGE_BY_FILENAME: Record<string, string> = {
  Dockerfile: 'Docker',
  Makefile: 'Make',
  'CMakeLists.txt': 'CMake',
};

/**
 * Counts file extensions and detects languages.
 * Pure function — no I/O, easily testable.
 */
export function detectLanguagesFromFiles(
  files: FileEntry[],
): Technology[] {
  const languageCounts: Record<
    string,
    { count: number; extensions: Set<string> }
  > = {};
  const languageByFilename: Record<string, string> = {};

  for (const file of files) {
    if (file.isDirectory) continue;

    const basename = path.basename(file.relativePath);

    // Check by filename first (e.g. Dockerfile)
    const filenameLanguage = LANGUAGE_BY_FILENAME[basename];
    if (filenameLanguage) {
      languageByFilename[filenameLanguage] = file.relativePath;
      continue;
    }

    // Check by extension
    const ext = path.extname(basename).toLowerCase();
    const language = LANGUAGE_BY_EXTENSION[ext];
    if (language) {
      if (!languageCounts[language]) {
        languageCounts[language] = { count: 0, extensions: new Set() };
      }
      languageCounts[language].count++;
      languageCounts[language].extensions.add(ext);
    }
  }

  const technologies: Technology[] = [];

  // Add filename-based technologies first
  for (const [lang, filepath] of Object.entries(languageByFilename)) {
    technologies.push({
      name: lang,
      category: 'language',
      count: 1,
      evidence: `Found ${filepath}`,
    });
  }

  // Add extension-based technologies (sorted by count, most frequent first)
  const sorted = Object.entries(languageCounts).sort(
    (a, b) => b[1].count - a[1].count,
  );
  for (const [language, info] of sorted) {
    // Sort extensions by length (shortest first) so .ts appears before .tsx, .mts, etc.
    const exts = [...info.extensions].sort(
      (a, b) => a.length - b.length || a.localeCompare(b),
    ).join(', ');
    technologies.push({
      name: language,
      category: 'language',
      count: info.count,
      evidence: `Found ${info.count} .${exts} file${info.count > 1 ? 's' : ''}`,
    });
  }

  return technologies;
}

export class LanguageDetector implements Detector {
  name = 'language';

  async detect(files: FileEntry[], _rootPath: string): Promise<Technology[]> {
    return detectLanguagesFromFiles(files);
  }
}
