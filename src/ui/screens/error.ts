/**
 * Error screen — professional diagnostic layout with calm, actionable feedback.
 *
 * Uses reusable components: Panel, Footer.
 * Sections: Error (cross symbol), Cause explanation, Recommendation, Exit hint.
 */

import { Renderer } from '../renderer.js';
import { Panel } from '../components/panel.js';
import { Footer } from '../components/footer.js';
import type { KeyHintEntry } from '../components/footer.js';
import { wrap } from '../primitives/text.js';
import { sanitizeFilePath } from '../utils/ansi.js';

// ─── Types ───────────────────────────────────────────────────────

export interface ErrorOptions {
  /** The error message explaining what went wrong. */
  message: string;
  /** Optional suggestion for how to resolve the error. */
  suggestion?: string;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Render an error screen to stderr with professional diagnostic layout.
 *
 * Layout:
 *   ╔═ Error ═══════════════════════════════════════════════╗
 *   ║                                                       ║
 *   ║  ✗  Path does not exist: /nonexistent                 ║
 *   ║                                                       ║
 *   ║  ── Recommendation ─────────────────────────────────   ║
 *   ║                                                       ║
 *   ║     Provide a valid path to a directory,               ║
 *   ║     or run 'repo-map .' for the current one.           ║
 *   ║                                                       ║
 *   ║  Press q to exit                                      ║
 *   ║                                                       ║
 *   ╚═══════════════════════════════════════════════════════╝
 *
 * On narrow terminals, renders without box borders.
 */
export function renderError(options: ErrorOptions, renderer: Renderer): void {
  const pw = renderer.width.contentWidth;
  const isNarrow = renderer.width.isNarrow;
  const theme = renderer.theme;
  const errorIcon = theme.symbol('error');
  const infoIcon = theme.symbol('info');

  if (isNarrow) {
    renderNarrowError(options, renderer);
    return;
  }

  // Use thick border for error panels (high emphasis)
  const panel = new Panel('error-panel', {
    title: 'Error',
    width: pw + 2,
    collapsible: false,
    border: theme.border('double'),
  });

  panel.addBlank();

  // Error message (focal point) — bold + error color
  panel.addLine({
    segments: [
      { text: ` ${errorIcon} `, style: { color: 'error' } },
      { text: sanitizeFilePath(options.message), style: { bold: true, color: 'error' } },
    ],
  });

  panel.addBlank();

  // Suggestion with "Recommendation" label
  if (options.suggestion) {
    panel.addLine({
      segments: [
        { text: ` ${infoIcon} Recommendation`, style: { bold: true } },
      ],
    });
    panel.addBlank();

    const maxMsgWidth = pw - 6;
    const wrappedLines = wrap(options.suggestion, maxMsgWidth);
    for (const line of wrappedLines) {
      panel.addLine({
        segments: [{ text: `   ${line}`, style: { dim: true } }],
      });
    }
    panel.addBlank();
  }

  // Exit hint
  panel.addLine({
    segments: [
      { text: `  Press q to exit`, style: { dim: true } },
    ],
  });

  panel.addBlank();

  // Render panel with double borders
  const boxLines = panel.renderBoxed(renderer);
  for (const l of boxLines) process.stderr.write(l + '\n');
  process.stderr.write('\n');

  // Footer
  const hints: KeyHintEntry[] = [
    { key: '?', description: 'Help' },
    { key: 'q', description: 'Quit' },
  ];
  const footer = new Footer('error-footer', { hints, separator: theme.symbol('separator') });
  const footerStyled = renderer.renderFrame(footer.render(renderer));
  if (footerStyled[0]) process.stderr.write(footerStyled[0] + '\n');
}

// ─── Narrow terminal layout ─────────────────────────────────────

function renderNarrowError(options: ErrorOptions, renderer: Renderer): void {
  const theme = renderer.theme;
  const errorIcon = theme.symbol('error');
  const lines: { segments: { text: string; style?: Record<string, unknown> }[] }[] = [];

  lines.push({
    segments: [
      { text: `${errorIcon} `, style: { color: 'error' } },
      { text: sanitizeFilePath(options.message), style: { bold: true, color: 'error' } },
    ],
  });

  if (options.suggestion) {
    lines.push({ segments: [{ text: '' }] });
    const maxMsgWidth = renderer.width.contentWidth - 2;
    const wrappedLines = wrap(options.suggestion, maxMsgWidth);
    for (const line of wrappedLines) {
      lines.push({
        segments: [{ text: line, style: { dim: true } }],
      });
    }
  }

  lines.push({ segments: [{ text: '' }] });
  lines.push({ segments: [{ text: 'Press q to exit', style: { dim: true } }] });

  const styled = renderer.renderFrame(lines);
  for (const l of styled) process.stderr.write(l + '\n');
}
