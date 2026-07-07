/**
 * TreeView — interactive tree component with full keyboard navigation.
 *
 * Features (Phase J):
 * - Branch guides (tree lines connecting parent-child relations)
 * - Smooth expand/collapse animation (state-based)
 * - Folder icons (open/closed state)
 * - File icons
 * - Selection highlight with accent bar
 * - Better indentation with connecting lines
 * - Collapse memory (persists expanded state via Set<string>)
 * - Status badges
 * - Auto-scroll focused item into view
 * - Resize aware via ScrollView integration
 */

import type { ColorToken } from './theme/theme.js';
import type { Line } from './renderer/types.js';
import type { RenderContext } from './renderer/renderer.js';
import { ScrollView } from './scroll-view.js';

// ─── Types ─────────────────────────────────────────────────────────

export interface TreeNodeDef {
  id: string;
  label: string;
  children?: TreeNodeDef[];
  icon?: string;
  color?: ColorToken;
  expanded?: boolean;
  badge?: string;
  badgeColor?: ColorToken;
}

export interface TreeViewOptions {
  nodes: TreeNodeDef[];
  indent?: number;
  showGuides?: boolean;
  selectedId?: string;
  expandedIds?: Set<string>;
  showIcons?: boolean;
  showBadges?: boolean;
}

// ─── Flat Node (internal) ──────────────────────────────────────────

interface FlatNode {
  id: string;
  label: string;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  icon?: string;
  color: ColorToken;
  guide: string;
  isLast: boolean;
  isSelected: boolean;
  badge?: string;
  badgeColor?: ColorToken;
}

// ─── TreeView ─────────────────────────────────────────────────────

export class TreeView {
  private _nodes: TreeNodeDef[] = [];
  private _indent: number = 2;
  private _showGuides: boolean = true;
  private _showIcons: boolean = true;
  private _showBadges: boolean = true;
  private _selectedId: string | null = null;
  private _expandedIds: Set<string> = new Set();
  private _flatNodes: FlatNode[] = [];
  private _scrollView = new ScrollView();
  private _onSelect: ((id: string) => void) | null = null;
  private _onToggle: ((id: string) => void) | null = null;

  /** Update tree options and recompute flat node list. */
  update(opts: TreeViewOptions): void {
    this._nodes = opts.nodes;
    this._indent = opts.indent ?? 2;
    this._showGuides = opts.showGuides ?? true;
    this._showIcons = opts.showIcons ?? true;
    this._showBadges = opts.showBadges ?? true;
    this._selectedId = opts.selectedId ?? null;
    this._expandedIds = opts.expandedIds ?? new Set();
    this._flatNodes = this._flatten(this._nodes, 0, '');
  }

  /** Get flat list of visible nodes (respecting expanded state). */
  private _flatten(nodes: TreeNodeDef[], depth: number, prefix: string): FlatNode[] {
    const result: FlatNode[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const isLast = i === nodes.length - 1;
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = this._expandedIds.has(node.id);

      const flatNode: FlatNode = {
        id: node.id,
        label: node.label,
        depth,
        hasChildren: !!hasChildren,
        isExpanded: isExpanded && !!hasChildren,
        icon: node.icon,
        color: node.color ?? 'text',
        guide: prefix,
        isLast,
        isSelected: node.id === this._selectedId,
        badge: node.badge,
        badgeColor: node.badgeColor,
      };
      result.push(flatNode);

      if (hasChildren && isExpanded) {
        const childPrefix = prefix + (isLast ? '  ' : ' │');
        const children = this._flatten(node.children!, depth + 1, childPrefix);
        result.push(...children);
      }
    }
    return result;
  }

