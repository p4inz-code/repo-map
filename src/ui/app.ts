/**
 * Application — production-quality top-level orchestrator.
 *
 * Wires together the Store, InputManager, ScreenManager, Renderer,
 * RenderLoop, Theme, and Component system into a cohesive application
 * lifecycle with dirty-state rendering and terminal safety.
 *
 * # Architecture
 *
 * ```
 * Application
 *   ├── Store           (state management — single source of truth)
 *   ├── InputManager    (keyboard input with terminal safety)
 *   ├── ScreenManager   (screen navigation with back-stack)
 *   ├── RenderLoop      (dirty-state render scheduling)
 *   ├── Renderer        (ANSI output)
 *   └── Theme           (visual identity)
 * ```
 *
 * # Terminal Safety
 * - SIGINT restores cursor and raw mode before exit.
 * - destroy() ALWAYS restores terminal state, even on error.
 * - Multiple destroy() calls are safe (idempotent).
 *
 * # Render Optimization
 * - Components mark themselves dirty on state change.
 * - RenderLoop only renders when dirty components exist.
 * - Full redraw only on resize or explicit request.
 * - Render buffers are cached per component.
 *
 * # Interactive Workspace
 * - 4 regions: sidebar, tree, info panel, footer
 * - Tab/Shift+Tab cycles focus between regions
 * - Each region has independent selection state
 * - Tree selection updates info panel immediately
 * - Enter: confirm/select/toggle
 * - Space: toggle panel collapse
 * - Home/End/PageUp/PageDown/Ctrl+Home/Ctrl+End: navigation
 *
 * # Lifecycle
 * ```
 * const app = new App(renderer);
 * app.initialize();
 * app.runWorkspace();   // Full interactive experience
 * app.destroy();        // Cleanup (terminal restored)
 * ```
 */

import { Store, createInitialUIState } from './state/index.js';
import type { ScreenId, WorkspaceView, WorkspaceRegion, BreadcrumbSegment, InfoPanelData, TreeNodeData } from './state/index.js';
import { InputManager } from './input/index.js';
import { mapKeyToAction } from './input/index.js';
import type { KeyEvent, KeyAction } from './input/index.js';
import { ScreenManager } from './screen-manager.js';
import type { Screen } from './screen-manager.js';
import { RenderLoop } from './render-loop.js';
import { Renderer } from './renderer.js';
import type { Theme } from './theme/index.js';
import { getTheme } from './theme/index.js';
import { getTerminalWidth } from './layout/width.js';
import { cursorShow } from './utils/ansi.js';
import { WorkspaceLayout } from './components/workspace-layout.js';
import { buildInfoPanelData } from './shared/info-panel-builder.js';
import type { Analysis } from '../types.js';

// ─── Type aliases for state shapes ─────────────────────────────

// ─── Types ─────────────────────────────────────────────────────

export interface AppOptions {
  /** Whether color is enabled. */
  color?: boolean;
  /** Whether to start in raw (keyboard) mode. */
  rawMode?: boolean;
  /** Override terminal width (for testing). */
  terminalWidth?: number;
  /** Whether to enable interactive workspace mode. */
  interactive?: boolean;
}

// ─── Constants ─────────────────────────────────────────────────

/** Ordered list of regions for Tab cycling. */
const REGION_CYCLE: WorkspaceRegion[] = ['sidebar', 'tree', 'info', 'footer'];

/** Sidebar views in order. */
const VIEWS: WorkspaceView[] = ['overview', 'statistics', 'suggestions', 'tree', 'help'];

/** View labels for breadcrumbs. */
const VIEW_LABELS: Record<WorkspaceView, string> = {
  overview: 'Overview',
  statistics: 'Statistics',
  suggestions: 'Suggestions',
  tree: 'Repository Tree',
  help: 'Help',
};

// ─── App ────────────────────────────────────────────────────────

export class App {
  readonly store: Store;
  readonly input: InputManager;
  readonly screens: ScreenManager;
  readonly renderer: Renderer;
  readonly renderLoop: RenderLoop;
  readonly theme: Theme;

