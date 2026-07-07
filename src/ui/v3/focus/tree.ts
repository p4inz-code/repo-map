/**
 * FocusTree — the hierarchical focus system for the V3 Runtime.
 *
 * Replaces the flat FocusManager with a tree-based system that supports:
 * - Hierarchical focus traversal (parent → child, sibling navigation)
 * - Tab / Shift+Tab cycling within the current subtree
 * - Arrow key navigation within the current subtree
 * - Modal focus trapping
 * - Focus path tracking for restoration
 * - Focus change events
 *
 * # Architecture
 * ```
 * FocusTree
 *   ├── FocusNode Registry (all registered nodes by ID)
 *   ├── Focus Path (root → current focus, for restoration)
 *   ├── Traversal Engine (tab, arrow, modal focus)
 *   ├── Focus History (for restoration on screen return)
 *   └── Change Events (focus changed callback)
 * ```
 *
 * # Traversal Rules
 * - Tab: next sibling in depth-first pre-order of current subtree.
 * - Shift+Tab: previous sibling in depth-first pre-order.
 * - Arrow keys: next/prev within the same parent container.
 * - Modal focus: trapped within the modal's subtree.
 * - Focus restoration: saves/restores focus path by context.
 *
 * # Determinism
 * - Tree structure is deterministic (insertion order preserved).
 * - Traversal follows a fixed depth-first pre-order pattern.
 * - Focus path is always root → leaf.
 */

import type {
  FocusNode,
  FocusTreeState,
  FocusResult,
  FocusPath,
  FocusChangeEvent,
  TabDirection,
  ArrowDirection,
} from './types.js';

// ─── FocusTree ────────────────────────────────────────────────────

export class FocusTree {
  /** All registered focus nodes by ID. */
  private readonly _nodes: Map<string, FocusNode> = new Map();

  /** Current focus path from root to focused node. */
  private _focusPath: string[] = [];

  /** Root node ID. */
  private _rootId: string | null = null;

  /** Focus history for restoration (context → FocusPath). */
  private readonly _history: Map<string, FocusPath> = new Map();

  /** Callback for focus change events. */
  private _onFocusChange: ((event: FocusChangeEvent) => void) | null = null;

  // ── Tree Construction ─────────────────────────────────────────

  /**
   * Set the root node of the focus tree.
   * The root is always focusable and serves as the entry point for traversal.
   *
   * @param id - Node ID to set as root.
   * @param metadata - Optional metadata.
   */
  setRoot(id: string, metadata?: Record<string, unknown>): FocusNode {
    this._pruneNode(id); // Remove existing node if present
    const node: FocusNode = {
      id,
      parentId: null,
      childIds: [],
      focusable: true,
      disabled: false,
      modal: false,
      metadata: metadata ?? {},
    };
    this._nodes.set(id, node);
    this._rootId = id;
    return node;
  }

  /**
   * Register a new focus node.
   *
   * @param id       - Unique node identifier.
   * @param parentId - Parent node ID (must exist, or null for root).
   * @param options  - Additional node properties.
   * @returns The created FocusNode.
   * @throws If parentId is provided but does not exist.
   */
  addNode(
    id: string,
    parentId: string | null,
    options?: {
      focusable?: boolean;
      disabled?: boolean;
      modal?: boolean;
      metadata?: Record<string, unknown>;
    },
  ): FocusNode {
    // Validate parent
    if (parentId !== null && !this._nodes.has(parentId)) {
      throw new Error(
        `FocusTree: parent node "${parentId}" does not exist for child "${id}"`,
      );
    }

    // Remove existing node with same ID
    this._pruneNode(id);

    const node: FocusNode = {
      id,
      parentId,
      childIds: [],
      focusable: options?.focusable ?? true,
      disabled: options?.disabled ?? false,
      modal: options?.modal ?? false,
      metadata: options?.metadata ?? {},
    };

    this._nodes.set(id, node);

    // Add to parent's children
    if (parentId !== null) {
      const parent = this._nodes.get(parentId)!;
      parent.childIds.push(id);
    }

    // If no root is set, this node becomes root
    if (this._rootId === null) {
      this._rootId = id;
    }

    return node;
  }

