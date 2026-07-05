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
 * repo-map — Professional repository analysis    v2.2.0
 *
 *   Scan any codebase, detect technologies, and
 *   generate comprehensive architecture reports.
 *
 * USAGE
 *
 *   $ repo-map [path] [options]
 *
 * ARGUMENTS
 *
 *   [path]      Path to the repository to scan  [default: .]
 *
 * OPTIONS
 *
 *   --json                JSON output (stable schema)
 *   -o, --output <file>   Write output to file
 *   --depth <number>      Maximum directory depth
 *   --stats               Compact repository summary
 *   --suggest             Improvement suggestions
 *   --exclude <pattern>   Exclude files (repeatable)
 *   --include <pattern>   Only include matching files
 *   --no-ignore           Do not respect .gitignore
 *   --no-color            Disable ANSI color output
 *
 * EXAMPLES
 *
 *   $ repo-map .                      Scan current directory
 *   $ repo-map --json -o report.json  Generate JSON report
 *   $ repo-map --stats --exclude dist Quick stats with filter
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
 * @param version  - The current CLI version string (e.g. "2.2.0").
 */
export function renderHelp(renderer: Renderer, version: string): void {
  const cw = renderer.width.contentWidth;
  const isNarrow = renderer.width.isNarrow;

  const allLines: { segments: { text: string; style?: Record<string, unknown> }[] }[] = [];

  if (isNarrow) {
    renderNarrowHelp(allLines, version, cw);
  } else {
    renderWideHelp(allLines, version, cw);
  }

  // Render all lines
  const styledStrings = renderer.renderFrame(allLines);
  for (const line of styledStrings) {
    process.stderr.write(line + '\n');
  }
}

// ─── Narrow terminal (< 60 cols) ─────────────────────────────────

function renderNarrowHelp(
  allLines: { segments: { text: string; style?: Record<string, unknown> }[] }[],
  version: string,
  _cw: number,
): void {
  // ── Header ───────────────────────────────────────────────────────
  allLines.push({
    segments: [
      { text: 'repo-map', style: { bold: true } },
      { text: ` v${version}`, style: { dim: true } },
    ],
  });
  allLines.push({ segments: [{ text: '' }] });

  // ── Description (preserved from wide layout) ─────────────────────
  allLines.push({ segments: [{ text: '  Scan any codebase, detect technologies, and' }] });
  allLines.push({ segments: [{ text: '  generate comprehensive architecture reports.' }] });
  allLines.push({ segments: [{ text: '' }] });

  // ── USAGE ────────────────────────────────────────────────────────
  allLines.push({ segments: [{ text: 'USAGE', style: { bold: true } }] });
  allLines.push({ segments: [{ text: '  $ repo-map [path] [options]' }] });

  // ── ARGUMENTS ────────────────────────────────────────────────────
  allLines.push({ segments: [{ text: '' }] });
  allLines.push({ segments: [{ text: 'ARGUMENTS', style: { bold: true } }] });
  allLines.push({ segments: [{ text: '  [path]  Path to scan  [default: .]' }] });

  // ── OPTIONS ──────────────────────────────────────────────────────
  allLines.push({ segments: [{ text: '' }] });
  allLines.push({ segments: [{ text: 'OPTIONS', style: { bold: true } }] });
  allLines.push({ segments: [{ text: '  --json        JSON output' }] });
  allLines.push({ segments: [{ text: '  -o <file>     Write to file' }] });
  allLines.push({ segments: [{ text: '  --depth <n>   Max directory depth' }] });
  allLines.push({ segments: [{ text: '  --stats       Repository summary' }] });
  allLines.push({ segments: [{ text: '  --suggest     Improvement suggestions' }] });
  allLines.push({ segments: [{ text: '  --exclude     Exclude files' }] });
  allLines.push({ segments: [{ text: '  --include     Include files' }] });
  allLines.push({ segments: [{ text: '  --no-ignore   Ignore .gitignore' }] });
  allLines.push({ segments: [{ text: '  --no-color    Disable color' }] });

  // ── EXAMPLES ────────────────────────────────────────────────────
  allLines.push({ segments: [{ text: '' }] });
  allLines.push({ segments: [{ text: 'EXAMPLES', style: { bold: true } }] });
  allLines.push({ segments: [{ text: '  $ repo-map .' }] });
  allLines.push({ segments: [{ text: '  $ repo-map --json -o report.json' }] });
  allLines.push({ segments: [{ text: '  $ repo-map --stats --exclude dist' }] });

  // ── Footer ───────────────────────────────────────────────────────
  allLines.push({ segments: [{ text: '' }] });
  allLines.push({ segments: [{ text: '  → codebuff.com/docs', style: { dim: true } }] });
}

// ─── Normal/wide terminal (≥ 60 cols) ────────────────────────────

function renderWideHelp(
  allLines: { segments: { text: string; style?: Record<string, unknown> }[] }[],
  version: string,
  cw: number,
): void {
  // Pre-compute right-aligned version segment
  const versionStr = `v${version}`;
  const fixedTextLen = 'repo-map — Professional repository analysis '.length;
  const versionPad = Math.max(1, cw - fixedTextLen - versionStr.length);
  const versionSegment = { text: ' '.repeat(versionPad) + versionStr, style: { dim: true } as const };

  // Helper to add a section
  function addSection(
    title: string,
    items: { text: string; style?: Record<string, unknown> }[],
  ): void {
    if (title) {
      allLines.push({ segments: [{ text: '' }] });
    }
    if (title) {
      allLines.push({ segments: [{ text: `  ${title}`, style: { bold: true } }] });
    }
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
      { text: '  Scan any codebase, detect technologies, and' },
    ],
  });
  allLines.push({
    segments: [
      { text: '  generate comprehensive architecture reports.' },
    ],
  });

  // ── USAGE ────────────────────────────────────────────────────────
  addSection('USAGE', [
    { text: '    $ repo-map [path] [options]' },
  ]);

  // ── ARGUMENTS ────────────────────────────────────────────────────
  addSection('ARGUMENTS', [
    { text: '    [path]      Path to the repository to scan  [default: .]' },
  ]);

  // ── OPTIONS ──────────────────────────────────────────────────────
  addSection('OPTIONS', [
    { text: '    --json                JSON output (stable schema)' },
    { text: '    -o, --output <file>   Write output to file' },
    { text: '    --depth <number>      Maximum directory depth' },
    { text: '    --stats               Compact repository summary' },
    { text: '    --suggest             Improvement suggestions' },
    { text: '    --exclude <pattern>   Exclude files (repeatable)' },
    { text: '    --include <pattern>   Only include matching files' },
    { text: '    --no-ignore           Do not respect .gitignore' },
    { text: '    --no-color            Disable ANSI color output' },
  ]);

  // ── EXAMPLES ────────────────────────────────────────────────────
  addSection('EXAMPLES', [
    { text: '    $ repo-map .                      Scan current directory' },
    { text: '    $ repo-map --json -o report.json  Generate JSON report' },
    { text: '    $ repo-map --stats --exclude dist Quick stats with filter' },
  ]);

  // ── Footer ───────────────────────────────────────────────────────
  addSection('', [
    { text: '    → codebuff.com/docs   Full documentation' },
  ]);
}
