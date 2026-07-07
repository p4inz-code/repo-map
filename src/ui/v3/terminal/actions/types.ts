/**
 * Quick Actions types for the Terminal Ecosystem.
 *
 * Every screen exposes a set of actions displayed in the footer.
 * Actions update automatically based on the current context.
 */

import type { EventBus } from '../../event-bus/bus.js';

// ─── Action Definition ─────────────────────────────────────────────

export interface QuickAction {
  /** Unique action ID. */
  readonly id: string;
  /** Display label (short, 1-2 words). */
  readonly label: string;
  /** Key binding (e.g., 'e', 'r', 'ctrl-e'). */
  readonly key: string;
  /** Description shown in help. */
  readonly description: string;
  /** Whether this action is currently enabled. */
  enabled: boolean;
  /** Whether this action is visible in the footer. */
  visible: boolean;
  /** Icon character. */
  readonly icon: string;
  /** Action handler. */
  readonly handler: () => void;
}

// ─── Action Registry ────────────────────────────────────────────────

export type ActionScreenId = string;

/**
 * Registry of all available actions per screen.
 * Each screen can define its own set of actions.
 */
export interface ActionRegistry {
  /** Actions available on all screens (global). */
  readonly global: QuickAction[];
  /** Actions specific to each screen. */
  readonly screens: Map<ActionScreenId, QuickAction[]>;
}

// ─── Action Manager State ───────────────────────────────────────────

export interface ActionManagerState {
  /** Currently visible actions for the active screen. */
  readonly visibleActions: QuickAction[];
  /** All available actions (including hidden). */
  readonly allActions: QuickAction[];
  /** The active screen ID. */
  readonly activeScreen: string | null;
}
