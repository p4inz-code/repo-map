/**
 * Component — abstract base class for the v2 UI engine.
 *
 * Every visual element in the v2 framework extends this class.
 * Components follow a strict lifecycle:
 *
 * # Lifecycle (ordered)
 * 1. `measure(constraints)` — Compute natural size given constraints.
 * 2. `layout(x, y, width, height)` — Position children after measure.
 * 3. `render(ctx)` — Produce styled Lines for the renderer.
 * 4. `update(props)` — Receive new props, mark dirty if changed.
 * 5. `resize(width, height)` — Respond to size changes.
 * 6. `destroy()` — Clean up resources.
 *
 * # Focus lifecycle
 * - `onFocus()` — Called when component gains keyboard focus.
 * - `onBlur()` — Called when component loses keyboard focus.
 *
 * # Dirty-State Rendering
 * - Call `markDirty()` when internal state changes.
 * - The render loop checks `isDirty` before calling `render()`.
 * - Children can be marked dirty independently of parents.
 *
 * # Architecture Rules
 * - Components produce `Line[]` (styled content).
 * - Components do NOT write to the terminal directly.
 * - Components do NOT know about the InputManager or Store.
 * - Components are composable: a Panel contains Sections, etc.
 *
 * @typeparam P — Props type for this component.
 */

import type { Line } from '../renderer/types.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { LayoutConstraints } from '../types.js';

// ─── Component ───────────────────────────────────────────────────

export abstract class Component<P = Record<string, unknown>> {
  /** Globally unique identifier. */
  readonly id: string;

  /** Human-readable name for debugging. */
  readonly name: string;

  /** Whether this component accepts keyboard focus. */
  readonly focusable: boolean;

  // ── Internal state ──────────────────────────────────────────────

  /** Current props. */
  protected _props: P;

  /** Whether this component needs re-rendering. */
  private _dirty: boolean = true;

  /** Whether this component's layout needs recomputation. */
  private _layoutDirty: boolean = true;

  /** Whether this component has been destroyed. */
  private _destroyed: boolean = false;

