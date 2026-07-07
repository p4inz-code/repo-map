/**
 * CommandPalette — floating overlay with instant search, categories,
 * fuzzy matching, highlighted matches, and keyboard-only operation.
 *
 * (Phase I) Features:
 * - Recent commands (first in list)
 * - Pinned/favorite commands (starred)
 * - Icons per command
 * - Descriptions shown on selection
 * - Keyboard shortcuts shown
 * - Categories with section headers
 * - Search scoring (fuzzy match)
 * - Animated selection (pointer)
 * - Centered layout
 * - Smooth scrolling (within list)
 * - Highlighted match characters
 * - Dismiss with Escape, confirm with Enter
 *
 * Activated by Ctrl+P. Dismissed by Escape.
 */

import type { RenderContext } from './renderer/renderer.js';
import type { Line } from './renderer/types.js';
import type { TextStyle } from './theme/theme.js';

// ─── Command Entry ────────────────────────────────────────────────

export interface CommandEntry {
  id: string;
  label: string;
  category: string;
  description?: string;
  shortcut?: string;
  icon?: string;
  pinned?: boolean;
}

const DEFAULT_COMMANDS: CommandEntry[] = [
  // ── Favorites / Pinned ──────────────────────────────────
  { id: 'show-dashboard', label: 'Dashboard', category: 'Favorites', description: 'Quick access to the main dashboard', shortcut: '1', icon: 'repo', pinned: true },
  { id: 'run-scan', label: 'Quick Scan', category: 'Favorites', description: 'Quick-start a repository scan', shortcut: '2', icon: 'search', pinned: true },
  { id: 'export-report', label: 'Export Report', category: 'Favorites', description: 'Quick export the current analysis', icon: 'stats', pinned: true },

  // ── Navigation ─────────────────────────────────────────
  { id: 'show-dashboard', label: 'Show Dashboard', category: 'Navigation', description: 'View project dashboard with health overview and quick metrics', shortcut: '1', icon: 'repo' },
  { id: 'show-scan', label: 'Scan Repository', category: 'Navigation', description: 'Scan the current directory to analyze its structure', shortcut: '2', icon: 'search' },
  { id: 'show-results', label: 'Show Results', category: 'Navigation', description: 'View full analysis results with statistics and insights', shortcut: '3', icon: 'stats' },
  { id: 'show-architecture', label: 'Show Architecture', category: 'Navigation', description: 'Explore architecture scores, layers, and dependency trees', shortcut: '4', icon: 'code' },
  { id: 'show-dependencies', label: 'Show Dependencies', category: 'Navigation', description: 'Browse dependency groups, unused packages, and versions', shortcut: '5', icon: 'lang' },
  { id: 'show-insights', label: 'Show Insights', category: 'Navigation', description: 'AI-powered analysis observations and recommendations', shortcut: '6', icon: 'search' },
  { id: 'show-suggestions', label: 'Show Suggestions', category: 'Navigation', description: 'Prioritized improvement roadmap for the codebase', shortcut: '7', icon: 'warning' },
  { id: 'show-history', label: 'Show History', category: 'Navigation', description: 'View previous analysis sessions and compare metrics', shortcut: '8', icon: 'repo' },
  { id: 'show-plugins', label: 'Show Plugins', category: 'Navigation', description: 'Manage installed plugins and install new ones', shortcut: '9', icon: 'tool' },
  { id: 'show-settings', label: 'Open Settings', category: 'Navigation', description: 'Configure theme, display, and behavior preferences', icon: 'stats' },
  { id: 'show-help', label: 'Show Help', category: 'Navigation', description: 'View all keyboard shortcuts organized by category', shortcut: '?', icon: 'search' },
  { id: 'show-about', label: 'About Repo-Map', category: 'Navigation', description: 'Application version, license, and credits', icon: 'check' },
  { id: 'focus-search', label: 'Focus Search', category: 'Navigation', description: 'Activate search bar to find items across the workspace', shortcut: '/', icon: 'search' },
  { id: 'go-back', label: 'Go Back', category: 'Navigation', description: 'Navigate to the previously viewed screen', shortcut: 'Esc' },

  // ── Analysis ───────────────────────────────────────────
  { id: 'run-scan', label: 'Run Repository Scan', category: 'Analysis', description: 'Start a new scan of the repository file structure', icon: 'search' },
  { id: 'run-analysis', label: 'Run Full Analysis', category: 'Analysis', description: 'Run complete analysis on the scanned repository data', icon: 'stats' },
  { id: 'reanalyze', label: 'Re-analyze Current Data', category: 'Analysis', description: 'Re-run analysis algorithms on existing scan data', icon: 'stats' },
  { id: 'export-report', label: 'Export Analysis Report', category: 'Export', description: 'Export the analysis as a formatted HTML report', icon: 'stats' },
  { id: 'export-json', label: 'Export as JSON', category: 'Export', description: 'Export raw analysis data in JSON format' },
  { id: 'export-markdown', label: 'Export as Markdown', category: 'Export', description: 'Export the analysis as a Markdown document' },

  // ── Tree ───────────────────────────────────────────────
  { id: 'expand-all', label: 'Expand All Nodes', category: 'Tree', description: 'Expand every node in the active tree view', icon: 'folder' },
  { id: 'collapse-all', label: 'Collapse All Nodes', category: 'Tree', description: 'Collapse all nodes to show only top-level items', icon: 'folder' },
  { id: 'toggle-tree', label: 'Toggle Tree View', category: 'Tree', description: 'Show or hide the tree panel' },
  { id: 'focus-tree', label: 'Focus Tree Panel', category: 'Tree', description: 'Move keyboard focus to the tree panel' },

  // ── Tools ──────────────────────────────────────────────
  { id: 'toggle-search', label: 'Toggle Search Panel', category: 'Tools', description: 'Show or hide the search panel overlay', icon: 'search' },
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', category: 'Tools', description: 'Collapse or expand the sidebar navigation' },
  { id: 'toggle-inspector', label: 'Toggle Inspector Panel', category: 'Tools', description: 'Show or hide the file inspector panel' },
  { id: 'fullscreen', label: 'Toggle Fullscreen Mode', category: 'Tools', description: 'Toggle fullscreen view to maximize content area' },

  // ── Exit ───────────────────────────────────────────────
  { id: 'quit', label: 'Quit Workspace', category: 'Exit', description: 'Exit Repo-Map and return to the terminal', shortcut: 'q' },
];

