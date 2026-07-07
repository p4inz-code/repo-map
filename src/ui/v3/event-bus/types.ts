/**
 * Event Bus types for the V3 Runtime.
 *
 * Defines all strongly typed events in the system.
 * Events are the primary mechanism for decoupling components:
 * instead of direct method calls, components emit events that
 * other components can subscribe to.
 *
 * # Design Principles
 * - Every event has a unique type identifier.
 * - Every event carries typed payload data.
 * - Events are emitted synchronously (no microtask deferral).
 * - Subscribers can be added/removed at any time.
 * - Errors in subscribers are caught and logged, never propagated.
 *
 * # Available Events
 * - ScreenChanged: emitted when the active screen changes.
 * - RepositoryLoaded: emitted when analysis data is loaded.
 * - AnalysisFinished: emitted when analysis completes.
 * - SearchOpened: emitted when search is activated.
 * - PaletteOpened: emitted when the command palette opens.
 * - NotificationAdded: emitted when a notification is created.
 * - AnimationCompleted: emitted when an animation finishes.
 * - ThemeChanged: emitted when the theme is changed.
 * - FocusChanged: emitted when focus moves.
 * - OverlayChanged: emitted when overlay state changes.
 * - TransitionStarted: emitted when a screen transition begins.
 * - TransitionCompleted: emitted when a screen transition ends.
 */

// ─── Event Type Identifier ────────────────────────────────────────

/**
 * All valid event type identifiers.
 */
export type EventType =
  | 'screen-changed'
  | 'repository-loaded'
  | 'analysis-finished'
  | 'search-opened'
  | 'search-closed'
  | 'palette-opened'
  | 'palette-closed'
  | 'notification-added'
  | 'notification-dismissed'
  | 'animation-completed'
  | 'theme-changed'
  | 'focus-changed'
  | 'overlay-changed'
  | 'transition-started'
  | 'transition-completed'
  | 'resize'
  | 'frame-rendered'
  | 'error';

// ─── Event Payloads ───────────────────────────────────────────────

/**
 * Payload for screen-changed event.
 */
export interface ScreenChangedPayload {
  /** The new screen ID. */
  readonly screenId: string;
  /** The previous screen ID (null if this is the first screen). */
  readonly previousScreenId: string | null;
  /** Whether this was a back-navigation. */
  readonly isBack: boolean;
}

/**
 * Payload for repository-loaded event.
 */
export interface RepositoryLoadedPayload {
  /** The project name. */
  readonly projectName: string;
  /** Number of files found. */
  readonly fileCount: number;
  /** Number of directories found. */
  readonly directoryCount: number;
}

/**
 * Payload for analysis-finished event.
 */
export interface AnalysisFinishedPayload {
  /** Elapsed time in seconds. */
  readonly elapsed: number;
  /** Health score (0-100). */
  readonly healthScore: number;
  /** Number of technologies detected. */
  readonly technologyCount: number;
}

/**
 * Payload for search-opened / search-closed events.
 */
export interface SearchPayload {
  /** The search query (empty string if just opened). */
  readonly query: string;
  /** Number of results (0 if just opened). */
  readonly resultCount: number;
}

/**
 * Payload for palette-opened / palette-closed events.
 */
export interface PalettePayload {
  /** Whether the palette was opened (true) or closed (false). */
  readonly open: boolean;
}

/**
 * Payload for notification-added event.
 */
export interface NotificationPayload {
  /** Unique notification ID. */
  readonly id: string;
  /** Notification message. */
  readonly message: string;
  /** Severity level. */
  readonly severity: 'info' | 'success' | 'warning' | 'error';
  /** Auto-dismiss duration in ms (0 = manual dismiss). */
  readonly duration: number;
}

/**
 * Payload for notification-dismissed event.
 */
export interface NotificationDismissedPayload {
  /** The dismissed notification ID. */
  readonly id: string;
  /** Whether it was auto-dismissed or manually dismissed. */
  readonly automatic: boolean;
}

/**
 * Payload for animation-completed event.
 */
