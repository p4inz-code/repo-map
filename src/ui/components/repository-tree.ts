/**
 * RepositoryTree — fully interactive repository explorer for the workspace.
 *
 * Wraps the Tree component with:
 * - Expand/collapse (Enter, ←, →)
 * - Scrolling (↑, ↓, PageUp, PageDown)
 * - Jumping (Home, End, Ctrl+Home, Ctrl+End)
 * - Auto-scroll to keep selection visible
 * - Persistent selection across view switches
 * - Empty, loading, and unavailable states
 * - Selection change → info panel update notification
 *
 * # Keyboard
 * - ↑/↓: Navigate between visible nodes
 * - →: Expand selected node
 * - ←: Collapse selected node or focus parent
 * - Enter: Toggle expand/collapse
 * - Home: Go to first visible node
 * - End: Go to last visible node
 * - PageUp: Scroll up one page
 * - PageDown: Scroll down one page
 * - Ctrl+Home: Go to root
 * - Ctrl+End: Go to deepest visible node
 *
 * # Architecture
 * - Uses the base Tree component for tree rendering.
 * - Manages scroll offset independently.
 * - Renders empty/loading/unavailable states when no data is available.
 * - Generates a callback on selection change for info panel updates.
 */

import { Component, blank } from './component.js';
import type { Renderer, Line } from '../renderer.js';
import type { TreeNodeData } from '../state/types.js';
import { formatSize } from '../../utils.js';

// ─── Types ─────────────────────────────────────────────────────

export interface RepositoryTreeOptions {
  /** Tree data to display. */
  data: TreeNodeData | null;
  /** Width available for the tree. */
  width: number;
  /** Height available for the tree. */
  height: number;
  /** Whether this component has focus. */
  focused: boolean;
  /** Current scroll offset. */
  scrollOffset: number;
  /** Current selected visible index. */
  selectedIndex: number;
  /** Callback when selection changes. */
  onSelectionChange?: (path: string, type: 'file' | 'directory') => void;
}

// ─── Types for internal visible node tracking ──────────────────

interface VisibleNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  size?: number;
  language?: string;
}

// ─── RepositoryTree ────────────────────────────────────────────

export class RepositoryTree extends Component {
  private _data: TreeNodeData | null;
  private _width: number;
  private _height: number;
  private _focused: boolean;
  private _scrollOffset: number;
  private _selectedIndex: number;
  private _onSelectionChange?: (path: string, type: 'file' | 'directory') => void;

  /** Cached flat list of visible nodes. */
  private _visibleNodes: VisibleNode[] = [];
  /** Current filter text (empty = no filter). */
  private _filterText: string = '';
  /** Index of the currently highlighted match (for next/prev navigation). */
  private _matchIndex: number = 0;
  /** List of indices of visible nodes that match the current filter. */
  private _matchIndices: number[] = [];

  /** Navigate to the next filter match. */
  nextMatch(): void {
    if (this._matchIndices.length === 0) return;
    this._matchIndex = (this._matchIndex + 1) % this._matchIndices.length;
    this._selectedIndex = this._matchIndices[this._matchIndex];
    this._ensureVisible();
    this.markDirty();
    this._notifySelectionChange();
  }

  /** Navigate to the previous filter match. */
  prevMatch(): void {
    if (this._matchIndices.length === 0) return;
    this._matchIndex = (this._matchIndex - 1 + this._matchIndices.length) % this._matchIndices.length;
    this._selectedIndex = this._matchIndices[this._matchIndex];
    this._ensureVisible();
    this.markDirty();
    this._notifySelectionChange();
  }

  /** Return the count of matches (0 if no filter active). */
  get matchCount(): number {
    if (!this._filterText) return 0;
    return this._matchIndices.length;
  }

  /** Return current match index position (1-based, 0 if no filter). */
  get matchCurrent(): number {
    if (this._matchIndices.length === 0) return 0;
    return this._matchIndex + 1;
  }