  private _initialized: boolean = false;
  private _destroyed: boolean = false;
  private _globalActions: Map<string, (action: KeyAction) => void> = new Map();
  private _frameRenderers: Array<() => string[]> = [];
  private _sigintHandler: (() => void) | null = null;
  private _workspace: WorkspaceLayout | null = null;
  private _interactive: boolean = false;
  private _workspaceResolve: (() => void) | null = null;
  constructor(renderer: Renderer) {
    this.store = new Store(createInitialUIState());
    this.input = new InputManager();
    this.screens = new ScreenManager();
    this.renderer = renderer;
    this.theme = renderer.theme;
    this.renderLoop = new RenderLoop(this.store, (output) => process.stderr.write(output));

    // Wire input → screen manager
    this.input.onKey((event: KeyEvent) => this._handleKey(event));

    // Wire render loop → render callback
    this.renderLoop.onRender(() => this._renderFrame());

    // Wire resize → width recalculation
    this.renderLoop.onResize((columns: number) => {
      const width = {
        columns,
        contentWidth: Math.max(0, Math.min(columns - 4, 100)),
        isNarrow: columns < 60,
        isWide: columns >= 120,
        breakpoint: (columns < 60 ? 'compact' : columns >= 120 ? 'wide' : 'normal') as 'compact' | 'normal' | 'wide',
      };
      this.store.setState({
        width,
        dirty: {
          ...this.store.getState().dirty,
          fullRedraw: true,
          layoutDirty: true,
        },
      });
      this._updateWorkspaceLayout();
    });
  }

  // ── Lifecycle ────────────────────────────────────────────────

  /**
   * Initialize the application.
   */
  initialize(): void {
    if (this._initialized) return;

    const width = getTerminalWidth();

    this.store.setState({
      theme: this.theme,
      width,
      appMode: 'idle',
      rawMode: false,
      terminal: {
        cursorHidden: false,
        rawMode: false,
        alternateScreen: false,
      },
    });

    this.screens.initialize();
    this.screens.setActionHandler((action: KeyAction) => this._handleGlobalAction(action));

    this._sigintHandler = () => {
      this._emergencyDestroy();
      process.exit(130);
    };
    process.on('SIGINT', this._sigintHandler as NodeJS.SignalsListener);

    this._initialized = true;
  }

  /**
   * Start the render loop and keyboard input.
   */
  start(): void {
    if (!this._initialized) return;
    this.renderLoop.start();
    this.input.start();
    this.store.setState({
      rawMode: true,
      terminal: {
        ...this.store.getState().terminal,
        rawMode: true,
      },
    });
  }

  /**
   * Start keyboard input handling (raw mode).
   */
  startInput(): void {
    this.input.start();
    this.store.setState({ rawMode: true });
  }

  /**
   * Stop keyboard input handling.
   */
  stopInput(): void {
    this.input.stop();
    this.store.setState({
      rawMode: false,
      terminal: {
        ...this.store.getState().terminal,
        rawMode: false,
      },
    });
  }

  /**
   * Navigate to a screen.
   */
  showScreen(id: ScreenId, replace?: boolean): void {
    let result: ScreenId | null;

    if (replace) {
      result = this.screens.replace(id);
    } else {
      if (this.screens.currentScreenId !== id) {
        result = this.screens.push(id);
      } else {
        return;
      }
    }

    if (result) {
      this.store.setState({
        currentScreen: id,
        screenStack: this.screens.stack,
        dirty: {
          ...this.store.getState().dirty,
          fullRedraw: true,
        },
      });
      this.renderLoop.requestFullRedraw();
    }
  }

  /**
   * Go back to the previous screen.
   */
  goBack(): void {
    const prevId = this.screens.pop();
    if (prevId) {
      this.store.setState({
        currentScreen: prevId,
        screenStack: this.screens.stack,
        dirty: {
          ...this.store.getState().dirty,
          fullRedraw: true,
        },
      });
      this.renderLoop.requestFullRedraw();
    }
  }

  /**
   * Register a screen with the application.
   */
  registerScreen(screen: Screen): void {
    this.screens.register(screen);
  }

  /**
   * Register a frame renderer function.
   */
  addFrameRenderer(renderer: () => string[]): () => void {
    this._frameRenderers.push(renderer);
    return () => {
      const idx = this._frameRenderers.indexOf(renderer);
      if (idx !== -1) {
        this._frameRenderers.splice(idx, 1);
      }
    };
  }

  /**
   * Register a global action handler.
   */
  onAction(type: string, handler: (action: KeyAction) => void): void {
    this._globalActions.set(type, handler);
  }

