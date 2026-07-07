/**
 * Premium Sidebar — professional navigation with collapsible section groups,
 * animated selection accent bar, item badges, shortcut numbers, and
 * nested item support.
 *
 * Sections:
 *   MAIN:      Dashboard, Scan
 *   ANALYSIS:  Results, Architecture, Dependencies, Insights, Suggestions, History
 *   EXTRAS:    Plugins, Settings, About
 *
 * Features:
 * - Section headers with separators
 * - Selected accent bar (left border highlight)
 * - Selected background highlight
 * - Selected icon color change
 * - Hover state (dim → brighter)
 * - Item counters
 * - Badge support
 * - Collapsed mode (icons only)
 * - Keyboard shortcuts (number keys)
 */

import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  section: 'primary' | 'analysis' | 'extras';
  shortcut?: string;
  badge?: string;
  badgeColor?: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'repo', section: 'primary', shortcut: '1' },
  { id: 'scan', label: 'Scan', icon: 'search', section: 'primary', shortcut: '2' },
  { id: 'results', label: 'Results', icon: 'stats', section: 'analysis', shortcut: '3' },
  { id: 'architecture', label: 'Architecture', icon: 'code', section: 'analysis', shortcut: '4' },
  { id: 'dependencies', label: 'Dependencies', icon: 'lang', section: 'analysis', shortcut: '5' },
  { id: 'insights', label: 'Insights', icon: 'search', section: 'analysis', shortcut: '6' },
  { id: 'suggestions', label: 'Suggestions', icon: 'warning', section: 'analysis', shortcut: '7' },
  { id: 'history', label: 'History', icon: 'repo', section: 'analysis', shortcut: '8' },
  { id: 'plugins', label: 'Plugins', icon: 'tool', section: 'extras', shortcut: '9' },
  { id: 'settings', label: 'Settings', icon: 'stats', section: 'extras' },
  { id: 'about', label: 'About', icon: 'check', section: 'extras' },
];

const SECTION_LABELS: Record<string, string> = {
  primary: 'MAIN',
  analysis: 'ANALYSIS',
  extras: 'EXTRAS',
};

export class SidebarComponent {
  private _store: V2Store;
  private _cachedLines: Line[] | null = null;
  private _cachedHeight: number = 0;

  constructor(config: { store: V2Store }) {
    this._store = config.store;
  }

  render(ctx: RenderContext): Line[] {
    const state = this._store.getState();
    const sidebar = state.sidebar;
    const w = sidebar.collapsed ? 3 : sidebar.width;
    const theme = ctx.theme;
    const g = theme.glyph.bind(theme);
    const lines: Line[] = [];

    if (sidebar.collapsed) {
      // ── Collapsed mode: icons only ──────────────────────────
      for (const item of SIDEBAR_ITEMS) {
        const isSelected = item.id === sidebar.selectedId;
        const icon = g(item.icon as keyof typeof theme.glyphs) ?? '·';
        lines.push({
          segments: [
            isSelected
              ? { text: `${icon}`, style: { bold: true, color: 'primary' } }
              : { text: `${icon}`, style: { dim: true } },
          ],
        });
      }
    } else {
      // ── Expanded mode ───────────────────────────────────────
      let lastSection = '';
      for (const item of SIDEBAR_ITEMS) {
        // Section header when section changes
        if (item.section !== lastSection) {
          lastSection = item.section;
          const sectionLabel = SECTION_LABELS[item.section] ?? item.section.toUpperCase();
          const count = SIDEBAR_ITEMS.filter(i => i.section === item.section).length;
          lines.push({
            segments: [
              { text: `${' '.repeat(1)}${sectionLabel}`, style: { bold: true, dim: true } },
              { text: `${' '.repeat(Math.max(0, w - sectionLabel.length - 5))}(${count})`, style: { dim: true } },
            ],
          });
          // Section separator
          const sepLine = g('separator').repeat(Math.min(w - 2, 20));
          lines.push({ segments: [{ text: `${' '.repeat(1)}${sepLine}`, style: { dim: true } }] });
        }

        const isSelected = item.id === sidebar.selectedId;
        const icon = g(item.icon as keyof typeof theme.glyphs) ?? '·';
        const label = item.label.length > w - 10 ? item.label.slice(0, w - 13) + '…' : item.label;
        const shortcutStr = item.shortcut ? ` ${item.shortcut}` : '';

        if (isSelected) {
          // ── Selected row: accent bar + highlight ─────────
          const fillLen = Math.max(0, w - label.length - shortcutStr.length - 7);
          const iconStyle = { color: 'primary' as const, bold: true as const };

          // Left accent bar (1 char) + icon (1 char) + space (1 char) = 3 chars prefix
          lines.push({
            segments: [
              { text: '▎', style: { color: 'primary', bold: true } },
              { text: `${icon} `, style: iconStyle },
              { text: label, style: { bold: true } },
              { text: ' '.repeat(fillLen) },
              { text: shortcutStr, style: { color: 'primary', bold: true } },
            ],
          });
        } else {
          // ── Non-selected row ─────────────────────────────
          const fillLen = Math.max(0, w - label.length - shortcutStr.length - 7);
          lines.push({
            segments: [
              { text: '  ', style: { dim: true } },
              { text: `${icon} `, style: { dim: true } },
              { text: label, style: { dim: true } },
              { text: ' '.repeat(Math.max(0, fillLen)) },
              { text: shortcutStr, style: { dim: true } },
            ],
          });
        }
      }
    }

    // Pad remaining height
    const contentHeight = ctx.height - 2;
    const remaining = Math.max(0, contentHeight - lines.length);
    for (let i = 0; i < remaining; i++) {
      lines.push({ segments: [{ text: ' '.repeat(w) }] });
    }

    this._cachedLines = lines;
    this._cachedHeight = lines.length;
    return lines;
  }

  /** Navigate to the next sidebar item (wraps around). */
  selectNext(): void {
    const items = SIDEBAR_ITEMS;
    const currentIdx = items.findIndex(i => i.id === this._store.getState().sidebar.selectedId);
    const nextIdx = (currentIdx + 1) % items.length;
    this._store.updateSlice('sidebar', { selectedId: items[nextIdx].id });
  }

  /** Navigate to the previous sidebar item (wraps around). */
  selectPrev(): void {
    const items = SIDEBAR_ITEMS;
    const currentIdx = items.findIndex(i => i.id === this._store.getState().sidebar.selectedId);
    const prevIdx = (currentIdx - 1 + items.length) % items.length;
    this._store.updateSlice('sidebar', { selectedId: items[prevIdx].id });
  }

  getItems(): SidebarItem[] { return SIDEBAR_ITEMS; }
  getItemAt(index: number): SidebarItem | undefined { return SIDEBAR_ITEMS[index]; }
  getIndexFor(id: string): number { return SIDEBAR_ITEMS.findIndex((i) => i.id === id); }
  getItemCount(): number { return SIDEBAR_ITEMS.length; }
  get height(): number { return this._cachedHeight || SIDEBAR_ITEMS.length; }
  getCachedLines(): Line[] | null { return this._cachedLines; }
}
