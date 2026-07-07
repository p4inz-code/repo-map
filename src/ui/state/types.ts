/**
 * UI State types for the repo-map interactive TUI framework.
 *
 * Defines the shape of all UI state managed by the observable Store.
 *
 * # Architecture
 * - State is the single source of truth for all interactive UI.
 * - Components read state; Input handlers write state.
 * - The Store notifies subscribers on every state change.
 * - Dirty state enables render optimization: only changed components render.
 */

import type { Theme } from '../theme/index.js';
import type { WidthInfo } from '../layout/width.js';
import type { Analysis } from '../../types.js';

// ─── Application Mode ──────────────────────────────────────────

/**
 * The overall mode the application is in.
 * Determines input routing and render behavior.
 */
export type AppMode = 'idle' | 'scanning' | 'analyzing' | 'displaying' | 'error';

// ─── Focus State ───────────────────────────────────────────────

/**
 * Represents which component currently has focus.
 */
export interface FocusState {
  /** ID of the currently focused component, or null if nothing is focused. */
  focusedId: string | null;
  /** Ordered list of focusable component IDs (for tab navigation). */
  focusableIds: string[];
  /** Index of the focused ID within focusableIds. */
  focusIndex: number;
}

// ─── Selection State ───────────────────────────────────────────

/**
 * Represents the current selection within a list or tree.
 */
export interface SelectionState {
  /** Currently selected item index (0-based). */
  selectedIndex: number;
  /** Total number of selectable items. */
  totalItems: number;
}

// ─── Scroll State ──────────────────────────────────────────────

/**
 * Represents scroll offset for scrollable content areas.
 */
export interface ScrollState {
  /** Current scroll offset (0-based). */
  offset: number;
  /** Maximum scroll offset. */
  maxOffset: number;
  /** Number of visible items at once. */
  pageSize: number;
}

// ─── Screen State ──────────────────────────────────────────────

/**
 * Identifies the current active screen.
 */
export type ScreenId =
  | 'scanning'
  | 'analyzing'
  | 'completion'
  | 'stats'
  | 'suggest'
  | 'help'
  | 'error';

// ─── Render State ──────────────────────────────────────────────

/**
 * Tracks which components need re-rendering.
 * Components set their dirty flag when their state changes.
 * The RenderLoop only redraws dirty components.
 */
export interface DirtyState {
  /** Set of component IDs that need re-rendering. */
  dirtyComponents: Set<string>;
  /** Whether a full re-render is needed (e.g., after resize). */
  fullRedraw: boolean;
  /** Whether layout has changed (needs reflow). */
  layoutDirty: boolean;
}

// ─── Terminal State ────────────────────────────────────────────

/**
 * Tracks terminal state for proper restore on exit.
 */
export interface TerminalState {
  /** Whether cursor is hidden. */
  cursorHidden: boolean;
  /** Whether raw mode is active. */
  rawMode: boolean;
  /** Whether alternate screen buffer is active. */
  alternateScreen: boolean;
}

// ─── Search / Filter State ─────────────────────────────────────

/**
 * Tracks search/filter state for incremental filtering and the command palette.
 */
export interface SearchFilterState {
  /** Whether a filter/search is currently active. */
  active: boolean;
  /** Current filter query string (for / search). */
  query: string;
  /** Whether the command palette is open. */
  paletteOpen: boolean;
  /** Whether the keyboard help overlay is open. */
  helpOpen: boolean;
}

// ─── Inspector Sections ────────────────────────────────────────

/**
 * A named section within the inspector panel.
 */
export interface InspectorSection {
  /** Section title (e.g. "Summary", "Metadata", "Relationships"). */
  title: string;
  /** Items within this section. */
  items: { label: string; value: string; dim?: boolean }[];
}

// ─── Workspace State ────────────────────────────────────────────

/**
 * Identifies a region/panel within the workspace layout.
 */
export type WorkspaceRegion = 'sidebar' | 'tree' | 'info' | 'footer';

/**
 * Identifies a sidebar section/view.
 */
export type WorkspaceView =
  | 'overview'
  | 'statistics'
  | 'suggestions'
  | 'tree'
  | 'help';

/**
 * Breadcrumb segment for navigation path display.
 */
export interface BreadcrumbSegment {
  /** Display label. */
  label: string;
  /** Whether this is the current (last) segment. */
  active: boolean;
}

/**
 * Tracks workspace layout dimensions and resize state.
 */
export interface WorkspaceLayoutDimensions {
  /** Sidebar width in characters. */
  sidebarWidth: number;
  /** Main panel width in characters. */
  mainWidth: number;
  /** Whether the info panel is visible. */
  infoVisible: boolean;
  /** Info panel width in characters. */
  infoWidth: number;
  /** Minimum sidebar width. */
  minSidebar: number;
  /** Minimum main width. */
  minMain: number;
  /** Minimum info width. */
  minInfo: number;
}

/**
 * Types of content the info panel can display.
 */
export type InfoContentType =
  | 'file'
  | 'folder'
  | 'module'
  | 'language'
  | 'framework'
  | 'architecture-issue'
  | 'statistics'
  | 'suggestion'
  | 'no-selection'
  | 'loading'
  | 'empty'
  | 'unavailable';

/**
 * Data for the info panel content — inspector mode with structured sections.
 */
export interface InfoPanelData {
  /** Type of content being displayed. */
  contentType: InfoContentType;
  /** Title/name of the selected item. */
  title: string;
  /** Optional subtitle or path. */
  subtitle?: string;
  /** Key-value metadata pairs. */
  metadata?: { label: string; value: string }[];
  /** List of related items/relationships. */
  relationships?: string[];
  /** Descriptive text paragraphs. */
  description?: string[];
  /** Risk level indicator. */
  riskLevel?: 'low' | 'medium' | 'high';
  /** Numeric score (0-100). */
  score?: number;
  /** Structured sections for the inspector (overrides flat rendering). */
  sections?: InspectorSection[];
}

