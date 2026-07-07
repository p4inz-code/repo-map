/**
 * WorkspaceController — persistent interactive workspace powered by RuntimeManager.
 *
 * # Architecture
 * The workspace layer renders the COMPLETE screen frame, including:
 *   - Header (rows 0-1)
 *   - Sidebar + Main Content + Inspector (rows 2 to height-2)
 *   - Status Bar (row height-1)
 *
 * All other FrameGraph layers return empty arrays. This avoids the y-offset
 * limitation of layer compositing (all layers render from y=0).
 *
 * # V3 Systems Wired
 * - StartupBoot + RevealManager: cinematic startup sequence
 * - RepositoryIdentity + WorkspaceIndicators: living repository identity
 * - SidebarMotion: gliding selection animation
 * - MicroDetails: subtle cursor pulses, panel transitions
 * - MetricAnimator: animated counter values (health score, file counts)
 * - KeyboardDiscoverability: context-aware key hints in status bar
 * - InspectorPanel: collapsible, resizable right panel
 * - ActionManager: per-screen quick actions
 * - NotificationSystem: proper notification queue
 * - LoadingManager: meaningful loading messages
 * - TaskManager: background task orchestration
 */

import { RuntimeManager } from '../runtime/manager.js';
import type { FrameContext } from '../types.js';
import type { Line } from '../../v2/renderer/types.js';
import type { RenderContext } from '../../v2/renderer/renderer.js';
import type { ThemeV2 } from '../../v2/theme/theme.js';
import type { Analysis } from '../../../types.js';
import type { TreeNodeData } from '../../state/types.js';

// ─── V2 Component Imports (content providers only) ───────────────

import { InputManagerV2 } from '../../v2/input.js';
import { ScreenManagerV2 } from '../../v2/screen-manager.js';
import { V2Store } from '../../v2/state.js';
import { createInitialV2State } from '../../v2/state.js';
import { HeaderComponent } from '../../v2/layers/header.js';
import { SidebarComponent } from '../../v2/layers/sidebar.js';
import { StatusBarComponent } from '../../v2/layers/status-bar.js';
import { ModalLayer } from '../../v2/layers/overlays.js';
import { NotificationLayer } from '../../v2/layers/overlays.js';
import { CommandPalette } from '../../v2/command-palette.js';
import { SearchManager } from '../../v2/search.js';

// ─── V2 Screen Imports (content providers only) ──────────────────

import { DashboardScreen } from '../../v2/screens/dashboard.js';
import { ScanScreen } from '../../v2/screens/scan.js';
import { ResultsScreen } from '../../v2/screens/results.js';
import { HelpScreen } from '../../v2/screens/help.js';
import { SettingsScreen } from '../../v2/screens/settings.js';
import { ErrorScreen } from '../../v2/screens/error.js';
import { ArchitectureScreen } from '../../v2/screens/architecture.js';
import { DependenciesScreen } from '../../v2/screens/dependencies.js';
import { InsightsScreen } from '../../v2/screens/insights.js';
import { SuggestionsScreen } from '../../v2/screens/suggestions.js';
import { HistoryScreen } from '../../v2/screens/history.js';
import { AboutScreen } from '../../v2/screens/about.js';
import { PluginsScreen } from '../../v2/screens/plugins.js';
import { LoadingScreen } from '../../v2/screens/loading.js';
import { EmptyStateScreen } from '../../v2/screens/empty.js';

// ─── V3 Experience System Imports ────────────────────────────────

import { StartupBoot } from '../experience/startup/boot.js';
import { RevealManager } from '../experience/reveal/manager.js';
import { SidebarMotion } from '../experience/sidebar/motion.js';
import { MetricAnimator } from '../experience/metrics/animator.js';
import { NotificationSystem } from '../experience/notifications/system.js';
import { LoadingManager } from '../experience/loading/manager.js';
import { RepositoryIdentity } from '../terminal/indicators/repository-identity.js';
import { WorkspaceIndicators } from '../terminal/indicators/manager.js';
import { MicroDetails } from '../terminal/micro/details.js';
import { KeyboardDiscoverability } from '../terminal/keyboard/discoverability.js';
import { InspectorPanel } from '../terminal/inspector/panel.js';
import { ActionManager } from '../terminal/actions/manager.js';
import { TaskManager } from '../terminal/tasks/manager.js';
import { AccessibilityManager } from '../terminal/accessibility/manager.js';
import { ScrollingEngine } from '../experience/scrolling/engine.js';
import { PaletteUX } from '../experience/palette/ux.js';
import { SearchUX } from '../experience/search/ux.js';
import { CLI_VERSION } from '../../../types.js';

// ─── Constants ─────────────────────────────────────────────────────

const SIDEBAR_IDS = [
  'dashboard', 'scan', 'results', 'architecture', 'dependencies',
  'insights', 'suggestions', 'history', 'settings', 'about',
  'plugins',
];

const LAYER_IDS = [
  'background', 'sidebar', 'workspace', 'header', 'status-bar',
  'notifications', 'palette', 'search', 'overlay', 'cursor',
] as const;

// ─── FrameContext → RenderContext adapter ─────────────────────────

function toRenderContext(ctx: FrameContext, layerId: string): RenderContext {
  return {
    theme: ctx.theme,
    width: ctx.width,
    height: ctx.height,
    layerId,
    fullRedraw: ctx.fullRedraw,
  };
}