  constructor(id: string, options: RepositoryTreeOptions) {
    super(id);
    this._data = options.data;
    this._width = options.width;
    this._height = options.height;
    this._focused = options.focused;
    this._scrollOffset = options.scrollOffset;
    this._selectedIndex = options.selectedIndex;
    this._onSelectionChange = options.onSelectionChange;

    this._rebuildVisibleNodes();
  }

  // ── Mutators ─────────────────────────────────────────────────

  /** Update tree data. */
  setData(data: TreeNodeData | null): void {
    this._data = data;
    this._rebuildVisibleNodes();
    this._clampSelection();
    this.markDirty();
  }

  /** Update focus state. */
  setFocused(focused: boolean): void {
    if (focused !== this._focused) {
      this._focused = focused;
      this.markDirty();
    }
  }

  /** Update dimensions. */
  setDimensions(width: number, height: number): void {
    if (width !== this._width || height !== this._height) {
      this._width = width;
      this._height = height;
      this.markDirty();
    }
  }

  /** Set scroll offset externally (e.g., from store). */
  setScrollOffset(offset: number): void {
    const clamped = Math.max(0, Math.min(offset, this._maxScrollOffset));
    if (clamped !== this._scrollOffset) {
      this._scrollOffset = clamped;
      this.markDirty();
    }
  }

  /** Get current scroll offset. */
  get scrollOffset(): number {
    return this._scrollOffset;
  }

  /** Set selected index. */
  setSelectedIndex(index: number): void {
    if (index >= 0 && index < this._visibleNodes.length) {
      this._selectedIndex = index;
      this._ensureVisible();
      this.markDirty();
      this._notifySelectionChange();
    }
  }

  /** Get current selected index. */
  get selectedIndex(): number {
    return this._selectedIndex;
  }

  /** Get the total number of visible nodes. */
  get visibleCount(): number {
    return this._visibleNodes.length;
  }

  /** Get the currently selected visible node. */
  get selectedNode(): VisibleNode | undefined {
    return this._visibleNodes[this._selectedIndex];
  }

  /** Get the list of visible nodes. */
  get visibleNodes(): VisibleNode[] {
    return this._visibleNodes;
  }

  /** Register selection change callback. */
  onSelectionChange(callback: (path: string, type: 'file' | 'directory') => void): void {
    this._onSelectionChange = callback;
  }

  /**
   * Set a filter string to filter visible nodes by name.
   * Empty string or null clears the filter.
   */
  setFilter(filter: string): void {
    if (filter) {
      // Store the filter; the visible nodes are already rebuilt from _data on each render
      this._filterText = filter;
    } else {
      this._filterText = '';
    }
    this._rebuildVisibleNodes();
    this._clampSelection();
    this.markDirty();
  }

  // ── Keyboard Navigation ─────────────────────────────────────

  /** Move selection down (next visible node). */
  selectNext(): void {
    if (this._visibleNodes.length === 0) return;
    if (this._selectedIndex < this._visibleNodes.length - 1) {
      this._selectedIndex++;
      this._ensureVisible();
      this.markDirty();
      this._notifySelectionChange();
    }
  }

  /** Move selection up (previous visible node). */
  selectPrev(): void {
    if (this._selectedIndex > 0) {
      this._selectedIndex--;
      this._ensureVisible();
      this.markDirty();
      this._notifySelectionChange();
    }
  }

  /** Go to first visible node. */
  selectFirst(): void {
    if (this._visibleNodes.length > 0 && this._selectedIndex !== 0) {
      this._selectedIndex = 0;
      this._scrollOffset = 0;
      this.markDirty();
      this._notifySelectionChange();
    }
  }

  /** Go to last visible node. */
  selectLast(): void {
    if (this._visibleNodes.length > 0) {
      this._selectedIndex = this._visibleNodes.length - 1;
      this._scrollOffset = this._maxScrollOffset;
      this.markDirty();
      this._notifySelectionChange();
    }
  }