/** Lightweight fuzzy scorer. */
function fuzzyScore(query: string, label: string): number {
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  if (l.startsWith(q)) return 1000 + l.length;
  if (l.includes(q)) return 500 + l.length - l.indexOf(q);
  let score = 0;
  let li = 0;
  for (const ch of q) {
    const idx = l.indexOf(ch, li);
    if (idx < 0) return 0;
    score += 100 - idx;
    li = idx + 1;
  }
  return score;
}

/** Highlight matched characters in a string. */
function highlightMatches(text: string, query: string, theme: any): { text: string; style?: TextStyle }[] {
  if (!query) return [{ text }];
  const q = query.toLowerCase();
  const l = text.toLowerCase();
  const segments: { text: string; style?: TextStyle }[] = [];
  let lastEnd = 0;

  let idx = l.indexOf(q, 0);
  while (idx !== -1) {
    if (idx > lastEnd) segments.push({ text: text.slice(lastEnd, idx) });
    segments.push({ text: text.slice(idx, idx + q.length), style: { color: 'highlight', bold: true } as TextStyle });
    lastEnd = idx + q.length;
    idx = l.indexOf(q, lastEnd);
  }
  if (lastEnd < text.length) segments.push({ text: text.slice(lastEnd) });
  if (segments.length === 0) segments.push({ text });
  return segments;
}

// ─── CommandPalette ───────────────────────────────────────────────

export class CommandPalette {
  private _commands: CommandEntry[];
  private _filter: string = '';
  private _selectedIndex: number = 0;
  private _callback: ((id: string) => void) | null = null;
  private _cachedLines: Line[] | null = null;
  private _recentCommands: string[] = []; // IDs of recently used commands

  constructor(commands?: CommandEntry[]) {
    this._commands = commands ?? DEFAULT_COMMANDS;
  }

  onCommand(callback: (id: string) => void): void {
    this._callback = callback;
  }

  setFilter(filter: string): void {
    this._filter = filter;
    this._selectedIndex = 0;
  }

  selectNext(): void {
    const filtered = this._getFiltered();
    if (this._selectedIndex < filtered.length - 1) this._selectedIndex++;
  }

  selectPrev(): void {
    if (this._selectedIndex > 0) this._selectedIndex--;
  }

  confirmSelection(): void {
    const filtered = this._getFiltered();
    const cmd = filtered[this._selectedIndex];
    if (cmd && this._callback) {
      // Track recent command
      this._recentCommands = [cmd.id, ...this._recentCommands.filter(id => id !== cmd.id)].slice(0, 5);
      this._callback(cmd.id);
    }
  }

