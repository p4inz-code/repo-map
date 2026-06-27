/**
 * Completion screen — the final results display for repo-map.
 *
 * Renders a professional summary box with key metrics, classification,
 * language breakdown, strengths/suggestions, and elapsed time.
 *
 * # Architecture
 * - Uses the Renderer for ANSI conversion (never emits raw codes).
 * - Uses box, text, and list primitives for structural layout.
 * - Static render (no animation) — writes once to stderr.
 *
 * # Layout (normal-width terminal)
 * ```
 * ╭─ repo-map · my-project ─────────────────────────────╮
 * │                                                      │
 * │  Files: 42   Dirs: 12   Size: 15.3 KB   Depth: 4    │
 * │                                                      │
 * │  Classification:  CLI Tool (87%)                     │
 * │  Maturity:        Active Development                 │
 * │  Health Score:    65/100                             │
 * │                                                      │
 * │  Languages                                           │
 * │  TypeScript    30 files  (71.4%)                     │
 * │  JavaScript     8 files  (19.0%)                     │
 * │  JSON           4 files  ( 9.5%)                     │
 * │                                                      │
 * │  ✓ 5 strengths identified                            │
 * │  ✓ 3 improvement suggestions (2 high priority)       │
 * │                                                      │
 * │  Completed in 1.2s                                   │
 * │                                                      │
 * ╰────────────────────────────────────────────────────────╯
 *
 * Output written to architecture.md
 * ```
 *
 * # Narrow-terminal layout (< 60 cols)
 * No box borders. Compact metrics line. Stacked layout.
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
import { formatSize } from '../../utils.js';

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
  /** Number of strengths identified. */
  strengthsCount: number;
  /** Number of improvement suggestions. */
  suggestionsCount: number;
  /** Number of high-priority suggestions. */
  highPriorityCount: number;
  /** Analysis elapsed time in seconds. */
  elapsed: number;
  /** Optional output file path for the report. */
  outputPath?: string;
}

// ─── Internal helpers ────────────────────────────────────────────

/**
 * Build the inner content lines (plain text, no ANSI codes) for the
 * completion box. Each line is returned as plain text that will later
 * be styled and wrapped in a box.
 *
 * @param options - Completion data.
 * @param checkMark - The check mark character/symbol to use (theme-dependent).
 */
function _buildContentLines(options: CompletionOptions, checkMark: string): string[] {
  const lines: string[] = [];

  const indent = ' '; // 1 extra space beyond box padding (padding=1 gives total 2)

  // ── Metrics line ────────────────────────────────────────────────
  lines.push(
    `${indent}Files: ${options.totalFiles}   Dirs: ${options.totalDirectories}   ` +
    `Size: ${formatSize(options.totalSize)}   Depth: ${options.maxDepth}`,
  );

  // ── Spacer ──────────────────────────────────────────────────────
  lines.push('');

  // ── Classification ──────────────────────────────────────────────
  lines.push(
    `${indent}Classification:  ${options.classification} (${options.classificationConfidence}%)`,
  );
  lines.push(
    `${indent}Maturity:        ${options.maturity}`,
  );
  lines.push(
    `${indent}Health Score:    ${options.healthScore}/100`,
  );

  // ── Spacer ──────────────────────────────────────────────────────
  lines.push('');

  // ── Languages ───────────────────────────────────────────────────
  const languages = options.technologies.filter(
    (t) => t.category === 'language' && t.count !== undefined,
  ) as { name: string; count: number }[];

  if (languages.length > 0) {
    lines.push(`${indent}Languages`);

    // Format each language row with aligned columns
    const nameWidth = Math.max(
      ...languages.map((l) => l.name.length),
      10,
    );
    const total = options.totalFiles || 1;

    for (const lang of languages) {
      const pct = ((lang.count / total) * 100).toFixed(1);
      const paddedName = lang.name.padEnd(nameWidth);
      const paddedCount = String(lang.count).padStart(5);
      const paddedPct = pct.padStart(5);
      lines.push(`${indent}  ${paddedName}${paddedCount} files  (${paddedPct}%)`);
    }
  } else {
    lines.push(`${indent}Languages`);
    lines.push(`${indent}  No languages detected`);
  }

  // ── Spacer ──────────────────────────────────────────────────────
  lines.push('');

  // ── Strengths & Suggestions ─────────────────────────────────────
  lines.push(`${indent}${checkMark} ${options.strengthsCount} strengths identified`);
  if (options.highPriorityCount > 0) {
    lines.push(
      `${indent}${checkMark} ${options.suggestionsCount} improvement suggestions ` +
      `(${options.highPriorityCount} high priority)`,
    );
  } else {
    lines.push(`${indent}${checkMark} ${options.suggestionsCount} improvement suggestions`);
  }

  // ── Spacer ──────────────────────────────────────────────────────
  lines.push('');

  // ── Elapsed time ────────────────────────────────────────────────
  lines.push(`${indent}Completed in ${options.elapsed.toFixed(1)}s`);

  // ── Bottom spacer ───────────────────────────────────────────────
  lines.push('');

  return lines;
}