  /** Scroll one page up. */
  pageUp(): void {
    if (this._visibleNodes.length === 0) return;
    const newIndex = Math.max(0, this._selectedIndex - this._height);
    if (newIndex !== this._selectedIndex) {
      this._selectedIndex = newIndex;
      this._scrollOffset = Math.max(0, this._scrollOffset - this._height);
      this.markDirty();
      this._notifySelectionChange();
    }
  }

  /** Scroll one page down. */
  pageDown(): void {
    if (this._visibleNodes.length === 0) return;
    const newIndex = Math.min(
      this._visibleNodes.length - 1,
      this._selectedIndex + this._height,
    );
    if (newIndex !== this._selectedIndex) {
      this._selectedIndex = newIndex;
      this._scrollOffset = Math.min(
        this._maxScrollOffset,
        this._scrollOffset + this._height,
      );
      this.markDirty();
      this._notifySelectionChange();
    }
  }

  /** Go to root (Ctrl+Home). */
  jumpToRoot(): void {
    this.selectFirst();
  }

  /** Go to deepest visible node (Ctrl+End). */
  jumpToEnd(): void {
    this.selectLast();
  }

  /** Expand the selected node. */
  expandSelected(): void {
    const node = this._visibleNodes[this._selectedIndex];
    if (!node || !node.hasChildren) return;

    const treeNode = this._findTreeNode(node.path);
    if (treeNode && !treeNode.expanded) {
      treeNode.expanded = true;
      this._rebuildVisibleNodes();
      this._clampSelection();
      this.markDirty();
    }
  }

  /** Collapse the selected node. */
  collapseSelected(): void {
    const node = this._visibleNodes[this._selectedIndex];
    if (!node) return;

    const treeNode = this._findTreeNode(node.path);

    if (treeNode && treeNode.expanded) {
      // Collapse this node
      treeNode.expanded = false;
      this._rebuildVisibleNodes();
      this._clampSelection();
      this.markDirty();
    } else if (node.depth > 1) {
      // Move to parent
      const parentPath = this._getParentPath(node.path);
      const parentIndex = this._visibleNodes.findIndex((v) => v.path === parentPath);
      if (parentIndex >= 0) {
        this._selectedIndex = parentIndex;
        this._ensureVisible();
        this.markDirty();
        this._notifySelectionChange();
      }
    }
  }

  /** Toggle expand/collapse of selected node. */
  toggleSelected(): void {
    const node = this._visibleNodes[this._selectedIndex];
    if (!node || !node.hasChildren) return;

    const treeNode = this._findTreeNode(node.path);
    if (treeNode) {
      treeNode.expanded = !treeNode.expanded;
      this._rebuildVisibleNodes();
      this._clampSelection();
      this.markDirty();
    }
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    return this._height;
  }

