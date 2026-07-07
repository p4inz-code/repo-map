/**
 * V3 Experience Engine — barrel export.
 *
 * The Experience Engine builds on the V3 Runtime to create a polished,
 * premium user experience. Everything flows through AnimationScheduler
 * and RuntimeManager — no setTimeout, no blocking sleeps.
 *
 * # Modules
 * - Startup: Boot sequence + Timeline
 * - Reveal: Progressive workspace reveal
 * - Navigation: Auto-selected screen transitions
 * - Sidebar: Gliding selection, animated expand/collapse
 * - Cards: Staggered card entry animations
 * - Metrics: Animated counting values, health bars, progress
 * - Notifications: Production notification system
 * - Loading: Informative loading states
 * - Empty State: Context-aware empty screens
 * - Context Hints: Auto-changing status bar
 * - Palette UX: Raycast-inspired command palette
 * - Search UX: Incremental search with highlights
 * - Scrolling: Smooth scroll with momentum
 */

// ─── Startup ──────────────────────────────────────────────────────

export { StartupTimeline } from './startup/timeline.js';
export { StartupBoot } from './startup/boot.js';
export type { StartupStage, StartupTimeline as StartupTimelineType, StartupState, StartupOptions } from './startup/types.js';
export { createDefaultStages, totalEstimatedTime } from './startup/types.js';

// ─── Reveal ───────────────────────────────────────────────────────

export { RevealManager } from './reveal/manager.js';
export type { RevealElement, RevealSequence, RevealConfig } from './reveal/types.js';
export { DEFAULT_REVEAL_ELEMENTS } from './reveal/types.js';

// ─── Navigation ───────────────────────────────────────────────────

export { NavigationRouter } from './navigation/router.js';
export type { NavigationEvent, NavigationDirection, ScreenTransitionMap } from './navigation/types.js';
export { autoSelectTransition, TRANSITION_PRESETS, SIDEBAR_SCREEN_ORDER } from './navigation/types.js';

// ─── Sidebar Motion ───────────────────────────────────────────────

export { SidebarMotion } from './sidebar/motion.js';
export type { SidebarMotionState, AnimatedCounter, SidebarMotionConfig } from './sidebar/types.js';

// ─── Cards ────────────────────────────────────────────────────────

export { CardAnimator } from './cards/animator.js';
export type { CardAnimationConfig, CardAnimationState, CardAnimationType } from './cards/types.js';
export { DEFAULT_CARD_CONFIGS } from './cards/types.js';

// ─── Metrics ──────────────────────────────────────────────────────

export { MetricAnimator } from './metrics/animator.js';
export type { AnimatedMetric, AnimatedHealthBar, AnimatedProgressBar, MetricAnimationConfig } from './metrics/types.js';
export { healthColor, formatMetricValue } from './metrics/types.js';

// ─── Notifications ────────────────────────────────────────────────

export { NotificationSystem } from './notifications/system.js';
export type { NotificationInstance, NotificationConfig, NotificationManagerState, NotificationSeverity, NotificationType, NotificationPriority } from './notifications/types.js';

// ─── Loading ──────────────────────────────────────────────────────

export { LoadingManager } from './loading/manager.js';
export type { LoadingState, LoadingOperation } from './loading/types.js';
export { getLoadingTitle, getLoadingDescription } from './loading/types.js';

// ─── Empty State ──────────────────────────────────────────────────

export { EmptyStateManager } from './empty-state/manager.js';
export type { EmptyState } from './empty-state/types.js';
export { EMPTY_STATES, getEmptyState } from './empty-state/types.js';

// ─── Context Hints ────────────────────────────────────────────────

export { ContextHintManager } from './context-hints/manager.js';
export type { ContextHint, ContextMode } from './context-hints/types.js';
export { CONTEXT_HINTS, detectContextMode } from './context-hints/types.js';

// ─── Palette UX ───────────────────────────────────────────────────

export { PaletteUX } from './palette/ux.js';
export type { PaletteCommand, PaletteEntry, PaletteSearchQuery, PaletteUXState } from './palette/types.js';
export { DEFAULT_PALETTE_COMMANDS, scoreCommand, findMatchPositions, parseQuery } from './palette/types.js';

// ─── Search UX ────────────────────────────────────────────────────

export { SearchUX } from './search/ux.js';
export type { SearchMatch, SearchUXState, SearchConfig } from './search/types.js';
export { scoreSearchMatch, findSearchMatchPositions, extractContext } from './search/types.js';

// ─── Scrolling ────────────────────────────────────────────────────

export { ScrollingEngine } from './scrolling/engine.js';
export type { ScrollConfig, ScrollDirection } from './scrolling/types.js';
export { ScrollState } from './scrolling/types.js';