/**
 * Tree node data used for the interactive repository explorer.
 */
export interface TreeNodeData {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  language?: string;
  children?: TreeNodeData[];
  expanded?: boolean;
  depth: number;
}

/**
 * Independent selection state for each workspace region.
 */
export interface RegionSelectionState {
  /** Sidebar selection index. */
  sidebarIndex: number;
  /** Tree selection index (within visible nodes). */
  treeIndex: number;
  /** Info panel scroll/list selection index. */
  infoIndex: number;
  /** Footer hint selection index. */
  footerIndex: number;
}

/**
 * Scroll state per region.
 */
export interface RegionScrollState {
  /** Tree scroll offset. */
  treeOffset: number;
  /** Info panel scroll offset. */
  infoOffset: number;
}

/**
 * Tracks which sections/panels are collapsed.
 */
export interface PanelCollapseState {
  /** Whether the statistics panel is collapsed. */
  statsPanel: boolean;
  /** Whether the suggestions panel is collapsed. */
  suggestionsPanel: boolean;
  /** Whether the tree panel is collapsed. */
  treePanel: boolean;
  /** Whether the architecture panel is collapsed. */
  architecturePanel: boolean;
}

/**
 * Tracks workspace interaction state.
 */
export interface WorkspaceState {
  /** Currently active view in the main content area. */
  activeView: WorkspaceView;
  /** Currently focused region. */
  focusedRegion: WorkspaceRegion;
  /** Breadcrumb navigation path. */
  breadcrumbs: BreadcrumbSegment[];
  /** Layout dimensions. */
  layout: WorkspaceLayoutDimensions;
  /** Whether the workspace is active (vs one-shot screen mode). */
  active: boolean;
  /** Currently selected item label for status bar. */
  selectedItem: string;
  /** Independent selection state per region. */
  regionSelections: RegionSelectionState;
  /** Scroll state per region. */
  regionScroll: RegionScrollState;
  /** Panel collapse state. */
  collapsedPanels: PanelCollapseState;
  /** Current info panel content data. */
  infoPanel: InfoPanelData;
  /** Tree data for the interactive repository explorer. */
  treeData: TreeNodeData | null;
  /** Full analysis data for real inspector content. */
  repoAnalysis: Analysis | null;
}

// ─── Full UI State ─────────────────────────────────────────────

/**
 * Complete UI state tree.
 *
 * All mutable UI state lives here. Components derive their visual
 * state from these values. Input handlers mutate these values via
 * Store.setState().
 */
export interface UIState {
  /** Current application mode. */
  appMode: AppMode;

  /** Currently active screen. */
  currentScreen: ScreenId | null;

  /** Screen history stack for back navigation. */
  screenStack: ScreenId[];

  /** Focus state for keyboard navigation. */
  focus: FocusState;

  /** Selection state for list/tree navigation. */
  selection: SelectionState;

  /** Scroll state for scrollable content areas. */
  scroll: ScrollState;

  /** Dirty state for render optimization. */
  dirty: DirtyState;

  /** Terminal state for proper cleanup. */
  terminal: TerminalState;

  /** Resolved theme. */
  theme: Theme | null;

  /** Current terminal width info. */
  width: WidthInfo | null;

  /** Whether raw mode (keyboard input) is active. */
  rawMode: boolean;

  /** Render tick counter (increments on each render pass). */
  renderTick: number;

  /** Search/filter state. */
  searchFilter: SearchFilterState;

  /** Workspace state for interactive mode. */
  workspace: WorkspaceState;
}

// ─── Initial State ─────────────────────────────────────────────

/**
 * Factory for creating the initial UI state.
 */
export function createInitialUIState(): UIState {
  return {
    appMode: 'idle',
    currentScreen: null,
    screenStack: [],
    focus: {
      focusedId: null,
      focusableIds: [],
      focusIndex: -1,
    },
    selection: {
      selectedIndex: 0,
      totalItems: 0,
    },
    scroll: {
      offset: 0,
      maxOffset: 0,
      pageSize: 10,
    },
    dirty: {
      dirtyComponents: new Set<string>(),
      fullRedraw: false,
      layoutDirty: false,
    },
    terminal: {
      cursorHidden: false,
      rawMode: false,
      alternateScreen: false,
    },
    theme: null,
    width: null,
    rawMode: false,
    renderTick: 0,
    searchFilter: {
      active: false,
      query: '',
      paletteOpen: false,
      helpOpen: false,
    },
    workspace: {
      activeView: 'overview',
      focusedRegion: 'sidebar',
      breadcrumbs: [{ label: 'Overview', active: true }],
      layout: {
        sidebarWidth: 22,
        mainWidth: 56,
        infoVisible: false,
        infoWidth: 0,
        minSidebar: 16,
        minMain: 30,
        minInfo: 0,
      },
      active: false,
      selectedItem: '',
      regionSelections: {
        sidebarIndex: 0,
        treeIndex: 0,
        infoIndex: 0,
        footerIndex: 0,
      },
      regionScroll: {
        treeOffset: 0,
        infoOffset: 0,
      },
      collapsedPanels: {
        statsPanel: false,
        suggestionsPanel: false,
        treePanel: false,
        architecturePanel: false,
      },
      infoPanel: {
        contentType: 'no-selection',
        title: 'No Selection',
        description: ['Select an item in the sidebar or repository tree to view details.'],
      },
      treeData: null,
      repoAnalysis: null,
    },
  };
}