  protected renderContent(_renderer: Renderer): Line[] {
    // Empty state
    if (this._visibleNodes.length === 0) {
      if (this._data === null) {
        return this._renderUnavailable(_renderer);
      }
      return this._renderEmpty(_renderer);
    }

    const lines: Line[] = [];
    const start = this._scrollOffset;
    const end = Math.min(start + this._height, this._visibleNodes.length);

    // Show match indicator when filter is active
    if (this._filterText && this._matchIndices.length > 0) {
      const filterIcon = _renderer.theme.symbol('search');
      lines.push({
        segments: [
          { text: ` ${filterIcon} `, style: { dim: true } },
          {
            text: `${this.matchCurrent}/${this.matchCount} matches — "${this._filterText}"`,
            style: { dim: true },
          },
        ],
      });
    }
    const fileIcon = _renderer.theme.symbol('file');
    const folderIcon = _renderer.theme.symbol('folder');

    // Tree-drawing characters — detect Unicode support from the theme's symbol set.
    // Using symbol('check') as a proxy for Unicode capability; minimal theme
    // returns '[ok]' while all others return '✓'.
    const isUnicode = _renderer.theme.symbol('check') === '✓';
    const branchChar = isUnicode ? '│' : '|';
    const joinChar = isUnicode ? '├' : '+';
    const cornerChar = isUnicode ? '└' : '+';
    const collapsedChar = isUnicode ? '▶' : '>';
    const expandedChar = isUnicode ? '▼' : 'v';

    for (let i = start; i < end; i++) {
      const node = this._visibleNodes[i];
      const isSelected = i === this._selectedIndex && this._focused;
      const isSelectedBlur = i === this._selectedIndex && !this._focused;

      // Build a depth-aware ancestry prefix using branch characters.
      // For each depth level, determine if there are more siblings
      // at that level visible below this node.
      let prefix = '';
      if (node.depth > 0) {
        // Pre-compute parent path segments for sibling detection
        const pathParts = node.path.split(/[/\\]/);

        for (let d = 0; d < node.depth; d++) {
          // Build the ancestor prefix for this depth level
          const ancestorPath = pathParts.slice(0, d + 1).join('/');

          // Check if there are more siblings at this depth below this node
          const hasMoreSiblings = this._visibleNodes.slice(i + 1).some((v) => {
            if (v.depth !== d + 1) return false;
            const vParts = v.path.split(/[/\\]/);
            const vAncestor = vParts.slice(0, d + 1).join('/');
            return vAncestor === ancestorPath;
          });

          if (d < node.depth - 1) {
            // Intermediate level: draw vertical branch continuation or gap
            // Both must be exactly 4 characters wide for alignment
            prefix += hasMoreSiblings ? ` ${branchChar}  ` : `    `;
          } else {
            // Final level: draw join or corner (4 characters wide)
            prefix += hasMoreSiblings ? ` ${joinChar}  ` : ` ${cornerChar}  `;
          }
        }
      }

      // Build node name with expand/collapse indicator and type icon
      const indicator = node.hasChildren
        ? (node.expanded ? `${expandedChar} ` : `${collapsedChar} `)
        : '  ';

      const typeIcon = node.type === 'directory' ? folderIcon : fileIcon;
      const nameStr = `${indicator}${typeIcon} ${node.name}`;
      const metaStr = node.size ? `  ${formatSize(node.size)}` : '';

      const text = `${prefix}${nameStr}${metaStr}`;

      if (isSelected) {
        lines.push({
          segments: [{ text, style: { bold: true } }],
        });
      } else if (isSelectedBlur) {
        lines.push({
          segments: [{ text, style: { dim: true } }],
        });
      } else {
        lines.push({
          segments: [{ text }],
        });
      }
    }

    // Pad remaining lines
    const rendered = lines.length;
    const remaining = this._height - rendered;
    if (remaining > 0) {
      for (let i = 0; i < remaining; i++) {
        lines.push(blank());
      }
    }

    return lines;
  }

  // ── Internal ─────────────────────────────────────────────────

  /** Rebuild the flat list of visible nodes from tree data. */
  private _rebuildVisibleNodes(): void {
    this._visibleNodes = [];
    this._matchIndices = [];
    this._matchIndex = 0;

    if (!this._data) return;

    const filterLower = this._filterText ? this._filterText.toLowerCase() : '';

    // Flatten starting from children (skip root if it's the only one)
    const children = this._data.children || [];
    for (const child of children) {
      this._flattenNode(child, 0, filterLower);
    }

    // If no children, show root node (but filter it too)
    if (this._visibleNodes.length === 0) {
      if (!filterLower || this._data.name.toLowerCase().includes(filterLower)) {
        this._visibleNodes.push({
          name: this._data.name,
          path: this._data.path,
          type: this._data.type,
          depth: 0,
          expanded: this._data.expanded || false,
          hasChildren: !!(this._data.children && this._data.children.length > 0),
          size: this._data.size,
          language: this._data.language,
        });
      }
    }

    // Track which visible nodes match the filter (for next/prev navigation)
    if (filterLower) {
      for (let i = 0; i < this._visibleNodes.length; i++) {
        if (this._visibleNodes[i].name.toLowerCase().includes(filterLower)) {
          this._matchIndices.push(i);
        }
      }
    }
  }

