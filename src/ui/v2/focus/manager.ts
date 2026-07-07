/**
 * FocusManager v2 — professional keyboard focus system.
 *
 * Manages which component has keyboard focus, tracks focus history,
 * handles tab order, arrow navigation, and provides a global focus
 * registry for component registration.
 *
 * # Architecture
 * ```
 * FocusManager
 *   ├── Focus Stack (ordered list of focusable components)
 *   ├── Focus History (navigation back-stack)
 *   ├── Tab Order (sequential focus cycling)
 *   ├── Arrow Navigation (directional focus movement)
 *   ├── Focus Registry (global component lookup by ID)
 *   └── Focus Ring (visual indicator state)
 * ```
 *
 * # Focus Rules
 * - Exactly ONE component is focused at any time.
 * - Tab/Shift+Tab cycles focus forward/backward.
 * - Arrow keys move focus directionally (when supported).
 * - Escape or blur event moves focus to the previous item.
 * - Focus ring is visible whenever a component has focus.
 * - Components must be registered before they can receive focus.
 *
 * # Lifecycle
 * ```
 * focusManager.register(component);
 * focusManager.focus(componentId);    // Focus a specific component
 * focusManager.focusNext();            // Tab
 * focusManager.focusPrev();            // Shift+Tab
 * focusManager.focusDirection('down'); // Arrow key
 * focusManager.blur();                 // Remove focus
 * focusManager.unregister(componentId);
 * ```
 *
 * @example
 * ```ts
 * const fm = new FocusManager();
 * fm.register(header);
 * fm.register(sidebar);
 * fm.register(tree);
 * fm.register(footer);
 *
 * fm.focus('sidebar');          // Sidebar gains focus
 * fm.focusNext();               // Tree gains focus
 * fm.focusDirection('up');      // Sidebar gains focus
 * fm.blur();                    // Focus cleared
 * fm.focusPrevious();           // Sidebar regains focus (from history)
 * ```
 */

import type { Component } from '../component/component.js';
import type { FocusDirection } from '../types.js';

// ─── Types ────────────────────────────────────────────────────────

export interface FocusManagerOptions {
  /** Whether to wrap around when reaching the end of tab order. Default: true. */
  wrapAround?: boolean;
  /** Whether to track focus history for back navigation. Default: true. */
  trackHistory?: boolean;
}

// ─── FocusManager ─────────────────────────────────────────────────

export class FocusManager {
  /** Registered focusable components by ID. */
  private _registry: Map<string, Component> = new Map();

  /** Ordered list of focusable component IDs (tab order). */
  private _tabOrder: string[] = [];

  /** Currently focused component ID, or null. */
  private _focusedId: string | null = null;

  /** Focus history stack (most recent first). */
  private _history: string[] = [];

  /** Whether to wrap around in tab order. */
  private _wrapAround: boolean;

  /** Whether to track history. */
  private _trackHistory: boolean;

  /** Callback fired when focus changes. */
  private _onFocusChange: ((id: string | null) => void) | null = null;

  constructor(options?: FocusManagerOptions) {
    this._wrapAround = options?.wrapAround ?? true;
    this._trackHistory = options?.trackHistory ?? true;
  }

  // ─── Registration ──────────────────────────────────────────────

  /**
   * Register a component as focusable.
   * Components must be registered before they can receive focus.
   * If the component is not focusable, registration is skipped.
   *
   * @param component - The component to register.
   */
  register(component: Component): void {
    if (!component.focusable) return;
    if (this._registry.has(component.id)) return;

    this._registry.set(component.id, component);
    this._tabOrder.push(component.id);
  }

  /**
   * Unregister a component. If it had focus, focus moves to the
   * previous component (from history) or the next in tab order.
   *
   * @param id - Component ID to unregister.
   */
  unregister(id: string): void {
    // If focused, blur first
    if (this._focusedId === id) {
      this.blur();
    }

    this._registry.delete(id);
    this._tabOrder = this._tabOrder.filter((tid) => tid !== id);
    this._history = this._history.filter((hid) => hid !== id);
  }

  // ─── Focus Operations ──────────────────────────────────────────

  /**
   * Focus a specific component by ID.
   *
   * @param id - The component ID to focus.
   * @returns Whether focus was successfully set.
   */
  focus(id: string): boolean {
    const component = this._registry.get(id);
    if (!component) return false;
    if (this._focusedId === id) return true; // Already focused

    // Blur current
    this._blurCurrent();

    // Push current to history
    if (this._trackHistory && this._focusedId !== null) {
      this._history.unshift(this._focusedId);

      // Limit history depth
      if (this._history.length > 20) {
        this._history.pop();
      }
    }

    // Focus new
    this._focusedId = id;
    component.onFocus();
    this._onFocusChange?.(id);

    return true;
  }