  render(ctx: RenderContext): Line[] {
    const w = ctx.width;
    const h = ctx.height;
    const theme = ctx.theme;
    const filtered = this._getFiltered();
    const lines: Line[] = [];

    // ── Centered overlay ───────────────────────────────────
    const boxWidth = Math.min(56, w - 8);
    const boxX = Math.floor((w - boxWidth) / 2);
    const overlayLines = Math.floor(h * 0.25);

    // Overlay dim background
    for (let i = 0; i < overlayLines; i++) {
      lines.push({ segments: [{ text: ' '.repeat(w), style: { dim: true } }] });
    }

    // Rounded borders
    const tl = '╭'; const tr = '╮'; const bl = '╰'; const br = '╯'; const hh = '─'; const v = '│';

    // Top border
    lines.push({
      segments: [{ text: ' '.repeat(boxX) + tl + hh.repeat(boxWidth - 2) + tr, style: { color: 'primary' } }],
    });

    // Search input with prefix glyph
    const searchDisplay = this._filter.length > 0 ? this._filter : 'Type a command...';
    const searchStyle: TextStyle = this._filter.length > 0 ? { bold: true } : { dim: true };
    lines.push({
      segments: [
        { text: ' '.repeat(boxX) + v + ' ' },
        { text: `${theme.glyph('search')} `, style: { dim: true } },
        { text: searchDisplay.padEnd(boxWidth - 6), style: searchStyle },
        { text: ' ' + v },
      ],
    });

    // Separator
    const sep = theme.glyph('separator');
    lines.push({
      segments: [{ text: ' '.repeat(boxX) + '├' + sep.repeat(boxWidth - 2) + '┤', style: { dim: true } }],
    });

    // Commands with sticky category group headers
    const visibleCount = Math.min(filtered.length, 12);
    let lastCategory = '';
    for (let i = 0; i < visibleCount; i++) {
      const cmd = filtered[i];

      // Category header (sticky group)
      if (cmd.category && cmd.category !== lastCategory) {
        lastCategory = cmd.category;
        const catLabel = cmd.pinned ? `★ ${cmd.category.toUpperCase()}` : cmd.category.toUpperCase();
        lines.push({
          segments: [
            { text: ' '.repeat(boxX) + v },
            { text: ` ${catLabel}`, style: { bold: true, dim: true } },
            { text: ' '.repeat(boxWidth - catLabel.length - 4) + v },
          ],
        });
      }

      const isSelected = i === this._selectedIndex;
      const icon = cmd.icon ? `${theme.glyph(cmd.icon)} ` : '';
      const label = cmd.label;
      const shortcut = cmd.shortcut ? ` ${cmd.shortcut}` : '';
      const desc = cmd.description ?? '';

      if (isSelected) {
        // Selected: pointer + label + description + shortcut
        const descText = desc.length > boxWidth - label.length - shortcut.length - 12
          ? desc.slice(0, boxWidth - label.length - shortcut.length - 15) + '…'
          : desc;
        const descPad = Math.max(0, boxWidth - label.length - shortcut.length - descText.length - 8);
        lines.push({
          segments: [
            { text: ' '.repeat(boxX) + v },
            { text: ` ${theme.glyph('pointer')} `, style: { color: 'primary', bold: true } },
            { text: icon, style: { dim: true } },
            { text: label, style: { bold: true } },
            { text: ' '.repeat(Math.max(1, descPad)) },
            { text: descText, style: { dim: true } },
            { text: ' '.repeat(1) + shortcut, style: { dim: true } },
            { text: ' ' + v },
          ],
        });
      } else {
        // Non-selected: compact icon + label + shortcut
        const labelPad = boxWidth - label.length - shortcut.length - (icon ? 4 : 7);
        lines.push({
          segments: [
            { text: ' '.repeat(boxX) + v },
            { text: '   ' },
            { text: icon, style: { dim: true } },
            { text: label, style: { dim: true } },
            { text: ' '.repeat(Math.max(0, labelPad)) },
            { text: shortcut, style: { dim: true } },
            { text: ' ' + v },
          ],
        });
      }
    }

    // Bottom border
    lines.push({
      segments: [{ text: ' '.repeat(boxX) + bl + hh.repeat(boxWidth - 2) + br }],
    });

    // Hint line
    lines.push({
      segments: [{ text: ' '.repeat(boxX) + '  ↑↓ Navigate  Enter Select  Esc Close', style: { dim: true } }],
    });

    this._cachedLines = lines;
    return lines;
  }

  private _getFiltered(): CommandEntry[] {
    if (!this._filter) {
      // Show recent + pinned first
      const sorted = [...this._commands].sort((a, b) => {
        const aRecent = this._recentCommands.includes(a.id) ? 1 : 0;
        const bRecent = this._recentCommands.includes(b.id) ? 1 : 0;
        if (aRecent !== bRecent) return bRecent - aRecent;
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
      });
      // Deduplicate by ID
      const seen = new Set<string>();
      return sorted.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return c.label !== ''; });
    }
    const q = this._filter;
    const scored = this._commands
      .filter((c) => c.label && fuzzyScore(q, c.label) > 0)
      .map(c => ({ cmd: c, score: fuzzyScore(q, c.label) + (c.pinned ? 100 : 0) + (this._recentCommands.includes(c.id) ? 50 : 0) }))
      .sort((a, b) => b.score - a.score);

    // Deduplicate by ID
    const seen = new Set<string>();
    return scored.filter(s => { if (seen.has(s.cmd.id)) return false; seen.add(s.cmd.id); return true; }).map(s => s.cmd);
  }

  get height(): number {
    const filtered = this._getFiltered();
    return Math.min(filtered.length + 4, 16);
  }

  getCachedLines(): Line[] | null {
    return this._cachedLines;
  }
}
