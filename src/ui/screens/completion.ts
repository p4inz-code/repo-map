/**
 * Completion Workspace — the final results display for repo-map.
 *
 * A multi-panel workspace with a professional summary layout.
 * Every section is a reusable Panel component.
 * Uses professional engineering icons for visual hierarchy.
 *
 * # Layout
 * ```
 * repo-map — Professional repository analysis    v2.2.0
 *
 * Project: my-project  42 files · 12 dirs · 3 languages · 0 frameworks
 *
 * ╭─ Project Summary ──────────────────────────────────────────╮
 * │                                                               │
 * │  Classification    CLI Tool                              87% │
 * │  Maturity          Active Development                         │
 * │  Health            ██████████████████░░░░░░░░  65/100         │
 * │                                                               │
 * │  Files  42    Dirs  12    Size  15.3 KB    Depth  4          │
 * │                                                               │
 * ╰───────────────────────────────────────────────────────────────╯
 *
 * ╭─ Statistics ───────────────────────────────────────────────╮
 * │                                                               │
 * │  ◎ TypeScript    30 files (71%)                               │
 * │  ◎ JavaScript     8 files (19%)                               │
 * │  ◎ JSON           4 files (10%)                               │
 * │                                                               │
 * ╰───────────────────────────────────────────────────────────────╯
 * ```
 */

import { Renderer } from '../renderer.js';
import type { WidthInfo } from '../layout/width.js';
import { formatSize } from '../../utils.js';
import { sanitizeFilePath } from '../utils/ansi.js';
import { Panel } from '../components/panel.js';
import { Title } from '../components/title.js';
import { StatusBar } from '../components/status-bar.js';
import { Footer } from '../components/footer.js';
import type { KeyHintEntry } from '../components/footer.js';
import type { Line } from '../renderer.js';

// ─── Types ───────────────────────────────────────────────────────

export interface CompletionOptions {
  projectName: string;
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  maxDepth: number;
  classification: string;
  classificationConfidence: number;
  maturity: string;
  healthScore: number;
  technologies: { name: string; category: string; count?: number }[];
  outputPath?: string;
}

// ─── Constants ───────────────────────────────────────────────────

const BAR_WIDTH = 24;
const LABEL_WIDTH = 20;

// ─── Public API ──────────────────────────────────────────────────

export function renderCompletion(
  options: CompletionOptions,
  renderer: Renderer,
  width: WidthInfo,
): void {
  const isNarrow = width.isNarrow;
  const pw = width.contentWidth;

  if (isNarrow) {
    renderNarrow(options, renderer);
    return;
  }

  const langIcon = renderer.theme.symbol('language');
  const fileIcon = renderer.theme.symbol('file');
  const folderIcon = renderer.theme.symbol('folder');

  // ── Title ───────────────────────────────────────────────────
  const title = new Title('completion-title', {
    text: 'repo-map',
    subtitle: 'Professional repository analysis',
    version: '2.2.0',
    width: pw,
  });
  writeLines(title.render(renderer), renderer);
  writeBlank();

  // ── StatusBar ───────────────────────────────────────────────
  const langCount = options.technologies.filter((t) => t.category === 'language').length;
  const frameworkCount = options.technologies.filter((t) => t.category === 'framework').length;
  const statusBar = new StatusBar('completion-status', {
    left: `${renderer.theme.symbol('repo')} ${sanitizeFilePath(options.projectName)}`,
    right: `${fileIcon} ${options.totalFiles} files · ${folderIcon} ${options.totalDirectories} dirs · ${langIcon} ${langCount} languages · ${frameworkCount} frameworks`,
    dim: true,
  });
  writeLines(statusBar.render(renderer), renderer);
  writeBlank();

  // ── Project Summary Panel ───────────────────────────────────
  const summaryPanel = new Panel('summary-panel', {
    title: 'Project Summary',
    width: pw + 2,
    collapsible: false,
  });

  const filledCount = Math.round((Math.max(0, Math.min(options.healthScore, 100)) / 100) * BAR_WIDTH);
  const emptyCount = BAR_WIDTH - filledCount;

  summaryPanel.addBlank();
  summaryPanel.addLine({
    segments: [
      { text: '  ' },
      { text: 'Classification'.padEnd(LABEL_WIDTH), style: { bold: true } },
      { text: options.classification },
      { text: `${options.classificationConfidence}%`.padStart(6), style: { dim: true } },
    ],
  });
  summaryPanel.addLine({
    segments: [
      { text: '  ' },
      { text: 'Maturity'.padEnd(LABEL_WIDTH), style: { bold: true } },
      { text: options.maturity },
    ],
  });
  summaryPanel.addLine({
    segments: [
      { text: '  ' },
      { text: 'Health'.padEnd(LABEL_WIDTH), style: { bold: true } },
      { text: '█'.repeat(filledCount), style: { color: 'bar-fill' } },
      { text: '░'.repeat(emptyCount), style: { color: 'bar-empty' } },
      { text: `  ${options.healthScore}/100`, style: { dim: true } },
    ],
  });
  summaryPanel.addBlank();
  summaryPanel.addLine({
    segments: [
      { text: '  ' },
      { text: `${fileIcon} Files`, style: { bold: true } },
      { text: `  ${options.totalFiles}   ` },
      { text: `${folderIcon} Dirs`, style: { bold: true } },
      { text: `  ${options.totalDirectories}   ` },
      { text: 'Size', style: { bold: true } },
      { text: `  ${formatSize(options.totalSize)}   ` },
      { text: 'Depth', style: { bold: true } },
      { text: `  ${options.maxDepth}` },
    ],
  });
  summaryPanel.addBlank();

  writePanel(summaryPanel, renderer);
  writeBlank();

  // ── Statistics Panel ────────────────────────────────────────
  const languages = options.technologies.filter(
    (t) => t.category === 'language' && t.count !== undefined,
  ) as { name: string; count: number }[];

  const statsPanel = new Panel('stats-panel', {
    title: 'Statistics',
    width: pw + 2,
    collapsible: true,
  });

  const maxLangLines = 5;
  statsPanel.addBlank();
  if (languages.length > 0) {
    const total = options.totalFiles || 1;
    const visibleLangs = languages.slice(0, maxLangLines);
    const overflowCount = languages.length - visibleLangs.length;
    const nameWidth = Math.max(...languages.map((l) => l.name.length));
    const countWidth = Math.max(...languages.map((l) => String(l.count).length));

    for (const lang of visibleLangs) {
      const pct = Math.round((lang.count / total) * 100);
      const paddedName = lang.name.padEnd(nameWidth);
      const paddedCount = String(lang.count).padStart(countWidth);
      statsPanel.addLine({
        segments: [{ text: ` ${langIcon} ${paddedName}  ${paddedCount} files (${pct}%)` }],
      });
    }

    if (overflowCount > 0) {
      statsPanel.addLine({
        segments: [{ text: `  +${overflowCount} more languages`, style: { dim: true } }],
      });
    }
  } else {
    statsPanel.addBlank();
    statsPanel.addLine({
        segments: [{ text: ` ${renderer.theme.symbol('info')} No languages detected`, style: { dim: true } }],
      });
      statsPanel.addLine({
        segments: [{ text: '   Unable to determine programming', style: { dim: true } }],
      });
      statsPanel.addLine({
        segments: [{ text: '   languages in this repository.', style: { dim: true } }],
      });
  }
  statsPanel.addBlank();

  writePanel(statsPanel, renderer);
  writeBlank();

  // ── Footer ──────────────────────────────────────────────────
  const hints: KeyHintEntry[] = [
    { key: '↑↓', description: 'Navigate' },
    { key: '←→', description: 'Expand' },
    { key: 'Tab', description: 'Next' },
    { key: 'Enter', description: 'Select' },
    { key: '/', description: 'Search', hidden: true },
    { key: '?', description: 'Help' },
    { key: 'q', description: 'Quit' },
  ];
  const footer = new Footer('completion-footer', {
    hints,
    separator: renderer.theme.symbol('separator'),
  });
  writeLines(footer.render(renderer), renderer);

  if (options.outputPath) {
    process.stderr.write(`\nOutput written to ${options.outputPath}\n`);
  }
}