  /**
   * Remove a node and all its descendants from the focus tree.
   */
  removeNode(id: string): void {
    const node = this._nodes.get(id);
    if (!node) return;

    // Remove from parent
    if (node.parentId !== null) {
      const parent = this._nodes.get(node.parentId);
      if (parent) {
        parent.childIds = parent.childIds.filter((cid) => cid !== id);
      }
    }

    // Remove all descendants recursively
    this._removeSubtree(id);

    // Clear root if root was removed
    if (this._rootId === id) {
      this._rootId = null;
    }

    // Update focus path
    this._focusPath = this._focusPath.filter((fid) => fid !== id);
  }

  /**
   * Clear all nodes and reset the tree.
   */
  clear(): void {
    this._nodes.clear();
    this._focusPath = [];
    this._rootId = null;
    this._history.clear();
  }

  // ── Focus Operations ─────────────────────────────────────────

  /**
   * Focus a specific node by ID.
   *
   * @param id - Node ID to focus.
   * @returns FocusResult indicating success/failure.
   */
  focus(id: string): FocusResult {
    const node = this._nodes.get(id);
    if (!node || !node.focusable || node.disabled) {
      return { success: false, newFocusId: null, previousFocusId: this._focusedId };
    }

    // If a modal is active, only allow focus within the modal subtree
    if (this._isModalActive() && !this._isInModalSubtree(id)) {
      return { success: false, newFocusId: this._focusedId, previousFocusId: this._focusedId };
    }

    const previousId = this._focusedId;

    // Build focus path from root to this node
    const path = this._buildPathToRoot(id);
    this._focusPath = path;

    // Fire change event
    this._onFocusChange?.({
      focusedId: id,
      previousId,
      focusPath: path,
    });

    return { success: true, newFocusId: id, previousFocusId: previousId };
  }

  /**
   * Blur (remove focus) from the current node.
   */
  blur(): FocusResult {
    const previousId = this._focusedId;
    this._focusPath = [];

    this._onFocusChange?.({
      focusedId: null,
      previousId,
      focusPath: [],
    });

    return { success: true, newFocusId: null, previousFocusId: previousId };
  }

  /**
   * Move focus forward (Tab key).
   * Traverses depth-first pre-order through the tree.
   */
  focusNext(): FocusResult {
    return this._tabTraverse('forward');
  }

  /**
   * Move focus backward (Shift+Tab key).
   */
  focusPrev(): FocusResult {
    return this._tabTraverse('backward');
  }

  /**
   * Move focus in a directional manner (Arrow keys).
   * Within the current parent, moves to the next/previous sibling.
   */
  focusDirection(direction: ArrowDirection): FocusResult {
    const focusedId = this._focusedId;
    if (!focusedId) {
      // Focus the first focusable node
      return this._focusFirst();
    }

    const node = this._nodes.get(focusedId);
    if (!node || !node.parentId) return { success: false, newFocusId: null, previousFocusId: focusedId };

    const parent = this._nodes.get(node.parentId);
    if (!parent) return { success: false, newFocusId: null, previousFocusId: focusedId };

    // Map directions to forward/backward within parent
    const isForward = direction === 'down' || direction === 'right';
    const isBackward = direction === 'up' || direction === 'left';

    if (!isForward && !isBackward) {
      return { success: false, newFocusId: null, previousFocusId: focusedId };
    }

    const siblings = parent.childIds.filter((cid) => {
      const child = this._nodes.get(cid);
      return child && child.focusable && !child.disabled;
    });

    const currentIdx = siblings.indexOf(focusedId);

    if (isForward && currentIdx < siblings.length - 1) {
      return this.focus(siblings[currentIdx + 1]);
    }

    if (isBackward && currentIdx > 0) {
      return this.focus(siblings[currentIdx - 1]);
    }

    return { success: false, newFocusId: null, previousFocusId: focusedId };
  }

  // ── Focus History / Restoration ──────────────────────────────

  /**
   * Save the current focus path for a given context.
   * Used when navigating away from a screen.
   *
   * @param contextId - The screen or context to save focus for.
   */
  saveFocusPath(contextId: string): void {
    const focusedId = this._focusedId;
    if (!focusedId) return;

    this._history.set(contextId, {
      contextId,
      path: [...this._focusPath],
      timestamp: Date.now(),
    });
  }

