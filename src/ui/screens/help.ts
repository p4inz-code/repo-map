/**
 * Help screen — professional --help output for repo-map.
 *
 * Uses reusable components: Title, Panel, Footer.
 * Commands grouped by category with clear visual separation.
 */

import { Renderer } from '../renderer.js';
import { Title } from '../components/title.js';
import { Panel } from '../components/panel.js';
import { Footer } from '../components/footer.js';
import type { KeyHintEntry } from '../components/footer.js';

// ─── Public API ──────────────────────────────────────────────────

export function renderHelp(renderer: Renderer, version: string): void {
  const pw = renderer.width.contentWidth;
  const isNarrow = renderer.width.isNarrow;

  if (isNarrow) {
    renderNarrowHelp(renderer, version);
    return;
  }

  const repoIcon = renderer.theme.symbol('repo');

  // ── Title ───────────────────────────────────────────────────
  const title = new Title('help-title', {
    text: 'repo-map',
    subtitle: 'Professional repository analysis',
    version: 'v' + version,
    width: pw,
  });
  const titleStyled = renderer.renderFrame(title.render(renderer));
  for (const l of titleStyled) process.stderr.write(l + '\n');
  process.stderr.write('\n');

  // ── Description ────────────────────────────────────────────
  const descLines = renderer.renderFrame([
    { segments: [{ text: `  ${repoIcon}  Scan any codebase, detect technologies, and` }] },
    { segments: [{ text: '     generate comprehensive architecture reports.' }] },
  ]);
  for (const l of descLines) process.stderr.write(l + '\n');
  process.stderr.write('\n');

  // ── USAGE Panel ────────────────────────────────────────────
  const usagePanel = new Panel('help-usage', {
    title: 'USAGE',
    width: pw + 2,
    collapsible: false,
  });
  usagePanel.addBlank();
  usagePanel.addLine({
    segments: [
      { text: '    $ ', style: { dim: true } },
      { text: 'repo-map', style: { bold: true } },
      { text: ' [path] [options]' },
    ],
  });
  usagePanel.addBlank();
  usagePanel.write(renderer);
  process.stderr.write('\n');

  // ── ARGUMENTS Panel ────────────────────────────────────────
  const argsPanel = new Panel('help-args', {
    title: 'ARGUMENTS',
    width: pw + 2,
    collapsible: false,
  });
  argsPanel.addBlank();
  argsPanel.addLine({
    segments: [
      { text: '    ', style: { dim: true } },
      { text: '[path]', style: { bold: true } },
      { text: '      Path to scan  ', style: { dim: true } },
      { text: '[default: .]' },
    ],
  });
  argsPanel.addBlank();
  argsPanel.write(renderer);
  process.stderr.write('\n');

  // ── OPTIONS Panel ──────────────────────────────────────────
  const optionsPanel = new Panel('help-options', {
    title: 'OPTIONS',
    width: pw + 2,
    collapsible: true,
  });
  optionsPanel.addBlank();

  // Output group
  addOption(optionsPanel, '--json', 'JSON output (stable schema)');
  addOption(optionsPanel, '-o, --output <file>', 'Write output to file');

  // Scan group
  addOption(optionsPanel, '--depth <number>', 'Maximum directory depth');
  addOption(optionsPanel, '--exclude <pattern>', 'Exclude files (repeatable)');
  addOption(optionsPanel, '--include <pattern>', 'Only include matching files');
  addOption(optionsPanel, '--no-ignore', 'Do not respect .gitignore');

  // Display group
  addOption(optionsPanel, '--stats', 'Compact repository summary');
  addOption(optionsPanel, '--suggest', 'Improvement suggestions');
  addOption(optionsPanel, '--no-color', 'Disable ANSI color output');

  optionsPanel.addBlank();
  optionsPanel.write(renderer);
  process.stderr.write('\n');

  // ── EXAMPLES Panel ─────────────────────────────────────────
  const examplesPanel = new Panel('help-examples', {
    title: 'EXAMPLES',
    width: pw + 2,
    collapsible: false,
  });
  examplesPanel.addBlank();
  examplesPanel.addLine({
    segments: [
      { text: '    $ ', style: { dim: true } },
      { text: 'repo-map .'.padEnd(43), style: { bold: true } },
      { text: 'Scan current directory' },
    ],
  });
  examplesPanel.addLine({
    segments: [
      { text: '    $ ', style: { dim: true } },
      { text: 'repo-map --json -o report.json'.padEnd(43), style: { bold: true } },
      { text: 'Generate JSON report' },
    ],
  });
  examplesPanel.addLine({
    segments: [
      { text: '    $ ', style: { dim: true } },
      { text: 'repo-map --stats --exclude dist'.padEnd(43), style: { bold: true } },
      { text: 'Quick stats with filter' },
    ],
  });
  examplesPanel.addBlank();

  // Documentation link
  examplesPanel.addLine({
    segments: [
      { text: '    → ', style: { dim: true } },
      { text: 'codebuff.com/docs', style: { color: 'link' } },
      { text: '   Full documentation', style: { dim: true } },
    ],
  });
  examplesPanel.addBlank();
  examplesPanel.write(renderer);
  process.stderr.write('\n');

  // ── Footer ─────────────────────────────────────────────────
  const hints: KeyHintEntry[] = [
    { key: '↑↓', description: 'Scroll' },
    { key: '?', description: 'Help' },
    { key: 'q', description: 'Quit' },
  ];
  const footer = new Footer('help-footer', { hints, separator: renderer.theme.symbol('separator') });
  const footerStyled = renderer.renderFrame(footer.render(renderer));
  if (footerStyled[0]) process.stderr.write(footerStyled[0] + '\n');
}

