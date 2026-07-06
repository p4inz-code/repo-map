/**
 * FocusState — a focus ring manager for keyboard navigation.
 *
 * Tracks which component currently has focus and manages the
 * ordered list of focusable components. Supports Tab/Shift+Tab
 * cycling and programmatic focus control.
 *
 * # Usage
 * ```ts
 * const focus = new FocusState();
 * focus.register('panel-1');
 * focus.register('list-1');
 * focus.register('button-1');
 * focus.focus('list-1');
 *
 * focus.focusNext(); // focus moves to 'button-1'
 * focus.focusPrev(); // focus moves to 'panel-1'
 * ```
 *
 * # Architecture
 * - Pure state manager — no rendering.
 * - Focus IDs are arbitrary strings set by components.
 * - Components check getFocusedId() to render focus indication.
 */

// ─── FocusState ────────────────────────────────────────────────

export class FocusState {
  private _focusableIds: string[] = [];
  private _focusedId: string | null = null;
  private _focusIndex: number = -1;

  // ── Registration ─────────────────────────────────────────────

  /**
   * Register a focusable component ID. Order determines Tab order.
   */
  register(id: string): void {
    if (!this._focusableIds.includes(id)) {
      this._focusableIds.push(id);
      if (this._focusedId === null) {
        this._focusedId = id;
        this._focusIndex = 0;
      }
    }
  }

  /**
   * Unregister a focusable component ID.
   */
  unregister(id: string): void {
    const idx = this._focusableIds.indexOf(id);
    if (idx !== -1) {
      this._focusableIds.splice(idx, 1);

      if (this._focusedId === id) {
        // Focus the next available, or previous, or clear
        if (this._focusableIds.length > 0) {
          const newIdx = Math.min(idx, this._focusableIds.length - 1);
          this._focusedId = this._focusableIds[newIdx];
          this._focusIndex = newIdx;
        } else {
          this._focusedId = null;
          this._focusIndex = -1;
        }
      } else if (this._focusIndex > idx) {
        this._focusIndex--;
      }
    }
  }

  /**
   * Clear all registered focusable IDs.
   */
  clear(): void {
    this._focusableIds = [];
    this._focusedId = null;
    this._focusIndex = -1;
  }

  // ── Focus Control ────────────────────────────────────────────

  /**
   * Focus a specific component by ID.
   */
  focus(id: string): void {
    const idx = this._focusableIds.indexOf(id);
    if (idx !== -1) {
      this._focusedId = id;
      this._focusIndex = idx;
    }
  }

  /**
   * Focus the next component in the Tab order.
   * Wraps around to the first component after the last.
   */
  focusNext(): void {
    if (this._focusableIds.length === 0) {
      this._focusedId = null;
      this._focusIndex = -1;
      return;
    }

    if (this._focusedId === null) {
      this._focusedId = this._focusableIds[0];
      this._focusIndex = 0;
      return;
    }

    this._focusIndex = (this._focusIndex + 1) % this._focusableIds.length;
    this._focusedId = this._focusableIds[this._focusIndex];
  }

  /**
   * Focus the previous component in the Tab order.
   * Wraps around to the last component after the first.
   */
  focusPrev(): void {
    if (this._focusableIds.length === 0) {
      this._focusedId = null;
      this._focusIndex = -1;
      return;
    }

    if (this._focusedId === null) {
      this._focusedId = this._focusableIds[this._focusableIds.length - 1];
      this._focusIndex = this._focusableIds.length - 1;
      return;
    }

    this._focusIndex = (this._focusIndex - 1 + this._focusableIds.length) % this._focusableIds.length;
    this._focusedId = this._focusableIds[this._focusIndex];
  }

  /**
   * Remove focus from all components.
   */
  blur(): void {
    this._focusedId = null;
    this._focusIndex = -1;
  }

  // ── Accessors ────────────────────────────────────────────────

  /**
   * Get the ID of the currently focused component.
   */
  get focusedId(): string | null {
    return this._focusedId;
  }

  /**
   * Get the index of the currently focused component.
   */
  get focusIndex(): number {
    return this._focusIndex;
  }

  /**
   * Get the ordered list of focusable component IDs.
   */
  get focusableIds(): string[] {
    return [...this._focusableIds];
  }

  /**
   * Check if a specific component has focus.
   */
  isFocused(id: string): boolean {
    return this._focusedId === id;
  }

  /**
   * Get the number of registered focusable components.
   */
  get count(): number {
    return this._focusableIds.length;
  }
}