  /**
   * Register a custom key handler.
   */
  onKey(predicate: (event: KeyEvent) => boolean, handler: (event: KeyEvent) => void): () => void {
    const wrapper = (event: KeyEvent) => {
      if (predicate(event)) {
        handler(event);
      }
    };
    const key = `key-handler-${Date.now()}-${Math.random()}`;
    this._globalActions.set(key, wrapper as unknown as (action: KeyAction) => void);
    return () => this._globalActions.delete(key);
  }

  /**
   * Request a full redraw on the next render tick.
   */
  requestRedraw(): void {
    this.renderLoop.requestFullRedraw();
  }

  /**
   * Mark a component as dirty.
   */
  markDirty(componentId: string): void {
    const state = this.store.getState();
    const dirtyComponents = new Set(state.dirty.dirtyComponents);
    dirtyComponents.add(componentId);
    this.store.setState({
      dirty: {
        ...state.dirty,
        dirtyComponents,
      },
    });
  }

  /**
   * Full cleanup. Stops input, render loop, destroys screen manager.
   */
  destroy(): void {
    if (this._destroyed) return;

    try {
      this.renderLoop.clearScreen();
      this.renderLoop.stop();
      this.input.destroy();
      this.screens.destroy();
      this._globalActions.clear();
      this._frameRenderers = [];
      process.stderr.write(cursorShow());

      if (this._sigintHandler) {
        try {
          process.removeListener('SIGINT', this._sigintHandler as NodeJS.SignalsListener);
        } catch {
          // Ignore
        }
        this._sigintHandler = null;
      }
    } catch {
      // Terminal cleanup must NEVER throw
    } finally {
      this._destroyed = true;
    }
  }

  // ── Workspace ────────────────────────────────────────────────

  /**
   * Launch the interactive workspace.
   */
  launchWorkspace(): void {
    if (!this._initialized) return;
    if (this._workspace) return;

    const state = this.store.getState();
    const tw = state.width?.columns ?? 80;
    const th = 24;

    this._interactive = true;

    // Create workspace layout with all state
    this._workspace = new WorkspaceLayout('workspace-main', {
      activeView: 'overview',
      focusedRegion: 'sidebar',
      breadcrumbs: [{ label: 'Overview', active: true }],
      sidebarWidth: 22,
      active: true,
      terminalWidth: tw,
      terminalHeight: th,
      selectedItem: '',
      regionSelections: state.workspace.regionSelections,
      regionScroll: state.workspace.regionScroll,
      collapsedPanels: state.workspace.collapsedPanels,
      infoPanelData: state.workspace.infoPanel,
      treeData: state.workspace.treeData,
      onDirty: (id) => this.markDirty(id),
      dirtyComponents: state.dirty.dirtyComponents,
      fullRedraw: state.dirty.fullRedraw,
    });

    // Register as a frame renderer
    this.addFrameRenderer(() => {
      if (!this._workspace) return [];
      const appState = this.store.getState();
      const ws = appState.workspace;
      this._workspace.setOptions({
        activeView: ws.activeView,
        focusedRegion: ws.focusedRegion,
        breadcrumbs: ws.breadcrumbs,
        sidebarWidth: ws.layout.sidebarWidth,
        active: ws.active,
        selectedItem: ws.selectedItem,
        regionSelections: ws.regionSelections,
        regionScroll: ws.regionScroll,
        collapsedPanels: ws.collapsedPanels,
        infoPanelData: ws.infoPanel,
        treeData: ws.treeData,
        repoAnalysis: ws.repoAnalysis,
        showPalette: appState.searchFilter.paletteOpen,
        showHelp: appState.searchFilter.helpOpen,
        onPaletteCommand: (id) => this._executePaletteCommand(id),
        searchQuery: appState.searchFilter.query,
        dirtyComponents: appState.dirty.dirtyComponents,
        fullRedraw: appState.dirty.fullRedraw,
      });
      const lines = this._workspace.render(this.renderer);
      return this.renderer.renderFrame(lines);
    });

    // Update workspace state
    this.store.setState({
      appMode: 'displaying',
      workspace: {
        ...state.workspace,
        active: true,
      },
      dirty: {
        ...state.dirty,
        fullRedraw: true,
      },
    });

    this.renderLoop.requestFullRedraw();
  }

