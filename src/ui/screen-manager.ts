/**
 * ScreenManager — manages screen lifecycle and navigation with
 * full back-stack support.
 *
 * Handles screen transitions, maintains a navigation stack for
 * back/forward, and routes input events to the active screen.
 *
 * # Navigation
 * - push(): Navigate to a screen, saving the current on the stack.
 * - pop(): Go back to the previous screen (Esc key).
 * - replace(): Swap current screen without history effect.
 * - reset(): Clear all history and start fresh.
 *
 * # Esc Key Handling
 * - Esc routes to the active screen first.
 * - If the screen returns `handled: false` (or doesn't implement
 *   handleAction), the ScreenManager attempts to pop the stack.
 * - If the stack has only one screen, Esc is ignored (concession
 *   to the application for handling).
 *
 * # Architecture
 * - Screen interface defines lifecycle hooks.
 * - Action routing goes: global handler → active screen handler.
 * - The handler can consume or pass through actions.
 */

import type { KeyAction, ActionHandler } from './input/index.js';
import type { ScreenId } from './state/index.js';

// ─── Screen interface ──────────────────────────────────────────

/**
 * Result of a screen handling an action.
 * - `handled: true` — the action was consumed, stop propagation.
 * - `handled: false` — the action was not consumed, continue routing.
 */
export interface ActionResult {
  handled: boolean;
}

/**
 * Interface that every screen must implement.
 *
 * Screens define:
 * - Their ID (matches ScreenId)
 * - How they handle key actions
 * - Lifecycle hooks for mount/unmount
 */
export interface Screen {
  /** Unique identifier for this screen. */
  readonly id: ScreenId;

  /** Called when the screen becomes active. */
  onMount(): void;

  /** Called when the screen is no longer active. */
  onUnmount(): void;

  /** Handle a semantic key action. Returns whether the action was handled. */
  handleAction(action: KeyAction): boolean;
}

// ─── ScreenManager ─────────────────────────────────────────────

export class ScreenManager {
  private _screenStack: ScreenId[] = [];
  private _screens: Map<ScreenId, Screen> = new Map();
  private _actionHandler: ActionHandler | null = null;
  private _escHandler: (() => void) | null = null;

  // ── Registration ─────────────────────────────────────────────

  /**
   * Register a screen with the manager.
   * Screens must be registered before they can be navigated to.
   */
  register(screen: Screen): void {
    this._screens.set(screen.id, screen);
  }

  /**
   * Unregister a screen.
   */
  unregister(id: ScreenId): void {
    this._screens.delete(id);
  }

  /**
   * Check if a screen is registered.
   */
  has(id: ScreenId): boolean {
    return this._screens.has(id);
  }

  // ── Navigation ───────────────────────────────────────────────

  /**
   * Navigate to a screen, pushing the current one onto the stack.
   * Returns the new screen ID, or null if navigation failed.
   */
  push(id: ScreenId): ScreenId | null {
    const screen = this._screens.get(id);
    if (!screen) return null;

    // Don't push if already on this screen
    const currentId = this.currentScreenId;
    if (currentId === id) return id;

    // Unmount current screen
    if (currentId !== null) {
      const current = this._screens.get(currentId);
      current?.onUnmount();
    }

    // Push onto stack and mount
    this._screenStack.push(id);
    screen.onMount();

    return id;
  }

  /**
   * Go back to the previous screen.
   * Returns the previous screen ID, or null if there's no previous screen.
   * Has no effect if the stack has only one screen.
   */
  pop(): ScreenId | null {
    if (this._screenStack.length <= 1) return null;

    // Unmount current
    const currentId = this._screenStack.pop()!;
    const current = this._screens.get(currentId);
    current?.onUnmount();

    // Mount previous
    const prevId = this._screenStack[this._screenStack.length - 1];
    const prev = this._screens.get(prevId);
    prev?.onMount();

    return prevId;
  }

