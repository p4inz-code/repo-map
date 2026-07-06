/**
 * Observable State Store for the repo-map TUI framework.
 *
 * A minimal, type-safe observable store that notifies subscribers
 * on every state change. Modeled after React's useState pattern
 * but for the terminal.
 *
 * # Usage
 * ```ts
 * const store = new Store(createInitialUIState());
 * const unsub = store.subscribe(() => render(store.getState()));
 * store.setState({ appMode: 'scanning' });
 * unsub();
 * ```
 *
 * # Architecture Rules
 * - State is read-only externally (must use getState()).
 * - State is updated via setState() with partial state objects.
 * - Subscribers are notified synchronously on every setState().
 * - Subscription returns an unsubscribe function.
 * - No magic proxies, no getters — plain objects only.
 */

import type { UIState } from './types.js';

// ─── Listener type ─────────────────────────────────────────────

type Listener = () => void;

// ─── Store ─────────────────────────────────────────────────────

export class Store {
  private _state: UIState;
  private _listeners: Set<Listener> = new Set();
  private _isDispatching: boolean = false;
  private _pendingListeners: Array<{ type: 'add' | 'remove'; listener: Listener }> = [];

  /**
   * @param initialState - The initial UI state.
   */
  constructor(initialState: UIState) {
    this._state = { ...initialState };
  }

  // ── Read ─────────────────────────────────────────────────────

  /**
   * Get the current state (read-only snapshot).
   */
  getState(): Readonly<UIState> {
    return this._state;
  }

  // ── Write ────────────────────────────────────────────────────

  /**
   * Update state with a partial object. Only the provided keys
   * are merged into the existing state.
   *
   * Subscribers are notified synchronously. If called while already
   * dispatching (nested setState), the update is batched and
   * subscribers are notified once after the outer dispatch completes.
   *
   * @param partial - Partial state to merge.
   */
  setState(partial: Partial<UIState>): void {
    if (this._isDispatching) {
      // Batch nested updates
      this._state = { ...this._state, ...partial };
      return;
    }

    this._isDispatching = true;
    this._state = { ...this._state, ...partial };

    try {
      this._notify();
    } finally {
      this._isDispatching = false;
      this._flushPendingListeners();
    }
  }

  // ── Subscribe ────────────────────────────────────────────────

  /**
   * Subscribe to state changes.
   *
   * @param listener - Called synchronously after every setState().
   * @returns An unsubscribe function.
   */
  subscribe(listener: Listener): () => void {
    if (this._isDispatching) {
      // Defer listener registration during dispatch
      this._pendingListeners.push({ type: 'add', listener });
    } else {
      this._listeners.add(listener);
    }

    return () => {
      if (this._isDispatching) {
        this._pendingListeners.push({ type: 'remove', listener });
      } else {
        this._listeners.delete(listener);
      }
    };
  }

  /**
   * Remove all subscribers.
   */
  clearListeners(): void {
    this._listeners.clear();
  }

  // ── Internal ─────────────────────────────────────────────────

  /**
   * Notify all subscribers of a state change.
   */
  private _notify(): void {
    for (const listener of this._listeners) {
      try {
        listener();
      } catch {
        // Swallow listener errors — a misbehaving subscriber
        // should not break the entire notification chain.
      }
    }
  }

  /**
   * Process any listeners that were added/removed during dispatch.
   */
  private _flushPendingListeners(): void {
    while (this._pendingListeners.length > 0) {
      const entry = this._pendingListeners.shift()!;
      if (entry.type === 'add') {
        this._listeners.add(entry.listener);
      } else {
        this._listeners.delete(entry.listener);
      }
    }
  }
}
