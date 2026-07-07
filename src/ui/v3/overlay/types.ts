/**
 * Overlay types for the V3 Overlay Manager.
 *
 * Defines the contract for all overlay layers including:
 * - Command Palette
 * - Search
 * - Notifications
 * - Dialogs (modals, confirmations)
 * - Help
 * - Future Plugin overlays
 *
 * # Overlay Stack
 * Overlays are managed as a stack. The topmost overlay receives focus.
 * Each overlay has:
 * - priority: determines stacking within the stack
 * - modal: whether it blocks interaction with layers below
 * - focus: whether it captures keyboard focus
 * - dismiss: how the overlay can be dismissed (escape, click-outside, etc.)
 */

// ─── Overlay Identifier ───────────────────────────────────────────

/**
 * Canonical overlay identifiers.
 */
export type OverlayId =
  | 'palette'
  | 'search'
  | 'notifications'
  | 'modal'
  | 'dialog'
  | 'help'
  | 'plugin';

// ─── Overlay Priority ─────────────────────────────────────────────

/**
 * Priority levels for overlay stacking.
 * Higher priority overlays appear above lower priority ones.
 */
export enum OverlayPriority {
  /** Passive overlays (notifications, status indicators). */
  Passive = 0,
  /** Interactive overlays (search, palette). */
  Interactive = 100,
  /** Dialog overlays (help, info dialogs). */
  Dialog = 200,
  /** Modal overlays (blocking dialogs). */
  Modal = 300,
  /** Critical overlays (errors, forced actions). */
  Critical = 400,
}

// ─── Dismiss Strategy ─────────────────────────────────────────────

/**
 * How an overlay can be dismissed.
 */
export interface DismissStrategy {
  /** Whether Escape dismisses this overlay. */
  readonly escape: boolean;
  /** Whether clicking outside the overlay dismisses it. */
  readonly clickOutside: boolean;
  /** Custom dismiss key binding (e.g., 'ctrl-w'). */
  readonly keyBinding?: string;
  /** Whether the overlay auto-dismisses after a duration. */
  readonly autoDismiss: boolean;
  /** Auto-dismiss duration in ms (only if autoDismiss is true). */
  readonly autoDismissMs: number;
}

// ─── Overlay Instance ─────────────────────────────────────────

/**
 * A single overlay instance in the overlay stack.
 */
export interface OverlayInstance {
  /** Unique overlay identifier. */
  readonly id: OverlayId;
  /** Human-readable overlay name. */
  readonly label: string;
  /** Stacking priority. */
  readonly priority: OverlayPriority;
  /** Whether this overlay blocks interaction with layers below. */
  readonly modal: boolean;
  /** Whether this overlay captures keyboard focus. */
  readonly focus: boolean;
  /** Dismiss strategy. */
  readonly dismiss: DismissStrategy;
  /** Whether the overlay is currently visible. */
  visible: boolean;
  /** Arbitrary data associated with this overlay. */
  data: Record<string, unknown>;
}

// ─── Overlay Manager State ────────────────────────────────────────

/**
 * Snapshot of the OverlayManager state.
 */
export interface OverlayManagerState {
  /** Currently visible overlays, ordered from bottom to top. */
  readonly stack: OverlayInstance[];
  /** The topmost visible overlay (null if none). */
  readonly topmost: OverlayInstance | null;
  /** Whether any modal overlay is visible. */
  readonly hasModal: boolean;
  /** Number of visible overlays. */
  readonly visibleCount: number;
}

// ─── Default Overlay Definitions ──────────────────────────────────

/**
 * Default dismiss strategies for common overlay types.
 */
export const DEFAULT_DISMISS: Record<string, DismissStrategy> = {
  palette: {
    escape: true,
    clickOutside: false,
    keyBinding: 'ctrl-p',
    autoDismiss: false,
    autoDismissMs: 0,
  },
  search: {
    escape: true,
    clickOutside: false,
    keyBinding: '/',
    autoDismiss: false,
    autoDismissMs: 0,
  },
  notifications: {
    escape: false,
    clickOutside: true,
    autoDismiss: true,
    autoDismissMs: 3000,
  },
  modal: {
    escape: true,
    clickOutside: true,
    autoDismiss: false,
    autoDismissMs: 0,
  },
  dialog: {
    escape: true,
    clickOutside: true,
    autoDismiss: false,
    autoDismissMs: 0,
  },
  help: {
    escape: true,
    clickOutside: false,
    autoDismiss: false,
    autoDismissMs: 0,
  },
};

/**
 * Default OverlayPriority for each overlay type.
 */
export const DEFAULT_PRIORITY: Record<OverlayId, OverlayPriority> = {
  palette: OverlayPriority.Interactive,
  search: OverlayPriority.Interactive,
  notifications: OverlayPriority.Passive,
  modal: OverlayPriority.Modal,
  dialog: OverlayPriority.Dialog,
  help: OverlayPriority.Dialog,
  plugin: OverlayPriority.Interactive,
};
