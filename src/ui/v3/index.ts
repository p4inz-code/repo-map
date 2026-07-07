/**
 * repo-map V3 Runtime — barrel export.
 *
 * The V3 Runtime is the foundation for all future visual features:
 * startup animations, page transitions, notifications, overlays,
 * command palette, search, plugins, and Veris.
 *
 * Everything visual flows through this runtime.
 *
 * # Architecture Overview
 * ```
 * RuntimeManager (orchestrator)
 *   │
 *   ├── FrameGraph         — deterministic render order (11 layers)
 *   ├── FrameBuilder       — collects dirty layer content
 *   ├── LayerComposer      — blends layers by z-order
 *   ├── DoubleBuffer       — frame diffing (front/back)
 *   ├── DiffEngine         — minified ANSI terminal output
 *   ├── AnimationScheduler — frame-based animations (pause/resume/reverse)
 *   ├── TransitionManager  — screen-to-screen transitions
 *   ├── OverlayManager     — overlay stack (palette, search, modals)
 *   ├── FocusTree          — hierarchical focus system
 *   ├── WorkspaceManager   — workspace state (screen, selection, search)
 *   └── EventBus           — strongly typed decoupled events
 * ```
 *
 * # Render Pipeline
 * ```
 * FrameContext → FrameBuilder → LayerComposer → DoubleBuffer → DiffEngine → Terminal
 * ```
 *
 * # Frame Graph (deterministic render order)
 * 0  Background
 * 1  Header
 * 2  Sidebar
 * 3  Workspace
 * 4  Panels
 * 5  Overlay
 * 6  Notifications
 * 7  Palette
 * 8  Search
 * 9  Status Bar
 * 10 Cursor
 *
 * # Backward Compatibility
 * The V3 Runtime is a completely independent subsystem that coexists with
 * the existing v1 and v2 engines. No existing files are modified.
 *
 * # Usage
 * ```ts
 * import { RuntimeManager } from './ui/v3/index.js';
 * import { getThemeV2 } from './ui/v2/theme/index.js';
 *
 * const theme = getThemeV2();
 * const runtime = new RuntimeManager(theme, { width: 80, height: 24 });
 *
 * // Register layer renderers
 * runtime.frameGraph.setRenderer('header', (ctx) => renderHeader(ctx));
 * runtime.frameGraph.setRenderer('workspace', (ctx) => renderWorkspace(ctx));
 * runtime.frameGraph.setRenderer('status-bar', (ctx) => renderStatusBar(ctx));
 *
 * // Start the runtime
 * runtime.initialize();
 * runtime.start();
 * ```
 */

// ─── Runtime Manager ──────────────────────────────────────────────

export { RuntimeManager } from './runtime/manager.js';
export type { RuntimeOptions } from './runtime/manager.js';

// ─── Core Types ───────────────────────────────────────────────────

export type {
  FrameContext,
  FrameTiming,
  WorkspaceSnapshot,
  ActiveTransition,
  BudgetResult,
  FrameSkipFlags,
} from './types.js';

export {
  createInitialFrameTiming,
  createInitialFrameContext,
  evaluateBudget,
} from './types.js';

// ─── Frame Graph ──────────────────────────────────────────────────

export { FrameGraph } from './frame-graph/graph.js';
export type { FrameGraphNode, FrameGraphLayerId } from './frame-graph/types.js';
export { FRAME_GRAPH_ORDER, FRAME_GRAPH_Z_ORDER } from './frame-graph/types.js';

// ─── Render Pipeline ──────────────────────────────────────────────

export { FrameBuilder } from './pipeline/frame-builder.js';
export { LayerComposer } from './pipeline/layer-composer.js';
export { DoubleBuffer } from './pipeline/double-buffer.js';
export { DiffEngine } from './pipeline/diff-engine.js';

export type {
  LayerContent,
  ComposedFrame,
  FrameBuildPlan,
  LayerBuildItem,
  CellChange,
  DiffResult,
  PipelineFrameStats,
  TerminalWriter,
} from './pipeline/types.js';

// ─── Animation ────────────────────────────────────────────────────

export { AnimationScheduler } from './animation/scheduler.js';
export type {
  AnimationDef,
  AnimationSchedulerOptions,
  AnimationState,
  AnimationDirection,
  SchedulerStats,
} from './animation/types.js';
export { interpolate, reverseAnimation } from './animation/types.js';

// ─── Easing ───────────────────────────────────────────────────────

export {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
  reverse as reverseEasing,
  composite as compositeEasing,
  getEasing,
  EasingRegistry,
} from './animation/easing.js';
export type { EasingFn } from './animation/easing.js';

// ─── Transitions ──────────────────────────────────────────────────

export { TransitionManager } from './transition/manager.js';
export type {
  TransitionConfig,
  TransitionType,
  TransitionDirection,
  TransitionPhase,
  ActiveTransition as ActiveTransitionDef,
  TransitionManagerState,
} from './transition/types.js';
export { DEFAULT_TRANSITION_CONFIG } from './transition/types.js';

// ─── Overlays ─────────────────────────────────────────────────────