  /** Resolved layout box (set by layout()). */
  private _box: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 };

  /** Cached render output (invalidated on markDirty). */
  private _cachedLines: Line[] | null = null;

  /** Parent component (set during addChild via setParent). */
  private _parent: Component | null = null;

  /** Child components. */
  private _children: Component[] = [];

  /** Focus-related state. */
  private _hasFocus: boolean = false;

  /** Optional callback fired when markDirty() is called. */
  private _dirtyCallback: ((id: string) => void) | null = null;

  /**
   * @param id - Unique identifier.
   * @param name - Human-readable name (for debugging).
   * @param options - Optional configuration.
   */
  constructor(
    id: string,
    name: string,
    options?: {
      focusable?: boolean;
      initialProps?: P;
    },
  ) {
    this.id = id;
    this.name = name;
    this.focusable = options?.focusable ?? false;
    this._props = (options?.initialProps ?? {}) as P;
  }

  // ─── Lifecycle API ──────────────────────────────────────────────

  /**
   * Compute the component's natural size given layout constraints.
   *
   * Called during the layout phase BEFORE layout(). The component
   * should measure its content and set its desired size.
   *
   * Override to provide custom measurement logic.
   *
   * @param constraints - Available space constraints from parent.
   */
  abstract measure(constraints: LayoutConstraints): void;

  /**
   * Position this component and its children.
   *
   * Called after measure(). Sets the final resolved position and size.
   *
   * Override to arrange children.
   *
   * @param x - Absolute x position.
   * @param y - Absolute y position.
   * @param width - Allocated width.
   * @param height - Allocated height.
   */
  layout(x: number, y: number, width: number, height: number): void {
    this._box = { x, y, width, height };
    this._layoutDirty = false;

    // Re-layout children
    let childY = y;
    for (const child of this._children) {
      const childHeight = child.getHeight();
      child.layout(x, childY, width, childHeight);
      childY += childHeight;
    }
  }

  /**
   * Render this component to styled Lines.
   *
   * Called by the render loop when dirty. Returns cached output if clean.
   *
   * @param ctx - Render context with theme reference.
   * @returns Styled lines.
   */
  render(ctx: RenderContext): Line[] {
    if (this._destroyed) return [];
    if (!this._dirty && this._cachedLines !== null) {
      return this._cachedLines;
    }
    const lines = this.renderContent(ctx);
    this._cachedLines = lines;
    this._dirty = false;
    return lines;
  }

  /**
   * Produce the component's content as styled Lines.
   *
   * Override this instead of render(). Called only when dirty.
   *
   * @param ctx - Render context.
   * @returns Styled lines.
   */
  protected abstract renderContent(ctx: RenderContext): Line[];

  /**
   * Receive new props. Override to detect meaningful changes.
   *
   * Default implementation replaces _props and marks dirty.
   *
   * @param nextProps - New props to merge.
   */
  update(nextProps: Partial<P>): void {
    const changed = this._hasPropsChanged(nextProps);
    this._props = { ...this._props, ...nextProps };
    if (changed) {
      this.markDirty();
    }
  }

  /**
   * Respond to a size change (e.g., terminal resize).
   *
   * Default implementation re-layouts and marks dirty.
   *
   * @param width - New width.
   * @param height - New height.
   */
  resize(width: number, height: number): void {
    this._box.width = width;
    this._box.height = height;
    this._layoutDirty = true;
    this.markDirty();
  }

  /**
   * Clean up resources. After destroy(), the component must not be used.
   */
  destroy(): void {
    this._destroyed = true;
    this._cachedLines = null;
    this._dirtyCallback = null;
    this._parent = null;
    for (const child of this._children) {
      child.destroy();
    }
    this._children = [];
  }

  // ─── Focus Lifecycle ────────────────────────────────────────────

  /**
   * Called when this component gains keyboard focus.
   * Override to update visual state (e.g., show focus ring).
   */
  onFocus(): void {
    this._hasFocus = true;
    this.markDirty();
  }

  /**
   * Called when this component loses keyboard focus.
   * Override to update visual state.
   */
  onBlur(): void {
    this._hasFocus = false;
    this.markDirty();
  }

  /** Whether this component currently has focus. */
  get hasFocus(): boolean {
    return this._hasFocus;
  }

  // ─── Parent/Child API ───────────────────────────────────────────

  /**
   * Add a child component.
   */
  addChild(child: Component): void {
    child.setParent(this);
    this._children.push(child);
    this.markDirty();
  }

  /**
   * Remove a child component.
   */
  removeChild(child: Component): void {
    const idx = this._children.indexOf(child);
    if (idx !== -1) {
      this._children.splice(idx, 1);
      child.setParent(null);
      this.markDirty();
    }
  }

  /**
   * Set the parent component (called internally by addChild).
   * Public to allow framework-level access but not intended for direct use.
   */
  setParent(parent: unknown): void {
    this._parent = parent as Component | null;
  }

  /** Get all children. */
  get children(): readonly Component[] {
    return this._children;
  }

  /** Get the parent component, or null if this is the root. */
  get parent(): Component | null {
    return this._parent;
  }

  // ─── Dirty State ────────────────────────────────────────────────

  /**
   * Mark this component as needing re-render.
   * Propagates up to parent so the render loop knows something changed.
   */
  markDirty(): void {
    if (this._destroyed) return;
    this._dirty = true;
    this._cachedLines = null;
    this._dirtyCallback?.(this.id);
    // Propagate upward so the layout container knows children changed
    this._parent?._onChildDirty(this.id);
  }

  /**
   * Called by a child when it marks itself dirty.
   * Override to propagate dirty state to layout containers.
   */
  protected _onChildDirty(_childId: string): void {
    // By default, mark self dirty so parent re-renders
    if (!this._dirty) {
      this._dirty = true;
      this._dirtyCallback?.(this.id);
    }
  }

  /** Whether this component needs re-rendering. */
  get isDirty(): boolean {
    return this._dirty;
  }

  /** Whether layout needs recomputation. */
  get isLayoutDirty(): boolean {
    return this._layoutDirty;
  }

  // ─── Layout accessors ──────────────────────────────────────────

  /** Get this component's resolved layout box. */
  get box(): { x: number; y: number; width: number; height: number } {
    return this._box;
  }

  /** Get the computed height. */
  getHeight(): number {
    return this._box.height;
  }

  /** Get the computed width. */
  getWidth(): number {
    return this._box.width;
  }

  // ─── Cache ───────────────────────────────────────────────────────

  /**
   * Register a callback that fires when this component marks itself dirty.
   */
  setDirtyCallback(callback: ((id: string) => void) | null): void {
    this._dirtyCallback = callback;
  }

  /**
   * Get cached rendered lines without triggering a render.
   * Returns null if never rendered or dirty.
   */
  getCachedLines(): Line[] | null {
    return this._cachedLines;
  }

  /** Whether the component has been destroyed. */
  get isDestroyed(): boolean {
    return this._destroyed;
  }

  // ─── Internal helpers ──────────────────────────────────────────

  /**
   * Detect whether props actually changed (shallow comparison).
   */
  private _hasPropsChanged(next: Partial<P>): boolean {
    for (const key of Object.keys(next) as (keyof P)[]) {
      if (this._props[key] !== next[key]) return true;
    }
    return false;
  }
}
