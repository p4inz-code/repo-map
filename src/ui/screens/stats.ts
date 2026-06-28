/**
 * Stats screen — compact repository statistics with language breakdown.
 *
 * Renders a boxed summary with file/directory counts, size, depth, language
 * breakdown by percentage, largest file/directory info, and elapsed time.
 *
 * # Architecture
 * - Uses the Renderer for ANSI conversion (never emits raw codes).
 * - Uses renderBox primitive for layout.
 * - Static render (no animation) — writes once to stderr.
 *
 * # Layout (normal-width terminal)
 * ```
 * ╭─ repo-map · my-project · stats ──────────────────────────────╮
 * │                                                               │
 * │  Files  42    Dirs  12    Size  15.3 KB                       │
 * │  Depth  4    Avg files/dir  3.5                               │
 * │                                                               │
 * │  Languages                                                    │
 * │  TypeScript    30 files  (71.4%)                               │
 * │  JavaScript     8 files  (19.0%)                               │
 * │  JSON           4 files  ( 9.5%)                               │
 * │                                                               │
 * │  Largest file  src/app.ts (2.5 KB)                             │
 * │  Largest dir   src/components (15 files)                       │
 * │                                                               │
 * │  Completed in 1.2s                                            │
 * │                                                               │
 * ╰───────────────────────────────────────────────────────────────╯
 * ```
 *
 * # Narrow-terminal layout (< 60 cols)
 * No box borders. Text-only with colon-separated labels.
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
  /** Analysis elapsed time in seconds. */
  elapsed: number;
}

// ─── Constants ───────────────────────────────────────────────────

/** Width of the label column in character cells. */
const LABEL_WIDTH = 20;

// ─── Internal helpers ───────────────────────────────────────────

/**
 * Render a label-value pair with 20-char label column.
 * Reused from completion.ts pattern.
 *
 * Contract:
 *   Input:  label ("Largest file"), value ("src/app.ts (2.5 KB)")
 *   Output: "Largest file        src/app.ts (2.5 KB)"
 *
 * Label: padRight to 20 chars
 * Value: follows immediately after label
 */
function renderLabelValue(label: string, value: string): string {
  return label.padEnd(LABEL_WIDTH) + value;
}

// ─── Content builders ──────────────────────────────────────────

/**
 * Build styled lines for normal/wide terminals (boxed layout).
 *
 * Layout budget: 16 lines inside box (including breathing).
 * Eye path: Metrics → Languages → Details → Elapsed
 */
function buildBoxedLines(options: StatsOptions): Line[] {
  const lines: Line[] = [];

  // ── Breathing after top border ──────────────────────────────────
  lines.push({ segments: [{ text: '' }] });

  // ── Compact metrics line 1: Files, Dirs, Size ───────────────────
  lines.push({
    segments: [
      { text: ' ' },
      { text: 'Files', style: { bold: true } },
      { text: `  ${options.totalFiles}   ` },
      { text: 'Dirs', style: { bold: true } },
      { text: `  ${options.totalDirectories}   ` },
      { text: 'Size', style: { bold: true } },
      { text: `  ${options.totalSize}` },
    ],
  });

  // ── Compact metrics line 2: Depth, Avg files/dir ────────────────
  lines.push({
    segments: [
      { text: ' ' },
      { text: 'Depth', style: { bold: true } },
      { text: `  ${options.maxDepth}   ` },
      { text: 'Avg files/dir', style: { bold: true } },
      { text: `  ${options.avgFilesPerDir}` },
    ],
  });

  // ── Blank between sections ──────────────────────────────────────
  lines.push({ segments: [{ text: '' }] });

  // ── Languages section header (bold, no indent) ──────────────────
  lines.push({
    segments: [{ text: 'Languages', style: { bold: true } }],
  });

  // ── Language rows ───────────────────────────────────────────────
  if (options.languages.length > 0) {
    const nameWidth = Math.max(...options.languages.map((l) => l.name.length));
    const countWidth = Math.max(...options.languages.map((l) => String(l.count).length));

    for (const lang of options.languages) {
      const paddedName = lang.name.padEnd(nameWidth);
      const paddedCount = String(lang.count).padStart(countWidth);
      const paddedPct = lang.percentage.toFixed(1).padStart(5);
      lines.push({
        segments: [{ text: ` ${paddedName}  ${paddedCount} files  (${paddedPct}%)` }],
      });
    }
  } else {
    lines.push({
      segments: [{ text: ' No languages detected', style: { dim: true } }],
    });
  }

  // ── Blank between sections ──────────────────────────────────────
  lines.push({ segments: [{ text: '' }] });

  // ── Largest file/dir/avg (20-char label column) ─────────────────
  if (options.largestFile) {
    lines.push({
      segments: [
        { text: renderLabelValue('Largest file', `${options.largestFile.path} (${options.largestFile.size})`) },
      ],
    });
  }
  if (options.largestDir) {
    lines.push({
      segments: [
        { text: renderLabelValue('Largest dir', `${options.largestDir.path} (${options.largestDir.files} files)`) },
      ],
    });
  }

  // ── Blank between sections ──────────────────────────────────────
  lines.push({ segments: [{ text: '' }] });

  // ── Elapsed time (dim) ──────────────────────────────────────────
  lines.push({
    segments: [
      { text: `Completed in ${options.elapsed.toFixed(1)}s`, style: { dim: true } },
    ],
  });

  // ── Breathing before bottom border ──────────────────────────────
  lines.push({ segments: [{ text: '' }] });

  return lines;
}

