/**
 * Suggest screen — improvement suggestions with professional visual hierarchy.
 *
 * Uses reusable components: Panel, Footer.
 * Professional icons for strengths and suggestions with priority indication.
 */

import { Renderer } from '../renderer.js';
import { Panel } from '../components/panel.js';
import { Footer } from '../components/footer.js';
import type { KeyHintEntry } from '../components/footer.js';
import { sanitizeFilePath } from '../utils/ansi.js';
import type { ColorToken } from '../theme/index.js';

// ─── Types ───────────────────────────────────────────────────────

export interface SuggestItem {
  title: string;
}

export interface SuggestOptions {
  projectName: string;
  strengths: SuggestItem[];
  suggestions: (SuggestItem & { priority: 'high' | 'medium' | 'low' })[];
}

// ─── Public API ──────────────────────────────────────────────────

export function renderSuggest(options: SuggestOptions, renderer: Renderer): void {
  const pw = renderer.width.contentWidth;
  const isNarrow = renderer.width.isNarrow;

  if (isNarrow) {
    renderNarrowSuggest(options, renderer);
    return;
  }

  const checkIcon = renderer.theme.symbol('success');
  const infoIcon = renderer.theme.symbol('info');

  // ── Suggest Panel ────────────────────────────────────────────
  const panel = new Panel('suggest-panel', {
    title: `${renderer.theme.symbol('repo')} ${sanitizeFilePath(options.projectName)} — suggestions`,
    width: pw + 2,
    collapsible: false,
  });

  panel.addBlank();

  // Strengths section
  panel.addSection(` ${checkIcon} Strengths`);

  if (options.strengths.length > 0) {
    for (const strength of options.strengths) {
      panel.addLine({
        segments: [
          { text: `  ${checkIcon} `, style: { color: 'success' } },
          { text: strength.title },
        ],
      });
    }
  } else {
    panel.addBlank();
    panel.addLine({
      segments: [{ text: `  ${infoIcon} No strengths identified`, style: { dim: true } }],
    });
    panel.addLine({
      segments: [{ text: '   The analysis did not find', style: { dim: true } }],
    });
    panel.addLine({
      segments: [{ text: '   notable project strengths', style: { dim: true } }],
    });
    panel.addLine({
      segments: [{ text: '   to highlight at this time.', style: { dim: true } }],
    });
  }

  panel.addBlank();

  // Suggestions section
  panel.addSection(` ${renderer.theme.symbol('warning')} Suggestions`);

  const PRIORITY_ORDER: Record<'high' | 'medium' | 'low', number> = {
    high: 0, medium: 1, low: 2,
  };
  const sorted = [...options.suggestions].sort((a, b) =>
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );

  if (sorted.length > 0) {
    for (const suggestion of sorted) {
      const { marker, style } = getMarker(suggestion.priority, renderer);
      let priorityLabel = '';
      if (suggestion.priority === 'high') priorityLabel = ` ${renderer.theme.symbol('warning')} high`;
      else if (suggestion.priority === 'medium') priorityLabel = '  medium';
      else priorityLabel = '  low';

      panel.addLine({
        segments: [
          { text: `  ${marker} `, style },
          { text: suggestion.title },
          { text: priorityLabel, style: { dim: true } },
        ],
      });
    }
  } else {
    panel.addBlank();
    panel.addLine({
      segments: [{ text: `  ${checkIcon} No suggestions available`, style: { dim: true } }],
    });
  }

  panel.addBlank();
  panel.write(renderer);

  // Footer
  const hints: KeyHintEntry[] = [
    { key: '↑↓', description: 'Navigate' },
    { key: 'Enter', description: 'Select' },
    { key: 'q', description: 'Quit' },
  ];
  const footer = new Footer('suggest-footer', { hints, separator: renderer.theme.symbol('separator') });
  const footerStyled = renderer.renderFrame(footer.render(renderer));
  if (footerStyled[0]) process.stderr.write(footerStyled[0] + '\n');
}

function getMarker(
  priority: 'high' | 'medium' | 'low',
  renderer: Renderer,
): { marker: string; style: { color?: ColorToken; dim?: boolean } } {
  switch (priority) {
    case 'high':
      return { marker: renderer.theme.symbol('error'), style: { color: 'error' } };
    case 'medium':
      return { marker: renderer.theme.symbol('warning'), style: { color: 'warning' } };
    case 'low':
      return { marker: renderer.theme.symbol('bullet'), style: { dim: true } };
  }
}

function renderNarrowSuggest(options: SuggestOptions, renderer: Renderer): void {
  const lines: { segments: { text: string; style?: Record<string, unknown> }[] }[] = [];
  const checkIcon = renderer.theme.symbol('success');
  const repoIcon = renderer.theme.symbol('repo');

  lines.push({ segments: [{ text: `${repoIcon} ${sanitizeFilePath(options.projectName)} — suggestions` }] });
  lines.push({ segments: [{ text: '' }] });
  lines.push({ segments: [{ text: 'Strengths', style: { bold: true } }] });
  if (options.strengths.length > 0) {
    for (const s of options.strengths) {
      lines.push({ segments: [{ text: `${checkIcon} `, style: { color: 'success' } }, { text: s.title }] });
    }
  } else {
    lines.push({ segments: [{ text: 'No strengths profiled', style: { dim: true } }] });
  }

  lines.push({ segments: [{ text: '' }] });
  lines.push({ segments: [{ text: 'Suggestions', style: { bold: true } }] });

  const PRIORITY_ORDER: Record<'high' | 'medium' | 'low', number> = {
    high: 0, medium: 1, low: 2,
  };
  const sorted = [...options.suggestions].sort((a, b) =>
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );
  if (sorted.length > 0) {
    for (const s of sorted) {
      const { marker, style } = getMarker(s.priority, renderer);
      lines.push({ segments: [{ text: `${marker} `, style }, { text: s.title }] });
    }
  } else {
    lines.push({ segments: [{ text: 'No suggestions — project looks clean!', style: { dim: true } }] });
  }

  const styled = renderer.renderFrame(lines);
  for (const l of styled) process.stderr.write(l + '\n');
}