// ─── Narrow terminal layout ─────────────────────────────────────

function renderNarrow(options: CompletionOptions, renderer: Renderer): void {
  const lines: { segments: { text: string; style?: Record<string, unknown> }[] }[] = [];

  const repoIcon = renderer.theme.symbol('repo');
  const fileIcon = renderer.theme.symbol('file');
  const folderIcon = renderer.theme.symbol('folder');

  lines.push({
    segments: [{ text: `${repoIcon} ${sanitizeFilePath(options.projectName)}` }],
  });
  lines.push({ segments: [{ text: '' }] });
  lines.push({
    segments: [
      { text: '  Classification: ', style: { bold: true } },
      { text: `${options.classification} (${options.classificationConfidence}%)` },
    ],
  });
  lines.push({
    segments: [
      { text: '  Maturity: ', style: { bold: true } },
      { text: options.maturity },
    ],
  });
  lines.push({
    segments: [
      { text: '  Health: ', style: { bold: true } },
      { text: `${options.healthScore}/100` },
    ],
  });
  lines.push({ segments: [{ text: '' }] });
  lines.push({
    segments: [{
      text: `  ${fileIcon} ${options.totalFiles}  ${folderIcon} ${options.totalDirectories}  ${formatSize(options.totalSize)}  depth ${options.maxDepth}`,
    }],
  });
  lines.push({ segments: [{ text: '' }] });

  const langIcon = renderer.theme.symbol('language');
  const languages = options.technologies.filter(
    (t) => t.category === 'language' && t.count !== undefined,
  ) as { name: string; count: number }[];

  if (languages.length > 0) {
    const total = options.totalFiles || 1;
    const visibleLangs = languages.slice(0, 3);
    const overflowCount = languages.length - visibleLangs.length;
    const nameWidth = Math.max(...languages.map((l) => l.name.length));
    const countWidth = Math.max(...languages.map((l) => String(l.count).length));

    for (const lang of visibleLangs) {
      const pct = Math.round((lang.count / total) * 100);
      const paddedName = lang.name.padEnd(nameWidth);
      const paddedCount = String(lang.count).padStart(countWidth);
      lines.push({
        segments: [{ text: ` ${langIcon} ${paddedName}  ${paddedCount} files (${pct}%)` }],
      });
    }

    if (overflowCount > 0) {
      lines.push({
        segments: [{ text: `  +${overflowCount} more`, style: { dim: true } }],
      });
    }
  } else {
    lines.push({
      segments: [{ text: '  No languages detected', style: { dim: true } }],
    });
  }

  const styledStrings = renderer.renderFrame(lines);
  for (const l of styledStrings) process.stderr.write(l + '\n');

  if (options.outputPath) {
    process.stderr.write(`\nOutput written to ${options.outputPath}\n`);
  }
}

// ─── Helpers ───────────────────────────────────────────────────

function writeLines(lines: Line[], renderer: Renderer): void {
  const styled = renderer.renderFrame(lines);
  for (const l of styled) process.stderr.write(l + '\n');
}

function writeBlank(): void {
  process.stderr.write('\n');
}

function writePanel(panel: Panel, renderer: Renderer): void {
  const lines = panel.renderBoxed(renderer);
  for (const l of lines) process.stderr.write(l + '\n');
}
