/**
 * ScreenManagerV2 — manages screen lifecycle with dynamic registration,
 * lazy loading, transitions, persistent state, and lifecycle hooks.
 *
 * # Lifecycle
 * - `onEnter()` — Called when the screen becomes active.
 * - `onLeave()` — Called when the user navigates away from the screen.
 * - `onPause()` — Called when another screen is pushed on top.
 * - `onResume()` — Called when returning from a paused state.
 * - `onDestroy()` — Called when the screen is removed permanently.
 *
 * # Architecture
 * ```
 * ScreenManagerV2
 *   ├── Registry (screen constructors/instances by ID)
 *   ├── Navigation Stack (history of screen IDs)
 *   ├── Lifecycle Management (enter/leave/pause/resume/destroy)
 *   └── Transition Scheduler (animated screen transitions)
 * ```
 *
 * # Dynamic Registration
 * Screens can be registered at any time. Lazy loading is supported:
 * screens are instantiated only when first navigated to.
 *
 * @example
 * ```ts
 * const sm = new ScreenManagerV2();
 * sm.register('dashboard', () => new DashboardScreen());
 * sm.register('help', lazyLoad(() => import('./screens/help.js')));
 * sm.navigate('dashboard');
 * ```
 */

import type { Component } from './component/component.js';
import type { RenderContext } from './renderer/renderer.js';
import type { Line } from './renderer/types.js';
import type { ThemeV2 } from './theme/theme.js';

// ─── Types ────────────────────────────────────────────────────────

/** Screen lifecycle hooks. */
export interface ScreenLifecycle {
  /** Called when the screen becomes active. */
  onEnter?(): void;
  /** Called when the user navigates away. */
  onLeave?(): void;
  /** Called when another screen is pushed on top. */
  onPause?(): void;
  /** Called when returning from a paused state. */
  onResume?(): void;
  /** Called when the screen is permanently removed. */
  onDestroy?(): void;
}

/** A screen instance with lifecycle and render capability. */
export interface ScreenV2 extends ScreenLifecycle {
  /** Unique screen identifier. */
  readonly id: string;
  /** Screen display title. */
  readonly title: string;
  /** Render the screen content. */
  render(ctx: RenderContext): Line[];
  /** Handle a keyboard shortcut. Returns true if handled. */
  handleShortcut?(binding: string): boolean;
}

/** Screen constructor (supports lazy loading). */
export type ScreenFactory = () => ScreenV2 | Promise<ScreenV2>;

// ─── ScreenManagerV2 ─────────────────────────────────────────────

export class ScreenManagerV2 {
  /** Registered screen factories/instances. */
  private _registry: Map<string, { factory: ScreenFactory; instance: ScreenV2 | null }> = new Map();

  /** Navigation history stack. */
  private _stack: string[] = [];

  /** Currently active screen ID. */
  private _activeId: string | null = null;

  /** Callback for screen changes. */
  private _onChange: ((id: string | null) => void) | null = null;

  // ── Registration ──────────────────────────────────────────────

  /**
   * Register a screen.
   *
   * @param id - Unique screen identifier.
   * @param factory - Screen factory function (supports lazy loading).
   */
  register(id: string, factory: ScreenFactory): void {
    this._registry.set(id, { factory, instance: null });
  }

  /**
   * Register a screen with a pre-created instance.
   */
  registerInstance(id: string, instance: ScreenV2): void {
    this._registry.set(id, { factory: () => instance, instance });
  }

  /**
   * Unregister a screen.
   */
  unregister(id: string): void {
    this._registry.delete(id);
  }

  /**
   * Check if a screen is registered.
   */
  has(id: string): boolean {
    return this._registry.has(id);
  }

  // ── Navigation ────────────────────────────────────────────────

  /**
   * Navigate to a screen. Pushes onto the history stack.
   *
   * @param id - Screen ID to navigate to.
   * @returns Whether navigation succeeded.
   */
  async navigate(id: string): Promise<boolean> {
    const entry = this._registry.get(id);
    if (!entry) return false;
    if (this._activeId === id) return true; // Already on this screen

    // Leave current screen
    if (this._activeId) {
      const currentEntry = this._registry.get(this._activeId);
      currentEntry?.instance?.onLeave?.();
      currentEntry?.instance?.onPause?.();
    }

    // Ensure screen is instantiated
    if (!entry.instance) {
      const instance = await entry.factory();
      entry.instance = instance;
    }

    // Push to history
    if (this._activeId) {
      this._stack.push(this._activeId);
    }
    this._activeId = id;

    // Enter new screen
    entry.instance.onEnter?.();

    this._onChange?.(id);
    return true;
  }

  /**
   * Go back to the previous screen.
   *
   * @returns The previous screen ID, or null if there's no history.
   */
  goBack(): string | null {
    if (this._stack.length === 0) return null;

    const prevId = this._stack.pop()!;

    // Leave current screen
    if (this._activeId) {
      const currentEntry = this._registry.get(this._activeId);
      currentEntry?.instance?.onLeave?.();
    }

    this._activeId = prevId;

    // Resume previous screen
    const prevEntry = this._registry.get(prevId);
    prevEntry?.instance?.onResume?.();
    prevEntry?.instance?.onEnter?.();

    this._onChange?.(prevId);
    return prevId;
  }

  /**
   * Replace the current screen without history effect.
   */
  async replace(id: string): Promise<boolean> {
    const entry = this._registry.get(id);
    if (!entry) return false;

    // Leave current screen
    if (this._activeId) {
      const currentEntry = this._registry.get(this._activeId);
      currentEntry?.instance?.onLeave?.();
      currentEntry?.instance?.onDestroy?.();
    }

    // Ensure screen is instantiated
    if (!entry.instance) {
      const instance = await entry.factory();
      entry.instance = instance;
    }

    this._activeId = id;
    entry.instance.onEnter?.();
    this._onChange?.(id);
    return true;
  }

  /**
   * Navigate to a screen without affecting history.
   */
  async reset(id: string): Promise<boolean> {
    // Destroy all instances
    for (const [, entry] of this._registry) {
      entry.instance?.onDestroy?.();
    }
    this._stack = [];
    this._activeId = null;

    return this.navigate(id);
  }

  // ── Callbacks ─────────────────────────────────────────────────

  /**
   * Register a callback for screen changes.
   */
  onChange(callback: (id: string | null) => void): void {
    this._onChange = callback;
  }

  // ── Accessors ─────────────────────────────────────────────────

  /** Get the currently active screen ID. */
  get activeScreenId(): string | null {
    return this._activeId;
  }

  /** Get the currently active screen instance. */
  get activeScreen(): ScreenV2 | null {
    if (!this._activeId) return null;
    const entry = this._registry.get(this._activeId);
    return entry?.instance ?? null;
  }

  /** Get the navigation stack depth. */
  get depth(): number {
    return this._stack.length;
  }

  /** Get a copy of the navigation stack. */
  get stack(): string[] {
    return [...this._stack];
  }

  /** Get all registered screen IDs. */
  get registeredScreens(): string[] {
    return [...this._registry.keys()];
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  /**
   * Destroy all screens and clear the manager.
   */
  destroy(): void {
    for (const [, entry] of this._registry) {
      try {
        entry.instance?.onDestroy?.();
      } catch {
        // Swallow destroy errors
      }
    }
    this._registry.clear();
    this._stack = [];
    this._activeId = null;
    this._onChange = null;
  }
}