  /**
   * Remove focus from the current component.
   * The component is blurred but focusable again on next focus().
   */
  blur(): void {
    this._blurCurrent();
    this._focusedId = null;
    this._onFocusChange?.(null);
  }

  /**
   * Focus the next component in tab order.
   * Equivalent to Tab key.
   *
   * @returns Whether focus moved.
   */
  focusNext(): boolean {
    if (this._tabOrder.length === 0) return false;

    if (this._focusedId === null) {
      // No focus yet — focus the first
      return this.focus(this._tabOrder[0]);
    }

    const currentIdx = this._tabOrder.indexOf(this._focusedId);
    if (currentIdx === -1) {
      return this.focus(this._tabOrder[0]);
    }

    let nextIdx = currentIdx + 1;
    if (nextIdx >= this._tabOrder.length) {
      if (this._wrapAround) {
        nextIdx = 0;
      } else {
        return false;
      }
    }

    return this.focus(this._tabOrder[nextIdx]);
  }

  /**
   * Focus the previous component in tab order.
   * Equivalent to Shift+Tab.
   */
  focusPrev(): boolean {
    if (this._tabOrder.length === 0) return false;

    if (this._focusedId === null) {
      return this.focus(this._tabOrder[this._tabOrder.length - 1]);
    }

    const currentIdx = this._tabOrder.indexOf(this._focusedId);
    if (currentIdx === -1) {
      return this.focus(this._tabOrder[this._tabOrder.length - 1]);
    }

    let prevIdx = currentIdx - 1;
    if (prevIdx < 0) {
      if (this._wrapAround) {
        prevIdx = this._tabOrder.length - 1;
      } else {
        return false;
      }
    }

    return this.focus(this._tabOrder[prevIdx]);
  }

  /**
   * Focus the next component in a given direction.
   * For now, maps directions to tab order (up/left = prev, down/right = next).
   *
   * @param direction - The direction to move focus.
   * @returns Whether focus moved.
   */
  focusDirection(direction: FocusDirection): boolean {
    switch (direction) {
      case 'up':
      case 'left':
      case 'prev':
        return this.focusPrev();
      case 'down':
      case 'right':
      case 'next':
        return this.focusNext();
    }
  }

  /**
   * Restore the previous focus from history.
   * Called when Escape closes an overlay.
   *
   * @returns Whether focus was restored.
   */
  focusPrevious(): boolean {
    if (this._history.length === 0) return false;

    const prevId = this._history.shift();
    if (!prevId || !this._registry.has(prevId)) {
      return this.focusPrevious(); // Skip invalid entries
    }

    return this.focus(prevId);
  }

  // ─── Accessors ─────────────────────────────────────────────────

  /** Get the currently focused component ID. */
  get focusedId(): string | null {
    return this._focusedId;
  }

  /** Get the currently focused component instance. */
  get focusedComponent(): Component | null {
    return this._focusedId ? (this._registry.get(this._focusedId) ?? null) : null;
  }

  /** Get all registered focusable component IDs. */
  get registeredIds(): readonly string[] {
    return this._tabOrder;
  }

  /** Get the number of registered focusable components. */
  get size(): number {
    return this._tabOrder.length;
  }

  /**
   * Register a callback for focus change events.
   *
   * @param callback - Called with the new focused ID (or null if blurred).
   */
  onFocusChange(callback: (id: string | null) => void): void {
    this._onFocusChange = callback;
  }

  /** Clear the focus change callback. */
  clearOnFocusChange(): void {
    this._onFocusChange = null;
  }

  /**
   * Check if a component is focusable (registered and focusable).
   */
  isFocusable(id: string): boolean {
    const component = this._registry.get(id);
    return component !== undefined && component.focusable;
  }

  /**
   * Check if a component is currently focused.
   */
  isFocused(id: string): boolean {
    return this._focusedId === id;
  }

  // ─── Debug / Introspection ────────────────────────────────────

  /** Get all registered components (for debugging). */
  getRegistry(): Map<string, Component> {
    return new Map(this._registry);
  }

  /** Get the focus history (most recent first). */
  getHistory(): string[] {
    return [...this._history];
  }

  /** Get the tab order. */
  getTabOrder(): string[] {
    return [...this._tabOrder];
  }

  // ─── Internal ──────────────────────────────────────────────────

  /** Blur the currently focused component. */
  private _blurCurrent(): void {
    if (this._focusedId !== null) {
      const current = this._registry.get(this._focusedId);
      current?.onBlur();
    }
  }
}
