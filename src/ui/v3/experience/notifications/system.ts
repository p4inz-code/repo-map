/**
 * NotificationSystem — production notification manager for the V3 Experience Engine.
 *
 * Features:
 * - Success, Warning, Error, Info types
 * - Progress notifications (percentages)
 * - Pinned notifications (persistent)
 * - Animated entry/exit via AnimationScheduler
 * - Auto dismiss and manual dismiss
 * - Queue support (notifications queued when max visible reached)
 * - Priority support (high-priority notifications skip the queue)
 * - EventBus integration
 */

import type { AnimationScheduler } from '../../animation/scheduler.js';
import type { EventBus } from '../../event-bus/bus.js';
import type {
  NotificationInstance,
  NotificationConfig,
  NotificationManagerState,
  NotificationSeverity,
  NotificationType,
} from './types.js';
import {
  NotificationPriority,
} from './types.js';
import { easeOutCubic, easeInCubic } from '../../animation/easing.js';

let _notifIdCounter = 0;

// ─── NotificationSystem ───────────────────────────────────────────

export class NotificationSystem {
  private readonly _scheduler: AnimationScheduler;
  private readonly _eventBus: EventBus;

  /** Visible notifications. */
  private readonly _notifications: NotificationInstance[] = [];

  /** Queue of pending notifications. */
  private readonly _queue: NotificationInstance[] = [];

  /** Config. */
  private readonly _defaultAutoDismissMs: number;
  private readonly _maxVisible: number;
  private readonly _entryDurationMs: number;
  private readonly _exitDurationMs: number;
  private readonly _entryEasing: (t: number) => number;
  private readonly _exitEasing: (t: number) => number;

  /** Total notifications created. */
  private _totalCreated: number = 0;

  constructor(
    scheduler: AnimationScheduler,
    eventBus: EventBus,
    config?: NotificationConfig,
  ) {
    this._scheduler = scheduler;
    this._eventBus = eventBus;
    this._defaultAutoDismissMs = config?.defaultAutoDismissMs ?? 4000;
    this._maxVisible = config?.maxVisible ?? 5;
    this._entryDurationMs = config?.entryDurationMs ?? 200;
    this._exitDurationMs = config?.exitDurationMs ?? 150;
    this._entryEasing = config?.entryEasing ?? easeOutCubic;
    this._exitEasing = config?.exitEasing ?? easeInCubic;
  }

  // ── Notification Creation ─────────────────────────────────────

  /**
   * Show a notification.
   *
   * @param message  - Notification message.
   * @param severity - Severity level.
   * @param options  - Optional configuration.
   * @returns The notification ID.
   */
  notify(
    message: string,
    severity: NotificationSeverity = 'info',
    options?: {
      title?: string;
      type?: NotificationType;
      priority?: NotificationPriority;
      duration?: number;
      pinReason?: string;
      icon?: string;
    },
  ): string {
    const id = `notif-${++_notifIdCounter}-${Date.now().toString(36)}`;
    const priority = options?.priority ?? NotificationPriority.Normal;

    const notification: NotificationInstance = {
      id,
      message,
      title: options?.title,
      severity,
      type: options?.type ?? 'alert',
      priority,
      visible: false,
      dismissed: false,
      createdAt: Date.now(),
      autoDismissMs: options?.duration ?? this._defaultAutoDismissMs,
      progress: 0,
      pinReason: options?.pinReason,
      icon: options?.icon,
      entryProgress: 0,
      exitProgress: 0,
    };

    this._totalCreated++;

    // High-priority notifications skip the queue
    if (priority >= NotificationPriority.High && this._notifications.length >= this._maxVisible) {
      // Remove lowest-priority visible notification
      const lowest = this._findLowestPriority();
      if (lowest) {
        this._dismissNotification(lowest.id, true);
      }
    }

    // If we have room, show immediately
    if (this._notifications.length < this._maxVisible) {
      this._showNotification(notification);
    } else {
      // Queue for later
      this._queue.push(notification);
    }

    // Emit event
    this._eventBus.emit('notification-added', {
      id,
      message,
      severity,
      duration: notification.autoDismissMs,
    }, 'notifications');

    return id;
  }

  /**
   * Convenience for success notifications.
   */
  success(message: string, options?: { title?: string; duration?: number }): string {
    return this.notify(message, 'success', { ...options, priority: NotificationPriority.Normal });
  }