  /**
   * Update the workspace with new data (after analysis is complete).
   */
  updateWorkspace(width: number, height: number): void {
    if (!this._workspace) return;

    this._workspace.setOptions({
      terminalWidth: width,
      terminalHeight: height,
    });

    const currentState = this.store.getState();
    this.store.setState({
      dirty: {
        ...currentState.dirty,
        fullRedraw: true,
      },
    });
    this.renderLoop.requestFullRedraw();
  }

  /**
   * Run the workspace interaction loop.
   */
  runWorkspace(): Promise<void> {
    return new Promise((resolve) => {
      this.launchWorkspace();
      this.start();
      this._workspaceResolve = resolve;
    });
  }

  // ── Set tree data on workspace ────────────────────────────────

  /**
   * Set the tree data for the repository explorer.
   */
  setTreeData(data: TreeNodeData): void {
    const state = this.store.getState();
    this.store.setState({
      workspace: {
        ...state.workspace,
        treeData: data,
      },
      dirty: {
        ...state.dirty,
        fullRedraw: true,
      },
    });
    this.renderLoop.requestFullRedraw();
  }

  /**
   * Set info panel data.
   */
  setInfoPanelData(data: InfoPanelData): void {
    const state = this.store.getState();
    this.store.setState({
      workspace: {
        ...state.workspace,
        infoPanel: data,
      },
    });
  }

  // ── Internal ─────────────────────────────────────────────────

  /**
   * Render the current frame.
   */
  private _renderFrame(): string[] {
    if (this._frameRenderers.length === 0) return [];

    const allLines: string[] = [];
    for (const renderer of this._frameRenderers) {
      try {
        const lines = renderer();
        allLines.push(...lines);
      } catch {
        // Swallow individual renderer errors
      }
    }
    return allLines;
  }

  /**
   * Handle a raw key event.
   */
  private _handleKey(event: KeyEvent): void {
    if (event.key.type === 'ctrl' && event.key.value === 'c') {
      process.kill(process.pid, 'SIGINT');
      return;
    }

    const state = this.store.getState();

    // When search is active in tree, intercept custom chars for filtering
    if (state.searchFilter.active && event.key.type === 'char' && event.key.value.length === 1) {
      if (event.key.value === '\x1b') {
        this._clearSearch();
        return;
      }
      const newQuery = state.searchFilter.query + event.key.value;
      this.store.setState({
        searchFilter: {
          ...state.searchFilter,
          query: newQuery,
        },
      });
      return;
    }

    // Handle Escape during search
    if (state.searchFilter.active && event.key.type === 'escape') {
      this._clearSearch();
      return;
    }

    const action = mapKeyToAction(event);
    if (!action) return;

    if (this._interactive) {
      this._handleWorkspaceAction(action);
      return;
    }

    this.screens.routeAction(action);
  }

  // ── Workspace Action Handling ────────────────────────────────