// ─── WorkspaceController ──────────────────────────────────────────

export class WorkspaceController {
  private readonly _runtime: RuntimeManager;
  private readonly _store: V2Store;
  private readonly _input: InputManagerV2;
  private readonly _screens: ScreenManagerV2;
  private readonly _sidebar: SidebarComponent;
  private readonly _header: HeaderComponent;
  private readonly _statusBar: StatusBarComponent;
  private readonly _modal: ModalLayer;
  private readonly _notification: NotificationLayer;
  private readonly _palette: CommandPalette;
  private readonly _search: SearchManager;
  private readonly _errorScreen: ErrorScreen;

  // ── V3 Experience Systems ─────────────────────────────────────

  private readonly _accessibility: AccessibilityManager;
  private readonly _microDetails: MicroDetails;
  private readonly _sidebarMotion: SidebarMotion;
  private readonly _metricAnimator: MetricAnimator;
  private readonly _keyboardDiscoverability: KeyboardDiscoverability;
  private readonly _inspectorPanel: InspectorPanel;
  private readonly _actionManager: ActionManager;
  private readonly _workspaceIndicators: WorkspaceIndicators;
  private readonly _repositoryIdentity: RepositoryIdentity;
  private readonly _notificationSystem: NotificationSystem;
  private readonly _loadingManager: LoadingManager;
  private readonly _taskManager: TaskManager;
  private readonly _startupBoot: StartupBoot;
  private readonly _revealManager: RevealManager;

  // ── Phase A: ScrollingEngines ────────────────────────────────
  private readonly _workspaceScroll: ScrollingEngine;
  private readonly _inspectorScroll: ScrollingEngine;

  // ── Phase C/D: V3 UX Controllers ────────────────────────────
  private readonly _paletteUX: PaletteUX;
  private readonly _searchUX: SearchUX;
  private _paletteOpen: boolean = false;
  private _searchActive: boolean = false;
  private _previousFocusOwner: string | null = null; // Kept for future use

  /** Whether the startup sequence has completed. */
  private _startupComplete: boolean = false;

  /** Whether the reveal sequence has completed. */
  private _revealComplete: boolean = false;

  /** Startup promise (resolves when startup completes). */
  private _startupPromise: Promise<void> | null = null;

  /** Last reveal update time for proper wall-clock delta tracking. */
  private _lastRevealTime: number = 0;

  private _closed: boolean = false;
  private _resolveClose: (() => void) | null = null;

  constructor(runtime: RuntimeManager, theme: ThemeV2) {
    this._runtime = runtime;

    // ── Create V3 UX Controllers & ScrollingEngines ──────────────
    this._paletteUX = new PaletteUX();
    this._searchUX = new SearchUX();
    this._searchUX.onJump((match: { lineNumber: number; item: string }) => {
      this._workspaceScroll.scrollTo(match.lineNumber);
      this._runtime.eventBus.emit('search-closed', { query: this._searchUX.query, resultCount: 0 }, 'search');
      this._markDirty();
    });
    this._workspaceScroll = new ScrollingEngine(runtime.animationScheduler);
    this._inspectorScroll = new ScrollingEngine(runtime.animationScheduler, { showScrollbar: false });

    // ── 1. Create V2 State Store ──────────────────────────────────
    this._store = new V2Store();
    this._store.setState({
      ...createInitialV2State(),
      theme,
      terminalWidth: process.stdout.columns ?? 80,
      terminalHeight: process.stdout.rows ?? 24,
      v2Active: true,
    });
    this._store.updateSlice('header', {
      projectName: 'repo-map',
      terminalSize: `${process.stdout.columns ?? 80}x${process.stdout.rows ?? 24}`,
    });
    this._store.updateSlice('sidebar', { selectedId: 'dashboard' });

    // ── 2. Create InputManagerV2 (keyboard routing) ──────────────
    this._input = new InputManagerV2();

    // ── 3. Create V2 Layer Components ────────────────────────────
    this._header = new HeaderComponent({ store: this._store });
    this._sidebar = new SidebarComponent({ store: this._store });
    this._statusBar = new StatusBarComponent({ store: this._store });
    this._modal = new ModalLayer({ store: this._store });
    this._notification = new NotificationLayer({ store: this._store });
    this._palette = new CommandPalette();
    this._search = new SearchManager(this._store);

    // ── 4. Create all V2 Screens ─────────────────────────────────
    this._errorScreen = new ErrorScreen(this._store);
    const screenRegistrations: Array<{ id: string; screen: any }> = [
      { id: 'dashboard', screen: new DashboardScreen(this._store) },
      { id: 'scan', screen: new ScanScreen(this._store) },
      { id: 'results', screen: new ResultsScreen(this._store) },
      { id: 'help', screen: new HelpScreen(this._store) },
      { id: 'settings', screen: new SettingsScreen(this._store) },
      { id: 'error', screen: this._errorScreen },
      { id: 'architecture', screen: new ArchitectureScreen(this._store) },
      { id: 'dependencies', screen: new DependenciesScreen(this._store) },
      { id: 'insights', screen: new InsightsScreen(this._store) },
      { id: 'suggestions', screen: new SuggestionsScreen(this._store) },
      { id: 'history', screen: new HistoryScreen(this._store) },
      { id: 'about', screen: new AboutScreen(this._store) },
      { id: 'plugins', screen: new PluginsScreen(this._store) },
      { id: 'loading', screen: new LoadingScreen(this._store) },
      { id: 'empty', screen: new EmptyStateScreen(this._store) },
    ];

    this._screens = new ScreenManagerV2();
    for (const { id, screen } of screenRegistrations) {
      this._screens.registerInstance(id, screen as any);
    }

    // ── 5. Wire screen changes → sidebar selection update ────────
    this._screens.onChange((id) => {
      if (id) {
        this._store.updateSlice('sidebar', { selectedId: id });
        // Trigger selection glide animation
        const idx = this._sidebar.getIndexFor(id);
        if (idx >= 0) {
          this._sidebarMotion.glideSelection(idx);
        }
        this._markDirty();
      }
    });

    // ── 6. Wire command palette ──────────────────────────────────
    this._palette.onCommand((id) => this._handlePaletteCommand(id));

    // ── 7. Create V3 Experience Systems ──────────────────────────
    this._accessibility = new AccessibilityManager(runtime.eventBus);
    this._microDetails = new MicroDetails(runtime.animationScheduler, this._accessibility);
    this._sidebarMotion = new SidebarMotion(runtime.animationScheduler);
    this._metricAnimator = new MetricAnimator(runtime.animationScheduler);
    this._keyboardDiscoverability = new KeyboardDiscoverability(runtime.eventBus);
    this._inspectorPanel = new InspectorPanel(runtime.animationScheduler, runtime.eventBus);
    this._actionManager = new ActionManager(runtime.eventBus, runtime.workspaceManager);
    this._workspaceIndicators = new WorkspaceIndicators();
    this._repositoryIdentity = new RepositoryIdentity(runtime.eventBus);
    this._notificationSystem = new NotificationSystem(runtime.animationScheduler, runtime.eventBus);
    this._loadingManager = new LoadingManager(runtime.eventBus);
    this._taskManager = new TaskManager(runtime.eventBus);
    this._startupBoot = new StartupBoot(runtime, runtime.animationScheduler, runtime.eventBus);

    // Create RevealManager with reduced-motion-aware durations
    const accFlags = this._accessibility.flags;
    const revealDurationScale = accFlags.reducedMotion ? 0.25 : 1.0;
    this._revealManager = new RevealManager({
      defaultDurationMs: Math.round(400 * revealDurationScale),
      defaultStaggerMs: Math.round(150 * revealDurationScale),
    });

    // ── 8. Register FrameGraph Layer Renderers ───────────────────
    this._registerLayerRenderers();

    // ── 9. Wire keyboard input → markDirty → RuntimeManager ──────
    this._wireInput();

    // ── 10. Enter the RuntimeManager render loop ─────────────────
    this._runtime.workspaceManager.setActiveScreen('startup');
    this._runtime.start();

    // ── 11. Start the cinematic boot sequence ────────────────────
    this._startStartupSequence();
  }

