/**
 * InputManagerV2 — centralized keyboard routing with focus stack,
 * context shortcuts, and global shortcut registry.
 *
 * # Architecture
 * ```
 * InputManagerV2
 *   ├── Global Shortcut Registry (always-active shortcuts)
 *   ├── Contextual Shortcuts (per-screen/per-component)
 *   ├── Focus Stack (which component receives key events)
 *   ├── Raw Input Handler (stdin in raw mode)
 *   └── Key Action Mapper (bytes → semantic actions)
 * ```
 *
 * # Routing Priority
 * 1. Global shortcuts (always active, e.g., Ctrl+C, Ctrl+P)
 * 2. Modal/overlay shortcuts (when modal is open)
 * 3. Focused component shortcuts
 * 4. Active screen shortcuts
 * 5. Default handling (navigation, quit, etc.)
 *
 * # Focus Stack
 * - Stack-based: push/pop for overlays and modals
 * - Events go to the top of the stack first
 * - When overlay closes, focus returns to previous component
 * - Exactly ONE component processes keyboard events
 *
 * # Usage
 * ```ts
 * const input = new InputManagerV2();
 * input.registerGlobal('ctrl-p', () => togglePalette());
 * input.registerContext('sidebar', { 'up': navigateUp, 'down': navigateDown });
 * input.pushFocus('sidebar');
 * input.start();
 * ```
 */

import { InputManager } from '../input/index.js';
import type { KeyEvent as V1KeyEvent } from '../input/types.js';

// ─── Types ────────────────────────────────────────────────────────

export type KeyBinding = string; // e.g., 'up', 'ctrl-p', 'escape', '/'

export interface ShortcutHandler {
  binding: KeyBinding;
  handler: () => void;
  description: string;
}

// ─── InputManagerV2 ───────────────────────────────────────────────

export class InputManagerV2 {
  /** Global shortcut registry (always active). */
  private _globalShortcuts: Map<KeyBinding, ShortcutHandler> = new Map();

  /** Contextual shortcuts keyed by context name. */
  private _contextShortcuts: Map<string, Map<KeyBinding, ShortcutHandler>> = new Map();

  /** Focus stack (most recent = top). */
  private _focusStack: string[] = [];

  /** Current context name for contextual shortcuts. */
  private _currentContext: string | null = null;

  /** Whether a modal is currently open. */
  private _modalOpen: boolean = false;

  /** Whether the manager is started. */
  private _started: boolean = false;

  /** Underlying v1 InputManager for raw stdin handling. */
  private _v1Input: InputManager;

  /** Callback fired when raw mode should be toggled. */
  private _onRawModeChange: ((raw: boolean) => void) | null = null;