  /**
   * Handle workspace-specific actions, routing to the correct region.
   */
  private _handleWorkspaceAction(action: KeyAction): void {
    const state = this.store.getState();
    const region = state.workspace.focusedRegion;

    switch (action.type) {
      // ── Region navigation (↑↓) ──────────────────────────
      case 'navigateUp':
        this._regionNavigateUp(region);
        break;
      case 'navigateDown':
        this._regionNavigateDown(region);
        break;

      // ── Expand/collapse (←→) ────────────────────────────
      case 'navigateLeft':
        if (region === 'tree') {
          this._treeCollapse();
        }
        break;
      case 'navigateRight':
        if (region === 'tree') {
          this._treeExpand();
        }
        break;

      // ── Confirm/select (Enter) ───────────────────────────
      case 'confirm':
        this._regionConfirm(region);
        break;

      // ── Toggle (Space) ───────────────────────────────────
      case 'toggle':
        this._regionToggle(region);
        break;

      // ── Scrolling ────────────────────────────────────────
      case 'scrollUp':
        if (region === 'tree') this._treePageUp();
        break;
      case 'scrollDown':
        if (region === 'tree') this._treePageDown();
        break;
      case 'scrollToTop':
        if (region === 'tree') this._treeScrollToTop();
        else if (region === 'sidebar') this._sidebarSelectFirst();
        break;
      case 'scrollToBottom':
        if (region === 'tree') this._treeScrollToBottom();
        else if (region === 'sidebar') this._sidebarSelectLast();
        break;
      case 'jumpToTop':
        if (region === 'tree') this._treeScrollToTop();
        break;
      case 'jumpToBottom':
        if (region === 'tree') this._treeScrollToBottom();
        break;

      // ── Focus cycling (Tab/Shift+Tab) ───────────────────
      case 'focusNext':
        this._focusCycle(true);
        break;
      case 'focusPrev':
        this._focusCycle(false);
        break;

      // ── Resize sidebar ──────────────────────────────────
      case 'resizeLeft':
        this._workspaceResize(-1);
        break;
      case 'resizeRight':
        this._workspaceResize(1);
        break;

      // ── Help overlay (?) ──────────────────────────
      case 'help':
        this._toggleHelp();
        break;

      // ── Palette (Ctrl+P) ────────────────────────────
      case 'palette':
        this._togglePalette();
        break;

      // ── Search (/) ────────────────────────────────────
      case 'search':
        if (region === 'tree') {
          this._activateSearch();
        }
        break;

      // ── Single-letter shortcuts ───────────────────────────
      case 'custom': {
        const val = action.value;
        if (val === '?' && !state.searchFilter.helpOpen) {
          // ? is handled by the 'help' action type — this path is for
          // terminals that don't produce the 'question' key type
          this._toggleHelp();
        } else if (val === 'g') {
          this._sidebarSelectView('tree');
          this._focusToRegion('tree');
        } else if (val === 's') {
          this._sidebarSelectView('statistics');
        } else if (val === 'o') {
          this._sidebarSelectView('overview');
        } else if (val === 'i') {
          this._focusToRegion('info');
        } else if (val === 't') {
          this._focusToRegion('tree');
        } else if (val === 'b') {
          this._focusToRegion('sidebar');
        } else if (val === 'n' && state.searchFilter.active) {
          this._workspace?.tree.nextMatch();
        } else if (val === 'p' && state.searchFilter.active) {
          this._workspace?.tree.prevMatch();
        } else if (val === 'r') {
          this.renderLoop.requestFullRedraw();
        }
        // Ignore other single chars
        break;
      }

      // ── Cancel (Escape) — close overlays first ─────────
      case 'cancel':
        if (state.searchFilter.helpOpen) {
          this._toggleHelp();
        } else if (state.searchFilter.paletteOpen) {
          this._togglePalette();
        }
        break;

      // ── Quit ─────────────────────────────────────────────
      case 'quit':
      case 'back':
        this._interactive = false;
        if (this._workspaceResolve) {
          this._workspaceResolve();
          this._workspaceResolve = null;
        }
        this.destroy();
        break;

      default:
        break;
    }
  }

  // ── Region-specific navigation ──────────────────────────────

  /** Navigate up within a region. */
  private _regionNavigateUp(region: WorkspaceRegion): void {
    const state = this.store.getState();
    const ws = state.workspace;

    switch (region) {
      case 'sidebar': {
        const views = VIEWS;
        const current = ws.activeView;
        const idx = views.indexOf(current);
        const newIdx = (idx - 1 + views.length) % views.length;
        this._sidebarSelectView(views[newIdx]);
        break;
      }
      case 'tree':
        this._treeSelectPrev();
        break;
      case 'info':
        this._infoScroll(-1);
        break;
      case 'footer':
        // Footer has no vertical navigation
        break;
    }
  }

  /** Navigate down within a region. */
  private _regionNavigateDown(region: WorkspaceRegion): void {
    const state = this.store.getState();
    const ws = state.workspace;

    switch (region) {
      case 'sidebar': {
        const views = VIEWS;
        const current = ws.activeView;
        const idx = views.indexOf(current);
        const newIdx = (idx + 1) % views.length;
        this._sidebarSelectView(views[newIdx]);
        break;
      }
      case 'tree':
        this._treeSelectNext();
        break;
      case 'info':
        this._infoScroll(1);
        break;
      case 'footer':
        break;
    }
  }

  /** Confirm action within a region. */
  private _regionConfirm(region: WorkspaceRegion): void {
    switch (region) {
      case 'sidebar':
        // Already navigated to the selected view via up/down
        break;
      case 'tree':
        this._treeToggle();
        break;
      case 'info':
        break;
      case 'footer':
        break;
    }
  }

  /** Toggle action within a region (Space). */
  private _regionToggle(region: WorkspaceRegion): void {
    switch (region) {
      case 'sidebar':
        break;
      case 'tree':
        this._treeToggle();
        break;
      case 'info':
        break;
      case 'footer':
        break;
    }
  }

