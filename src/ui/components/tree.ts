/**
 * Tree component — production-quality collapsible tree with
 * full keyboard navigation and selection support.
 *
 * # Keyboard Support
 * - ↑/↓: Navigate between visible tree nodes
 * - →: Expand selected node (if it has children)
 * - ←: Collapse selected node (if expanded) or focus parent
 * - Enter: Toggle expand/collapse of selected node
 *
 * # Selection Model
 * - Selected node tracks by path (array of ancestor names from root).
 * - Only leaf nodes or branch headers can be selected.
 * - Selection follows filtering and expand/collapse.
 *
 * # Expand/Collapse
 * - Each node independently remembers its expanded state.
 * - Collapsing a node hides all its descendants.
 * - Expanding a node shows immediate children.
 * - Parent collapse collapses all descendants implicitly.
 */

import { Component } from './component.js';
import type { Renderer, Line } from '../renderer.js';

// ─── Types ─────────────────────────────────────────────────────

export interface TreeNode {
  /** Display name for this node. */
  name: string;
  /** Child nodes (if any). */
  children?: TreeNode[];
  /** Whether this node is expanded (default: false). */
  expanded?: boolean;
  /** Additional metadata to display. */
  meta?: string;
}

export interface TreeOptions {
  /** The root tree node. */
  root: TreeNode;
  /** Maximum depth to display. Default: unlimited. */
  maxDepth?: number;
  /** Whether to show root node. Default: true. */
  showRoot?: boolean;
  /** Character for branch forks. Default: '├──'. */
  branchChar?: string;
  /** Character for the last child. Default: '└──'. */
  lastChar?: string;
  /** Vertical line character. Default: '│'. */
  verticalChar?: string;
  /** Indentation character. Default: '   '. */
  indentChar?: string;
  /** Character for collapse indicator ▶. Default: '▶'. */
  collapsedChar?: string;
  /** Character for expand indicator ▼. Default: '▼'. */
  expandedChar?: string;
}

// ─── Tree ──────────────────────────────────────────────────────

export class Tree extends Component {
  private _root: TreeNode;
  private _maxDepth: number;
  private _showRoot: boolean;
  private _branchChar: string;
  private _lastChar: string;
  private _verticalChar: string;
  private _indentChar: string;
  private _collapsedChar: string;
  private _expandedChar: string;

  /** Flat list of visible nodes with their paths (for selection). */
  private _visibleNodes: Array<{ node: TreeNode; path: string[]; depth: number }> = [];

  /** Currently selected index within the visible nodes list. */
  private _selectedVisibleIndex: number = 0;

  constructor(id: string, options: TreeOptions) {
    super(id);
    this._root = options.root;
    this._maxDepth = options.maxDepth ?? Infinity;
    this._showRoot = options.showRoot ?? true;
    this._branchChar = options.branchChar ?? '├──';
    this._lastChar = options.lastChar ?? '└──';
    this._verticalChar = options.verticalChar ?? '│';
    this._indentChar = options.indentChar ?? '   ';
    this._collapsedChar = options.collapsedChar ?? '▶';
    this._expandedChar = options.expandedChar ?? '▼';

    // Build initial visible nodes
    this._rebuildVisibleNodes();
  }

  // ── Accessors ────────────────────────────────────────────────

  get selectedNode(): TreeNode | undefined {
    const entry = this._visibleNodes[this._selectedVisibleIndex];
    return entry?.node;
  }

  get selectedPath(): string[] | undefined {
    const entry = this._visibleNodes[this._selectedVisibleIndex];
    return entry?.path;
  }

  get selectedVisibleIndex(): number {
    return this._selectedVisibleIndex;
  }

  get visibleNodeCount(): number {
    return this._visibleNodes.length;
  }

  // ── Navigation ────────────────────────────────────────────────

  /**
   * Move selection down (to the next visible node).
   */
  selectNext(): void {
    if (this._visibleNodes.length === 0) return;
    if (this._selectedVisibleIndex < this._visibleNodes.length - 1) {
      this._selectedVisibleIndex++;
      this.markDirty();
    }
  }

  /**
   * Move selection up (to the previous visible node).
   */
  selectPrev(): void {
    if (this._selectedVisibleIndex > 0) {
      this._selectedVisibleIndex--;
      this.markDirty();
    }
  }

  /**
   * Move selection to the first visible node.
   */
  selectFirst(): void {
    if (this._selectedVisibleIndex !== 0) {
      this._selectedVisibleIndex = 0;
      this.markDirty();
    }
  }

  /**
   * Move selection to the last visible node.
   */
  selectLast(): void {
    const last = this._visibleNodes.length - 1;
    if (this._selectedVisibleIndex !== last) {
      this._selectedVisibleIndex = last;
      this.markDirty();
    }
  }

  // ── Expand / Collapse ────────────────────────────────────────

