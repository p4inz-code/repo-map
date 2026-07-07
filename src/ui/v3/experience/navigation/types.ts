/**
 * Navigation types for the V3 Experience Engine.
 *
 * Defines the auto-selection of screen transitions based on navigation direction.
 * Every screen change uses TransitionManager with automatically selected transitions:
 *
 * # Auto-Selection Rules
 * - Dashboard → Results: Slide Left
 * - Results → Dashboard: Slide Right
 * - Help: Fade
 * - Palette: Overlay
 * - Search: Overlay
 * - Error: Fade
 * - Settings: Slide Left
 * - Any → Next in sidebar: Slide Left
 * - Previous in sidebar: Slide Right
 * - Same screen: No transition
 */

import type { TransitionConfig, TransitionType, TransitionDirection } from '../../transition/types.js';

// ─── Screen Transition Map ────────────────────────────────────────

/**
 * Maps a (fromScreen, toScreen) pair to a transition config.
 * Null means use the default transition.
 */
export type ScreenTransitionMap = Map<string, Map<string, TransitionConfig | null>>;

// ─── Navigation Direction ─────────────────────────────────────────

/**
 * The direction of navigation between screens.
 */
export type NavigationDirection = 'forward' | 'backward' | 'same';

// ─── Navigation Event ─────────────────────────────────────────────

/**
 * Emitted when navigation occurs.
 */
export interface NavigationEvent {
  /** Source screen ID. */
  readonly fromScreen: string;
  /** Destination screen ID. */
  readonly toScreen: string;
  /** Direction of navigation. */
  readonly direction: NavigationDirection;
  /** The transition config selected for this navigation. */
  readonly transition: TransitionConfig;
}

// ─── Sidebar Screen Order ─────────────────────────────────────────

/**
 * The canonical sidebar screen order for auto-selecting left/right transitions.
 */
export const SIDEBAR_SCREEN_ORDER: readonly string[] = [
  'dashboard',
  'scan',
  'results',
  'architecture',
  'dependencies',
  'insights',
  'suggestions',
  'history',
  'plugins',
  'settings',
  'about',
];

// ─── Default Transition Presets ───────────────────────────────────

/**
 * Pre-defined transition presets for common navigation scenarios.
 */
export const TRANSITION_PRESETS: Record<string, Partial<TransitionConfig>> = {
  /** Slide content to the left (forward navigation). */
  'slide-left': { type: 'slide', direction: 'left', duration: 250 },
  /** Slide content to the right (backward navigation). */
  'slide-right': { type: 'slide', direction: 'right', duration: 250 },
  /** Push content to the left (forward). */
  'push-forward': { type: 'push', direction: 'left', duration: 300 },
  /** Push content to the right (backward). */
  'push-backward': { type: 'push', direction: 'right', duration: 300 },
  /** Fade transition (dialogs, overlays). */
  'fade': { type: 'fade', duration: 200 },
  /** Reveal from right. */
  'reveal': { type: 'reveal', direction: 'right', duration: 350 },
  /** Crossfade (equal weight). */
  'crossfade': { type: 'crossfade', duration: 250 },
  /** Instant (no animation). */
  'instant': { type: 'fade', duration: 0, instant: true },
};

// ─── Auto-Select Transition Logic ─────────────────────────────────

/**
 * Automatically select the appropriate transition based on
 * the source and destination screens.
 */
export function autoSelectTransition(
  fromScreen: string | null,
  toScreen: string,
): Partial<TransitionConfig> {
  if (!fromScreen) return TRANSITION_PRESETS['fade'];

  // Same screen — no transition
  if (fromScreen === toScreen) return TRANSITION_PRESETS['instant'];

  // Special screens
  if (toScreen === 'help' || toScreen === 'error') return TRANSITION_PRESETS['fade'];
  if (fromScreen === 'help' || fromScreen === 'error') return TRANSITION_PRESETS['fade'];

  if (toScreen === 'settings' || fromScreen === 'settings') return TRANSITION_PRESETS['slide-left'];

  // Sidebar navigation — determine direction
  const fromIdx = SIDEBAR_SCREEN_ORDER.indexOf(fromScreen);
  const toIdx = SIDEBAR_SCREEN_ORDER.indexOf(toScreen);

  if (fromIdx !== -1 && toIdx !== -1) {
    if (toIdx > fromIdx) return TRANSITION_PRESETS['slide-left'];  // Forward
    if (toIdx < fromIdx) return TRANSITION_PRESETS['slide-right']; // Backward
  }

  // Default
  return TRANSITION_PRESETS['fade'];
}
