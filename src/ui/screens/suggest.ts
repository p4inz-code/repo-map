/**
 * Suggest screen — improvement suggestions and project strengths.
 *
 * Renders a boxed summary with strengths and improvement suggestions
 * organized by priority level.
 *
 * # Architecture
 * - Uses the Renderer for ANSI conversion (never emits raw codes).
 * - Uses renderBox primitive for layout.
 * - Static render (no animation) — writes once to stderr.
 *
 * # Layout (normal-width terminal)
 * ```
 * ╭─ repo-map · my-project · suggestions ────────────────────────╮
 * │                                                               │
 * │  Strengths                                                    │
 * │  ✓ Clean project structure with clear separation              │
 * │  ✓ Comprehensive test coverage                                │
 * │  ✓ Consistent coding style                                    │
 * │                                                               │
 * │  Suggestions                                                  │
 * │  ✗ Add CI/CD pipeline for automated testing                   │
 * │  ! Upgrade outdated dependencies (3 high-severity)            │
 * │  · Consider adding API documentation                          │
 * │                                                               │
 * ╰───────────────────────────────────────────────────────────────╯
 * ```
 *
 * # Narrow-terminal layout (< 60 cols)
 * No box borders. Text-only with markers preserved.
 *
 * # What it must NOT know about
 * - Animation manager, analysis pipeline, file system I/O
 * - Raw ANSI escape codes
 */

import { Renderer } from '../renderer.js';
import type { Line } from '../renderer.js';
import type { ColorToken } from '../theme/index.js';
import { renderBox } from '../primitives/box.js';

// ─── Types ───────────────────────────────────────────────────────

export interface SuggestItem {
  /** Short title describing the strength or suggestion. */
  title: string;
}

export interface SuggestOptions {
  /** Name of the scanned project. */
  projectName: string;
  /** Identified project strengths. */
  strengths: SuggestItem[];
  /** Improvement suggestions with priority levels. */
  suggestions: (SuggestItem & { priority: 'high' | 'medium' | 'low' })[];
}

// ─── Content builders ──────────────────────────────────────────

/**
 * Build styled lines for normal/wide terminals (boxed layout).
 *
 * Layout budget: 20 lines inside box (including breathing).
 * Eye path: Strengths → Suggestions
 */
function buildBoxedLines(options: SuggestOptions): Line[] {
  const lines: Line[] = [];

  // ── Breathing after top border ──────────────────────────────────
  lines.push({ segments: [{ text: '' }] });

  // ── Strengths section header (bold) ─────────────────────────────
  lines.push({
    segments: [{ text: 'Strengths', style: { bold: true } }],
  });

  // ── Strength items (✓ in green) ─────────────────────────────────
  if (options.strengths.length > 0) {
    for (const strength of options.strengths) {
      lines.push({
        segments: [
          { text: ' ✓ ', style: { color: 'success' } },
          { text: strength.title },
        ],
      });
    }
  } else {
    lines.push({
      segments: [{ text: ' No strengths identified', style: { dim: true } }],
    });
  }

  // ── Blank between sections ──────────────────────────────────────
  lines.push({ segments: [{ text: '' }] });

  // ── Suggestions section header (bold) ───────────────────────────
  lines.push({
    segments: [{ text: 'Suggestions', style: { bold: true } }],
  });

  // ── Suggestion items (✗/!/· by priority, high first) ───────────
  const sortedSuggestions = [...options.suggestions].sort((a, b) =>
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );
  if (sortedSuggestions.length > 0) {
    for (const suggestion of sortedSuggestions) {
      const { marker, style } = getSuggestionMarker(suggestion.priority);
      lines.push({
        segments: [
          { text: ` ${marker} `, style },
          { text: suggestion.title },
        ],
      });
    }
  } else {
    lines.push({
      segments: [{ text: ' No suggestions at this time', style: { dim: true } }],
    });
  }

  // ── Breathing before bottom border ──────────────────────────────
  lines.push({ segments: [{ text: '' }] });

  return lines;
}

/**
 * Build text-only lines for narrow terminals (< 60 columns).
 * No box. Information preserved.
 */
function buildNarrowLines(options: SuggestOptions): Line[] {
  const lines: Line[] = [];

  // Project name header
  lines.push({
    segments: [{ text: `repo-map · ${options.projectName} · suggestions` }],
  });
  lines.push({ segments: [{ text: '' }] });

  // Strengths
  lines.push({
    segments: [{ text: 'Strengths', style: { bold: true } }],
  });

  if (options.strengths.length > 0) {
    for (const strength of options.strengths) {
      lines.push({
        segments: [
          { text: '✓ ', style: { color: 'success' } },
          { text: strength.title },
        ],
      });
    }
  } else {
    lines.push({
      segments: [{ text: 'No strengths identified', style: { dim: true } }],
    });
  }

  lines.push({ segments: [{ text: '' }] });

  // Suggestions
  lines.push({
    segments: [{ text: 'Suggestions', style: { bold: true } }],
  });

  const sortedSuggestions = [...options.suggestions].sort((a, b) =>
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );
  if (sortedSuggestions.length > 0) {
    for (const suggestion of sortedSuggestions) {
      const { marker, style } = getSuggestionMarker(suggestion.priority);
      lines.push({
        segments: [
          { text: `${marker} `, style },
          { text: suggestion.title },
        ],
      });
    }
  } else {
    lines.push({
      segments: [{ text: 'No suggestions at this time', style: { dim: true } }],
    });
  }

  return lines;
}

// ─── Internal helpers ──────────────────────────────────────────

/** Priority sort order: high=0, medium=1, low=2. */
const PRIORITY_ORDER: Record<'high' | 'medium' | 'low', number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Get the marker character and style for a suggestion priority level.
 *
 * Per spec §3.3:
 * - High priority: ✗ in red (error)
 * - Medium priority: ! in yellow (warning)
 * - Low priority: · in dim
 */
function getSuggestionMarker(
  priority: 'high' | 'medium' | 'low',
): { marker: string; style: { color?: ColorToken; dim?: boolean } } {
  switch (priority) {
    case 'high':
      return { marker: '✗', style: { color: 'error' } };
    case 'medium':
      return { marker: '!', style: { color: 'warning' } };
    case 'low':
      return { marker: '·', style: { dim: true } };
  }
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Render a suggestions screen to stderr.
 *
 * Shows project strengths and improvement suggestions inside a bordered box.
 * On narrow terminals (< 60 columns), renders without box borders.
 *
 * @param options  - Suggest display data.
 * @param renderer - The renderer for ANSI conversion.
 */
export function renderSuggest(options: SuggestOptions, renderer: Renderer): void {
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
      title: `repo-map · ${options.projectName} · suggestions`,
      width: boxWidth,
      padding: 1,
      border: border.tl ? border : undefined,
    });

    for (const line of boxLines) {
      process.stderr.write(line + '\n');
    }
  }
}
