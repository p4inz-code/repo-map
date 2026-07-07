/**
 * OverlayManager — single owner for all overlay layers.
 *
 * Manages the overlay stack with support for:
 * - Stack-based ordering (push/pop)
 * - Priority-based insertion
 * - Focus management (which overlay receives keyboard input)
 * - Modal overlays (block interaction with layers below)
 * - Dismiss strategies (escape, click-outside, auto-dismiss)
 * - State snapshots for rendering
 *
 * # Architecture
 * ```
 * OverlayManager
 *   ├── Overlay Stack (ordered by priority, then insertion order)
 *   ├── Default Definitions (pre-configured overlays)
 *   ├── Focus Ownership (topmost focusable overlay gets focus)
 *   ├── Dismiss Router (routes dismiss actions)
 *   └── State Snapshot (for FrameContext)
 * ```
 *
 * # Overlay Registration
 * Overlays can be registered at any time. Built-in overlays
 * (palette, search, notifications, modal, dialog, help) are
 * automatically registered on construction.
 *
 * # Focus Ownership
 * - The topmost overlay with focus:true receives keyboard input.
 * - Modal overlays prevent focus from reaching layers below.
 * - When an overlay is dismissed, focus returns to the previous overlay.
 *
 * # Determinism
 * - Stack order is deterministic: sorted by priority, then insertion order.
 * - Dismiss routing follows a fixed priority order.
 */

import type {
  OverlayId,
  OverlayInstance,
  OverlayManagerState,
  DismissStrategy,
} from './types.js';
import { OverlayPriority, DEFAULT_DISMISS, DEFAULT_PRIORITY } from './types.js';

// ─── OverlayManager ───────────────────────────────────────────────

export class OverlayManager {
  /** Registered overlay instances (including invisible ones). */
  private readonly _overlays: Map<OverlayId, OverlayInstance> = new Map();

  /** Insertion order for deterministic tie-breaking. */
  private readonly _insertionOrder: OverlayId[] = [];

  /** Callback fired when the overlay state changes. */
  private _onChange: ((state: OverlayManagerState) => void) | null = null;

  constructor() {
    // Register all built-in overlays
    this._registerBuiltins();
  }

  // ── Registration ──────────────────────────────────────────────

  /**
   * Register a custom overlay.
   *
   * @param id       - Overlay identifier.
   * @param instance - Overlay configuration.
   */
  register(id: OverlayId, instance: Partial<OverlayInstance>): void {
    const existing = this._overlays.get(id);
    if (existing) {
      // Merge with existing
      this._overlays.set(id, {
        ...existing,
        ...instance,
        dismiss: { ...existing.dismiss, ...instance.dismiss },
        data: { ...existing.data, ...instance.data },
      });
      return;
    }

    const full: OverlayInstance = {
      id,
      label: instance.label ?? id,
      priority: instance.priority ?? DEFAULT_PRIORITY[id] ?? OverlayPriority.Passive,
      modal: instance.modal ?? false,
      focus: instance.focus ?? true,
      dismiss: {
        ...(DEFAULT_DISMISS[id] ?? DEFAULT_DISMISS.modal),
        ...instance.dismiss,
      },
      visible: instance.visible ?? false,
      data: instance.data ?? {},
    };

    this._overlays.set(id, full);
    if (!this._insertionOrder.includes(id)) {
      this._insertionOrder.push(id);
    }
  }

  /**
   * Unregister an overlay.
   */
  unregister(id: OverlayId): void {
    this._overlays.delete(id);
    const idx = this._insertionOrder.indexOf(id);
    if (idx !== -1) {
      this._insertionOrder.splice(idx, 1);
    }
    this._notifyChange();
  }

  // ── Visibility ────────────────────────────────────────────────

  /**
   * Show an overlay.
   *
   * @param id   - Overlay to show.
   * @param data - Optional data to associate with the overlay.
   * @returns Whether the overlay was shown.
   */
  show(id: OverlayId, data?: Record<string, unknown>): boolean {
    const overlay = this._overlays.get(id);
    if (!overlay) return false;

    overlay.visible = true;
    if (data) {
      overlay.data = { ...overlay.data, ...data };
    }
    this._notifyChange();
    return true;
  }

  /**
   * Hide an overlay.
   *
   * @param id - Overlay to hide.
   * @returns Whether the overlay was hidden.
   */
  hide(id: OverlayId): boolean {
    const overlay = this._overlays.get(id);
    if (!overlay || !overlay.visible) return false;

    overlay.visible = false;
    this._notifyChange();
    return true;
  }

  /**
   * Toggle an overlay's visibility.
   *
   * @param id   - Overlay to toggle.
   * @param data - Optional data for when showing.
   * @returns Whether the overlay is now visible.
   */
  toggle(id: OverlayId, data?: Record<string, unknown>): boolean {
    const overlay = this._overlays.get(id);
    if (!overlay) return false;

    if (overlay.visible) {
      overlay.visible = false;
    } else {
      overlay.visible = true;
      if (data) {
        overlay.data = { ...overlay.data, ...data };
      }
    }
    this._notifyChange();
    return overlay.visible;
  }

  /**
   * Hide all visible overlays.
   */
  hideAll(): void {
    for (const [, overlay] of this._overlays) {
      overlay.visible = false;
    }
    this._notifyChange();
  }

  // ── Dismissal ─────────────────────────────────────────────────