  // ── Public API ──────────────────────────────────────────────────

  /** Get the promise that resolves when the workspace is closed. */
  get closed(): Promise<void> {
    return new Promise((resolve) => {
      this._resolveClose = resolve;
    });
  }

  /** Set analysis data for the workspace screens. */
  setAnalysisData(analysis: Analysis): void {
    this._store.setState({ analysis });
    this._store.updateSlice('header', { projectName: analysis.projectName });
    this._store.updateSlice('statusBar', { errors: 0, warnings: 0 });

    // Update V3 systems
    this._repositoryIdentity.setMetadata({
      projectName: analysis.projectName,
      fileCount: analysis.stats.totalFiles,
      directoryCount: analysis.stats.totalDirectories,
      healthScore: analysis.intelligence.health.overall,
      language: analysis.technologies.find(t => t.category === 'language')?.name ?? null,
    });
    this._metricAnimator.countMetric('health-score', analysis.intelligence.health.overall, 'number');
    this._metricAnimator.countMetric('file-count', analysis.stats.totalFiles, 'number');
    this._metricAnimator.countMetric('directory-count', analysis.stats.totalDirectories, 'number');
    this._metricAnimator.countMetric('language-count',
      analysis.technologies.filter(t => t.category === 'language').length, 'number');

    this._runtime.workspaceManager.setAnalysis(analysis);
    this._runtime.eventBus.emit('repository-loaded', {
      projectName: analysis.projectName,
      fileCount: analysis.stats.totalFiles,
      directoryCount: analysis.stats.totalDirectories,
    }, 'workspace');
    this._runtime.eventBus.emit('analysis-finished', {
      elapsed: 0,
      healthScore: analysis.intelligence.health.overall,
      technologyCount: analysis.technologies.length,
    }, 'workspace');

    this._notificationSystem.success(`Analysis complete — ${analysis.stats.totalFiles} files analyzed`);

    // Bridge V3 NotificationSystem to V2 store so the NotificationLayer renders them
    this._store.addNotification({
      message: `Analysis complete — ${analysis.stats.totalFiles} files analyzed`,
      severity: 'success',
      duration: 4000,
    });

    this._markDirty();
  }

  /** Set tree data for the workspace explorer. */
  setTreeData(_data: TreeNodeData): void {
    this._markDirty();
  }

  /** Navigate to a specific screen. */
  navigate(screenId: string): void {
    this._screens.navigate(screenId);
    this._runtime.workspaceManager.setActiveScreen(screenId);
    this._runtime.eventBus.emit('screen-changed', {
      screenId,
      previousScreenId: null,
      isBack: false,
    }, 'workspace');
    this._markDirty();
  }

