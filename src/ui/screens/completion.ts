/**
 * Completion screen — the final results display for repo-map.
 *
 * Renders a professional summary box with classification, maturity,
 * health bar, compact metrics, and language breakdown.
 *
 * # Architecture
 * - Uses the Renderer for ANSI conversion (never emits raw codes).
 * - Uses box primitive for structural layout.
 * - Static render (no animation) — writes once to stderr.
 *
 * # Layout (normal-width terminal)
 * ```
 * ╭─ repo-map · my-project ───────────────────────────────────────╮
 * │                                                                │
 * │  Classification    CLI Tool                              87%   │
 * │  Maturity          Active Development                          │
 * │  Health            ██████████████████░░░░░░░░  65/100           │
 * │                                                                │
 * │  Files  42    Dirs  12    Size  15.3 KB    Depth  4             │
 * │                                                                │
 * │  TypeScript  30 files (71%)                                     │
 * │  JavaScript   8 files (19%)                                     │
 * │  JSON         4 files (10%)                                     │
 * │                                                                │
 * ╰────────────────────────────────────────────────────────────────╯
 * ```
 *
 * # Narrow-terminal layout (< 60 cols)
 * No box borders. No bar. Text-only with colon-separated labels.
 *
 * # What it must NOT know about
 * - Animation manager (completion is static)
 * - Analysis pipeline details
 * - Raw ANSI escape codes
 */

import { Renderer } from '../renderer.js';
import type { Line } from '../renderer.js';
import type { WidthInfo } from '../layout/width.js';
import { renderBox } from '../primitives/box.js';
import { LABEL_WIDTH } from '../utils/index.js';
import { formatSize } from '../../utils.js';
import { sanitizeFilePath } from '../utils/ansi.js';

// ─── Types ───────────────────────────────────────────────────────

export interface CompletionOptions {
  /** Name of the scanned project. */
  projectName: string;
  /** Total number of files found. */
  totalFiles: number;
  /** Total number of directories found. */
  totalDirectories: number;
  /** Total size in bytes. */
  totalSize: number;
  /** Maximum directory depth scanned. */
  maxDepth: number;
  /** Project classification name (e.g. "CLI Tool"). */
  classification: string;
  /** Classification confidence percentage (0–100). */
  classificationConfidence: number;
  /** Project maturity label (e.g. "Active Development"). */
  maturity: string;
  /** Overall health score (0–100). */
  healthScore: number;
  /** Detected technologies with file counts. */
  technologies: { name: string; category: string; count?: number }[];
  /** Optional output file path for the report. */
  outputPath?: string;
}

// ─── Constants ───────────────────────────────────────────────────

/** Width of the health bar in character cells. */
const BAR_WIDTH = 24;

// ─── Internal helpers (v2.2 patterns) ───────────────────────────

/**
 * Maximum number of language lines inside the boxed dashboard.
 * Derived from the 12-line content budget: 7 fixed lines (breathing,
 * classification, maturity, health, gap, metrics, gap, breathing-bottom)
 * leaves room for 4 language lines (3 languages + 1 overflow).
 */
const MAX_LANGUAGE_LINES = 3;

// ─── Dashboard content builder ──────────────────────────────────

/**
 * Build the dashboard content as styled Lines.
 *
 * The layout follows the v2.2 specification:
 * - Classification, Maturity, Health (with bar) — 20-char label column
 * - Compact metrics line
 * - Clean language list
 * - Breathing whitespace between sections
 *
 * @param options      - Completion data.
 * @param contentWidth - Usable content width inside the box.
 * @param isNarrow     - Whether to use text-only layout.
 * @returns Array of styled Lines for the dashboard.
 */
function buildDashboardLines(
  options: CompletionOptions,
  isNarrow: boolean,
): Line[] {
  if (isNarrow) {
    return buildNarrowLines(options);
  }
  return buildBoxedLines(options);
}