  /**
   * Dismiss the topmost overlay using the Escape key.
   *
   * @returns The ID of the dismissed overlay, or null if none.
   */
  dismissTop(): OverlayId | null {
    const topmost = this._getTopmost();
    if (!topmost || !topmost.dismiss.escape) return null;

    topmost.visible = false;
    this._notifyChange();
    return topmost.id;
  }

  /**
   * Dismiss an overlay by clicking outside.
   *
   * @returns Whether an overlay was dismissed.
   */
  dismissClickOutside(): boolean {
    const topmost = this._getTopmost();
    if (!topmost || !topmost.dismiss.clickOutside) return false;

    topmost.visible = false;
    this._notifyChange();
    return true;
  }

  /**
   * Dismiss an overlay by ID.
   *
   * @returns Whether the overlay was dismissed.
   */
  dismiss(id: OverlayId): boolean {
    return this.hide(id);
  }

  /**
   * Check if dismissal via a custom key binding applies.
   *
   * @param binding - Key binding string (e.g., 'escape', 'ctrl-w').
   * @returns Whether an overlay was dismissed.
   */
  handleDismissBinding(binding: string): boolean {
    const topmost = this._getTopmost();
    if (!topmost || !topmost.visible) return false;

    if (topmost.dismiss.escape && binding === 'escape') {
      return this.dismissTop() !== null;
    }

    if (topmost.dismiss.keyBinding === binding) {
      topmost.visible = false;
      this._notifyChange();
      return true;
    }

    return false;
  }

  // ── Focus ─────────────────────────────────────────────────────

  /**
   * Get the overlay that currently owns keyboard focus.
   * This is the topmost visible overlay with focus:true.
   *
   * Returns null if no overlay has focus (focus falls to workspace).
   */
  getFocusOwner(): OverlayId | null {
    const topmost = this._getTopmost();
    if (topmost && topmost.visible && topmost.focus) {
      return topmost.id;
    }
    return null;
  }

  /**
   * Check if a modal overlay is currently visible.
   * Modal overlays block interaction with layers below.
   */
  get hasModal(): boolean {
    for (const [, overlay] of this._overlays) {
      if (overlay.visible && overlay.modal) return true;
    }
    return false;
  }

  // ── State ─────────────────────────────────────────────────────

  /**
   * Get a snapshot of the current overlay state.
   */
  getState(): OverlayManagerState {
    const stack = this._buildStack();
    return {
      stack,
      topmost: stack[stack.length - 1] ?? null,
      hasModal: this.hasModal,
      visibleCount: stack.length,
    };
  }

  /**
   * Register a callback for overlay state changes.
   */
  onChange(callback: (state: OverlayManagerState) => void): void {
    this._onChange = callback;
  }

  /**
   * Get an overlay instance by ID.
   */
  get(id: OverlayId): OverlayInstance | undefined {
    return this._overlays.get(id);
  }

  /**
   * Check if an overlay is currently visible.
   */
  isVisible(id: OverlayId): boolean {
    return this._overlays.get(id)?.visible ?? false;
  }

  /**
   * Update overlay data.
   */
  setData(id: OverlayId, data: Record<string, unknown>): void {
    const overlay = this._overlays.get(id);
    if (overlay) {
      overlay.data = { ...overlay.data, ...data };
    }
  }

  /**
   * Clear all overlay state.
   */
  reset(): void {
    this._overlays.clear();
    this._insertionOrder.length = 0;
    this._registerBuiltins();
    this._notifyChange();
  }

  // ── Internal ──────────────────────────────────────────────────

  /**
   * Build the visible overlay stack, sorted by priority then insertion order.
   */
  private _buildStack(): OverlayInstance[] {
    const visible: OverlayInstance[] = [];

    for (const id of this._insertionOrder) {
      const overlay = this._overlays.get(id);
      if (overlay && overlay.visible) {
        visible.push(overlay);
      }
    }

    // Sort by priority (ascending), then insertion order (stable)
    visible.sort((a, b) => {
      const priDiff = a.priority - b.priority;
      if (priDiff !== 0) return priDiff;
      return this._insertionOrder.indexOf(a.id) - this._insertionOrder.indexOf(b.id);
    });

    return visible;
  }

  /**
   * Get the topmost visible overlay.
   */
  private _getTopmost(): OverlayInstance | null {
    const stack = this._buildStack();
    return stack[stack.length - 1] ?? null;
  }

  /**
   * Register all built-in overlays.
   */
  private _registerBuiltins(): void {
    const builtins: Array<{ id: OverlayId; label: string; modal: boolean; focus: boolean }> = [
      { id: 'palette', label: 'Command Palette', modal: false, focus: true },
      { id: 'search', label: 'Search', modal: false, focus: true },
      { id: 'notifications', label: 'Notifications', modal: false, focus: false },
      { id: 'modal', label: 'Modal Dialog', modal: true, focus: true },
      { id: 'dialog', label: 'Dialog', modal: true, focus: true },
      { id: 'help', label: 'Help', modal: false, focus: true },
      { id: 'plugin', label: 'Plugin', modal: false, focus: true },
    ];

    for (const def of builtins) {
      this.register(def.id, def);
    }
  }

  /**
   * Notify listeners of state changes.
   */
  private _notifyChange(): void {
    this._onChange?.(this.getState());
  }
}