  /** Set error message and navigate to error screen. */
  reportError(message: string, suggestion?: string): void {
    this._errorScreen.setError(message, suggestion);
    this._screens.navigate('error');
    this._notificationSystem.error(message);
    // Bridge V3 NotificationSystem to V2 store for visual rendering
    this._store.addNotification({
      message,
      severity: 'error',
      duration: 6000,
    });
    this._markDirty();
  }

  /** Handle a terminal resize event. */
  resize(width: number, height: number): void {
    this._store.setState({ terminalWidth: width, terminalHeight: height });
    this._store.updateSlice('header', { terminalSize: `${width}x${height}` });
    this._inspectorPanel.setWidth(Math.min(30, Math.floor(width * 0.25)));
    this._markDirty();
    this._runtime.requestFullRedraw();
  }

  /** Cleanup and destroy the workspace. */
  close(): void {
    if (this._closed) return;
    this._closed = true;
    this._input.stop();
    this._input.destroy();
    this._screens.destroy();
    this._store.clear();
    this._microDetails.stopCursorPulse();
    this._runtime.stop();
    if (this._resolveClose) {
      this._resolveClose();
    }
  }

  /** Whether the workspace has been closed. */
  get isClosed(): boolean {
    return this._closed;
  }

  // ── Startup Sequence ────────────────────────────────────────────

  private _startStartupSequence(): void {
    // ALWAYS execute startup. Reduced motion changes duration/easing, NOT lifecycle.
    this._revealManager.start();

    // Start the cinematic boot sequence
    this._startupPromise = this._startupBoot.start().then(() => {
      this._startupComplete = true;
      this._runtime.workspaceManager.setActiveScreen('dashboard');
      this._screens.navigate('dashboard');

      // Start cursor pulse now that startup is complete
      this._microDetails.startCursorPulse();

      // Navigate to dashboard
      this._runtime.eventBus.emit('screen-changed', {
        screenId: 'dashboard',
        previousScreenId: 'startup',
        isBack: false,
      }, 'startup');

      this._markDirty();
      this._runtime.requestFullRedraw();
    });

    // Wire reveal manager to mark layers dirty as they reveal
    this._revealManager.onElementReveal(() => {
      this._markDirty();
      this._runtime.requestFullRedraw();
    });

    this._revealManager.onComplete(() => {
      this._revealComplete = true;
    });

    // Advance the reveal manager using actual wall-clock delta time
    this._runtime.eventBus.on('frame-rendered', (_msg) => {
      if (!this._revealComplete) {
        const now = performance.now();
        if (this._lastRevealTime === 0) {
          this._lastRevealTime = now;
        }
        // Compute actual wall-clock delta, capped at ~30fps worst case
        const dt = Math.min(now - this._lastRevealTime, 50);
        this._lastRevealTime = now;
        this._revealManager.update(dt, now);
      }
    });
  }

  // ── FrameGraph Layer Renderer Registration ──────────────────────

  private _registerLayerRenderers(): void {
    for (const layerId of LAYER_IDS) {
      if (layerId !== 'workspace') {
        this._runtime.frameGraph.setRenderer(layerId, () => []);
      }
    }

    this._runtime.frameGraph.setRenderer('workspace', (ctx: FrameContext) => {
      if (this._closed) return [];
      if (!this._startupComplete) {
        return this._buildStartupFrame(ctx);
      }
      return this._buildFullFrame(ctx);
    });
  }

  /**
   * Build startup frame: logo + version + initialization messages.
   */
  private _buildStartupFrame(ctx: FrameContext): Line[] {
    const w = ctx.width;
    const h = ctx.height;
    const theme = ctx.theme;
    // Start with empty rows (background layer fills spaces)
    const frame: Line[] = new Array(h);
    for (let i = 0; i < h; i++) {
      frame[i] = { segments: [{ text: '' }] };
    }

    // Logo centered vertically
    const logoLines = [
      '  ██████   ███████ ██████   ██████  ───  ███    ███  █████  ██████  ',
      '  ██   ██  ██      ██   ██ ██       ██   ████  ████ ██   ██ ██   ██ ',
      '  ██████   █████   ██████  ██   ███     ██ ████ ██ ███████ ██████  ',
      '  ██   ██  ██      ██      ██    ██     ██  ██  ██ ██   ██ ██      ',
      '  ██   ██  ███████ ██       ██████      ██      ██ ██   ██ ██      ',
    ];

    const logoY = Math.floor(h / 2) - 3;
    const logoX = Math.floor((w - 50) / 2);

    for (let i = 0; i < logoLines.length; i++) {
      const y = logoY + i;
      if (y >= 0 && y < h) {
        const reveal = this._revealManager.getLayerOpacity('header');
        const opacity = Math.min(reveal, this._revealManager.isRevealed('header') ? 1 : 0);
        const style = opacity < 1 ? { dim: true, color: 'primary' as const }
          : { bold: true, color: 'primary' as const };
        frame[y] = {
          segments: [
            { text: ' '.repeat(Math.max(0, logoX)) },
            { text: logoLines[i].slice(0, Math.max(0, w - logoX)), style },
          ],
        };
      }
    }

    // Version string below logo
    const versionStr = `v${CLI_VERSION} — Professional Repository Analysis`;
    const verY = logoY + logoLines.length + 1;
    const verX = Math.floor((w - versionStr.length) / 2);
    if (verY >= 0 && verY < h) {
      const revealProgress = this._revealManager.getLayerOpacity('sidebar');
      const visible = revealProgress > 0.3;
      frame[verY] = {
        segments: [
          { text: ' '.repeat(Math.max(0, verX)) },
          { text: versionStr.slice(0, Math.max(0, w - verX)),
            style: { dim: true } },
        ],
      };
    }

    return frame;
  }