  /**
   * Restore a previously saved focus path for a context.
   *
   * @param contextId - The screen or context to restore focus for.
   * @returns Whether focus was restored.
   */
  restoreFocusPath(contextId: string): boolean {
    const saved = this._history.get(contextId);
    if (!saved || saved.path.length === 0) return false;

    // Walk the path and find the deepest still-valid focusable node
    for (let i = saved.path.length - 1; i >= 0; i--) {
      const nodeId = saved.path[i];
      const node = this._nodes.get(nodeId);
      if (node && node.focusable && !node.disabled) {
        return this.focus(nodeId).success;
      }
    }

    return false;
  }

  /**
   * Clear saved focus paths for a context.
   */
  clearHistory(contextId: string): void {
    this._history.delete(contextId);
  }

  /**
   * Clear all saved focus history.
   */
  clearAllHistory(): void {
    this._history.clear();
  }

  // ── Modal Support ─────────────────────────────────────────────

  /**
   * Set a container node as a modal, trapping focus within its subtree.
   *
   * @param id - Node ID to set as modal container.
   */
  setModal(id: string): void {
    const node = this._nodes.get(id);
    if (node) {
      node.modal = true;
      // Focus the first focusable node within the modal
      this._focusFirstInSubtree(id);
    }
  }

  /**
   * Remove modal status from a container.
   */
  clearModal(id: string): void {
    const node = this._nodes.get(id);
    if (node) {
      node.modal = false;
    }
  }

  /**
   * Get the current modal container ID, or null if no modal is active.
   */
  getModalContainer(): string | null {
    for (const [, node] of this._nodes) {
      if (node.modal) return node.id;
    }
    return null;
  }

  // ── Callbacks ─────────────────────────────────────────────────

  /**
   * Register a callback for focus change events.
   */
  onFocusChange(callback: (event: FocusChangeEvent) => void): void {
    this._onFocusChange = callback;
  }

  /**
   * Remove the focus change callback.
   */
  clearOnFocusChange(): void {
    this._onFocusChange = null;
  }

  // ── Accessors ─────────────────────────────────────────────────

  /**
   * Get the current state of the focus tree.
   */
  getState(): FocusTreeState {
    return {
      nodes: new Map(this._nodes),
      focusPath: [...this._focusPath],
      focusedId: this._focusedId,
      rootId: this._rootId ?? '',
      nodeCount: this._nodes.size,
      modalActive: this._isModalActive(),
      modalContainerId: this.getModalContainer(),
    };
  }

  /**
   * Get a node by ID.
   */
  getNode(id: string): FocusNode | undefined {
    return this._nodes.get(id);
  }

  /**
   * Get the currently focused node ID.
   */
  get focusedId(): string | null {
    return this._focusedId;
  }

  /**
   * Get the root node ID.
   */
  get rootId(): string | null {
    return this._rootId;
  }

  /**
   * Check if a node exists and is focusable.
   */
  isFocusable(id: string): boolean {
    const node = this._nodes.get(id);
    return node !== undefined && node.focusable && !node.disabled;
  }

  /**
   * Check if a node is currently focused.
   */
  isFocused(id: string): boolean {
    return this._focusedId === id;
  }

  /**
   * Get all node IDs registered in the tree.
   */
  getAllNodeIds(): string[] {
    return [...this._nodes.keys()];
  }

  // ── Debug / Introspection ─────────────────────────────────────

  /**
   * Dump the tree structure for debugging.
   */
  dumpTree(): string {
    const lines: string[] = [];
    if (!this._rootId) return '(empty)';

    const walk = (nodeId: string, depth: number) => {
      const node = this._nodes.get(nodeId);
      if (!node) return;
      const indent = '  '.repeat(depth);
      const focusMarker = nodeId === this._focusedId ? ' ←' : '';
      const modalMarker = node.modal ? ' [MODAL]' : '';
      const disabledMarker = node.disabled ? ' [DISABLED]' : '';
      const notFocusable = !node.focusable ? ' [NOT-FOCUSABLE]' : '';
      lines.push(
        `${indent}${nodeId}${focusMarker}${modalMarker}${disabledMarker}${notFocusable}`,
      );
      for (const childId of node.childIds) {
        walk(childId, depth + 1);
      }
    };

    walk(this._rootId, 0);
    return lines.join('\n');
  }

  // ── Internal ──────────────────────────────────────────────────

  /**
   * Get the currently focused node ID.
   */
  private get _focusedId(): string | null {
    return this._focusPath.length > 0
      ? this._focusPath[this._focusPath.length - 1]
      : null;
  }

