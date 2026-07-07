/**
 * AppShellV2 — production application shell that wires all v2 systems together.
 *
 * Orchestrates:
 * - Theme Engine v2
 * - Layout Engine v2
 * - LayerRenderer v2 (dirty rectangles, double buffering, frame diffing)
 * - Focus Manager
 * - Resize Manager
 * - Animation Scheduler
 * - V2 State Store
 * - Screen Manager v2 (dynamic registration, lifecycle hooks)
 * - Input Manager v2 (centralized keyboard routing)
 * - All layers: Header, Sidebar, Workspace, Status Bar, Overlays
 *
 * # Initialization Order
 * 1. State Store
 * 2. Theme Engine
 * 3. Input Manager
 * 4. Focus Manager
 * 5. Resize Manager
 * 6. Screen Manager + Register screens
 * 7. LayerRenderer
 * 8. Layout Engine
 * 9. Animation Scheduler
 * 10. Render Loop
 *
 * # Layer Stack (bottom to top)
 * - z=0: Workspace (main content)
 * - z=1: Sidebar
 * - z=2: Inspector
 * - z=4: Header
 * - z=5: Status Bar
 * - z=10: Command Palette overlay
 * - z=20: Modal layer
 * - z=30: Notification layer
 *
 * # Dirty-Rectangle Flow
 * Each tick:
 * 1. Check which layers are dirty via store.getState().dirty
 * 2. Only re-render dirty layers
 * 3. Compose all layers by z-order
 * 4. Diff against previous frame and write only changed cells
 * 5. Clear dirty flags
 */

import { LayerRenderer, type RenderContext } from './renderer/renderer.js';
import { getThemeV2, type ThemeV2 } from './theme/index.js';
import { FocusManager } from './focus/manager.js';
import { ResizeManager } from './resize/manager.js';
import { AnimationScheduler } from './animation/scheduler.js';
import { ScreenManagerV2, type ScreenV2 } from './screen-manager.js';
import { InputManagerV2 } from './input.js';
import { V2Store, createInitialV2State, type V2AppState } from './state.js';
import { HeaderComponent } from './layers/header.js';
import { SidebarComponent } from './layers/sidebar.js';
import { StatusBarComponent } from './layers/status-bar.js';
import { ModalLayer, NotificationLayer } from './layers/overlays.js';
import { WorkspacePanel } from './layers/workspace.js';
import { CommandPalette } from './command-palette.js';
import { SearchManager, renderSearchBar } from './search.js';
import { ScrollView } from './scroll-view.js';
import { DataTable } from './data-table.js';
import { DashboardScreen } from './screens/dashboard.js';
import { ScanScreen } from './screens/scan.js';
import { ResultsScreen } from './screens/results.js';
import { HelpScreen } from './screens/help.js';
import { SettingsScreen } from './screens/settings.js';
import { ErrorScreen } from './screens/error.js';
import { ArchitectureScreen } from './screens/architecture.js';
import { DependenciesScreen } from './screens/dependencies.js';
import { InsightsScreen } from './screens/insights.js';
import { SuggestionsScreen } from './screens/suggestions.js';
import { HistoryScreen } from './screens/history.js';
import { AboutScreen } from './screens/about.js';
import { PluginsScreen } from './screens/plugins.js';
import { LoadingScreen } from './screens/loading.js';
import { EmptyStateScreen } from './screens/empty.js';

import type { Line } from './renderer/types.js';
import type { Analysis } from '../../types.js';
import type { TreeNodeData } from '../state/types.js';
import { cursorShow } from '../utils/ansi.js';

// ─── Constants ────────────────────────────────────────────────────

/** Ordered sidebar items (for keyboard navigation). */
const SIDEBAR_IDS = [
  'dashboard', 'scan', 'results', 'architecture', 'dependencies',
  'insights', 'suggestions', 'history', 'settings', 'about',
  'plugins',
];

/** Layer IDs used for dirty-rectangle tracking. */
const LAYER_IDS = [
  'workspace', 'sidebar', 'header', 'status',
  'search', 'palette', 'modal', 'notifications',
] as const;

type LayerId = (typeof LAYER_IDS)[number];

// ─── AppShellV2 ───────────────────────────────────────────────────

