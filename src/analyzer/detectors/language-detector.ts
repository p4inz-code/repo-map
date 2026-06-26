import type { Detector } from './types.js';
import type { Technology, FileEntry } from '../../types.js';
import path from 'node:path';

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  // TypeScript
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.mts': 'TypeScript',
  '.cts': 'TypeScript',
  // JavaScript
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  // Python
  '.py': 'Python',
  '.pyw': 'Python',
  '.pyx': 'Python',
  '.ipynb': 'Jupyter Notebook',
  // Java
  '.java': 'Java',
  '.jar': 'Java',
  // Kotlin
  '.kt': 'Kotlin',
  '.kts': 'Kotlin',
  // C
  '.c': 'C',
  '.h': 'C/C++ Header',
  // C++
  '.cpp': 'C++',
  '.hpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.hh': 'C++',
  '.ixx': 'C++',
  // C#
  '.cs': 'C#',
  '.csx': 'C#',
  // Rust
  '.rs': 'Rust',
  '.rlib': 'Rust',
  // Go
  '.go': 'Go',
  // PHP
  '.php': 'PHP',
  '.phtml': 'PHP',
  // Ruby
  '.rb': 'Ruby',
  '.erb': 'Ruby',
  '.rake': 'Ruby',
  '.gemspec': 'Ruby',
  // Swift
  '.swift': 'Swift',
  // Dart
  '.dart': 'Dart',
  // HTML
  '.html': 'HTML',
  '.htm': 'HTML',
  '.xhtml': 'HTML',
  // CSS
  '.css': 'CSS',
  // SCSS
  '.scss': 'SCSS',
  // Less
  '.less': 'Less',
  // SQL
  '.sql': 'SQL',
  // Shell
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.zsh': 'Shell',
  '.ksh': 'Shell',
  '.fish': 'Shell',
  // PowerShell
  '.ps1': 'PowerShell',
  '.psm1': 'PowerShell',
  '.psd1': 'PowerShell',
  // YAML
  '.yaml': 'YAML',
  '.yml': 'YAML',
  // TOML
  '.toml': 'TOML',
  // JSON
  '.json': 'JSON',
  '.jsonc': 'JSON',
  '.json5': 'JSON',
  // Markdown
  '.md': 'Markdown',
  '.mdx': 'Markdown',
  '.markdown': 'Markdown',
  // Other known extensions
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.astro': 'Astro',
  '.ex': 'Elixir',
  '.exs': 'Elixir',
  '.erl': 'Erlang',
  '.hrl': 'Erlang',
  '.hs': 'Haskell',
  '.lhs': 'Haskell',
  '.clj': 'Clojure',
  '.cljs': 'ClojureScript',
  '.cljc': 'Clojure',
  '.edn': 'Clojure',
  '.fs': 'F#',
  '.fsx': 'F#',
  '.scala': 'Scala',
  '.sc': 'Scala',
  '.r': 'R',
  '.rmd': 'R',
  '.lua': 'Lua',
  '.zig': 'Zig',
  '.nim': 'Nim',
  '.pl': 'Perl',
  '.pm': 'Perl',
  '.t': 'Perl',
  '.xml': 'XML',
  '.svg': 'SVG',
  '.proto': 'Protocol Buffers',
  '.graphql': 'GraphQL',
  '.gql': 'GraphQL',
  '.prisma': 'Prisma',
  '.tf': 'Terraform',
  '.tfstate': 'Terraform',
  '.dockerfile': 'Docker',
  // Batch
  '.bat': 'Batch',
  '.cmd': 'Batch',
  // Solid
  '.sol': 'Solidity',
  // Latex
  '.tex': 'LaTeX',
  '.sty': 'LaTeX',
  '.cls': 'LaTeX',
  // Config
  '.ini': 'INI',
  '.cfg': 'INI',
  '.conf': 'INI',
  // Make
  '.mk': 'Make',
};

const LANGUAGE_BY_FILENAME: Record<string, string> = {
  Dockerfile: 'Docker',
  Makefile: 'Make',
  'CMakeLists.txt': 'CMake',
  'Cargo.toml': 'TOML',
  'composer.json': 'JSON',
  '.env': 'Environment Variables',
  '.env.example': 'Environment Variables',
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
  const filenameLanguages: Record<string, string> = {};

  for (const file of files) {
    if (file.isDirectory) continue;

    const basename = path.basename(file.relativePath);

    // Check by filename first (e.g. Dockerfile)
    const filenameLanguage = LANGUAGE_BY_FILENAME[basename];
    if (filenameLanguage) {
      filenameLanguages[filenameLanguage] = file.relativePath;
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
  for (const [lang, filepath] of Object.entries(filenameLanguages)) {
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
      evidence: `Found ${info.count} file${info.count > 1 ? 's' : ''} (${exts})`,
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
