/**
 * Stats screen — compact repository statistics with language breakdown.
 *
 * Renders a boxed summary with file/directory counts, size, depth, language
 * breakdown by percentage, and largest file/directory info.
 *
 * # Architecture
 * - Uses the Renderer for ANSI conversion (never emits raw codes).
 * - Uses renderBox primitive for layout.
 * - Static render (no animation) — writes once to stderr.
 *
 * # Layout
 * ```
 * ╭─ repo-map · stats ─────────────────────────────────╮
 * │                                                     │
 * │  Files: 42   Dirs: 12   Size: 15.3 KB               │
 * │  Depth: 4                                           │
 * │                                                     │
 * │  TypeScript             30 files  (71.4%)            │
 * │  JavaScript              8 files  (19.0%)            │
 * │  JSON                    4 files  ( 9.5%)            │
 * │                                                     │
 * │  Largest file:   src/app.ts (2.5 KB)                 │
 * │  Largest dir:    src/components (15 files)           │
 * │  Avg files/dir:  3.5                                 │
 * │                                                     │
 * ╰───────────────────────────────────────────────────────╯
 * ```
 *
 * # What it must NOT know about
 * - Animation manager, analysis pipeline, file system I/O
 * - Raw ANSI escape codes
 */

import { Renderer } from '../renderer.js';
import type { Line } from '../renderer.js';
import { renderBox } from '../primitives/box.js';

// ─── Types ───────────────────────────────────────────────────────

export interface StatsOptions {
  /** Name of the scanned project. */
  projectName: string;
  /** Total number of files found. */
  totalFiles: number;
  /** Total number of directories found. */
  totalDirectories: number;
  /** Total size as a pre-formatted string (e.g. "15.3 KB"). */
  totalSize: string;
  /** Maximum directory depth scanned. */
  maxDepth: number;
  /** Language breakdown with file counts and percentages. */
  languages: { name: string; count: number; percentage: number }[];
  /** Optional info about the largest file. */
  largestFile?: { path: string; size: string };
  /** Optional info about the largest directory. */
  largestDir?: { path: string; files: number };
  /** Average number of files per directory. */
  avgFilesPerDir: number;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Render a compact statistics screen to stderr.
 *
 * Shows key metrics and language breakdown inside a bordered box.
 * On narrow terminals, renders without box borders.
 *
 * @param options  - Stats display data.
 * @param renderer - The renderer for ANSI conversion.
 */
export function renderStats(options: StatsOptions, renderer: Renderer): void {
  const contentWidth = renderer.width.contentWidth;
  const isNarrow = renderer.width.isNarrow;
  const theme = renderer.theme;

  const indent = ' '; // 1 extra space beyond box padding
  const namePadding = 22;

  // Build inner content lines (plain text)
  const contentLines: string[] = [];

  // ── Metrics line ────────────────────────────────────────────────
  contentLines.push(
    `${indent}Files: ${options.totalFiles}   Dirs: ${options.totalDirectories}   ` +
    `Size: ${options.totalSize}`,
  );
  contentLines.push(
    `${indent}Depth: ${options.maxDepth}`,
  );

  // ── Spacer ──────────────────────────────────────────────────────
  contentLines.push('');

  // ── Language breakdown ──────────────────────────────────────────
  if (options.languages.length > 0) {
    for (const lang of options.languages) {
      const paddedName = lang.name.padEnd(namePadding);
      const paddedCount = String(lang.count).padStart(6);
      const paddedPct = lang.percentage.toFixed(1).padStart(5);
      contentLines.push(`${indent}${paddedName}${paddedCount} files  (${paddedPct}%)`);
    }
  } else {
    contentLines.push(`${indent}No languages detected`);
  }

  // ── Spacer ──────────────────────────────────────────────────────
  contentLines.push('');

  // ── Additional stats ────────────────────────────────────────────
  if (options.largestFile) {
    contentLines.push(
      `${indent}Largest file:   ${options.largestFile.path} (${options.largestFile.size})`,
    );
  }
  if (options.largestDir) {
    contentLines.push(
      `${indent}Largest dir:    ${options.largestDir.path} (${options.largestDir.files} files)`,
    );
  }
  if (options.avgFilesPerDir > 0) {
    contentLines.push(
      `${indent}Avg files/dir:  ${options.avgFilesPerDir}`,
    );
  }

  // ── Bottom spacer ───────────────────────────────────────────────
  contentLines.push('');

  // Style via renderer — apply bold to section headers
  const styledLines: Line[] = contentLines.map((line) => {
    if (!line) return { segments: [{ text: line }] };
    return { segments: [{ text: line }] };
  });

  const styledStrings = renderer.renderFrame(styledLines);

  if (isNarrow) {
    for (const line of styledStrings) {
      process.stderr.write(line + '\n');
    }
  } else {
    const border = theme.border('round');
    const boxWidth = Math.min(contentWidth + 4, renderer.width.columns);

    const boxLines = renderBox(styledStrings, {
      title: `repo-map · ${options.projectName} · stats`,
      width: boxWidth,
      padding: 1,
      border: border.tl ? border : undefined,
    });

    for (const line of boxLines) {
      process.stderr.write(line + '\n');
    }
  }
}