  /**
   * Convenience for warning notifications.
   */
  warning(message: string, options?: { title?: string; duration?: number }): string {
    return this.notify(message, 'warning', { ...options, priority: NotificationPriority.Normal });
  }

  /**
   * Convenience for error notifications.
   */
  error(message: string, options?: { title?: string; duration?: number }): string {
    return this.notify(message, 'error', { ...options, priority: NotificationPriority.High });
  }

  /**
   * Convenience for info notifications.
   */
  info(message: string, options?: { title?: string; duration?: number }): string {
    return this.notify(message, 'info', { ...options, priority: NotificationPriority.Low });
  }

  /**
   * Show a progress notification.
   */
  progress(message: string, options?: { title?: string; pinReason?: string }): string {
    return this.notify(message, 'info', {
      type: 'progress',
      priority: NotificationPriority.Low,
      duration: 0, // Manual dismiss
      pinReason: options?.pinReason ?? 'Task in progress',
      ...options,
    });
  }

  /**
   * Update a progress notification's percentage.
   */
  updateProgress(id: string, progress: number): void {
    const notif = this._notifications.find((n) => n.id === id);
    if (notif) {
      notif.progress = Math.max(0, Math.min(100, progress));
    }
  }

  // ── Dismissal ─────────────────────────────────────────────────

  /**
   * Dismiss a specific notification by ID.
   */
  dismiss(id: string): void {
    this._dismissNotification(id, true);
  }

  /**
   * Dismiss all visible notifications.
   */
  dismissAll(): void {
    for (const notif of [...this._notifications]) {
      this._dismissNotification(notif.id, true);
    }
  }

  // ── State ─────────────────────────────────────────────────────

  /**
   * Get the current state of the notification system.
   */
  getState(): NotificationManagerState {
    return {
      visible: this._notifications.filter((n) => !n.dismissed),
      queue: [...this._queue],
      totalCreated: this._totalCreated,
    };
  }

  /**
   * Update notification timers and entry/exit animations.
   * Called each frame.
   *
   * @param dt - Delta time in ms.
   */
  update(dt: number): void {
    const now = Date.now();

    for (const notif of this._notifications) {
      if (notif.dismissed) {
        // Exit animation
        notif.exitProgress = Math.min(1, notif.exitProgress + dt / this._exitDurationMs);

        if (notif.exitProgress >= 1) {
          // Remove from visible
          this._removeNotification(notif.id);

          // Process queue
          this._processQueue();
        }
      } else if (!notif.visible) {
        // Entry animation
        notif.entryProgress = Math.min(1, notif.entryProgress + dt / this._entryDurationMs);

        if (notif.entryProgress >= 1) {
          notif.visible = true;

          // Schedule auto-dismiss if not pinned and not progress
          if (notif.autoDismissMs > 0 && notif.type !== 'pinned' && notif.type !== 'progress') {
            setTimeout(() => {
              this.dismiss(notif.id);
            }, notif.autoDismissMs);
          }
        }
      }
    }
  }

  /**
   * Reset the notification system.
   */
  reset(): void {
    this._notifications.length = 0;
    this._queue.length = 0;
    this._totalCreated = 0;
  }

  // ── Internal ──────────────────────────────────────────────────

  private _showNotification(notification: NotificationInstance): void {
    this._notifications.push(notification);

    // Entry animation will be driven by the update() method
  }

  private _dismissNotification(id: string, automatic: boolean): void {
    const notif = this._notifications.find((n) => n.id === id);
    if (!notif || notif.dismissed) return;

    notif.dismissed = true;
    notif.exitProgress = 0;

    this._eventBus.emit('notification-dismissed', {
      id,
      automatic,
    }, 'notifications');
  }

  private _removeNotification(id: string): void {
    const idx = this._notifications.findIndex((n) => n.id === id);
    if (idx !== -1) {
      this._notifications.splice(idx, 1);
    }
  }

  private _processQueue(): void {
    if (this._queue.length === 0) return;
    if (this._notifications.length >= this._maxVisible) return;

    const next = this._queue.shift()!;
    this._showNotification(next);
  }

  private _findLowestPriority(): NotificationInstance | null {
    let lowest: NotificationInstance | null = null;
    for (const n of this._notifications) {
      if (!lowest || n.priority < lowest.priority) {
        lowest = n;
      }
    }
    return lowest;
  }
}