  /** Flatten a tree node into visible nodes. */
  private _flattenNode(node: TreeNodeData, depth: number, filterLower?: string): void {
    // Apply filter: skip nodes that don't match the filter
    if (filterLower && !node.name.toLowerCase().includes(filterLower)) {
      // Even if this node doesn't match, check if any children match
      if (node.children) {
        for (const child of node.children) {
          this._flattenNode(child, depth + 1, filterLower);
        }
      }
      return;
    }

    this._visibleNodes.push({
      name: node.name,
      path: node.path,
      type: node.type,
      depth,
      expanded: node.expanded || false,
      hasChildren: !!(node.children && node.children.length > 0),
      size: node.size,
      language: node.language,
    });

    // Recurse into children if expanded
    if (node.expanded && node.children) {
      for (const child of node.children) {
        this._flattenNode(child, depth + 1, filterLower);
      }
    }
  }

  /** Find a TreeNodeData by path. */
  private _findTreeNode(path: string): TreeNodeData | undefined {
    if (!this._data) return undefined;

    // Check root
    if (this._data.path === path) return this._data;

    // Search children recursively
    return this._searchChildren(this._data, path);
  }

  private _searchChildren(node: TreeNodeData, path: string): TreeNodeData | undefined {
    if (!node.children) return undefined;
    for (const child of node.children) {
      if (child.path === path) return child;
      const found = this._searchChildren(child, path);
      if (found) return found;
    }
    return undefined;
  }

  /** Get the parent path from a file/directory path. */
  private _getParentPath(path: string): string {
    const parts = path.replace(/\\/g, '/').split('/');
    parts.pop();
    return parts.join('/') || '/';
  }

  /** Ensure the selected node is visible within the scroll window. */
  private _ensureVisible(): void {
    if (this._selectedIndex < this._scrollOffset) {
      this._scrollOffset = this._selectedIndex;
    } else if (this._selectedIndex >= this._scrollOffset + this._height) {
      this._scrollOffset = this._selectedIndex - this._height + 1;
    }
    this._scrollOffset = Math.max(0, Math.min(this._scrollOffset, this._maxScrollOffset));
  }

  /** Get max scroll offset. */
  private get _maxScrollOffset(): number {
    return Math.max(0, this._visibleNodes.length - this._height);
  }

  /** Clamp selection to valid range. */
  private _clampSelection(): void {
    if (this._selectedIndex >= this._visibleNodes.length) {
      this._selectedIndex = Math.max(0, this._visibleNodes.length - 1);
    }
  }

  /** Notify selection change callback. */
  private _notifySelectionChange(): void {
    if (this._onSelectionChange) {
      const node = this._visibleNodes[this._selectedIndex];
      if (node) {
        this._onSelectionChange(node.path, node.type);
      }
    }
  }

  /** Render unavailable state — no tree data loaded. */
  private _renderUnavailable(renderer: Renderer): Line[] {
    const lines: Line[] = [];
    const infoIcon = renderer.theme.symbol('info');
    lines.push(blank());
    lines.push({
      segments: [
        { text: ` ${infoIcon} `, style: { dim: true } },
        { text: 'No repository loaded', style: { dim: true } },
      ],
    });
    lines.push({
      segments: [{ text: '   Run an analysis to explore', style: { dim: true } }],
    });
    lines.push({
      segments: [{ text: '   your project structure.', style: { dim: true } }],
    });
    return lines;
  }

  /** Render empty tree state — data exists but no visible nodes. */
  private _renderEmpty(_renderer: Renderer): Line[] {
    return [
      { segments: [{ text: '   No files to display', style: { dim: true } }] },
      { segments: [{ text: '   The repository appears to', style: { dim: true } }] },
      { segments: [{ text: '   be empty.', style: { dim: true } }] },
    ];
  }


}