export { OverlayManager } from './overlay/manager.js';
export type {
  OverlayId,
  OverlayInstance,
  OverlayManagerState,
  DismissStrategy,
} from './overlay/types.js';
export {
  OverlayPriority,
  DEFAULT_DISMISS,
  DEFAULT_PRIORITY,
} from './overlay/types.js';

// ─── Focus ────────────────────────────────────────────────────────

export { FocusTree } from './focus/tree.js';
export type {
  FocusNode,
  FocusTreeState,
  FocusResult,
  FocusPath,
  FocusChangeEvent,
  TabDirection,
  ArrowDirection,
} from './focus/types.js';

// ─── Workspace ────────────────────────────────────────────────────

export { WorkspaceManager } from './workspace/context.js';
export type {
  WorkspaceContext,
  WorkspaceSelection,
  WorkspaceSearchState,
  ScrollState,
  CursorState,
  HistoryEntry,
  WorkspaceChangeEvent,
  WorkspaceChangeType,
} from './workspace/types.js';
export {
  createInitialWorkspaceContext,
  defaultScrollState,
  defaultSearchState,
  defaultCursorState,
} from './workspace/types.js';

// ─── Experience Engine ────────────────────────────────────────────

export {
  StartupTimeline,
  StartupBoot,
  RevealManager,
  NavigationRouter,
  SidebarMotion,
  CardAnimator,
  MetricAnimator,
  NotificationSystem,
  LoadingManager,
  EmptyStateManager,
  ContextHintManager,
  PaletteUX,
  SearchUX,
  ScrollingEngine,
} from './experience/index.js';

export type {
  StartupStage,
  StartupState,
  StartupOptions,
  RevealElement,
  RevealConfig,
  NavigationEvent,
  NavigationDirection,
  SidebarMotionState,
  SidebarMotionConfig,
  CardAnimationConfig,
  CardAnimationState,
  CardAnimationType,
  AnimatedMetric,
  AnimatedHealthBar,
  AnimatedProgressBar,
  MetricAnimationConfig,
  NotificationInstance,
  NotificationConfig,
  NotificationManagerState,
  NotificationSeverity,
  NotificationType,
  LoadingState,
  LoadingOperation,
  EmptyState,
  ContextHint,
  ContextMode,
  PaletteCommand,
  PaletteEntry,
  PaletteSearchQuery,
  PaletteUXState,
  SearchMatch,
  SearchUXState,
  SearchConfig,
  ScrollConfig,
  ScrollDirection,
} from './experience/index.js';

export {
  DEFAULT_REVEAL_ELEMENTS,
  autoSelectTransition,
  TRANSITION_PRESETS,
  SIDEBAR_SCREEN_ORDER,
  DEFAULT_CARD_CONFIGS,
  healthColor,
  formatMetricValue,
  EMPTY_STATES,
  getEmptyState,
  CONTEXT_HINTS,
  detectContextMode,
  DEFAULT_PALETTE_COMMANDS,
  scoreCommand,
  findMatchPositions,
  parseQuery,
  scoreSearchMatch,
  findSearchMatchPositions,
  extractContext,
} from './experience/index.js';

// ─── Terminal Ecosystem ───────────────────────────────────────────

export {
  WorkspaceIdentity,
  InspectorPanel,
  ActionManager,
  BreadcrumbEngine,
  WorkspaceIndicators,
  RepositoryIdentity,
  TaskManager,
  ExportManager,
  KeyboardDiscoverability,
  AccessibilityManager,
  MicroDetails,
} from './terminal/index.js';

export type {
  WorkspaceHistoryEntry,
  Breadcrumb,
  PersistentWorkspaceState,
  InspectorSectionId,
  InspectorSection,
  QuickAction,
  ActionManagerState,
  Indicator,
  IndicatorId,
  IndicatorColor,
  RepoMetadata,
  RepoIdentityState,
  GitState,
  BackgroundTask,
  TaskManagerState,
  TaskStatus,
  TaskType,
  ExportWorkflow,
  ExportConfig,
  ExportFormat,
  ExportStage,
  KeyBinding,
  KeyBindingCategory,
  CheatSheet,
  AccessibilityFlags,
  AccessibilityState,
  CursorPulseConfig,
  SelectionGlideConfig,
  PanelTransitionConfig,
} from './terminal/index.js';

export {
  LANGUAGE_ICONS,
  EXPORT_FORMAT_LABELS,
  EXPORT_STAGE_LABELS,
} from './terminal/index.js';

// ─── Event Bus ────────────────────────────────────────────────────

export { EventBus } from './event-bus/bus.js';
export type {
  EventType,
  EventMessage,
  EventHandler,
  EventPayloadMap,
  Subscription,
  ScreenChangedPayload,
  RepositoryLoadedPayload,
  AnalysisFinishedPayload,
  SearchPayload,
  PalettePayload,
  NotificationPayload,
  NotificationDismissedPayload,
  AnimationCompletedPayload,
  ThemeChangedPayload,
  FocusChangedPayload,
  OverlayChangedPayload,
  TransitionPayload,
  ResizePayload,
  FrameRenderedPayload,
  ErrorPayload,
} from './event-bus/types.js';