/**
 * Build text-only lines for narrow terminals (< 60 columns).
 * No box. Information preserved.
 */
function buildNarrowLines(options: StatsOptions): Line[] {
  const lines: Line[] = [];

  // Project name header
  lines.push({
    segments: [{ text: `repo-map · ${options.projectName} · stats` }],
  });
  lines.push({ segments: [{ text: '' }] });

  // Metrics
  lines.push({
    segments: [
      {
        text: `Files: ${options.totalFiles}  Dirs: ${options.totalDirectories}  Size: ${options.totalSize}  Depth: ${options.maxDepth}  Avg: ${options.avgFilesPerDir}`,
      },
    ],
  });
  lines.push({ segments: [{ text: '' }] });

  // Languages
  if (options.languages.length > 0) {
    const nameWidth = Math.max(...options.languages.map((l) => l.name.length));
    const countWidth = Math.max(...options.languages.map((l) => String(l.count).length));

    for (const lang of options.languages) {
      const paddedName = lang.name.padEnd(nameWidth);
      const paddedCount = String(lang.count).padStart(countWidth);
      const paddedPct = lang.percentage.toFixed(1).padStart(5);
      lines.push({
        segments: [{ text: `${paddedName}  ${paddedCount} files  (${paddedPct}%)` }],
      });
    }
  } else {
    lines.push({
      segments: [{ text: 'No languages detected', style: { dim: true } }],
    });
  }

  lines.push({ segments: [{ text: '' }] });

  // Largest file/dir
  if (options.largestFile) {
    lines.push({
      segments: [{ text: `Largest file: ${options.largestFile.path} (${options.largestFile.size})` }],
    });
  }
  if (options.largestDir) {
    lines.push({
      segments: [{ text: `Largest dir: ${options.largestDir.path} (${options.largestDir.files} files)` }],
    });
  }

  lines.push({ segments: [{ text: '' }] });

  // Elapsed
  lines.push({
    segments: [
      { text: `Completed in ${options.elapsed.toFixed(1)}s`, style: { dim: true } },
    ],
  });

  return lines;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Render a compact statistics screen to stderr.
 *
 * Shows key metrics, language breakdown, largest file/dir, and elapsed time
 * inside a bordered box.
 * On narrow terminals (< 60 columns), renders without box borders.
 *
 * @param options  - Stats display data.
 * @param renderer - The renderer for ANSI conversion.
 */
export function renderStats(options: StatsOptions, renderer: Renderer): void {
  const contentWidth = renderer.width.contentWidth;
  const isNarrow = renderer.width.isNarrow;

  const styledLines = isNarrow
    ? buildNarrowLines(options)
    : buildBoxedLines(options);
  const styledStrings = renderer.renderFrame(styledLines);

  if (isNarrow) {
    for (const line of styledStrings) {
      process.stderr.write(line + '\n');
    }
  } else {
    const border = renderer.theme.border('round');
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