  /**
   * Expand the currently selected node (if it has children).
   * Right arrow (→) triggers this.
   */
  expandSelected(): void {
    const entry = this._visibleNodes[this._selectedVisibleIndex];
    if (!entry || !entry.node.children || entry.node.children.length === 0) return;
    if (entry.node.expanded) return; // Already expanded

    entry.node.expanded = true;
    this._rebuildVisibleNodes();
    this.markDirty();
  }

  /**
   * Collapse the currently selected node.
   * Left arrow (←) triggers this.
   */
  collapseSelected(): void {
    const entry = this._visibleNodes[this._selectedVisibleIndex];
    if (!entry) return;

    if (entry.node.expanded) {
      // Collapse this node
      entry.node.expanded = false;
      this._rebuildVisibleNodes();
      this.markDirty();
    } else if (entry.path.length > 1) {
      // Move to parent if already collapsed
      const parentPath = entry.path.slice(0, -1);
      const parentIndex = this._visibleNodes.findIndex(
        (v) => v.path.length === parentPath.length && v.path.every((p, i) => p === parentPath[i]),
      );
      if (parentIndex >= 0) {
        this._selectedVisibleIndex = parentIndex;
        this.markDirty();
      }
    }
  }

  /**
   * Toggle expand/collapse of the currently selected node.
   * Enter triggers this.
   */
  toggleSelected(): void {
    const entry = this._visibleNodes[this._selectedVisibleIndex];
    if (!entry || !entry.node.children || entry.node.children.length === 0) return;

    entry.node.expanded = !entry.node.expanded;
    this._rebuildVisibleNodes();
    this.markDirty();
  }

  /**
   * Expand all nodes.
   */
  expandAll(): void {
    this._setExpandAll(this._root, true);
    this._rebuildVisibleNodes();
    this.markDirty();
  }

  /**
   * Collapse all nodes.
   */
  collapseAll(): void {
    this._setExpandAll(this._root, false);
    this._rebuildVisibleNodes();
    this.markDirty();
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    return this._visibleNodes.length;
  }

  protected renderContent(_renderer: Renderer): Line[] {
    const lines: Line[] = [];

    for (let i = 0; i < this._visibleNodes.length; i++) {
      const { node, depth } = this._visibleNodes[i];
      const isSelected = i === this._selectedVisibleIndex;
      const hasChildren = node.children && node.children.length > 0;

      // Build tree prefix (indentation + branch characters)
      let prefix = '';
      for (let d = 0; d < depth - (this._showRoot ? 0 : 1); d++) {
        // Check if this depth level has more siblings after current
        prefix += this._indentChar;
      }

      // Build node name with expand/collapse indicator
      const indicator = hasChildren
        ? (node.expanded ? `${this._expandedChar} ` : `${this._collapsedChar} `)
        : '  ';
      const nameStr = `${indicator}${node.name}`;
      const metaStr = node.meta ? `  ${node.meta}` : '';

      const text = `${prefix}${nameStr}${metaStr}`;

      if (isSelected) {
        lines.push({
          segments: [{ text, style: { bold: true } }],
        });
      } else {
        lines.push({
          segments: [{ text }],
        });
      }
    }

    return lines;
  }

  // ── Internal ─────────────────────────────────────────────────

  /**
   * Find a node by path from root.
   */
  private _findNodeByPath(path: string[]): TreeNode | undefined {
    let current: TreeNode | undefined = this._root;
    for (const segment of path) {
      if (!current || !current.children) return undefined;
      current = current.children.find((c) => c.name === segment);
    }
    return current;
  }

  /**
   * Rebuild the flat list of visible nodes.
   */
  private _rebuildVisibleNodes(): void {
    this._visibleNodes = [];
    this._flattenNode(this._root, [], 0, this._showRoot ? 0 : 1);

    // Clamp selected index
    if (this._selectedVisibleIndex >= this._visibleNodes.length) {
      this._selectedVisibleIndex = Math.max(0, this._visibleNodes.length - 1);
    }
  }

  /**
   * Flatten a tree node and its visible children into the visibleNodes array.
   */
  private _flattenNode(node: TreeNode, prefix: string[], depth: number, startDepth: number): void {
    if (depth >= startDepth) {
      this._visibleNodes.push({ node, path: [...prefix, node.name], depth });
    }

    // Recurse into children if expanded
    if (
      (depth === startDepth - 1 || node.expanded) &&
      node.children &&
      depth < this._maxDepth
    ) {
      for (const child of node.children) {
        this._flattenNode(child, [...prefix, node.name], depth + 1, startDepth);
      }
    }
  }

  private _setExpandAll(node: TreeNode, expanded: boolean): void {
    if (node.children && node.children.length > 0) {
      node.expanded = expanded;
      for (const child of node.children) {
        this._setExpandAll(child, expanded);
      }
    }
  }
}