  constructor() {
    this._v1Input = new InputManager();
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  /**
   * Start listening for keyboard input.
   * Wraps the v1 InputManager's raw mode.
   */
  start(): void {
    if (this._started) return;

    this._v1Input.onKey((event: V1KeyEvent) => this._dispatch(event));
    this._v1Input.start();
    this._started = true;
  }

  /**
   * Stop listening for keyboard input.
   */
  stop(): void {
    if (!this._started) return;
    this._v1Input.stop();
    this._started = false;
  }

  /**
   * Full cleanup.
   */
  destroy(): void {
    this.stop();
    this._globalShortcuts.clear();
    this._contextShortcuts.clear();
    this._focusStack = [];
    this._currentContext = null;
  }

  // ── Shortcut Registration ──────────────────────────────────────

  /**
   * Register a global shortcut (always active).
   */
  registerGlobal(binding: KeyBinding, handler: () => void, description?: string): () => void {
    const entry: ShortcutHandler = { binding, handler, description: description ?? binding };
    this._globalShortcuts.set(binding, entry);
    return () => this._globalShortcuts.delete(binding);
  }

  /**
   * Register a contextual shortcut for a specific context.
   */
  registerContext(context: string, binding: KeyBinding, handler: () => void, description?: string): () => void {
    if (!this._contextShortcuts.has(context)) {
      this._contextShortcuts.set(context, new Map());
    }
    const ctxMap = this._contextShortcuts.get(context)!;
    const entry: ShortcutHandler = { binding, handler, description: description ?? binding };
    ctxMap.set(binding, entry);
    return () => ctxMap.delete(binding);
  }

  /**
   * Register multiple contextual shortcuts at once.
   */
  registerContextMap(context: string, bindings: Record<KeyBinding, () => void>): () => void {
    const unsubs: (() => void)[] = [];
    for (const [binding, handler] of Object.entries(bindings)) {
      unsubs.push(this.registerContext(context, binding, handler));
    }
    return () => unsubs.forEach((u) => u());
  }

  // ── Focus Stack ────────────────────────────────────────────────

  /**
   * Push a component/context onto the focus stack.
   * The new component receives keyboard events first.
   */
  pushFocus(contextId: string): void {
    this._focusStack.push(contextId);
    this._currentContext = contextId;
  }

  /**
   * Pop the top component from the focus stack.
   * Focus returns to the previous component.
   */
  popFocus(): string | undefined {
    const popped = this._focusStack.pop();
    this._currentContext = this._focusStack.length > 0
      ? this._focusStack[this._focusStack.length - 1]
      : null;
    return popped;
  }

  /**
   * Get the currently focused context.
   */
  get focusedContext(): string | null {
    return this._currentContext;
  }

  /**
   * Get the focus stack depth.
   */
  get focusDepth(): number {
    return this._focusStack.length;
  }

  // ── Modal State ────────────────────────────────────────────────

  /**
   * Mark that a modal is open. While open, global shortcuts
   * continue to work but contextual shortcuts are suspended.
   */
  setModalOpen(open: boolean): void {
    this._modalOpen = open;
  }

  /**
   * Whether a modal is currently open.
   */
  get isModalOpen(): boolean {
    return this._modalOpen;
  }

  // ── Callbacks ──────────────────────────────────────────────────

  /**
   * Register a callback for raw mode changes.
   */
  onRawModeChange(callback: (raw: boolean) => void): void {
    this._onRawModeChange = callback;
  }

  // ── Internal ───────────────────────────────────────────────────

  /**
   * Dispatch a key event through the routing hierarchy.
   */
  private _dispatch(event: V1KeyEvent): void {
    // 1. Handle Ctrl+C specially
    if (event.key.type === 'ctrl' && event.key.value === 'c') {
      process.kill(process.pid, 'SIGINT');
      return;
    }

    // 2. Determine the key binding string
    const binding = this._eventToBinding(event);
    if (!binding) return;

    // 3. Global shortcuts (always active)
    if (this._globalShortcuts.has(binding)) {
      this._globalShortcuts.get(binding)!.handler();
      return;
    }

    // 4. Check modal state — if modal is open, only allow modal-specific actions
    if (this._modalOpen) {
      if (binding === 'escape' || binding === 'enter') {
        // Let these through for modal handling
        this._routeToFocusedContext(binding);
      }
      return;
    }

    // 5. Route to the focused component/context
    this._routeToFocusedContext(binding);
  }

  /**
   * Route a key binding to the focused context.
   */
  private _routeToFocusedContext(binding: KeyBinding): void {
    if (!this._currentContext) return;

    const contextShortcuts = this._contextShortcuts.get(this._currentContext);
    if (contextShortcuts && contextShortcuts.has(binding)) {
      contextShortcuts.get(binding)!.handler();
      return;
    }

    // Check all contexts in the stack (fallback)
    for (let i = this._focusStack.length - 1; i >= 0; i--) {
      const ctx = this._focusStack[i];
      const ctxMap = this._contextShortcuts.get(ctx);
      if (ctxMap && ctxMap.has(binding)) {
        ctxMap.get(binding)!.handler();
        return;
      }
    }
  }

  /**
   * Convert a KeyEvent to a binding string.
   */
  private _eventToBinding(event: V1KeyEvent): KeyBinding | null {
    switch (event.key.type) {
      case 'up': return 'up';
      case 'down': return 'down';
      case 'left': return 'left';
      case 'right': return 'right';
      case 'enter': return 'enter';
      case 'escape': return 'escape';
      case 'tab': return 'tab';
      case 'shiftTab': return 'shift-tab';
      case 'slash': return '/';
      case 'question': return '?';
      case 'space': return 'space';
      case 'home': return 'home';
      case 'end': return 'end';
      case 'pageUp': return 'page-up';
      case 'pageDown': return 'page-down';
      case 'backspace': return 'backspace';
      case 'delete': return 'delete';
      case 'ctrlHome': return 'ctrl-home';
      case 'ctrlEnd': return 'ctrl-end';
      case 'char': return event.key.value;
      case 'ctrl': return `ctrl-${event.key.value}`;
      default: return null;
    }
  }
}
