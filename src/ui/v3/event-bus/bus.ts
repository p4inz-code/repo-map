/**
 * EventBus — the strongly typed event system for the V3 Runtime.
 *
 * Removes direct component coupling by providing a publish/subscribe
 * event bus where components emit events that other components can
 * subscribe to without knowing about each other.
 *
 * # Architecture
 * ```
 * Component A → EventBus.emit('screen-changed', payload) → Component B (subscribed)
 *                                                         → Component C (subscribed)
 *                                                         → Component D (subscribed)
 * ```
 *
 * # Design
 * - Strongly typed: TypeScript ensures payload types match event types.
 * - Synchronous: events are delivered immediately on emit().
 * - Error isolation: subscriber errors are caught and logged, never propagated.
 * - Subscriptions return an unsubscribe function for cleanup.
 * - Wildcard '*' subscribes to all events (for logging, debugging).
 *
 * # Events
 * See types.ts for the complete list of events and their payloads.
 *
 * @example
 * ```ts
 * const bus = new EventBus();
 *
 * // Subscribe to a specific event
 * bus.on('screen-changed', (msg) => {
 *   console.log(`Screen changed to ${msg.payload.screenId}`);
 * });
 *
 * // Emit an event
 * bus.emit('screen-changed', { screenId: 'dashboard', previousScreenId: null, isBack: false }, 'runtime');
 *
 * // Unsubscribe
 * const sub = bus.on('resize', handler);
 * sub.unsubscribe();
 * ```
 */

import type {
  EventType,
  EventPayloadMap,
  EventMessage,
  EventHandler,
  Subscription,
} from './types.js';

// ─── EventBus ──────────────────────────────────────────────────────

export class EventBus {
  /** Subscribers by event type. */
  private readonly _subscribers: Map<string, Map<string, EventHandler>> = new Map();

  /** Wildcard subscribers (receive all events). */
  private readonly _wildcardSubscribers: Map<string, EventHandler> = new Map();

  /** Counter for generating unique subscription IDs. */
  private _idCounter: number = 0;

  // ── Subscription ──────────────────────────────────────────────

  /**
   * Subscribe to a specific event type.
   *
   * @param type     - The event type to subscribe to.
   * @param handler  - Callback fired when the event is emitted.
   * @returns A Subscription that can be used to unsubscribe.
   */
  on<T extends EventType>(type: T, handler: EventHandler<T>): Subscription {
    const id = this._nextId();

    if (!this._subscribers.has(type)) {
      this._subscribers.set(type, new Map());
    }
    this._subscribers.get(type)!.set(id, handler as EventHandler);

    return {
      type,
      id,
      unsubscribe: () => this._removeSubscription(type, id),
    };
  }

  /**
   * Subscribe to ALL events (wildcard).
   * Useful for logging, debugging, and analytics.
   *
   * @param handler - Callback fired for every event.
   * @returns A Subscription.
   */
  onAny(handler: EventHandler): Subscription {
    const id = this._nextId();
    this._wildcardSubscribers.set(id, handler);

    return {
      type: '*',
      id,
      unsubscribe: () => {
        this._wildcardSubscribers.delete(id);
      },
    };
  }

  /**
   * Subscribe to an event, but only fire once then auto-unsubscribe.
   *
   * @param type    - The event type to subscribe to.
   * @param handler - Callback fired once.
   * @returns A Subscription.
   */
  once<T extends EventType>(type: T, handler: EventHandler<T>): Subscription {
    const sub = this.on(type, ((msg: EventMessage<T>) => {
      handler(msg);
      sub.unsubscribe();
    }) as EventHandler);

    return sub;
  }

  /**
   * Remove all subscriptions for a specific event type.
   *
   * @param type - The event type to clear.
   */
  clear(type: EventType): void {
    this._subscribers.delete(type);
  }

  /**
   * Remove ALL subscriptions (including wildcard).
   */
  clearAll(): void {
    this._subscribers.clear();
    this._wildcardSubscribers.clear();
  }

  /**
   * Get the number of subscriptions for a specific event type.
   */
  subscriberCount(type: EventType): number {
    return this._subscribers.get(type)?.size ?? 0;
  }

  /**
   * Get the total number of subscriptions (including wildcard).
   */
  get totalSubscribers(): number {
    let count = this._wildcardSubscribers.size;
    for (const [, subs] of this._subscribers) {
      count += subs.size;
    }
    return count;
  }

  // ── Emission ──────────────────────────────────────────────────

  /**
   * Emit an event to all subscribers.
   *
   * @param type    - Event type identifier.
   * @param payload - Event payload (type-checked at compile time).
   * @param source  - Source identifier describing who emitted the event.
   */
  emit<T extends EventType>(
    type: T,
    payload: EventPayloadMap[T],
    source: string = 'unknown',
  ): void {
    const message: EventMessage<T> = {
      type,
      payload,
      timestamp: performance.now(),
      source,
    };

    // Deliver to type-specific subscribers
    const typeSubs = this._subscribers.get(type);
    if (typeSubs) {
      for (const [, handler] of typeSubs) {
        try {
          handler(message as EventMessage);
        } catch (err) {
          console.error(`EventBus: error in subscriber for "${type}":`, err);
        }
      }
    }

    // Deliver to wildcard subscribers
    if (this._wildcardSubscribers.size > 0) {
      for (const [, handler] of this._wildcardSubscribers) {
        try {
          handler(message as EventMessage);
        } catch (err) {
          console.error('EventBus: error in wildcard subscriber:', err);
        }
      }
    }
  }

  // ── Internal ──────────────────────────────────────────────────

  /**
   * Remove a specific subscription.
   */
  private _removeSubscription(type: EventType, id: string): void {
    const subs = this._subscribers.get(type);
    if (subs) {
      subs.delete(id);
      if (subs.size === 0) {
        this._subscribers.delete(type);
      }
    }
  }

  /**
   * Generate a unique subscription ID.
   */
  private _nextId(): string {
    return `sub-${++this._idCounter}-${Date.now().toString(36)}`;
  }
}