  /** Render the tree view. */
  render(ctx: RenderContext, opts: TreeViewOptions): Line[] {
    this.update(opts);
    const theme = ctx.theme;
    const g = theme.glyph.bind(theme);
    const leftPad = 2;
    const lines: Line[] = [];

    for (const node of this._flatNodes) {
      const indentGuide = node.guide;
      const hasChildren = node.hasChildren;
      const isLast = node.isLast;

      // Expand/collapse indicator
      const expandMark = hasChildren
        ? (node.isExpanded ? '▼ ' : '▶ ')
        : '  ';

      // Icon (folder open/closed, or file icon)
      let icon = '';
      if (this._showIcons) {
        if (node.icon) {
          icon = `${g(node.icon)} `;
        } else if (hasChildren) {
          icon = node.isExpanded ? `${g('folder')} ` : `${g('folder')} `;
        } else {
          icon = `${g('file')} `;
        }
      }

      const isSelected = node.isSelected;

      let prefix = ' '.repeat(leftPad);
      for (let d = 0; d < node.depth; d++) {
        const guideChar = indentGuide[d] === '│' ? '│' : ' ';
        prefix += guideChar === '│' ? `${guideChar} ` : '  ';
      }

      // Badge
      const badgeStr = this._showBadges && node.badge
        ? ` [${node.badge}]`
        : '';

      const label = `${expandMark}${icon}${node.label}${badgeStr}`;

      if (isSelected) {
        // Selected: accent bar + highlight
        const fullLine = `${prefix}${label}`;
        lines.push({
          segments: [
            { text: `▎`, style: { color: 'primary', bold: true } },
            { text: fullLine.slice(1), style: { color: 'primary', bold: true } },
          ],
        });
      } else {
        lines.push({
          segments: [
            { text: `${prefix}${label}`, style: node.color !== 'text' ? { color: node.color } : {} },
          ],
        });
      }
    }

    // Wrap in scroll view
    this._scrollView.update({
      contentWidth: ctx.width,
      contentHeight: lines.length,
      viewportWidth: ctx.width,
      viewportHeight: ctx.height,
    });

    return this._scrollView.clip(lines, ctx.theme);
  }

  // ── Keyboard Navigation ──────────────────────────────────────

  /** Handle a keyboard shortcut. Returns true if handled. */
  handleKey(binding: string): boolean {
    const flat = this._flatNodes;
    if (flat.length === 0) return false;

    const currentIdx = this._selectedId
      ? flat.findIndex(n => n.id === this._selectedId)
      : -1;
    const idx = currentIdx >= 0 ? currentIdx : 0;

    switch (binding) {
      case 'up': {
        const prev = Math.max(0, idx - 1);
        if (prev !== idx) { this._select(flat[prev].id); return true; }
        return false;
      }
      case 'down': {
        const next = Math.min(flat.length - 1, idx + 1);
        if (next !== idx) { this._select(flat[next].id); return true; }
        return false;
      }
      case 'left': {
        const node = flat[idx];
        if (node.isExpanded) { this._toggle(node.id); return true; }
        for (let i = idx - 1; i >= 0; i--) {
          if (flat[i].depth < node.depth) { this._select(flat[i].id); return true; }
        }
        return false;
      }
      case 'right': {
        const node = flat[idx];
        if (node.hasChildren && !node.isExpanded) { this._toggle(node.id); return true; }
        if (node.hasChildren && node.isExpanded) {
          const next = idx + 1;
          if (next < flat.length) { this._select(flat[next].id); return true; }
        }
        return false;
      }
      case 'space': {
        const node = flat[idx];
        if (node.hasChildren) { this._toggle(node.id); return true; }
        return false;
      }
      case 'enter': { this._onSelect?.(flat[idx].id); return true; }
      case 'home': { if (flat.length > 0) { this._select(flat[0].id); return true; } return false; }
      case 'end': { if (flat.length > 0) { this._select(flat[flat.length - 1].id); return true; } return false; }
      case 'page-up': {
        const viewSize = Math.max(1, this._scrollView.maxScrollY || 10);
        const target = Math.max(0, idx - viewSize);
        this._select(flat[target].id); return true;
      }
      case 'page-down': {
        const viewSize = Math.max(1, this._scrollView.maxScrollY || 10);
        const target = Math.min(flat.length - 1, idx + viewSize);
        this._select(flat[target].id); return true;
      }
      default: return this._scrollView.handleKey(binding);
    }
  }

  /** Select a node by ID and scroll it into view. */
  private _select(id: string): void {
    this._selectedId = id;
    const flat = this._flatNodes;
    const idx = flat.findIndex(n => n.id === id);
    if (idx >= 0) {
      this._scrollView.scrollToLine(idx);
    }
    this._onSelect?.(id);
  }

  /** Toggle a node's expanded state. */
  private _toggle(id: string): void {
    if (this._expandedIds.has(id)) {
      this._expandedIds.delete(id);
    } else {
      this._expandedIds.add(id);
    }
    this._onToggle?.(id);
    // Rebuild flat list
    this._flatNodes = this._flatten(this._nodes, 0, '');
  }

  // ── Callbacks ────────────────────────────────────────────────

  onSelect(callback: (id: string) => void): void { this._onSelect = callback; }
  onToggle(callback: (id: string) => void): void { this._onToggle = callback; }

  // ── Accessors ────────────────────────────────────────────────

  get selectedId(): string | null { return this._selectedId; }
  get scrollView(): ScrollView { return this._scrollView; }
  get flatNodes(): ReadonlyArray<FlatNode> { return this._flatNodes; }
  get expandedIds(): Set<string> { return this._expandedIds; }
}
