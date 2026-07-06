/**
 * Stats screen — compact repository statistics with language breakdown.
 *
 * Uses reusable components: Panel, Footer.
 * Uses professional icons for visual hierarchy.
 */

import { Renderer } from '../renderer.js';
import { Panel } from '../components/panel.js';
import { Footer } from '../components/footer.js';
import type { KeyHintEntry } from '../components/footer.js';
import { sanitizeFilePath } from '../utils/ansi.js';

// ─── Types ───────────────────────────────────────────────────────

export interface StatsOptions {
  projectName: string;
  totalFiles: number;
  totalDirectories: number;
  totalSize: string;
  maxDepth: number;
  languages: { name: string; count: number; percentage: number }[];
  largestFile?: { path: string; size: string };
  largestDir?: { path: string; files: number };
  avgFilesPerDir: number;
  elapsed: number;
}

// ─── Public API ──────────────────────────────────────────────────

export function renderStats(options: StatsOptions, renderer: Renderer): void {
  const pw = renderer.width.contentWidth;
  const isNarrow = renderer.width.isNarrow;

  if (isNarrow) {
    renderNarrowStats(options, renderer);
    return;
  }

  const fileIcon = renderer.theme.symbol('file');
  const folderIcon = renderer.theme.symbol('folder');
  const langIcon = renderer.theme.symbol('language');
  const timeIcon = renderer.theme.symbol('time');
  const statsIcon = renderer.theme.symbol('stats');

  // ── Stats Panel ──────────────────────────────────────────────
  const panel = new Panel('stats-panel', {
    title: `${statsIcon} ${sanitizeFilePath(options.projectName)} — stats`,
    width: pw + 2,
    collapsible: false,
  });

  panel.addBlank();

  // Metrics line 1
  panel.addLine({
    segments: [
      { text: '  ' },
      { text: `${fileIcon} Files`, style: { bold: true } },
      { text: `  ${options.totalFiles}   ` },
      { text: `${folderIcon} Dirs`, style: { bold: true } },
      { text: `  ${options.totalDirectories}   ` },
      { text: 'Size', style: { bold: true } },
      { text: `  ${options.totalSize}` },
    ],
  });

  // Metrics line 2
  panel.addLine({
    segments: [
      { text: '  ' },
      { text: 'Depth', style: { bold: true } },
      { text: `  ${options.maxDepth}   ` },
      { text: 'Avg files/dir', style: { bold: true } },
      { text: `  ${options.avgFilesPerDir}` },
    ],
  });

  panel.addBlank();

  // Languages section
  panel.addSection(` ${langIcon} Languages`);

  if (options.languages.length > 0) {
    const nameWidth = Math.max(...options.languages.map((l) => l.name.length));
    const countWidth = Math.max(...options.languages.map((l) => String(l.count).length));

    for (const lang of options.languages) {
      const paddedName = lang.name.padEnd(nameWidth);
      const paddedCount = String(lang.count).padStart(countWidth);
      const paddedPct = lang.percentage.toFixed(1).padStart(5);
      panel.addLine({
        segments: [{ text: ` ${langIcon} ${paddedName}  ${paddedCount} files  (${paddedPct}%)` }],
      });
    }
  } else {
    panel.addBlank();
    panel.addLine({
      segments: [{ text: ` ${renderer.theme.symbol('info')} No languages detected`, style: { dim: true } }],
    });
    panel.addLine({
      segments: [{ text: '   Unable to determine the', style: { dim: true } }],
    });
    panel.addLine({
      segments: [{ text: '   programming languages used', style: { dim: true } }],
    });
    panel.addLine({
      segments: [{ text: '   in this repository.', style: { dim: true } }],
    });
  }

  panel.addBlank();

  // Largest file/dir
  if (options.largestFile) {
    panel.addLine({
      segments: [
        { text: ` ${fileIcon} ${sanitizeFilePath(options.largestFile.path)} (${options.largestFile.size})`, style: { dim: true } },
      ],
    });
  }
  if (options.largestDir) {
    panel.addLine({
      segments: [
        { text: ` ${folderIcon} ${sanitizeFilePath(options.largestDir.path)} (${options.largestDir.files} files)`, style: { dim: true } },
      ],
    });
  }

  if (options.largestFile || options.largestDir) {
    panel.addBlank();
  }

  // Elapsed time
  panel.addLine({
    segments: [
      { text: ` ${timeIcon} Completed in ${options.elapsed.toFixed(1)}s`, style: { dim: true } },
    ],
  });

  panel.addBlank();

  // Render
  panel.write(renderer);

  // Footer
  const hints: KeyHintEntry[] = [
    { key: '↑↓', description: 'Navigate' },
    { key: 'q', description: 'Quit' },
  ];
  const footer = new Footer('stats-footer', { hints, separator: renderer.theme.symbol('separator') });
  const footerStyled = renderer.renderFrame(footer.render(renderer));
  if (footerStyled[0]) process.stderr.write(footerStyled[0] + '\n');
}

// ─── Narrow terminal layout ─────────────────────────────────────

function renderNarrowStats(options: StatsOptions, renderer: Renderer): void {
  const lines: { segments: { text: string; style?: Record<string, unknown> }[] }[] = [];
  const repoIcon = renderer.theme.symbol('repo');
  const fileIcon = renderer.theme.symbol('file');
  const langIcon = renderer.theme.symbol('language');
  const timeIcon = renderer.theme.symbol('time');

  lines.push({ segments: [{ text: `${repoIcon} ${sanitizeFilePath(options.projectName)} — stats` }] });
  lines.push({ segments: [{ text: '' }] });
  lines.push({
    segments: [{
      text: `  ${fileIcon} ${options.totalFiles}  ${options.totalDirectories} dirs  ${options.totalSize}  depth ${options.maxDepth}`,
    }],
  });
  lines.push({ segments: [{ text: '' }] });

  if (options.languages.length > 0) {
    const nameWidth = Math.max(...options.languages.map((l) => l.name.length));
    const countWidth = Math.max(...options.languages.map((l) => String(l.count).length));
    for (const lang of options.languages) {
      const paddedName = lang.name.padEnd(nameWidth);
      const paddedCount = String(lang.count).padStart(countWidth);
      const paddedPct = lang.percentage.toFixed(1).padStart(5);
      lines.push({ segments: [{ text: `${langIcon} ${paddedName}  ${paddedCount} files  (${paddedPct}%)` }] });
    }
  } else {
    lines.push({ segments: [{ text: 'No languages detected', style: { dim: true } }] });
  }

  lines.push({ segments: [{ text: '' }] });
  if (options.largestFile) {
    lines.push({ segments: [{ text: `${fileIcon} ${sanitizeFilePath(options.largestFile.path)} (${options.largestFile.size})` }] });
  }
  if (options.largestDir) {
    lines.push({ segments: [{ text: `${sanitizeFilePath(options.largestDir.path)} (${options.largestDir.files} files)` }] });
  }
  lines.push({ segments: [{ text: '' }] });
  lines.push({ segments: [{ text: `${timeIcon} Completed in ${options.elapsed.toFixed(1)}s`, style: { dim: true } }] });

  const styled = renderer.renderFrame(lines);
  for (const l of styled) process.stderr.write(l + '\n');
}