  /**
   * Build the complete terminal frame with V3 systems integrated.
   */
  private _buildFullFrame(ctx: FrameContext): Line[] {
    const rctx = toRenderContext(ctx, 'workspace');
    const state = this._store.getState();
    const theme = ctx.theme;

    const w = ctx.width;
    const h = ctx.height;
    const headerH = 2;
    const statusH = 1;
    const contentH = h - headerH - statusH;

    const frame: Line[] = [];

    // ── Header (rows 0..headerH-1) ─────────────────────────────
    const headerLines = this._header.render({ ...rctx, height: headerH });
    for (let i = 0; i < headerH; i++) {
      const revealOpacity = this._revealManager.getLayerOpacity('header');
      if (i < headerLines.length) {
        frame.push(headerLines[i]);
      } else {
        frame.push({ segments: [{ text: ' '.repeat(w) }] });
      }
    }

    // ── Body (rows headerH..headerH+contentH-1) ────────────────
    const activeScreen = this._screens.activeScreen;
    const sidebarLines = this._sidebar.render({ ...rctx, height: contentH });
    const screenContent = activeScreen
      ? activeScreen.render({ ...rctx, height: contentH })
      : [{ segments: [{ text: ' '.repeat(w) }] }];

    // Update inspector panel with analysis data
    if (state.analysis) {
      this._updateInspectorContent(state.analysis);
    }

    // Update keyboard hints
    this._updateKeyboardHints();

    // Compose body with V3 inspector panel
    const bodyLines = this._composeBody(sidebarLines, screenContent, {
      width: w,
      height: contentH,
      theme,
      analysis: state.analysis,
      sidebarCollapsed: state.sidebar.collapsed,
      sidebarWidth: state.sidebar.width,
    });

    for (const line of bodyLines) {
      frame.push(line);
    }

    // ── Render notifications (floating overlay at top-right) ────
    const notifLines = this._notification.render({ ...rctx, height: 0 });
    // Merge notifications as a floating overlay at top-right without corrupting workspace rows
    if (notifLines.length > 0) {
      const sidebarW = state.sidebar.collapsed ? 3 : state.sidebar.width;
      for (let i = 0; i < notifLines.length && (headerH + i) < (h - statusH); i++) {
        const rowIdx = headerH + i;
        if (rowIdx < frame.length) {
          // Get existing row text, overlay notification text at right side
          const existingSeg = frame[rowIdx].segments
            .map(s => s.text).join('');
          const notifText = notifLines[i].segments
            .map(s => s.text).join('');
          if (notifText.trim().length > 0) {
            // Place notification text right-aligned, starting after sidebar
            const overlayX = sidebarW + 1;
            const truncated = notifText.slice(0, w - overlayX - 1);
            const newLeft = existingSeg.slice(0, overlayX) +
              truncated.padEnd(w - overlayX);
            frame[rowIdx] = {
              segments: [{ text: newLeft.slice(0, w) }],
            };
          }
        }
      }
    }

    // ── Status Bar (row h-1) ──────────────────────────────────
    const statusLines = this._statusBar.render({ ...rctx, height: statusH });
    if (statusLines.length > 0) {
      // Build status bar with keyboard hints
      const hints = this._keyboardDiscoverability.getHints(true).slice(0, 3);
      if (hints.length > 0) {
        const hintStr = hints.map(h => `${h.key}=${h.description}`).join(' ');
        const originalText = statusLines[0].segments[0]?.text ?? '';
        if (w > originalText.length + hintStr.length + 4) {
          frame.push({
            segments: [
              { text: originalText.padEnd(w - hintStr.length - 1) },
              { text: hintStr, style: { dim: true } },
            ],
          });
        } else {
          frame.push({ segments: [{ text: originalText.slice(0, w) }] });
        }
      } else {
        frame.push(statusLines[0]);
      }
    } else {
      frame.push({ segments: [{ text: ' '.repeat(w) }] });
    }

    return frame;
  }

  /**
   * Update the V3 InspectorPanel with current analysis data.
   */
  private _updateInspectorContent(analysis: Analysis): void {
    const an = analysis;
    this._inspectorPanel.setSectionContent('details', [
      ` Files: ${an.stats.totalFiles}`,
      ` Dirs:  ${an.stats.totalDirectories}`,
      ` Depth: ${an.stats.maxDepth}`,
      ` Health: ${an.intelligence.health.overall}/100`,
    ]);
    const cat = an.intelligence.classification.category ?? 'uncategorized';
    const mat = an.intelligence.maturity.level ?? 'unknown';
    const conf = an.intelligence.classification.confidence ?? 0;
    this._inspectorPanel.setSectionContent('stats', [
      ` Class: ${cat}`,
      ` Maturity: ${mat}`,
      ` Languages: ${an.technologies.filter(t => t.category === 'language').length}`,
      ` Confidence: ${conf}%`,
    ]);
  }