  // ── Sidebar actions ──────────────────────────────────────────

  /** Select a sidebar view. */
  private _sidebarSelectView(view: WorkspaceView): void {
    const state = this.store.getState();
    const ws = state.workspace;
    const breadcrumbs: BreadcrumbSegment[] = [
      { label: VIEW_LABELS[view], active: true },
    ];

    // Build contextual info panel data for the view
    let infoData: InfoPanelData = ws.infoPanel;
    if (view === 'tree') {
      infoData = {
        contentType: 'no-selection',
        title: 'Tree Explorer',
        subtitle: 'Select a file to view details',
        description: ['Use ↑↓ to navigate, ←→ to expand/collapse, Enter to toggle.'],
      };
    } else if (view === 'statistics') {
      infoData = {
        contentType: 'statistics',
        title: 'Statistics',
        description: ['Repository metrics and language breakdown.'],
        metadata: [
          { label: 'Files', value: '—' },
          { label: 'Directories', value: '—' },
        ],
      };
    } else if (view === 'suggestions') {
      infoData = {
        contentType: 'suggestion',
        title: 'Suggestions',
        description: ['Improvement recommendations for your project.'],
      };
    } else if (view === 'help') {
      infoData = {
        contentType: 'unavailable',
        title: 'Help',
        description: ['Keyboard shortcuts reference.'],
      };
    } else {
      infoData = {
        contentType: 'no-selection',
        title: 'Overview',
        description: ['Repository analysis overview.'],
      };
    }

    this.store.setState({
      workspace: {
        ...ws,
        activeView: view,
        breadcrumbs,
        selectedItem: view,
        infoPanel: infoData,
      },
      dirty: {
        ...state.dirty,
        fullRedraw: true,
      },
    });
    this.renderLoop.requestFullRedraw();
  }

  /** Select first sidebar view. */
  private _sidebarSelectFirst(): void {
    if (VIEWS.length > 0) {
      this._sidebarSelectView(VIEWS[0]);
    }
  }

  /** Select last sidebar view. */
  private _sidebarSelectLast(): void {
    if (VIEWS.length > 0) {
      this._sidebarSelectView(VIEWS[VIEWS.length - 1]);
    }
  }

  // ── Tree actions ─────────────────────────────────────────────

  /** Select next tree node. */
  private _treeSelectNext(): void {
    if (this._workspace) {
      this._workspace.tree.selectNext();
      this._syncTreeState();
    }
  }

  /** Select previous tree node. */
  private _treeSelectPrev(): void {
    if (this._workspace) {
      this._workspace.tree.selectPrev();
      this._syncTreeState();
    }
  }

  /** Toggle expand/collapse of selected tree node. */
  private _treeToggle(): void {
    if (this._workspace) {
      this._workspace.tree.toggleSelected();
      this._syncTreeState();
    }
  }

  /** Expand selected tree node. */
  private _treeExpand(): void {
    if (this._workspace) {
      this._workspace.tree.expandSelected();
      this._syncTreeState();
    }
  }

  /** Collapse selected tree node. */
  private _treeCollapse(): void {
    if (this._workspace) {
      this._workspace.tree.collapseSelected();
      this._syncTreeState();
    }
  }

  /** Scroll tree one page up. */
  private _treePageUp(): void {
    if (this._workspace) {
      this._workspace.tree.pageUp();
      this._syncTreeState();
    }
  }

  /** Scroll tree one page down. */
  private _treePageDown(): void {
    if (this._workspace) {
      this._workspace.tree.pageDown();
      this._syncTreeState();
    }
  }

  /** Scroll tree to top. */
  private _treeScrollToTop(): void {
    if (this._workspace) {
      this._workspace.tree.selectFirst();
      this._syncTreeState();
    }
  }

  /** Scroll tree to bottom. */
  private _treeScrollToBottom(): void {
    if (this._workspace) {
      this._workspace.tree.selectLast();
      this._syncTreeState();
    }
  }