export class AppShellV2 {
  // Core systems
  readonly store: V2Store;
  readonly theme: ThemeV2;
  readonly renderer: LayerRenderer;
  readonly focus: FocusManager;
  readonly resize: ResizeManager;
  readonly animation: AnimationScheduler;
  readonly screens: ScreenManagerV2;
  readonly input: InputManagerV2;

  // Layers
  readonly header: HeaderComponent;
  readonly sidebar: SidebarComponent;
  readonly statusBar: StatusBarComponent;
  readonly modal: ModalLayer;
  readonly notification: NotificationLayer;
  readonly workspace: WorkspacePanel;
  readonly palette: CommandPalette;
  readonly search: SearchManager;
  readonly dataTable: DataTable;

  // Screens (all registered for 1-9 navigation)
  readonly dashboardScreen: DashboardScreen;
  readonly scanScreen: ScanScreen;
  readonly resultsScreen: ResultsScreen;
  readonly helpScreen: HelpScreen;
  readonly settingsScreen: SettingsScreen;
  readonly errorScreen: ErrorScreen;
  readonly architectureScreen: ArchitectureScreen;
  readonly dependenciesScreen: DependenciesScreen;
  readonly insightsScreen: InsightsScreen;
  readonly suggestionsScreen: SuggestionsScreen;
  readonly historyScreen: HistoryScreen;
  readonly aboutScreen: AboutScreen;
  readonly pluginsScreen: PluginsScreen;
  readonly loadingScreen: LoadingScreen;
  readonly emptyStateScreen: EmptyStateScreen;

  /** Render loop timer. */
  private _renderTimer: ReturnType<typeof setInterval> | null = null;

  /** Whether the shell has been initialized. */
  private _initialized: boolean = false;

  /** Whether the shell has been destroyed. */
  private _destroyed: boolean = false;

  /** Cached previous frame lines per layer for diffing. */
  private _prevLayerFrame: Map<string, string[]> = new Map();

  /**
   * Dirty-layer flags: if true, that layer must be re-rendered this frame.
   * Layers start dirty so the first frame renders everything.
   */
  private _dirtyLayers: Set<string> = new Set(LAYER_IDS);

  /** SIGINT handler reference. */
  private _sigintHandler: (() => void) | null = null;

  /** Full-screen redraw requested (e.g., on resize). */
  private _forceFullRedraw: boolean = false;