  /**
   * Update keyboard hints dynamically based on current workspace state.
   */
  private _updateKeyboardHints(): void {
    // Update context before getting hints so they reflect real state
    this._keyboardDiscoverability.updateContext({
      screenId: this._screens.activeScreenId,
      paletteOpen: this._paletteOpen,
      searchActive: this._searchActive,
      overlayVisible: this._runtime.overlayManager.getState().visibleCount > 0,
      focusOwner: this._runtime.overlayManager.getFocusOwner(),
    });

    const hints = this._keyboardDiscoverability.getHints(true);
    const hintLines = hints.map(h => `${h.key}: ${h.description}`);

    this._inspectorPanel.setSectionContent('hints', hintLines.slice(0, 5));
  }

  /**
   * Compose body section: sidebar | main content | V3 inspector panel.
   */
  private _composeBody(
    sidebarLines: Line[],
    screenContent: Line[],
    opts: {
      width: number;
      height: number;
      theme: ThemeV2;
      analysis: Analysis | null;
      sidebarCollapsed: boolean;
      sidebarWidth: number;
    },
  ): Line[] {
    const sidebarW = opts.sidebarCollapsed ? 3 : opts.sidebarWidth;
    const inspectorW = this._inspectorPanel.currentWidth;
    const mainW = opts.width - sidebarW - inspectorW - 2;

    const sepGlyph = '│';
    const lines: Line[] = [];
    const sidebarTexts = sidebarLines.map((l) => l.segments.map((s) => s.text).join(''));
    const screenTexts = screenContent.map((l) => l.segments.map((s) => s.text).join(''));

    // Use V3 InspectorPanel for the right side
    const inspectorContent = this._inspectorPanel.render(inspectorW, opts.height);

    const maxLines = Math.min(
      Math.max(sidebarTexts.length, screenTexts.length, inspectorContent.length),
      opts.height,
    );

    for (let i = 0; i < maxLines; i++) {
      const sidebarPart = sidebarTexts[i]?.slice(0, sidebarW) ?? ' '.repeat(sidebarW);
      const screenPart = screenTexts[i]?.slice(0, mainW) ?? ' '.repeat(mainW);
      const inspectorPart = inspectorContent[i] ?? ' '.repeat(inspectorW);

      lines.push({
        segments: [
          { text: sidebarPart.padEnd(sidebarW) },
          { text: sepGlyph, style: { dim: true } },
          { text: screenPart.padEnd(mainW) },
          { text: sepGlyph, style: { dim: true } },
          { text: inspectorPart.padEnd(inspectorW) },
        ],
      });
    }

    // Fill remaining lines
    for (let i = maxLines; i < opts.height; i++) {
      lines.push({
        segments: [
          { text: ' '.repeat(sidebarW) },
          { text: sepGlyph, style: { dim: true } },
          { text: ' '.repeat(mainW) },
          { text: sepGlyph, style: { dim: true } },
          { text: ' '.repeat(inspectorW) },
        ],
      });
    }

    return lines;
  }



  // ── Input Routing ───────────────────────────────────────────────