/**
 * Build the inner content as styled Lines for the renderer.
 * Each line is wrapped with the appropriate TextStyle tokens.
 */
function _buildStyledLines(
  contentLines: string[],
  _options: CompletionOptions,
): Line[] {
  return contentLines.map((line) => {
    // Empty lines (spacers) — pass through as plain segments
    if (!line) {
      return { segments: [{ text: line }] };
    }

    const trimmed = line.trimStart();

    // Metrics line
    if (trimmed.startsWith('Files:')) {
      return buildSimpleLine(line);
    }

    // Classification / Maturity / Health Score — labels bold
    if (
      trimmed.startsWith('Classification:') ||
      trimmed.startsWith('Maturity:') ||
      trimmed.startsWith('Health Score:')
    ) {
      return { segments: [{ text: line, style: { bold: true } }] };
    }

    // Languages header — bold
    if (trimmed === 'Languages') {
      return { segments: [{ text: line, style: { bold: true } }] };
    }

    // "No languages detected" — dim
    if (trimmed.startsWith('No languages detected')) {
      return { segments: [{ text: line, style: { dim: true } }] };
    }

    // Strengths / Suggestions — success color
    if (
      trimmed.endsWith('strengths identified') ||
      trimmed.endsWith('improvement suggestions') ||
      trimmed.endsWith('high priority)')
    ) {
      return { segments: [{ text: line, style: { color: 'success' } }] };
    }

    // Elapsed — dim style
    if (trimmed.startsWith('Completed in')) {
      return { segments: [{ text: line, style: { dim: true } }] };
    }

    // Language rows — plain text
    if (/^\s{2,}\S/.test(trimmed) && /\d+ files/.test(trimmed)) {
      return buildSimpleLine(line);
    }

    // Fallback — plain text
    return { segments: [{ text: line }] };
  });
}

function buildSimpleLine(line: string): Line {
  return { segments: [{ text: line }] };
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Render the completion screen to stderr.
 *
 * Builds a professional summary box with all key analysis results.
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

  // Build inner content as plain text using the theme's check mark symbol
  const checkMark = renderer.theme.symbol('check');
  const contentLines = _buildContentLines(options, checkMark);

  // Style the content via the renderer
  const styledLines = _buildStyledLines(contentLines, options);
  const styledStrings = renderer.renderFrame(styledLines);

  if (isNarrow) {
    // Narrow terminal — no box, write content directly
    for (const line of styledStrings) {
      process.stderr.write(line + '\n');
    }
  } else {
    // Normal/wide terminal — wrap in a box
    const border = renderer.theme.border('round');
    const boxWidth = Math.min(contentWidth + 4, width.columns);

    const boxLines = renderBox(styledStrings, {
      title: `repo-map · ${options.projectName}`,
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