export interface AnimationCompletedPayload {
  /** The animation ID that completed. */
  readonly animationId: string;
  /** Whether the animation was cancelled or completed naturally. */
  readonly cancelled: boolean;
}

/**
 * Payload for theme-changed event.
 */
export interface ThemeChangedPayload {
  /** The new theme name. */
  readonly themeName: string;
}

/**
 * Payload for focus-changed event.
 */
export interface FocusChangedPayload {
  /** The newly focused element ID (null if nothing focused). */
  readonly focusedId: string | null;
  /** The previously focused element ID. */
  readonly previousId: string | null;
}

/**
 * Payload for overlay-changed event.
 */
export interface OverlayChangedPayload {
  /** The overlay ID that changed. */
  readonly overlayId: string;
  /** Whether the overlay is now visible. */
  readonly visible: boolean;
  /** Whether this is a modal overlay. */
  readonly modal: boolean;
}

/**
 * Payload for transition-started / transition-completed events.
 */
export interface TransitionPayload {
  /** Transition type (fade, slide, push, reveal, crossfade). */
  readonly type: string;
  /** Source screen ID. */
  readonly fromScreen: string | null;
  /** Destination screen ID. */
  readonly toScreen: string;
  /** Transition duration in ms. */
  readonly duration: number;
}

/**
 * Payload for resize event.
 */
export interface ResizePayload {
  /** New terminal width. */
  readonly width: number;
  /** New terminal height. */
  readonly height: number;
}

/**
 * Payload for frame-rendered event.
 */
export interface FrameRenderedPayload {
  /** Frame number. */
  readonly frameNumber: number;
  /** Total frame time in ms. */
  readonly frameTimeMs: number;
  /** Whether this was a full redraw. */
  readonly fullRedraw: boolean;
  /** Number of changed cells. */
  readonly changedCells: number;
}

/**
 * Payload for error event.
 */
export interface ErrorPayload {
  /** Error message. */
  readonly message: string;
  /** Optional error object. */
  readonly error?: Error;
  /** Optional suggestion for the user. */
  readonly suggestion?: string;
}

// ─── Event Map ────────────────────────────────────────────────────

/**
 * Maps each EventType to its payload type.
 * This enables type-safe emit/subscribe.
 */
export interface EventPayloadMap {
  'screen-changed': ScreenChangedPayload;
  'repository-loaded': RepositoryLoadedPayload;
  'analysis-finished': AnalysisFinishedPayload;
  'search-opened': SearchPayload;
  'search-closed': SearchPayload;
  'palette-opened': PalettePayload;
  'palette-closed': PalettePayload;
  'notification-added': NotificationPayload;
  'notification-dismissed': NotificationDismissedPayload;
  'animation-completed': AnimationCompletedPayload;
  'theme-changed': ThemeChangedPayload;
  'focus-changed': FocusChangedPayload;
  'overlay-changed': OverlayChangedPayload;
  'transition-started': TransitionPayload;
  'transition-completed': TransitionPayload;
  'resize': ResizePayload;
  'frame-rendered': FrameRenderedPayload;
  'error': ErrorPayload;
}

// ─── Event Message ────────────────────────────────────────────────

/**
 * A strongly typed event message.
 */
export interface EventMessage<T extends EventType = EventType> {
  /** Event type identifier. */
  readonly type: T;
  /** Event payload. */
  readonly payload: EventPayloadMap[T];
  /** Timestamp when the event was emitted (performance.now()). */
  readonly timestamp: number;
  /** Source identifier (e.g., 'runtime', 'focus', 'overlay'). */
  readonly source: string;
}

// ─── Event Handler ────────────────────────────────────────────────

/**
 * Type-safe event handler.
 */
export type EventHandler<T extends EventType = EventType> =
  (message: EventMessage<T>) => void;

// ─── Subscription ─────────────────────────────────────────────────

/**
 * A subscription that can be unsubscribed.
 */
export interface Subscription {
  /** The event type this subscription is for. */
  readonly type: EventType | '*';
  /** Unique subscription ID. */
  readonly id: string;
  /** Unsubscribe this subscription. */
  unsubscribe(): void;
}