  private _wireInput(): void {
    this._input.onRawModeChange((raw) => {
      this._store.setState({ rawMode: raw });
    });

    this._input.start();

    this._input.registerGlobal('ctrl-p', () => {
      const pState = this._store.getState().palette;
      this._store.setState({ palette: { ...pState, open: !pState.open } });
      this._runtime.eventBus.emit('palette-opened', { open: pState.open }, 'input');
      this._markDirty();
    });

    // ── Phase C: Ctrl+K opens PaletteUX ────────────────────────
    this._input.registerGlobal('ctrl-k', () => {
      this._openPaletteUX();
    });

    // ── Phase D: Ctrl+F opens SearchUX ─────────────────────────
    this._input.registerGlobal('ctrl-f', () => {
      this._openSearchUX();
    });

    this._input.registerGlobal('q', () => {
      this.close();
    });

    this._input.registerGlobal('?', () => {
      this._screens.navigate('help');
      this._markDirty();
    });

    this._input.registerGlobal('escape', () => {
      // Phase C: Escape closes PaletteUX with focus restoration
      if (this._paletteOpen) {
        this._closePaletteUX();
        return;
      }
      // Phase D: Escape closes SearchUX with focus restoration
      if (this._searchActive) {
        this._closeSearchUX();
        return;
      }
      const curState = this._store.getState();
      if (curState.palette.open) {
        this._store.setState({ palette: { ...curState.palette, open: false } });
        this._runtime.eventBus.emit('palette-closed', { open: false }, 'input');
      } else if (this._search.isActive) {
        this._search.deactivate();
        this._runtime.eventBus.emit('search-closed', { query: '', resultCount: 0 }, 'input');
      } else if (curState.modal.visible) {
        this._store.setState({ modal: { ...curState.modal, visible: false } });
      } else {
        this._screens.goBack();
      }
      this._markDirty();
    });

    // Number shortcuts for sidebar navigation
    for (let i = 0; i < Math.min(SIDEBAR_IDS.length, 9); i++) {
      const num = (i + 1).toString();
      const screenId = SIDEBAR_IDS[i];
      this._input.registerGlobal(num, () => {
        if (this._search.isActive) {
          this._search.inputChar(num);
        } else {
          this._screens.navigate(screenId);
        }
        this._markDirty();
      });
    }

    this._input.registerGlobal('tab', () => {
      const pState = this._store.getState().palette;
      if (pState.open) {
        this._palette.selectNext();
      } else if (this._search.isActive) {
        this._search.selectNext();
      } else {
        // Cycle through sections: sidebar → content → inspector
        const curId = this._screens.activeScreenId ?? 'dashboard';
        const curIdx = SIDEBAR_IDS.indexOf(curId);
        const nextIdx = (curIdx + 1) % SIDEBAR_IDS.length;
        this._screens.navigate(SIDEBAR_IDS[nextIdx]);
      }
      this._markDirty();
    });

    this._input.registerGlobal('shift-tab', () => {
      const pState = this._store.getState().palette;
      if (pState.open) {
        this._palette.selectPrev();
      } else if (this._search.isActive) {
        this._search.selectPrev();
      } else {
        // Cycle through sections in reverse
        const curId = this._screens.activeScreenId ?? 'dashboard';
        const curIdx = SIDEBAR_IDS.indexOf(curId);
        const prevIdx = (curIdx - 1 + SIDEBAR_IDS.length) % SIDEBAR_IDS.length;
        this._screens.navigate(SIDEBAR_IDS[prevIdx]);
      }
      this._markDirty();
    });

    this._input.registerGlobal('enter', () => {
      if (this._search.isActive) {
        this._search.jumpToSelected();
        this._search.deactivate();
      } else if (this._store.getState().palette.open) {
        this._palette.confirmSelection();
      }
      this._markDirty();
    });

    this._input.registerGlobal('up', () => {
      const pState = this._store.getState().palette;
      if (pState.open) {
        this._palette.selectPrev();
      } else if (this._search.isActive) {
        this._search.selectPrev();
      } else {
        this._sidebar.selectPrev();
        const selId = this._store.getState().sidebar.selectedId;
        const idx = this._sidebar.getIndexFor(selId);
        if (idx >= 0) this._sidebarMotion.glideSelection(idx);
        this._screens.navigate(selId);
      }
      this._markDirty();
    });

    this._input.registerGlobal('down', () => {
      const pState = this._store.getState().palette;
      if (pState.open) {
        this._palette.selectNext();
      } else if (this._search.isActive) {
        this._search.selectNext();
      } else {
        this._sidebar.selectNext();
        const selId = this._store.getState().sidebar.selectedId;
        const idx = this._sidebar.getIndexFor(selId);
        if (idx >= 0) this._sidebarMotion.glideSelection(idx);
        this._screens.navigate(selId);
      }
      this._markDirty();
    });

    this._input.registerGlobal('page-up', () => {
      // Phase A: Actual ScrollingEngine page up
      this._workspaceScroll.pageUp();
      this._runtime.workspaceManager.setScrollState({
        offset: this._workspaceScroll.offset,
        totalHeight: this._workspaceScroll.getState().totalHeight,
        viewportHeight: this._workspaceScroll.getState().viewportHeight,
        atTop: this._workspaceScroll.getState().atTop,
        atBottom: this._workspaceScroll.getState().atBottom,
      });
      this._markDirty();
    });

    this._input.registerGlobal('page-down', () => {
      // Phase A: Actual ScrollingEngine page down
      this._workspaceScroll.pageDown();
      this._runtime.workspaceManager.setScrollState({
        offset: this._workspaceScroll.offset,
        totalHeight: this._workspaceScroll.getState().totalHeight,
        viewportHeight: this._workspaceScroll.getState().viewportHeight,
        atTop: this._workspaceScroll.getState().atTop,
        atBottom: this._workspaceScroll.getState().atBottom,
      });
      this._markDirty();
    });

    this._input.registerGlobal('home', () => {
      // Phase A: Actual ScrollingEngine scroll to top
      this._workspaceScroll.scrollToTop();
      this._runtime.workspaceManager.setScrollState({
        offset: this._workspaceScroll.offset,
        totalHeight: this._workspaceScroll.getState().totalHeight,
        viewportHeight: this._workspaceScroll.getState().viewportHeight,
        atTop: true,
        atBottom: this._workspaceScroll.getState().atBottom,
      });
      this._markDirty();
    });

    this._input.registerGlobal('end', () => {
      // Phase A: Actual ScrollingEngine scroll to bottom
      this._workspaceScroll.scrollToBottom();
      this._runtime.workspaceManager.setScrollState({
        offset: this._workspaceScroll.offset,
        totalHeight: this._workspaceScroll.getState().totalHeight,
        viewportHeight: this._workspaceScroll.getState().viewportHeight,
        atTop: this._workspaceScroll.getState().atTop,
        atBottom: true,
      });
      this._markDirty();
    });

    this._input.registerGlobal('/', () => {
      if (!this._search.isActive && !this._searchActive) {
        this._search.activate();
        this._runtime.eventBus.emit('search-opened', { query: '', resultCount: 0 }, 'input');
        this._markDirty();
      }
    });

    // Register 'r' for refresh
    this._input.registerGlobal('r', () => {
      // Re-navigate to current screen to refresh
      const curId = this._screens.activeScreenId;
      if (curId) {
        this._screens.navigate(curId);
        this._markDirty();
      }
    });

    // Register 'i' to toggle inspector
    this._input.registerGlobal('i', () => {
      this._inspectorPanel.toggle();
      this._markDirty();
    });

    this._input.registerGlobal('backspace', () => {
      const pState = this._store.getState().palette;
      if (pState.open) {
        const newFilter = pState.filter.slice(0, -1);
        this._palette.setFilter(newFilter);
        this._store.setState({ palette: { ...pState, filter: newFilter } });
      } else if (this._search.isActive) {
        this._search.backspace();
      }
      this._markDirty();
    });

    this._input.registerGlobal('delete', () => {
      const pState = this._store.getState().palette;
      if (pState.open) {
        const newFilter = pState.filter.slice(0, -1);
        this._palette.setFilter(newFilter);
        this._store.setState({ palette: { ...pState, filter: newFilter } });
      } else if (this._search.isActive) {
        this._search.backspace();
      }
      this._markDirty();
    });

    const SEARCH_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-_/@:'.split('');
    for (const ch of SEARCH_CHARS) {
      this._input.registerGlobal(ch, () => {
        const pState = this._store.getState().palette;
        if (pState.open) {
          const newFilter = pState.filter + ch;
          this._palette.setFilter(newFilter);
          this._store.setState({ palette: { ...pState, filter: newFilter } });
        } else if (this._search.isActive) {
          this._search.inputChar(ch);
        }
        this._markDirty();
      });
    }

    this._input.registerGlobal('space', () => {
      const pState = this._store.getState().palette;
      if (pState.open) {
        const newFilter = pState.filter + ' ';
        this._palette.setFilter(newFilter);
        this._store.setState({ palette: { ...pState, filter: newFilter } });
      } else if (this._search.isActive) {
        this._search.inputChar(' ');
      }
      this._markDirty();
    });
  }