  /**
   * Traverse in tab order (depth-first pre-order).
   */
  private _tabTraverse(direction: TabDirection): FocusResult {
    const focusedId = this._focusedId;
    if (!focusedId) {
      return this._focusFirst();
    }

    // Get all focusable nodes in depth-first order
    const allFocusable = this._getFocusableNodes();

    if (allFocusable.length === 0) {
      return { success: false, newFocusId: null, previousFocusId: focusedId };
    }

    const currentIdx = allFocusable.indexOf(focusedId);

    if (direction === 'forward') {
      const nextIdx = currentIdx + 1 < allFocusable.length ? currentIdx + 1 : 0;
      return this.focus(allFocusable[nextIdx]);
    } else {
      const prevIdx = currentIdx - 1 >= 0 ? currentIdx - 1 : allFocusable.length - 1;
      return this.focus(allFocusable[prevIdx]);
    }
  }

  /**
   * Get all focusable nodes in depth-first pre-order.
   * Respects modal boundaries (only returns nodes within modal if active).
   */
  private _getFocusableNodes(): string[] {
    const result: string[] = [];

    if (!this._rootId) return result;

    const modalId = this.getModalContainer();

    const walk = (nodeId: string) => {
      const node = this._nodes.get(nodeId);
      if (!node) return;

      if (node.focusable && !node.disabled) {
        result.push(nodeId);
      }

      for (const childId of node.childIds) {
        const child = this._nodes.get(childId);
        if (child && child.modal) {
          // Only traverse into the active modal
          if (childId === modalId) {
            walk(childId);
          }
          // Otherwise skip this modal subtree
        } else {
          walk(childId);
        }
      }
    };

    walk(this._rootId);
    return result;
  }

  /**
   * Focus the first focusable node in the tree.
   */
  private _focusFirst(): FocusResult {
    const allFocusable = this._getFocusableNodes();
    if (allFocusable.length === 0) {
      return { success: false, newFocusId: null, previousFocusId: null };
    }
    return this.focus(allFocusable[0]);
  }

  /**
   * Focus the first focusable node within a subtree.
   */
  private _focusFirstInSubtree(rootId: string): boolean {
    const walk = (nodeId: string): boolean => {
      const node = this._nodes.get(nodeId);
      if (!node) return false;
      if (node.focusable && !node.disabled) {
        return this.focus(nodeId).success;
      }
      for (const childId of node.childIds) {
        if (walk(childId)) return true;
      }
      return false;
    };

    return walk(rootId);
  }

  /**
   * Build the focus path from root to a given node.
   */
  private _buildPathToRoot(nodeId: string): string[] {
    const path: string[] = [];
    let current: string | null = nodeId;

    while (current !== null) {
      path.unshift(current);
      const node = this._nodes.get(current);
      current = node?.parentId ?? null;
    }

    return path;
  }

  /**
   * Check if a modal is currently active.
   */
  private _isModalActive(): boolean {
    return this.getModalContainer() !== null;
  }

  /**
   * Check if a node is within the current modal's subtree.
   */
  private _isInModalSubtree(nodeId: string): boolean {
    const modalId = this.getModalContainer();
    if (!modalId) return true; // No modal, all nodes are accessible

    // Walk up from nodeId to see if we hit the modal container
    let current: string | null = nodeId;
    while (current !== null) {
      if (current === modalId) return true;
      const node = this._nodes.get(current);
      current = node?.parentId ?? null;
    }

    return false;
  }

  /**
   * Remove a node and all its descendants.
   */
  private _removeSubtree(id: string): void {
    const node = this._nodes.get(id);
    if (!node) return;

    // Recursively remove children
    for (const childId of [...node.childIds]) {
      this._removeSubtree(childId);
    }

    // Remove from history
    this._history.forEach((path, contextId) => {
      if (path.path.includes(id)) {
        this._history.delete(contextId);
      }
    });

    this._nodes.delete(id);
  }

  /**
   * Remove a node to prepare for re-insertion.
   * Unlike removeNode, this does not affect the parent's child list
   * (assumes the caller will re-add to a different parent).
   */
  private _pruneNode(id: string): void {
    const existing = this._nodes.get(id);
    if (!existing) return;

    // Remove from parent's children
    if (existing.parentId !== null) {
      const parent = this._nodes.get(existing.parentId);
      if (parent) {
        parent.childIds = parent.childIds.filter((cid) => cid !== id);
      }
    }

    this._nodes.delete(id);
    this._focusPath = this._focusPath.filter((fid) => fid !== id);
  }
}