/**
 * Build text-only lines for narrow terminals (< 60 columns).
 * No box, no bar, no fancy alignment. Information preserved.
 */
function buildNarrowLines(options: CompletionOptions): Line[] {
  const lines: Line[] = [];

  // Project name header
  lines.push({
    segments: [{ text: `repo-map · ${sanitizeFilePath(options.projectName)}` }],
  });
  lines.push({ segments: [{ text: '' }] });

  // Classification
  lines.push({
    segments: [
      { text: 'Classification: ', style: { bold: true } },
      { text: `${options.classification} (${options.classificationConfidence}%)` },
    ],
  });

  // Maturity
  lines.push({
    segments: [
      { text: 'Maturity: ', style: { bold: true } },
      { text: options.maturity },
    ],
  });

  // Health (no bar — just the score)
  lines.push({
    segments: [
      { text: 'Health: ', style: { bold: true } },
      { text: `${options.healthScore}/100` },
    ],
  });

  // Blank between sections
  lines.push({ segments: [{ text: '' }] });

  // Metrics
  lines.push({
    segments: [
      {
        text: `Files: ${options.totalFiles}  Dirs: ${options.totalDirectories}  Size: ${formatSize(options.totalSize)}  Depth: ${options.maxDepth}`,
      },
    ],
  });

  // Blank between sections
  lines.push({ segments: [{ text: '' }] });

  // Languages
  const languages = options.technologies.filter(
    (t) => t.category === 'language' && t.count !== undefined,
  ) as { name: string; count: number }[];

  if (languages.length > 0) {
    const total = options.totalFiles || 1;
    const visibleLangs = languages.slice(0, MAX_LANGUAGE_LINES);
    const overflowCount = languages.length - visibleLangs.length;
    const nameWidth = Math.max(...languages.map((l) => l.name.length));
    const countWidth = Math.max(...languages.map((l) => String(l.count).length));

    for (const lang of visibleLangs) {
      const pct = Math.round((lang.count / total) * 100);
      const paddedName = lang.name.padEnd(nameWidth);
      const paddedCount = String(lang.count).padStart(countWidth);
      lines.push({
        segments: [{ text: `${paddedName}  ${paddedCount} files (${pct}%)` }],
      });
    }

    if (overflowCount > 0) {
      lines.push({
        segments: [{ text: `+${overflowCount} more languages`, style: { dim: true } }],
      });
    }
  } else {
    lines.push({
      segments: [{ text: 'No languages detected', style: { dim: true } }],
    });
  }

  return lines;
}

/**
 * Build styled lines for normal/wide terminals (boxed layout).
 *
 * Layout budget: 12 lines inside box (including breathing).
 * Eye path: Classification → Health → Metrics → Languages
 */
