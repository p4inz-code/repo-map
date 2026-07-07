/**
 * Focus Tree types for the V3 Runtime.
 *
 * Defines the contract for a tree-based focus system that replaces
 * the flat FocusManager with a hierarchical FocusTree.
 *
 * # FocusNode
 * A single focusable element in the focus tree.
 * Each node has:
 * - id: unique identifier
 * - parent: parent node ID (null for root)
 * - children: ordered child node IDs (for tab/arrow traversal)
 * - focusable: whether this node can receive focus
 * - metadata: arbitrary data associated with the node
 *
 * # FocusTree
 * The full tree of focusable elements.
 * Supports:
 * - Registration of focus nodes
 * - Hierarchical focus traversal (parent → child, forward/backward)
 * - Tab/Shift+Tab cycling within the current subtree
 * - Arrow key navigation within the current subtree
 * - Modal focus trapping
 * - Focus path tracking for restoration
 *
 * # FocusPath
 * A sequence of node IDs from root to the currently focused node.
 * Used for focus restoration when returning to a previously visited screen.
 *
 * # Traversal
 * - Tab: moves to the next focusable sibling within the current subtree.
 * - Shift+Tab: moves to the previous focusable sibling.
 * - Arrow keys: moves directionally within the current container.
 * - Modal: restricts focus to the modal's subtree.
 *
 * # Focus Restoration
 * When navigating back to a screen, the focus path is restored
 * to the last focused node in that screen's subtree.
 */

// ─── Focus Node ───────────────────────────────────────────────────

/**
 * A single node in the focus tree.
 */
export interface FocusNode {
  /** Unique identifier within the focus tree. */
  readonly id: string;
  /** Parent node ID (null for root). */
  parentId: string | null;
  /** Ordered child node IDs. */
  childIds: string[];
  /** Whether this node can receive focus. */
  focusable: boolean;
  /** Whether this node is currently disabled (cannot receive focus). */
  disabled: boolean;
  /** Whether this is a modal container (focus is trapped within). */
  modal: boolean;
  /** Arbitrary metadata associated with this node. */
  metadata: Record<string, unknown>;
}

// ─── Focus Tree State ─────────────────────────────────────────────

/**
 * Complete state of the FocusTree.
 */
export interface FocusTreeState {
  /** All registered nodes by ID. */
  readonly nodes: ReadonlyMap<string, FocusNode>;
  /** Current focus path from root to focused node. */
  readonly focusPath: string[];
  /** Currently focused node ID (null if nothing focused). */
  readonly focusedId: string | null;
  /** Root node ID. */
  readonly rootId: string;
  /** Total number of registered nodes. */
  readonly nodeCount: number;
  /** Whether focus is currently trapped in a modal. */
  readonly modalActive: boolean;
  /** The modal container ID (null if no modal is active). */
  readonly modalContainerId: string | null;
}

// ─── Focus Direction ──────────────────────────────────────────────

/**
 * Direction for tab-style focus traversal.
 */
export type TabDirection = 'forward' | 'backward';

/**
 * Direction for arrow-key focus traversal.
 */
export type ArrowDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Result of a focus operation.
 */
export interface FocusResult {
  /** Whether the focus operation succeeded. */
  readonly success: boolean;
  /** The newly focused node ID (null if blur). */
  readonly newFocusId: string | null;
  /** The previous focus node ID (null if nothing was focused). */
  readonly previousFocusId: string | null;
}

// ─── Focus Path ───────────────────────────────────────────────────

/**
 * A recorded focus path for restoration.
 * Stores the sequence of node IDs from root to a focused node.
 */
export interface FocusPath {
  /** The screen or context this path belongs to. */
  readonly contextId: string;
  /** Node IDs from root to the focused node. */
  readonly path: string[];
  /** Timestamp when this path was recorded. */
  readonly timestamp: number;
}

// ─── Focus Change Event ───────────────────────────────────────────

/**
 * Event data emitted when focus changes.
 */
export interface FocusChangeEvent {
  /** The newly focused node ID (null if blurred). */
  readonly focusedId: string | null;
  /** The previously focused node ID. */
  readonly previousId: string | null;
  /** The current focus path from root to focused node. */
  readonly focusPath: string[];
}