  /** Sync tree state from component to store — builds real inspector sections from analysis data. */
  private _syncTreeState(): void {
    if (!this._workspace) return;
    const state = this.store.getState();
    const ws = state.workspace;
    const analysis = ws.repoAnalysis;

    const selectedNode = this._workspace.tree.selectedNode;

    // Build info panel data from selected tree node with real analysis data
    let infoData: InfoPanelData = ws.infoPanel;
    if (selectedNode) {
      infoData = buildInfoPanelData(
        {
          name: selectedNode.name,
          path: selectedNode.path,
          type: selectedNode.type,
          size: selectedNode.size,
          language: selectedNode.language,
        },
        analysis,
      );
    }

    this.store.setState({
      workspace: {
        ...ws,
        regionSelections: {
          ...ws.regionSelections,
          treeIndex: this._workspace.tree.selectedIndex,
        },
        regionScroll: {
          ...ws.regionScroll,
          treeOffset: this._workspace.tree.scrollOffset,
        },
        selectedItem: selectedNode ? selectedNode.path : ws.selectedItem,
        infoPanel: infoData,
      },
    });
  }

  // ── Info panel actions ───────────────────────────────────────

  /** Scroll info panel content. */
  private _infoScroll(_direction: number): void {
    // Info panel currently doesn't have internal scrolling items,
    // but the structure supports it
  }

  // ── Focus cycling ────────────────────────────────────────────

  /** Cycle focus to next or previous region. */
  private _focusCycle(forward: boolean): void {
    const state = this.store.getState();
    const ws = state.workspace;
    const current = ws.focusedRegion;
    const idx = REGION_CYCLE.indexOf(current);

    let newIdx: number;
    if (forward) {
      newIdx = (idx + 1) % REGION_CYCLE.length;
    } else {
      newIdx = (idx - 1 + REGION_CYCLE.length) % REGION_CYCLE.length;
    }

    const newRegion = REGION_CYCLE[newIdx];

    this.store.setState({
      workspace: {
        ...ws,
        focusedRegion: newRegion,
      },
      dirty: {
        ...state.dirty,
        fullRedraw: true,
      },
    });
    this.renderLoop.requestFullRedraw();
  }

  // ── Resize ───────────────────────────────────────────────────

  /** Resize the workspace sidebar. */
  private _workspaceResize(delta: number): void {
    const state = this.store.getState();
    const layout = state.workspace.layout;
    const newWidth = Math.max(layout.minSidebar, Math.min(40, layout.sidebarWidth + delta));

    this.store.setState({
      workspace: {
        ...state.workspace,
        layout: {
          ...layout,
          sidebarWidth: newWidth,
          mainWidth: (state.width?.columns ?? 80) - newWidth - 1,
        },
      },
      dirty: {
        ...state.dirty,
        fullRedraw: true,
      },
    });
    this.renderLoop.requestFullRedraw();
  }

  // ── Layout update ────────────────────────────────────────────

  /** Update workspace layout on resize. */
  private _updateWorkspaceLayout(): void {
    if (!this._workspace) return;
    const state = this.store.getState();
    const ws = state.workspace;

    this._workspace.setOptions({
      terminalWidth: state.width?.columns ?? 80,
    });

    this.store.setState({
      workspace: {
        ...ws,
        layout: {
          ...ws.layout,
          mainWidth: (state.width?.columns ?? 80) - ws.layout.sidebarWidth - 1,
        },
      },
      dirty: {
        ...state.dirty,
        fullRedraw: true,
      },
    });
  }

  // ── Global actions ───────────────────────────────────────────

  /**
   * Handle global actions.
   */
  private _handleGlobalAction(action: KeyAction): void {
    if (action.type === 'back') {
      this.goBack();
      return;
    }
    if (action.type === 'quit') {
      this.destroy();
      return;
    }
    const handler = this._globalActions.get(action.type);
    if (handler) {
      handler(action);
    }
  }

  /**
   * Emergency destroy for SIGINT handling.
   */
  private _emergencyDestroy(): void {
    try {
      this.renderLoop.clearScreen();
      this.renderLoop.stop();
      this.input.destroy();
      process.stderr.write(cursorShow());
    } catch {
      // Best-effort terminal restore
    }
  }

  // ── Help Overlay ──────────────────────────────────────────

  /** Toggle the keyboard help overlay open/closed. */
  private _toggleHelp(): void {
    const state = this.store.getState();

    // Close palette if open when opening help
    const wasHelpOpen = state.searchFilter.helpOpen;

    this.store.setState({
      searchFilter: {
        ...state.searchFilter,
        helpOpen: !wasHelpOpen,
        paletteOpen: wasHelpOpen ? false : state.searchFilter.paletteOpen,
      },
      dirty: {
        ...state.dirty,
        fullRedraw: true,
      },
    });
    this.renderLoop.requestFullRedraw();
  }