// ─── Helpers ─────────────────────────────────────────────────────

function addOption(panel: Panel, flag: string, description: string): void {
  panel.addLine({
    segments: [
      { text: '    ', style: { dim: true } },
      { text: flag.padEnd(28), style: { bold: true } },
      { text: description },
    ],
  });
}

// ─── Narrow terminal layout ─────────────────────────────────────

function renderNarrowHelp(renderer: Renderer, version: string): void {
  const lines: { segments: { text: string; style?: Record<string, unknown> }[] }[] = [];
  const repoIcon = renderer.theme.symbol('repo');

  lines.push({
    segments: [
      { text: `${repoIcon} repo-map`, style: { bold: true } },
      { text: ` v${version}`, style: { dim: true } },
    ],
  });
  lines.push({ segments: [{ text: '' }] });
  lines.push({ segments: [{ text: '  Scan any codebase, detect technologies, and' }] });
  lines.push({ segments: [{ text: '  generate comprehensive architecture reports.' }] });
  lines.push({ segments: [{ text: '' }] });
  lines.push({ segments: [{ text: 'USAGE', style: { bold: true } }] });
  lines.push({ segments: [{ text: '  $ repo-map [path] [options]' }] });
  lines.push({ segments: [{ text: '' }] });
  lines.push({ segments: [{ text: 'ARGUMENTS', style: { bold: true } }] });
  lines.push({ segments: [{ text: '  [path]  Path to scan  [default: .]' }] });
  lines.push({ segments: [{ text: '' }] });
  lines.push({ segments: [{ text: 'OPTIONS', style: { bold: true } }] });
  lines.push({ segments: [{ text: '  --json        JSON output' }] });
  lines.push({ segments: [{ text: '  -o <file>     Write to file' }] });
  lines.push({ segments: [{ text: '  --depth <n>   Max directory depth' }] });
  lines.push({ segments: [{ text: '  --stats       Repository summary' }] });
  lines.push({ segments: [{ text: '  --suggest     Improvement suggestions' }] });
  lines.push({ segments: [{ text: '  --exclude     Exclude files' }] });
  lines.push({ segments: [{ text: '  --include     Include files' }] });
  lines.push({ segments: [{ text: '  --no-ignore   Ignore .gitignore' }] });
  lines.push({ segments: [{ text: '  --no-color    Disable color' }] });
  lines.push({ segments: [{ text: '' }] });
  lines.push({ segments: [{ text: 'EXAMPLES', style: { bold: true } }] });
  lines.push({ segments: [{ text: '  $ repo-map .' }] });
  lines.push({ segments: [{ text: '  $ repo-map --json -o report.json' }] });
  lines.push({ segments: [{ text: '  $ repo-map --stats --exclude dist' }] });
  lines.push({ segments: [{ text: '' }] });
  lines.push({ segments: [{ text: '  → codebuff.com/docs', style: { dim: true } }] });

  const styled = renderer.renderFrame(lines);
  for (const l of styled) process.stderr.write(l + '\n');
}