  constructor() {
    // 1. Create state store
    this.store = new V2Store();

    // 2. Create theme
    this.theme = getThemeV2();
    this.store.setState({ theme: this.theme });

    // 3. Create input manager
    this.input = new InputManagerV2();

    // 4. Create focus manager
    this.focus = new FocusManager();

    // 5. Create renderer
    const width = process.stdout.columns ?? 80;
    const height = process.stdout.rows ?? 24;
    this.renderer = new LayerRenderer({ width, height, theme: this.theme });

    // 6. Create resize manager
    this.resize = new ResizeManager();
    this.resize.onResize((w, h) => {
      this.store.setState({ terminalWidth: w, terminalHeight: h });
      this.renderer.resize(w, h);
      this.store.updateSlice('header', { terminalSize: `${w}x${h}` });
      // On resize, dirty all layers for full redraw
      this._markAllLayersDirty();
      this._forceFullRedraw = true;
    });

    // 7. Create animation scheduler
    this.animation = new AnimationScheduler();
    this.animation.onFrame(() => {
      this._dirtyLayers.add('workspace');
    });

    // 8. Create layers
    this.header = new HeaderComponent({ store: this.store });
    this.sidebar = new SidebarComponent({ store: this.store });
    this.statusBar = new StatusBarComponent({ store: this.store });
    this.modal = new ModalLayer({ store: this.store });
    this.notification = new NotificationLayer({ store: this.store });
    this.workspace = new WorkspacePanel({ store: this.store });
    this.palette = new CommandPalette();
    this.search = new SearchManager(this.store);
    this.dataTable = new DataTable();

    // 9. Create all screens
    this.dashboardScreen = new DashboardScreen(this.store);
    this.scanScreen = new ScanScreen(this.store);
    this.resultsScreen = new ResultsScreen(this.store);
    this.helpScreen = new HelpScreen(this.store);
    this.settingsScreen = new SettingsScreen(this.store);
    this.errorScreen = new ErrorScreen(this.store);
    this.architectureScreen = new ArchitectureScreen(this.store);
    this.dependenciesScreen = new DependenciesScreen(this.store);
    this.insightsScreen = new InsightsScreen(this.store);
    this.suggestionsScreen = new SuggestionsScreen(this.store);
    this.historyScreen = new HistoryScreen(this.store);
    this.aboutScreen = new AboutScreen(this.store);
    this.pluginsScreen = new PluginsScreen(this.store);
    this.loadingScreen = new LoadingScreen(this.store);
    this.emptyStateScreen = new EmptyStateScreen(this.store);

    // 10. Create screen manager & register all screens
    this.screens = new ScreenManagerV2();
    this.screens.registerInstance('dashboard', this.dashboardScreen);
    this.screens.registerInstance('scan', this.scanScreen);
    this.screens.registerInstance('results', this.resultsScreen);
    this.screens.registerInstance('help', this.helpScreen);
    this.screens.registerInstance('settings', this.settingsScreen);
    this.screens.registerInstance('error', this.errorScreen);
    this.screens.registerInstance('architecture', this.architectureScreen);
    this.screens.registerInstance('dependencies', this.dependenciesScreen);
    this.screens.registerInstance('insights', this.insightsScreen);
    this.screens.registerInstance('suggestions', this.suggestionsScreen);
    this.screens.registerInstance('history', this.historyScreen);
    this.screens.registerInstance('about', this.aboutScreen);
    this.screens.registerInstance('plugins', this.pluginsScreen);
    this.screens.registerInstance('loading', this.loadingScreen);
    this.screens.registerInstance('empty', this.emptyStateScreen);

    // Wire screen changes → update sidebar selection
    this.screens.onChange((id) => {
      if (id) {
        this.store.updateSlice('sidebar', { selectedId: id });
        this._dirtyLayers.add('sidebar');
        this._dirtyLayers.add('workspace');
      }
    });

    // Wire command palette
    this.palette.onCommand((id) => this._handlePaletteCommand(id));

    // Wire search jump
    this.search.onJump((result) => {
      this.store.addNotification({
        message: `Search result: ${result.item.text}`,
        severity: 'info',
        duration: 2000,
      });
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────

  initialize(): void {
    if (this._initialized) return;

    const width = process.stdout.columns ?? 80;
    const height = process.stdout.rows ?? 24;
    this.store.setState({
      terminalWidth: width,
      terminalHeight: height,
      v2Active: true,
    });

    this.store.updateSlice('header', {
      projectName: 'repo-map',
      terminalSize: `${width}x${height}`,
    });

    this.focus.onFocusChange((id) => {
      if (id) this._dirtyLayers.add(id);
    });

    this._registerShortcuts();
    this.resize.start();

    this._sigintHandler = () => {
      this._emergencyDestroy();
      process.exit(130);
    };
    process.on('SIGINT', this._sigintHandler as NodeJS.SignalsListener);

    // Create render layers
    this.renderer.createLayer('workspace', { zIndex: 0 });
    this.renderer.createLayer('sidebar', { zIndex: 1 });
    this.renderer.createLayer('header', { zIndex: 4 });
    this.renderer.createLayer('status', { zIndex: 5 });
    this.renderer.createLayer('search', { zIndex: 8 });
    this.renderer.createLayer('palette', { zIndex: 10 });
    this.renderer.createLayer('modal', { zIndex: 20 });
    this.renderer.createLayer('notifications', { zIndex: 30 });

    // Start render loop immediately so scanning/analyzing progress is visible
    this.input.start();
    this.animation.start();
    this._renderTimer = setInterval(() => this._tick(), 33);

    this.screens.navigate('dashboard');
    this._initialized = true;
  }

  /**
   * Start is a no-op now — render loop starts in initialize().
   * Kept for API compatibility.
   */
  start(): void {
    // Render loop already running from initialize()
  }

  stop(): void {
    if (this._renderTimer !== null) {
      clearInterval(this._renderTimer);
      this._renderTimer = null;
    }
    this.input.stop();
    this.animation.stop();
  }

  destroy(): void {
    if (this._destroyed) return;
    try {
      this.stop();
      this.resize.stop();
      this.screens.destroy();
      this.input.destroy();
      this.store.clear();
      process.stderr.write(cursorShow());
      if (this._sigintHandler) {
        try {
          process.removeListener('SIGINT', this._sigintHandler as NodeJS.SignalsListener);
        } catch { /* ignore */ }
        this._sigintHandler = null;
      }
    } catch { /* swallow */ }
    finally { this._destroyed = true; }
  }

  // ── UISession API ─────────────────────────────────────────────

  startScanning(projectName: string): void {
    this.store.setState({ appMode: 'scanning' });
    this.store.updateSlice('header', { projectName, currentMode: 'scanning' });
    this.store.updateSlice('statusBar', {
      message: `Scanning ${projectName}...`,
      backgroundTask: 'Scanning files',
      progress: 0,
    });
    this.screens.navigate('loading');
    this._dirtyLayers.add('workspace');
    this._dirtyLayers.add('status');
  }

  updateScanProgress(files: number, dirs: number, total?: number): void {
    const progress = total ? Math.round((files / total) * 100) : -1;
    this.store.updateSlice('statusBar', { progress, scanSpeed: files, message: `Scanned ${files} files, ${dirs} directories` });
    this._dirtyLayers.add('status');
  }

  finishScanning(files: number, dirs: number): void {
    this.store.updateSlice('statusBar', {
      message: `✓ Scanned ${files} files, ${dirs} directories`,
      progress: -1, backgroundTask: '',
    });
    this._dirtyLayers.add('status');
  }

  startAnalyzing(): void {
    this.store.setState({ appMode: 'analyzing' });
    this.store.updateSlice('header', { currentMode: 'analyzing' });
    this.store.updateSlice('statusBar', { message: 'Analyzing repository...', backgroundTask: 'Running analysis' });
    this.screens.navigate('loading');
    this._dirtyLayers.add('workspace');
    this._dirtyLayers.add('status');
  }

  finishAnalyzing(elapsed: number): void {
    this.store.updateSlice('statusBar', { message: `✓ Done in ${elapsed.toFixed(1)}s`, backgroundTask: '', progress: -1 });
    this.store.updateSlice('header', { currentMode: 'results' });
    this.store.setState({ appMode: 'results' });
    this._dirtyLayers.add('workspace');
    this._dirtyLayers.add('status');
  }

  setAnalysisData(analysis: Analysis): void {
    this.store.setState({ analysis });
    this.store.updateSlice('header', { projectName: analysis.projectName });
    this.store.updateSlice('statusBar', { errors: 0, warnings: 0 });
    this.resultsScreen.onEnter();
    this._dirtyLayers.add('workspace');
    this._dirtyLayers.add('sidebar');
  }

  setTreeData(_data: TreeNodeData): void {
    // Available for future tree rendering
  }

  renderCompletion(analysis: Analysis, outputPath?: string): void {
    this.setAnalysisData(analysis);
    this.screens.navigate('results');
    if (outputPath) {
      this.store.addNotification({ message: `Output written to ${outputPath}`, severity: 'success', duration: 5000 });
    }
  }

  reportError(message: string, suggestion?: string): void {
    this.errorScreen.setError(message, suggestion);
    this.screens.navigate('error');
  }

  renderHelp(): void {
    this.screens.navigate('help');
  }

  // ── Internal ─────────────────────────────────────────────────

  /** Mark all layers as needing redraw. */
  private _markAllLayersDirty(): void {
    for (const id of LAYER_IDS) {
      this._dirtyLayers.add(id);
    }
  }

  /**
   * Main render tick.
   * Only re-renders layers that are dirty, then composes by z-order.
   */
  private _tick(): void {
    const tickStart = performance.now();

    const w = this.store.getState().terminalWidth || 80;
    const h = this.store.getState().terminalHeight || 24;
    const state = this.store.getState();

    const fullRedraw = this._forceFullRedraw;
    const ctx: RenderContext = {
      theme: this.theme,
      width: w,
      height: h,
      layerId: '',
      fullRedraw,
    };

    // ── Conditionally re-render dirty layers ──────────────────

    // Layer 1: Sidebar (z=1)
    if (this._dirtyLayers.has('sidebar') || fullRedraw) {
      const sidebarCtx = { ...ctx, layerId: 'sidebar' };
      const sidebarLines = this.sidebar.render(sidebarCtx);
      this.renderer.renderLines('sidebar', sidebarLines);
      this._dirtyLayers.delete('sidebar');
    }

    // Layer 2: Workspace (z=0) — main content area
    if (this._dirtyLayers.has('workspace') || fullRedraw) {
      const workspaceCtx = { ...ctx, layerId: 'workspace' };
      const activeScreen = this.screens.activeScreen;
      const screenContent = activeScreen?.render(workspaceCtx) ?? [];
      const wsLines = this._composeWorkspace(screenContent, w, h, ctx);
      this.renderer.renderLines('workspace', wsLines);
      this._dirtyLayers.delete('workspace');
    }

    // Layer 3: Header (z=4)
    if (this._dirtyLayers.has('header') || fullRedraw) {
      const headerCtx = { ...ctx, layerId: 'header', height: 2 };
      const headerLines = this.header.render(headerCtx);
      this.renderer.renderLines('header', headerLines);
      this._dirtyLayers.delete('header');
    }

    // Layer 4: Status bar (z=5)
    if (this._dirtyLayers.has('status') || fullRedraw) {
      const statusCtx = { ...ctx, layerId: 'status', height: 1 };
      const statusLines = this.statusBar.render(statusCtx);
      this.renderer.renderLines('status', statusLines);
      this._dirtyLayers.delete('status');
    }

    // Layer 5: Search overlay (z=8) — rendered above workspace, below palette
    if ((this._dirtyLayers.has('search') || fullRedraw) && this.search.isActive) {
      const searchCtx = { ...ctx, layerId: 'search' };
      const searchBar = renderSearchBar(this.theme, {
        query: this.search.query,
        resultCount: this.search.getResults().length,
        selectedIndex: this.store.getState().search.selectedMatch ?? 0,
        isActive: true,
        viewportWidth: w,
      });
      // Offset search bar below the 2-row header so it doesn't overlay it
      const headerOffset = 2;
      const offsetLines: Line[] = [];
      for (let i = 0; i < headerOffset; i++) {
        offsetLines.push({ segments: [{ text: '' }] });
      }
      this.renderer.renderLines('search', [...offsetLines, ...searchBar]);
      this._dirtyLayers.delete('search');
    } else if (!this.search.isActive && this._prevLayerFrame.has('search')) {
      // Search was active but now closed — clear its layer
      this.renderer.renderLines('search', []);
      this._prevLayerFrame.delete('search');
    }

    // Layer 6: Command palette overlay (z=10)
    if ((this._dirtyLayers.has('palette') || fullRedraw) && state.palette.open) {
      const paletteCtx = { ...ctx, layerId: 'palette' };
      const paletteLines = this.palette.render(paletteCtx);
      this.renderer.renderLines('palette', paletteLines);
      this._dirtyLayers.delete('palette');
    } else if (!state.palette.open && this._prevLayerFrame.has('palette')) {
      // Palette was open but now closed — clear its layer
      this.renderer.renderLines('palette', []);
      this._prevLayerFrame.delete('palette');
    }

    // Layer 6: Modal (z=20)
    if ((this._dirtyLayers.has('modal') || fullRedraw) && state.modal.visible) {
      const modalCtx = { ...ctx, layerId: 'modal' };
      const modalLines = this.modal.render(modalCtx);
      this.renderer.renderLines('modal', modalLines);
      this._dirtyLayers.delete('modal');
    } else if (!state.modal.visible && this._prevLayerFrame.has('modal')) {
      this.renderer.renderLines('modal', []);
      this._prevLayerFrame.delete('modal');
    }

    // Layer 7: Notifications (z=30)
    if ((this._dirtyLayers.has('notifications') || fullRedraw) && state.notifications.length > 0) {
      const notifCtx = { ...ctx, layerId: 'notifications' };
      const notifLines = this.notification.render(notifCtx);
      this.renderer.renderLines('notifications', notifLines);
      this._dirtyLayers.delete('notifications');
    }

    // ── Compose and flush ──────────────────────────────────
    this.renderer.compose();
    const flushStats = this.renderer.flush();

    // Update performance metrics
    const frameTime = performance.now() - tickStart;
    this.store.updateFrameTime(frameTime);

    // Periodically update header info (not every frame to reduce noise)
    if (state.frameCount % 5 === 0) {
      this.store.updateSlice('header', {
        fps: this.store.getState().fps,
        clock: new Date().toLocaleTimeString(),
      });
    }

    // Reset full-redraw flag
    this._forceFullRedraw = false;

    // Clear store dirty set
    this.store.clearDirty();
  }

  /**
   * Compose the workspace: sidebar + main content + inspector.
   */
  private _composeWorkspace(screenContent: Line[], w: number, h: number, _ctx: RenderContext): Line[] {
    const state = this.store.getState();
    const sidebarW = state.sidebar.collapsed ? 3 : state.sidebar.width;
    const mainW = w - sidebarW - 31;
    const inspectorW = 30;
    const contentH = h - 4;

    const lines: Line[] = [];
    const sidebarTexts = (this.sidebar.getCachedLines() ?? []).map((l) => l.segments[0]?.text ?? '');
    const screenTexts = screenContent.map((l) => l.segments.map((s) => s.text).join(''));

    const maxLines = Math.min(Math.max(sidebarTexts.length, screenTexts.length), contentH);

    for (let i = 0; i < maxLines; i++) {
      const sidebarPart = sidebarTexts[i]?.slice(0, sidebarW) ?? ' '.repeat(sidebarW);
      const screenPart = screenTexts[i]?.slice(0, mainW) ?? ' '.repeat(mainW);
      const inspectorPart = this._inspectorLine(i, inspectorW);
      lines.push({
        segments: [
          { text: sidebarPart.padEnd(sidebarW) },
          { text: '│', style: { dim: true } },
          { text: screenPart.padEnd(mainW) },
          { text: '│', style: { dim: true } },
          { text: inspectorPart.padEnd(inspectorW) },
        ],
      });
    }
    // Fill remaining lines
    for (let i = maxLines; i < contentH; i++) {
      lines.push({
        segments: [
          { text: ' '.repeat(sidebarW) },
          { text: '│', style: { dim: true } },
          { text: ' '.repeat(mainW) },
          { text: '│', style: { dim: true } },
          { text: ' '.repeat(inspectorW) },
        ],
      });
    }
    return lines;
  }

  private _inspectorLine(lineIndex: number, _width: number): string {
    const state = this.store.getState();
    const an = state.analysis;
    const sep = this.theme.glyph('separator');
    if (!an) return '';
    if (lineIndex === 0) return ` ${this.theme.glyph('stats')} Inspector`;
    if (lineIndex === 1) return ' ' + sep.repeat(14);
    if (lineIndex === 2) return ` Files: ${an.stats.totalFiles}`;
    if (lineIndex === 3) return ` Dirs:  ${an.stats.totalDirectories}`;
    if (lineIndex === 4) return ` Health: ${an.intelligence.health.overall}/100`;
    if (lineIndex === 5) return ` Class: ${an.intelligence.classification.category}`;
    return '';
  }

  // ── Keyboard Shortcuts ───────────────────────────────────────

  private _registerShortcuts(): void {
    this.input.registerGlobal('ctrl-p', () => {
      const pState = this.store.getState().palette;
      this.store.setState({ palette: { ...pState, open: !pState.open } });
      this._dirtyLayers.add('palette');
    });

    this.input.registerGlobal('ctrl-c', () => {
      process.kill(process.pid, 'SIGINT');
    });

    this.input.registerGlobal('q', () => {
      this.destroy();
      process.exit(0);
    });

    this.input.registerGlobal('?', () => {
      this.screens.navigate('help');
    });

    this.input.registerGlobal('escape', () => {
      const curState = this.store.getState();
      if (curState.palette.open) {
        this.store.setState({ palette: { ...curState.palette, open: false } });
        this._dirtyLayers.delete('palette');
      } else if (this.search.isActive) {
        this.search.deactivate();
        this._dirtyLayers.add('search');
        this._dirtyLayers.add('workspace');
      } else if (curState.modal.visible) {
        this.store.setState({ modal: { ...curState.modal, visible: false } });
        this._dirtyLayers.delete('modal');
      } else {
        this.screens.goBack();
      }
    });

    this.input.registerGlobal('tab', () => this.focus.focusNext());
    this.input.registerGlobal('shift-tab', () => this.focus.focusPrev());

    // Number shortcuts for sidebar navigation (1-9) + search input when active
    for (let i = 0; i < Math.min(SIDEBAR_IDS.length, 9); i++) {
      const num = (i + 1).toString();
      const screenId = SIDEBAR_IDS[i];
      this.input.registerGlobal(num, () => {
        if (this.search.isActive) {
          this.search.inputChar(num);
          this._dirtyLayers.add('search');
          this._dirtyLayers.add('workspace');
        } else {
          this.screens.navigate(screenId);
        }
      });
    }

    this.input.registerGlobal('enter', () => {
      if (this.search.isActive) {
        this.search.jumpToSelected();
        this.search.deactivate();
        this._dirtyLayers.add('search');
        this._dirtyLayers.add('workspace');
      } else if (this.store.getState().palette.open) {
        this.palette.confirmSelection();
        this._dirtyLayers.add('palette');
      }
    });

    // Arrow key navigation with sidebar + search support
    this.input.registerGlobal('up', () => {
      const pState = this.store.getState().palette;
      if (pState.open) {
        this.palette.selectPrev();
        this._dirtyLayers.add('palette');
      } else if (this.search.isActive) {
        this.search.selectPrev();
        this._dirtyLayers.add('search');
        this._dirtyLayers.add('workspace');
      } else {
        this.sidebar.selectPrev();
        const selId = this.store.getState().sidebar.selectedId;
        this.screens.navigate(selId);
        this._dirtyLayers.add('sidebar');
        this._dirtyLayers.add('workspace');
      }
    });
    this.input.registerGlobal('down', () => {
      const pState = this.store.getState().palette;
      if (pState.open) {
        this.palette.selectNext();
        this._dirtyLayers.add('palette');
      } else if (this.search.isActive) {
        this.search.selectNext();
        this._dirtyLayers.add('search');
        this._dirtyLayers.add('workspace');
      } else {
        this.sidebar.selectNext();
        const selId = this.store.getState().sidebar.selectedId;
        this.screens.navigate(selId);
        this._dirtyLayers.add('sidebar');
        this._dirtyLayers.add('workspace');
      }
    });
    this.input.registerGlobal('left', () => {
      if (this.store.getState().palette.open) {
        this.palette.selectPrev();
        this._dirtyLayers.add('palette');
      } else {
        this.focus.focusDirection('left');
      }
    });
    this.input.registerGlobal('right', () => {
      if (this.store.getState().palette.open) {
        this.palette.selectNext();
        this._dirtyLayers.add('palette');
      } else {
        this.focus.focusDirection('right');
      }
    });

    // Search key (/)
    this.input.registerGlobal('/', () => {
      if (!this.search.isActive) {
        this.search.activate();
        this._dirtyLayers.add('search');
        this._dirtyLayers.add('workspace');
      }
    });

    // Escape also closes search
    // (escape is already registered above — this is handled in its handler)

    // Backspace (for search and palette)
    this.input.registerGlobal('backspace', () => {
      const pState = this.store.getState().palette;
      if (pState.open) {
        const newFilter = pState.filter.slice(0, -1);
        this.palette.setFilter(newFilter);
        this.store.setState({ palette: { ...pState, filter: newFilter } });
        this._dirtyLayers.add('palette');
      } else if (this.search.isActive) {
        this.search.backspace();
        this._dirtyLayers.add('search');
        this._dirtyLayers.add('workspace');
      }
    });

    // Page Up/Down — forward to active screen's scroll view
    this.input.registerGlobal('page-up', () => {
      const active = this.screens.activeScreen;
      if (active && 'handleShortcut' in active) {
        active.handleShortcut?.('page-up');
      }
      this._dirtyLayers.add('workspace');
    });
    this.input.registerGlobal('page-down', () => {
      const active = this.screens.activeScreen;
      if (active && 'handleShortcut' in active) {
        active.handleShortcut?.('page-down');
      }
      this._dirtyLayers.add('workspace');
    });

    // Home/End — forward to active screen's scroll view
    this.input.registerGlobal('home', () => {
      const active = this.screens.activeScreen;
      if (active && 'handleShortcut' in active) {
        active.handleShortcut?.('home');
      }
      this._dirtyLayers.add('workspace');
    });
    this.input.registerGlobal('end', () => {
      const active = this.screens.activeScreen;
      if (active && 'handleShortcut' in active) {
        active.handleShortcut?.('end');
      }
      this._dirtyLayers.add('workspace');
    });

    // Character routing for search AND palette input
    // When palette is open, characters go to palette filter
    // When search is active, characters go to search
    const SEARCH_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-_/@:'.split('');
    for (const ch of SEARCH_CHARS) {
      this.input.registerGlobal(ch, () => {
        const pState = this.store.getState().palette;
        if (pState.open) {
          // Route character to palette filter
          const newFilter = pState.filter + ch;
          this.palette.setFilter(newFilter);
          this.store.setState({ palette: { ...pState, filter: newFilter } });
          this._dirtyLayers.add('palette');
        } else if (this.search.isActive) {
          this.search.inputChar(ch);
          this._dirtyLayers.add('search');
          this._dirtyLayers.add('workspace');
        }
      });
    }

    // Delete key for search and palette
    this.input.registerGlobal('delete', () => {
      const pState = this.store.getState().palette;
      if (pState.open) {
        const newFilter = pState.filter.slice(0, -1);
        this.palette.setFilter(newFilter);
        this.store.setState({ palette: { ...pState, filter: newFilter } });
        this._dirtyLayers.add('palette');
      } else if (this.search.isActive) {
        this.search.backspace();
        this._dirtyLayers.add('search');
        this._dirtyLayers.add('workspace');
      }
    });

    // Space key for palette, search, and TreeView toggle
    this.input.registerGlobal('space', () => {
      const pState = this.store.getState().palette;
      if (pState.open) {
        // Space in palette filter
        const newFilter = pState.filter + ' ';
        this.palette.setFilter(newFilter);
        this.store.setState({ palette: { ...pState, filter: newFilter } });
        this._dirtyLayers.add('palette');
      } else if (this.search.isActive) {
        this.search.inputChar(' ');
        this._dirtyLayers.add('search');
        this._dirtyLayers.add('workspace');
      } else {
        const active = this.screens.activeScreen;
        if (active && 'handleShortcut' in active) {
          active.handleShortcut?.('space');
        }
        this._dirtyLayers.add('workspace');
      }
    });
  }

  private _handlePaletteCommand(id: string): void {
    this.store.setState({ palette: { ...this.store.getState().palette, open: false } });
    // Mark workspace dirty so the new screen renders
    this._dirtyLayers.add('workspace');
    this._dirtyLayers.add('sidebar');
    switch (id) {
      // Navigation
      case 'show-dashboard': this.screens.navigate('dashboard'); break;
      case 'show-scan': case 'run-scan': this.screens.navigate('scan'); break;
      case 'show-results': this.screens.navigate('results'); break;
      case 'show-architecture': this.screens.navigate('architecture'); break;
      case 'show-dependencies': this.screens.navigate('dependencies'); break;
      case 'show-insights': this.screens.navigate('insights'); break;
      case 'show-suggestions': this.screens.navigate('suggestions'); break;
      case 'show-history': this.screens.navigate('history'); break;
      case 'show-plugins': case 'manage-plugins': this.screens.navigate('plugins'); break;
      case 'show-settings': this.screens.navigate('settings'); break;
      case 'show-help': case 'help-keyboard': case 'keyboard-shortcuts': this.screens.navigate('help'); break;
      case 'show-about': this.screens.navigate('about'); break;

      // Analysis
      case 'run-analysis': case 'reanalyze': {
        this.store.setState({ appMode: 'analyzing' });
        this.store.updateSlice('statusBar', { message: 'Running analysis...', backgroundTask: 'Analyzing' });
        break;
      }

      // Tools
      case 'focus-search': case 'toggle-search': {
        this.search.activate();
        this._dirtyLayers.add('search');
        break;
      }
      case 'toggle-sidebar': {
        const sb = this.store.getState().sidebar;
        this.store.updateSlice('sidebar', { collapsed: !sb.collapsed });
        this._dirtyLayers.add('sidebar');
        break;
      }

      // Tree
      case 'expand-all': {
        // Forward to active screen
        const active = this.screens.activeScreen;
        if (active && 'handleShortcut' in active) active.handleShortcut?.('expand-all');
        break;
      }
      case 'collapse-all': {
        const active = this.screens.activeScreen;
        if (active && 'handleShortcut' in active) active.handleShortcut?.('collapse-all');
        break;
      }

      // Navigation
      case 'go-back': this.screens.goBack(); break;
      case 'quit': this.destroy(); process.exit(0); break;

      // Default
      default: break;
    }
  }

  private _emergencyDestroy(): void {
    try { this.stop(); process.stderr.write(cursorShow()); } catch { /* ignore */ }
  }
}