function buildBoxedLines(options: CompletionOptions): Line[] {
  const lines: Line[] = [];

  // ── Breathing after top border ──────────────────────────────────
  lines.push({ segments: [{ text: '' }] });

  // ── Classification (focal point) ────────────────────────────────
  lines.push({
    segments: [
      { text: 'Classification'.padEnd(LABEL_WIDTH), style: { bold: true } },
      { text: options.classification },
      { text: `${options.classificationConfidence}%`.padStart(6), style: { dim: true } },
    ],
  });

  // ── Maturity ────────────────────────────────────────────────────
  lines.push({
    segments: [
      { text: 'Maturity'.padEnd(LABEL_WIDTH), style: { bold: true } },
      { text: options.maturity },
    ],
  });

  // ── Health bar ──────────────────────────────────────────────────
  const filledCount = Math.round((Math.max(0, Math.min(options.healthScore, 100)) / 100) * BAR_WIDTH);
  const emptyCount = BAR_WIDTH - filledCount;
  lines.push({
    segments: [
      { text: 'Health'.padEnd(LABEL_WIDTH), style: { bold: true } },
      { text: '█'.repeat(filledCount), style: { color: 'bar-fill' } },
      { text: '░'.repeat(emptyCount), style: { color: 'bar-empty' } },
      { text: `  ${options.healthScore}/100`, style: { dim: true } },
    ],
  });

  // ── Blank between sections ──────────────────────────────────────
  lines.push({ segments: [{ text: '' }] });

  // ── Compact metrics line (3-space gaps per spec §8) ─────────────
  lines.push({
    segments: [
      { text: ' ' },
      { text: 'Files', style: { bold: true } },
      { text: `  ${options.totalFiles}   ` },
      { text: 'Dirs', style: { bold: true } },
      { text: `  ${options.totalDirectories}   ` },
      { text: 'Size', style: { bold: true } },
      { text: `  ${formatSize(options.totalSize)}   ` },
      { text: 'Depth', style: { bold: true } },
      { text: `  ${options.maxDepth}` },
    ],
  });

  // ── Blank between sections ──────────────────────────────────────
  lines.push({ segments: [{ text: '' }] });

  // ── Languages ───────────────────────────────────────────────────
  const languages = options.technologies.filter(
    (t) => t.category === 'language' && t.count !== undefined,
  ) as { name: string; count: number }[];

  if (languages.length > 0) {
    const total = options.totalFiles || 1;
    const visibleLangs = languages.slice(0, MAX_LANGUAGE_LINES);
    const overflowCount = languages.length - visibleLangs.length;
    const nameWidth = Math.max(...languages.map((l) => l.name.length));
    const countWidth = Math.max(...languages.map((l) => String(l.count).length));

    for (const lang of visibleLangs) {
      const pct = Math.round((lang.count / total) * 100);
      const paddedName = lang.name.padEnd(nameWidth);
      const paddedCount = String(lang.count).padStart(countWidth);
      lines.push({
        segments: [{ text: ` ${paddedName}  ${paddedCount} files (${pct}%)` }],
      });
    }

    if (overflowCount > 0) {
      lines.push({
        segments: [{ text: `  +${overflowCount} more languages`, style: { dim: true } }],
      });
    }
  } else {
    lines.push({
      segments: [{ text: ' No languages detected', style: { dim: true } }],
    });
  }

  // ── Breathing before bottom border ──────────────────────────────
  lines.push({ segments: [{ text: '' }] });

  return lines;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Render the completion screen to stderr.
 *
 * Builds a professional summary box with classification, health bar,
 * compact metrics, and language breakdown.
 * On narrow terminals (< 60 columns), renders without box borders
 * for readability.
 *
 * @param options - Completion data to display.
 * @param renderer - The renderer for ANSI conversion.
 * @param width    - Current terminal width info for layout adaptation.
 */
export function renderCompletion(
  options: CompletionOptions,
  renderer: Renderer,
  width: WidthInfo,
): void {
  const contentWidth = width.contentWidth;
  const isNarrow = width.isNarrow;

  // Build dashboard content as styled Lines
  const styledLines = buildDashboardLines(options, isNarrow);
  const styledStrings = renderer.renderFrame(styledLines);

  if (isNarrow) {
    // Narrow terminal — no box, write content directly
    for (const line of styledStrings) {
      process.stderr.write(line + '\n');
    }
  } else {
    // Normal/wide terminal — wrap in a box
    const border = renderer.theme.border('round');
    const boxWidth = Math.min(contentWidth + 2, width.columns);

    const boxLines = renderBox(styledStrings, {
      title: `repo-map · ${sanitizeFilePath(options.projectName)}`,
      width: boxWidth,
      padding: 1,
      border: border.tl ? border : undefined,
    });

    for (const line of boxLines) {
      process.stderr.write(line + '\n');
    }
  }

  // Output path (outside the box, below)
  if (options.outputPath) {
    process.stderr.write(`\nOutput written to ${options.outputPath}\n`);
  }
}
