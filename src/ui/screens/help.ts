/**
 * Help screen — redesigned --help output for repo-map.
 *
 * Replaces commander's default help output with a professional,
 * width-aware layout using the CLI Design System.
 *
 * # Architecture
 * - Uses the Renderer for ANSI conversion (never emits raw codes).
 * - No box — free-form layout with labeled sections.
 * - Static render (no animation) — writes once to stderr.
 *
 * # Layout
 * ```
 * repo-map — Professional repository analysis           v2.1.0
 *
 *   Scan any codebase, detect technologies, and generate
 *   comprehensive architecture reports.
 *
 * USAGE
 *
 *   $ repo-map [path] [options]
 *
 * ARGUMENTS
 *
 *   [path]      Path to the repository to scan       [default: .]
 *
 * OPTIONS
 *
 *   --json                JSON output (stable schema)
 *   -o, --output <file>   Write to file
 *   ...
 *
 * EXAMPLES
 *
 *   $ repo-map .                         Scan current directory
 *   ...
 *
 *   → codebuff.com/docs   Full documentation
 * ```
 *
 * # What it must NOT know about
 * - Animation manager, analysis pipeline, file system I/O
 * - Raw ANSI escape codes
 */

import { Renderer } from '../renderer.js';

// ─── Public API ──────────────────────────────────────────────────

/**
 * Render the help screen to stderr.
 *
 * Displays usage, arguments, options, and examples in a clean,
 * width-aware layout suitable for any terminal width.
 *
 * @param renderer - The renderer for ANSI conversion.
 * @param version  - The current CLI version string (e.g. "2.1.0").
 */
export function renderHelp(renderer: Renderer, version: string): void {
  const cw = renderer.width.contentWidth;

  // ── Build all lines as styled Lines ──────────────────────────────

  // Pre-compute right-aligned version segment
  const versionStr = `v${version}`;
  const fixedTextLen = 'repo-map — Professional repository analysis '.length;
  const versionPad = Math.max(1, cw - fixedTextLen - versionStr.length);
  const versionSegment = { text: ' '.repeat(versionPad) + versionStr, style: { dim: true } as const };

  const allLines: { segments: { text: string; style?: Record<string, unknown> }[] }[] = [];

  // Helper to add a section
  function addSection(
    title: string,
    items: { text: string; style?: Record<string, unknown> }[],
  ): void {
    // Blank line before section (skip for empty title to avoid double spacing)
    if (title) {
      allLines.push({ segments: [{ text: '' }] });
    }

    // Section title
    if (title) {
      allLines.push({ segments: [{ text: `  ${title}`, style: { bold: true } }] });
    }

    // Items
    for (const item of items) {
      allLines.push({ segments: [item] });
    }
  }

  // ── Header ───────────────────────────────────────────────────────
  allLines.push({
    segments: [
      { text: 'repo-map', style: { bold: true } },
      { text: ' — Professional repository analysis' },
      versionSegment
    ],
  });
  allLines.push({ segments: [{ text: '' }] });
  allLines.push({
    segments: [
      { text: '  Scan any codebase, detect technologies, and generate' },
    ],
  });
  allLines.push({
    segments: [
      { text: '  comprehensive architecture reports.' },
    ],
  });

  // ── USAGE ────────────────────────────────────────────────────────
  addSection('USAGE', [
    { text: '    $ repo-map [path] [options]' },
  ]);

  // ── ARGUMENTS ────────────────────────────────────────────────────
  addSection('ARGUMENTS', [
    { text: '    [path]      Path to the repository to scan       [default: .]' },
  ]);

  // ── OPTIONS ──────────────────────────────────────────────────────
  addSection('OPTIONS', [
    { text: '    --json                JSON output (stable schema)' },
    { text: '    -o, --output <file>   Write output to file' },
    { text: '    --depth <number>      Maximum directory depth' },
    { text: '    --no-ignore           Do not respect .gitignore files' },
    { text: '    --exclude <pattern>   Exclude files (repeatable)' },
    { text: '    --include <pattern>   Only include matching files' },
    { text: '    --stats               Compact repository summary' },
    { text: '    --no-color            Disable ANSI color output' },
  ]);

  // ── EXAMPLES ────────────────────────────────────────────────────
  addSection('EXAMPLES', [
    { text: '    $ repo-map .                         Scan current directory' },
    { text: '    $ repo-map --json -o report.json     Generate JSON report' },
    { text: '    $ repo-map --stats --exclude dist    Quick stats with filter' },
  ]);

  // ── Footer ───────────────────────────────────────────────────────
  addSection('', [
    { text: '    → codebuff.com/docs   Full documentation' },
  ]);

  // Render all lines
  const styledStrings = renderer.renderFrame(allLines);
  for (const line of styledStrings) {
    process.stderr.write(line + '\n');
  }
}