  // ── Palette Command Dispatch ───────────────────────────────────

  private _handlePaletteCommand(id: string): void {
    this._store.setState({ palette: { ...this._store.getState().palette, open: false } });

    switch (id) {
      case 'show-dashboard': this._screens.navigate('dashboard'); break;
      case 'run-scan':
      case 'show-scan': this._screens.navigate('scan'); break;
      case 'show-results': this._screens.navigate('results'); break;
      case 'show-architecture': this._screens.navigate('architecture'); break;
      case 'show-dependencies': this._screens.navigate('dependencies'); break;
      case 'show-insights': this._screens.navigate('insights'); break;
      case 'show-suggestions': this._screens.navigate('suggestions'); break;
      case 'show-history': this._screens.navigate('history'); break;
      case 'show-plugins':
      case 'manage-plugins': this._screens.navigate('plugins'); break;
      case 'show-settings': this._screens.navigate('settings'); break;
      case 'show-help':
      case 'help-keyboard':
      case 'keyboard-shortcuts': this._screens.navigate('help'); break;
      case 'show-about': this._screens.navigate('about'); break;
      case 'toggle-search':
      case 'focus-search': this._search.activate(); break;
      case 'toggle-sidebar': {
        const sb = this._store.getState().sidebar;
        const newCollapsed = !sb.collapsed;
        this._store.updateSlice('sidebar', { collapsed: newCollapsed });
        if (newCollapsed) {
          this._sidebarMotion.collapse();
        } else {
          this._sidebarMotion.expand();
        }
        break;
      }
      case 'go-back': this._screens.goBack(); break;
      case 'quit': this.close(); break;
      default: break;
    }
    this._markDirty();
  }

  // ── Phase C: PaletteUX Management ────────────────────────────

  private _openPaletteUX(): void {
    if (this._paletteOpen) return;
    this._paletteOpen = true;
    this._paletteUX.reset();
    this._runtime.eventBus.emit('palette-opened', { open: true }, 'input');
    this._runtime.overlayManager.show('palette');
    // Palette owns focus while open — overlayManager handles focus routing
    this._markDirty();
  }

  private _closePaletteUX(): void {
    if (!this._paletteOpen) return;
    this._paletteOpen = false;
    this._runtime.eventBus.emit('palette-closed', { open: false }, 'input');
    this._runtime.overlayManager.hide('palette');
    // Focus returns to the next overlay in the stack automatically
    this._markDirty();
  }

  // ── Phase D: SearchUX Management ─────────────────────────────

  private _openSearchUX(): void {
    if (this._searchActive) return;
    this._searchActive = true;
    // Restore previous search state when reopening
    const prevQuery = this._searchUX.query;
    this._searchUX.activate(prevQuery);
    this._searchUX.setItems(this._getSearchableItems());
    this._runtime.eventBus.emit('search-opened', { query: prevQuery, resultCount: this._searchUX.resultCount }, 'input');
    this._runtime.overlayManager.show('search');
    this._markDirty();
  }

  private _closeSearchUX(): void {
    if (!this._searchActive) return;
    this._searchActive = false;
    this._searchUX.deactivate();
    this._runtime.eventBus.emit('search-closed', { query: '', resultCount: 0 }, 'input');
    this._runtime.overlayManager.hide('search');
    // Focus returns to the next overlay in the stack automatically
    this._markDirty();
  }

  /** Get searchable items from the current screen for SearchUX. */
  private _getSearchableItems(): string[] {
    const state = this._store.getState();
    const screenId = this._screens.activeScreenId ?? 'dashboard';
    // Collect searchable text from the active screen content
    const items: string[] = [];
    // Sidebar items are always searchable
    for (const itemId of SIDEBAR_IDS) {
      items.push(itemId);
    }
    // Add header info
    items.push(state.header.projectName);
    if (state.analysis) {
      items.push(state.analysis.projectName);
      for (const tech of state.analysis.technologies) {
        items.push(tech.name);
      }
    }
    return items;
  }

  /** Mark workspace layer as dirty. */
  private _markDirty(): void {
    this._runtime.markDirty('workspace');
  }
}