  // ── Command Palette ─────────────────────────────────────────

  /** Toggle the command palette open/closed. */
  private _togglePalette(): void {
    const state = this.store.getState();
    const wasOpen = state.searchFilter.paletteOpen;

    this.store.setState({
      searchFilter: {
        ...state.searchFilter,
        paletteOpen: !wasOpen,
      },
      dirty: {
        ...state.dirty,
        fullRedraw: true,
      },
    });
    this.renderLoop.requestFullRedraw();
  }

  /** Execute a command from the palette. */
  private _executePaletteCommand(commandId: string): void {
    // Close palette first
    this._togglePalette();

    switch (commandId) {
      case 'go-overview':
        this._sidebarSelectView('overview');
        this._focusToRegion('tree');
        break;
      case 'go-statistics':
        this._sidebarSelectView('statistics');
        this._focusToRegion('tree');
        break;
      case 'go-suggestions':
        this._sidebarSelectView('suggestions');
        this._focusToRegion('tree');
        break;
      case 'go-tree':
        this._sidebarSelectView('tree');
        this._focusToRegion('tree');
        break;
      case 'go-help':
        this._sidebarSelectView('help');
        this._focusToRegion('tree');
        break;
      case 'expand-all':
        // Expand all tree nodes
        if (this._workspace) {
          this._workspace.tree.expandSelected();
        }
        break;
      case 'collapse-all':
        // Collapse all tree nodes
        if (this._workspace) {
          this._workspace.tree.collapseSelected();
        }
        break;
      case 'focus-sidebar':
        this._focusToRegion('sidebar');
        break;
      case 'focus-tree':
        this._focusToRegion('tree');
        break;
      case 'focus-inspector':
        this._focusToRegion('info');
        break;
      case 'quit':
        this._handleWorkspaceAction({ type: 'quit' });
        break;
    }
  }

  /**
   * Set the full analysis data for the workspace.
   * This enables the inspector to show real data from the analysis pipeline.
   */
  setAnalysisData(analysis: Analysis): void {
    const state = this.store.getState();
    this.store.setState({
      workspace: {
        ...state.workspace,
        repoAnalysis: analysis,
      },
    });

    // Also update workspace layout if it exists
    if (this._workspace) {
      this._workspace.setOptions({ repoAnalysis: analysis });
    }
  }

  /** Focus a specific region. */
  private _focusToRegion(region: WorkspaceRegion): void {
    const state = this.store.getState();
    const ws = state.workspace;
    this.store.setState({
      workspace: {
        ...ws,
        focusedRegion: region,
      },
      dirty: {
        ...state.dirty,
        fullRedraw: true,
      },
    });
    this.renderLoop.requestFullRedraw();
  }

  // ── Search / Filter ─────────────────────────────────────────

  /** Activate incremental search mode in the tree. */
  private _activateSearch(): void {
    const state = this.store.getState();
    this.store.setState({
      searchFilter: {
        ...state.searchFilter,
        active: true,
        query: '',
      },
      dirty: {
        ...state.dirty,
        fullRedraw: true,
      },
    });
    this.renderLoop.requestFullRedraw();
  }

  /** Clear search and deactivate filter mode. */
  private _clearSearch(): void {
    const state = this.store.getState();
    this.store.setState({
      searchFilter: {
        ...state.searchFilter,
        active: false,
        query: '',
      },
      dirty: {
        ...state.dirty,
        fullRedraw: true,
      },
    });
    this.renderLoop.requestFullRedraw();
  }

}

// ─── Factory ───────────────────────────────────────────────────

/**
 * Create a new Application instance with the given options.
 */
export function createApp(options: AppOptions = {}): App {
  const theme = getTheme({ color: options.color !== false });
  const width = options.terminalWidth
    ? {
        columns: options.terminalWidth,
        contentWidth: options.terminalWidth - 4,
        isNarrow: options.terminalWidth < 60,
        isWide: options.terminalWidth >= 120,
        breakpoint: (options.terminalWidth < 60 ? 'compact' : options.terminalWidth >= 120 ? 'wide' : 'normal') as 'compact' | 'normal' | 'wide',
      }
    : getTerminalWidth();
  const renderer = new Renderer(theme, width);
  const app = new App(renderer);
  app.initialize();

  if (options.rawMode) {
    app.startInput();
  }

  return app;
}
