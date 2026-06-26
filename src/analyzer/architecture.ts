import type { Technology } from '../types.js';
import path from 'node:path';

/**
 * Formats byte size into a human-readable string.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

interface ArchitectureInput {
  rootPath: string;
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  technologies: Technology[];
  tree: string;
  generatedAt: string;
  cliVersion: string;
}

/**
 * Generates a Markdown architecture summary from analysis data.
 *
 * Pure function — consumes pre-computed data, no I/O, no additional scanning.
 */
export function generateArchitecture(input: ArchitectureInput): string {
  const {
    rootPath,
    totalFiles,
    totalDirectories,
    totalSize,
    technologies,
    tree,
    generatedAt,
    cliVersion,
  } = input;

  const projectName = path.basename(rootPath);
  const lines: string[] = [];

  // --- Header ---
  lines.push(`# Project Architecture: ${projectName}`);
  lines.push('');
  lines.push(
    `**Generated:** ${generatedAt}  `,
  );
  lines.push(`**repo-map v${cliVersion}**  `);
  lines.push('');
  lines.push(
    `**Files:** ${totalFiles} | **Directories:** ${totalDirectories} | **Total Size:** ${formatSize(totalSize)}`,
  );
  lines.push('');

  // --- Technology Stack ---
  if (technologies.length > 0) {
    lines.push('## Technology Stack');
    lines.push('');
    lines.push('| Technology | Category | Evidence |');
    lines.push('|---|---|---|');

    const sorted = [...technologies].sort((a, b) => {
      const catOrder: Record<string, number> = {
        language: 0,
        framework: 1,
        tool: 2,
      };
      const catDiff =
        (catOrder[a.category] ?? 99) - (catOrder[b.category] ?? 99);
      if (catDiff !== 0) return catDiff;
      return a.name.localeCompare(b.name);
    });

    for (const tech of sorted) {
      const versionStr = tech.version ? ` (${tech.version})` : '';
      lines.push(
        `| ${tech.name}${versionStr} | ${tech.category} | ${tech.evidence} |`,
      );
    }
    lines.push('');
  }

  // --- Project Structure ---
  lines.push('## Project Structure');
  lines.push('');
  lines.push('```');
  lines.push(tree);
  lines.push('```');
  lines.push('');

  // --- Summary ---
  if (technologies.length > 0) {
    lines.push('## Summary');
    lines.push('');

    const langs = technologies.filter((t) => t.category === 'language');
    const frameworks = technologies.filter(
      (t) => t.category === 'framework',
    );
    const tools = technologies.filter((t) => t.category === 'tool');

    const parts: string[] = [];

    if (langs.length > 0) {
      const primary = langs[0].name;
      const secondary = langs.slice(1).map((l) => l.name);
      let langStr = `This project is primarily a **${primary}**`;
      if (secondary.length > 0) {
        langStr += ` project with ${secondary.join(', ')}`;
      } else {
        langStr += ` project`;
      }
      langStr += '.';
      parts.push(langStr);
    }

    if (frameworks.length > 0) {
      const names = frameworks.map((f) => `**${f.name}**`);
      parts.push(
        `It uses ${names.slice(0, -1).join(', ')}${names.length > 1 ? ' and ' : ''}${names[names.length - 1]}.`,
      );
    }

    if (tools.length > 0) {
      const toolNames = tools.map((t) => t.name);
      parts.push(
        `Tooling includes ${toolNames.slice(0, -1).join(', ')}${toolNames.length > 1 ? ' and ' : ''}${toolNames[toolNames.length - 1]}.`,
      );
    }

    if (parts.length > 0) {
      lines.push(parts.join(' '));
      lines.push('');
    }
  }

  return lines.join('\n');
}