  /**
   * Replace the current screen without affecting history.
   * Returns the new screen ID, or null if replacement failed.
   */
  replace(id: ScreenId): ScreenId | null {
    const screen = this._screens.get(id);
    if (!screen) return null;

    // Unmount current
    const currentId = this._screenStack.pop();
    if (currentId !== undefined) {
      const current = this._screens.get(currentId);
      current?.onUnmount();
    }

    // Push new screen
    this._screenStack.push(id);
    screen.onMount();

    return id;
  }

  /**
   * Navigate to a screen, clearing the entire stack.
   * Returns the new screen ID, or null if navigation failed.
   */
  reset(id: ScreenId): ScreenId | null {
    // Unmount all
    for (const sid of this._screenStack) {
      const s = this._screens.get(sid);
      s?.onUnmount();
    }

    this._screenStack = [];
    const screen = this._screens.get(id);
    if (screen) {
      this._screenStack.push(id);
      screen.onMount();
      return id;
    }

    return null;
  }

  /**
   * Set a custom Esc handler.
   * Called when Esc is pressed and no screen handled it.
   * Default behavior is to pop the stack.
   */
  setEscHandler(handler: (() => void) | null): void {
    this._escHandler = handler;
  }

  // ── Accessors ────────────────────────────────────────────────

  /**
   * Get the ID of the currently active screen.
   */
  get currentScreenId(): ScreenId | null {
    return this._screenStack.length > 0
      ? this._screenStack[this._screenStack.length - 1]
      : null;
  }

  /**
   * Get the active screen instance.
   */
  get currentScreen(): Screen | null {
    const id = this.currentScreenId;
    return id ? (this._screens.get(id) ?? null) : null;
  }

  /**
   * Get the screen stack depth.
   */
  get depth(): number {
    return this._screenStack.length;
  }

  /**
   * Get a copy of the screen stack.
   */
  get stack(): ScreenId[] {
    return [...this._screenStack];
  }

  /**
   * Get the screen at the given index from the bottom of the stack.
   */
  getScreenAt(index: number): ScreenId | null {
    if (index >= 0 && index < this._screenStack.length) {
      return this._screenStack[index];
    }
    return null;
  }

  // ── Input Routing ────────────────────────────────────────────

  /**
   * Set the global action handler.
   * This handler receives ALL actions first, before screen handling.
   */
  setActionHandler(handler: ActionHandler): void {
    this._actionHandler = handler;
  }

  /**
   * Route a key action to the current screen.
   *
   * The action is first sent to the global handler (if set),
   * then to the current screen's handleAction method.
   *
   * If Esc is pressed and no screen handled it, attempts to pop
   * the navigation stack or fires the custom Esc handler.
   */
  routeAction(action: KeyAction): void {
    // Global handler fires first
    if (this._actionHandler) {
      this._actionHandler(action);
    }

    // Screen handler
    let handled = false;
    const screen = this.currentScreen;
    if (screen) {
      try {
        handled = screen.handleAction(action);
      } catch {
        // Screen handler error — continue with fallback behavior
      }
    }

    // Handle Esc fallback: if the action was Escape and nothing handled it
    if (!handled && action.type === 'cancel') {
      this._handleEscFallback();
    }
  }

  /**
   * Handle the Esc key when no screen consumed it.
   */
  private _handleEscFallback(): void {
    if (this._escHandler) {
      this._escHandler();
    } else if (this._screenStack.length > 1) {
      this.pop();
    }
    // If stack has 1 screen and no custom handler, Esc is consumed silently
  }

  // ── Lifecycle ────────────────────────────────────────────────

  /**
   * Initialize the screen manager.
   * Call this once before any navigation.
   */
  initialize(): void {
    this._screenStack = [];
  }

  /**
   * Destroy the screen manager. Unmounts all screens.
   */
  destroy(): void {
    // Unmount all screens
    for (const id of this._screenStack) {
      const screen = this._screens.get(id);
      try {
        screen?.onUnmount();
      } catch {
        // Swallow unmount errors
      }
    }

    this._screenStack = [];
    this._screens.clear();
    this._actionHandler = null;
    this._escHandler = null;
  }
}
