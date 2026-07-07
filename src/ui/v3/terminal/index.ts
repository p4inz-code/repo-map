/**
 * repo-map V3 Terminal Ecosystem — barrel export.
 *
 * The Terminal Ecosystem is the final experience layer that transforms
 * repo-map from "a CLI with screens" into "a terminal operating system."
 *
 * # Modules
 * - Workspace: WorkspaceIdentity (history, persistence, breadcrumbs)
 * - Inspector: InspectorPanel (collapsible, resizable, animated)
 * - Actions: ActionManager (per-screen quick actions)
 * - Breadcrumbs: BreadcrumbEngine (keyboard-navigable path)
 * - Indicators: WorkspaceIndicators + RepositoryIdentity
 * - Tasks: TaskManager (background task orchestration)
 * - Export: ExportManager (workflow with lifecycle)
 * - Keyboard: KeyboardDiscoverability (hints, cheat sheet)
 * - Accessibility: AccessibilityManager (modes)
 * - Micro: MicroDetails (subtle animations)
 */

// ─── Workspace Identity ─────────────────────────────────────────────

export { WorkspaceIdentity } from './workspace/identity.js';
export type {
  WorkspaceHistoryEntry,
  Breadcrumb,
  PersistentWorkspaceState,
} from './workspace/identity.js';

// ─── Inspector Panel ────────────────────────────────────────────────

export { InspectorPanel } from './inspector/panel.js';
export type { InspectorSectionId, InspectorSection } from './inspector/panel.js';

// ─── Actions ────────────────────────────────────────────────────────

export { ActionManager } from './actions/manager.js';
export type { QuickAction, ActionManagerState } from './actions/types.js';

// ─── Breadcrumbs ────────────────────────────────────────────────────

export { BreadcrumbEngine } from './breadcrumbs/engine.js';

// ─── Indicators ─────────────────────────────────────────────────────

export { WorkspaceIndicators } from './indicators/manager.js';
export { RepositoryIdentity } from './indicators/repository-identity.js';
export type { Indicator, IndicatorId, IndicatorColor } from './indicators/manager.js';
export type { RepoMetadata, RepoIdentityState, GitState } from './indicators/repository-identity.js';
export { LANGUAGE_ICONS } from './indicators/repository-identity.js';

// ─── Tasks ──────────────────────────────────────────────────────────

export { TaskManager } from './tasks/manager.js';
export type { BackgroundTask, TaskManagerState, TaskStatus, TaskType } from './tasks/types.js';

// ─── Export ─────────────────────────────────────────────────────────

export { ExportManager } from './export/manager.js';
export type { ExportWorkflow, ExportConfig, ExportFormat, ExportStage } from './export/types.js';
export { EXPORT_FORMAT_LABELS, EXPORT_STAGE_LABELS } from './export/types.js';

// ─── Keyboard ───────────────────────────────────────────────────────

export { KeyboardDiscoverability } from './keyboard/discoverability.js';
export type { KeyBinding, KeyBindingCategory, CheatSheet } from './keyboard/discoverability.js';

// ─── Accessibility ──────────────────────────────────────────────────

export { AccessibilityManager } from './accessibility/manager.js';
export type { AccessibilityFlags, AccessibilityState } from './accessibility/manager.js';

// ─── Micro Details ──────────────────────────────────────────────────

export { MicroDetails } from './micro/details.js';
export type { CursorPulseConfig, SelectionGlideConfig, PanelTransitionConfig } from './micro/details.js';
