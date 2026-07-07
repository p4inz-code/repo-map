/**
 * Notification system types for the V3 Experience Engine.
 *
 * Production notification system with:
 * - Success, Warning, Error, Info, Progress, Pinned types
 * - Animated entry/exit
 * - Auto dismiss and manual dismiss
 * - Queue support
 * - Priority support
 * - Stack management (max visible)
 */

import type { EasingFn } from '../../animation/easing.js';
import { easeOutCubic, easeInCubic } from '../../animation/easing.js';

// ─── Notification Severity ────────────────────────────────────────

export type NotificationSeverity = 'success' | 'warning' | 'error' | 'info';

// ─── Notification Type ────────────────────────────────────────────

/**
 * The type/category of notification.
 */
export type NotificationType = 'alert' | 'progress' | 'pinned';

// ─── Notification Priority ────────────────────────────────────────

export enum NotificationPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Critical = 3,
}

// ─── Notification Instance ────────────────────────────────────────

/**
 * A single notification instance.
 */
export interface NotificationInstance {
  /** Unique notification ID. */
  readonly id: string;
  /** Notification message. */
  readonly message: string;
  /** Optional title. */
  readonly title?: string;
  /** Severity. */
  readonly severity: NotificationSeverity;
  /** Type. */
  readonly type: NotificationType;
  /** Priority. */
  readonly priority: NotificationPriority;
  /** Whether the notification is visible (animation in progress). */
  visible: boolean;
  /** Whether the notification is dismissed. */
  dismissed: boolean;
  /** Timestamp when created. */
  readonly createdAt: number;
  /** Duration in ms before auto-dismiss (0 = manual). */
  readonly autoDismissMs: number;
  /** Progress percentage (0..100, for progress type). */
  progress: number;
  /** Pin reason (for pinned type). */
  readonly pinReason?: string;
  /** Custom icon override. */
  readonly icon?: string;
  /** Entry animation progress (0..1). */
  entryProgress: number;
  /** Exit animation progress (0..1). */
  exitProgress: number;
}

// ─── Notification Config ──────────────────────────────────────────

export interface NotificationConfig {
  /** Default auto-dismiss duration in ms (default: 4000). */
  readonly defaultAutoDismissMs?: number;
  /** Maximum visible notifications (default: 5). */
  readonly maxVisible?: number;
  /** Duration for entry animation in ms (default: 200). */
  readonly entryDurationMs?: number;
  /** Duration for exit animation in ms (default: 150). */
  readonly exitDurationMs?: number;
  /** Entry easing. */
  readonly entryEasing?: EasingFn;
  /** Exit easing. */
  readonly exitEasing?: EasingFn;
}

// ─── Notification Manager State ───────────────────────────────────

export interface NotificationManagerState {
  /** Currently visible (non-dismissed) notifications. */
  readonly visible: NotificationInstance[];
  /** Queue of pending notifications. */
  readonly queue: NotificationInstance[];
  /** Total notifications created. */
  readonly totalCreated: number;
}
