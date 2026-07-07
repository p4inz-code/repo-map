/**
 * WorkspaceLayout — persistent multi-region layout for interactive mode.
 *
 * Manages 4 regions:
 * - Sidebar (NavigationSidebar) — view selection
 * - Tree (RepositoryTree) — interactive file explorer
 * - Info Panel (InfoPanel) — contextual details
 * - Footer — keyboard hints
 *
 * Plus: BreadcrumbBar and StatusLine.
 *
 * # Layout
 * ```
 * ┌──────────────────────────────────────────────────────────────┐
 * │  repo-map — Interactive Workspace                 v2.2.0    │  ← Header
 * ├────────┬───────────────────────────────────┬───────────────┤
 * │        │                                   │               │
 * │ Nav    │  Overview / Statistics / Tree     │  Info Panel   │  ← Content
 * │ Sidebar│  / Suggestions / Help             │  (contextual) │     Area
 * │        │                                   │               │
 * ├────────┴───────────────────────────────────┴───────────────┤
 * │  Breadcrumb: Overview → Statistics                         │  ← Breadcrumb
 * ├──────────────────────────────────────────────────────────────┤
 * │  Mode: Tree · Focus: tree                                    │  ← Status line
 * ├──────────────────────────────────────────────────────────────┤
 * │  ↑↓ Navigate · Enter Open · Tab Focus · q Quit             │  ← Footer
 * └──────────────────────────────────────────────────────────────┘
 * ```
 *
 * # Architecture
 * - Renders as a single frame renderer in the App.
 * - Each region is an independent component with dirty-state rendering.
 * - Focus is tracked via the Store's workspace.focusedRegion.
 * - Terminal resize triggers layout recalculation.
 * - 4 regions for split navigation: sidebar → tree → info → footer.
 *
 * # Keyboard
 * - Tab/Shift+Tab: Cycle focus between regions (sidebar→tree→info→footer).
 * - ↑↓: Navigate within focused region.
 * - Enter: Confirm/select/toggle within focused region.
 * - Space: Toggle panel collapse (when focused on content panels).
 * - Home/End: Jump to first/last item in region.
 * - PageUp/PageDown: Scroll one page.
 * - Ctrl+Home/Ctrl+End: Jump to absolute top/bottom.
 * - q: Quit workspace.
 *
 * # Focus Indication
 * - Each region shows a focus indicator (pointer symbol) when focused.
 * - Non-focused regions show dimmed styling.
 * - Focus is visually obvious at all times.
 *
 * # Selection Model
 * - Each region maintains independent selection state.
 * - Changing focus never loses selection.
 * - Tree selection updates the info panel immediately.
 * - Sidebar selection updates the active view.
 *
 * # Empty/Loading States
 * - Every region has professional empty, loading, unavailable, no-selection states.
 */

import { Component, blank } from './component.js';
import type { Renderer, Line } from '../renderer.js';
import { NavigationSidebar } from './sidebar.js';
import { BreadcrumbBar } from './breadcrumb.js';
import { Footer } from './footer.js';
import type { KeyHintEntry } from './footer.js';
import { InfoPanel } from './info-panel.js';
import { RepositoryTree } from './repository-tree.js';
import { CommandPalette } from './command-palette.js';
import { KeyboardHelp } from './keyboard-help.js';
import type { WorkspaceView, WorkspaceRegion, BreadcrumbSegment, InfoPanelData, TreeNodeData, RegionSelectionState, RegionScrollState, PanelCollapseState } from '../state/types.js';
import { CLI_VERSION } from '../../types.js';
import type { Analysis } from '../../types.js';
import { buildInfoPanelData } from '../shared/info-panel-builder.js';

// ─── Types ─────────────────────────────────────────────────────

export interface WorkspaceLayoutOptions {
  /** Currently active view. */
  activeView: WorkspaceView;
  /** Currently focused region. */
  focusedRegion: WorkspaceRegion;
  /** Breadcrumb navigation path. */
  breadcrumbs: BreadcrumbSegment[];
  /** Sidebar width in characters. */
  sidebarWidth: number;
  /** Whether the layout is active (vs one-shot screen mode). */
  active: boolean;
  /** Terminal width in columns. */
  terminalWidth: number;
  /** Terminal height in rows. */
  terminalHeight: number;
  /** Currently selected item label for status line. */
  selectedItem: string;
  /** Independent selection state per region. */
  regionSelections: RegionSelectionState;
  /** Scroll state per region. */
  regionScroll: RegionScrollState;
  /** Panel collapse state. */
  collapsedPanels: PanelCollapseState;
  /** Info panel content data. */
  infoPanelData: InfoPanelData;
  /** Tree data for interactive explorer. */
  treeData: TreeNodeData | null;
  /** Whether command palette is shown. */
  showPalette?: boolean;
  /** Whether the keyboard help overlay is shown. */
  showHelp?: boolean;
  /** Callback when a palette command is selected. */
  onPaletteCommand?: (id: string) => void;
  /** Search filter query for tree filtering. */
  searchQuery?: string;
  /** Full analysis data for real inspector content. */
  repoAnalysis?: Analysis | null;
  /**
   * Callback invoked when a child component marks itself dirty.
   * Wires Component.markDirty() into the Store's dirtyComponents set.
   */
  onDirty?: (id: string) => void;
  /**
   * Set of component IDs that need re-rendering.
   * When non-empty and fullRedraw is false, only components whose
   * IDs exist in this set will have render() called.
   */
  dirtyComponents?: Set<string>;
  /**
   * Whether a full re-render is needed (bypasses dirty filtering).
   * When true, every component is rendered regardless of dirtyComponents.
   */
  fullRedraw?: boolean;
}

// ─── Constants ─────────────────────────────────────────────────

/** Default info panel width. */
const INFO_PANEL_WIDTH = 30;

/** Minimum width to show info panel. */
const MIN_WIDTH_FOR_INFO = 80;

// ─── Blank-line cache ───────────────────────────────────────────

/** Cache of blank padding lines keyed by terminal width. */
const _blankLineCache = new Map<number, Line>();

/** Get or create a blank line of the given width. */
function _blankLine(width: number): Line {
  let cached = _blankLineCache.get(width);
  if (!cached) {
    cached = { segments: [{ text: ' '.repeat(width) }] };
    _blankLineCache.set(width, cached);
  }
  return cached;
}

// ─── WorkspaceLayout ─────────────────────────────────────────

export class WorkspaceLayout extends Component {
  private _sidebar: NavigationSidebar;
  private _breadcrumb: BreadcrumbBar;
  private _footer: Footer;
  private _infoPanel: InfoPanel;
  private _tree: RepositoryTree;
  private _options: WorkspaceLayoutOptions;
  private _palette: CommandPalette | null = null;
  private _help: KeyboardHelp | null = null;

  // ── Cached composed output ──────────────────────────────────────
  /**
   * Cached result of the last full workspace composition.
   * When no child rendered this frame and fullRedraw is false,
   * this cache is returned immediately, skipping all composition work.
   */
  private _cachedWorkspaceOutput: Line[] | null = null;

  /**
   * Tracks whether any child component executed its render() method
   * (rather than returning cached output) during the current frame.
   * Reset to false at the start of each renderContent() call.
   */
  private _anyChildRendered: boolean = false;

  constructor(id: string, options: WorkspaceLayoutOptions) {
    super(id);
    this._options = options;

    // Create command palette if needed
    if (options.showPalette && options.onPaletteCommand) {
      this._palette = new CommandPalette('workspace-palette', {
        width: Math.min(50, options.terminalWidth - 10),
        height: Math.min(18, options.terminalHeight - 4),
      });
      this._palette.onCommand(options.onPaletteCommand);
      this._wireDirtyCallback(this._palette, options);
    }

    const hasInfo = options.terminalWidth >= MIN_WIDTH_FOR_INFO;

    this._sidebar = new NavigationSidebar('ws-sidebar', {
      activeView: options.activeView,
      width: options.sidebarWidth,
      focused: options.focusedRegion === 'sidebar',
      terminalHeight: options.terminalHeight,
    });
    this._wireDirtyCallback(this._sidebar, options);

    this._breadcrumb = new BreadcrumbBar('ws-breadcrumb', {
      segments: options.breadcrumbs,
      width: options.terminalWidth - options.sidebarWidth - (hasInfo ? INFO_PANEL_WIDTH + 2 : 1),
    });
    this._wireDirtyCallback(this._breadcrumb, options);

    this._infoPanel = new InfoPanel('ws-infopanel', {
      width: INFO_PANEL_WIDTH,
      height: this._computeContentHeight(options),
      focused: options.focusedRegion === 'info',
      data: options.infoPanelData,
    });
    this._wireDirtyCallback(this._infoPanel, options);

    this._tree = new RepositoryTree('ws-tree', {
      data: options.treeData,
      width: this._computeMainWidth(options),
      height: this._computeContentHeight(options),
      focused: options.focusedRegion === 'tree',
      scrollOffset: options.regionScroll.treeOffset,
      selectedIndex: options.regionSelections.treeIndex,
      onSelectionChange: (path, type) => this._onTreeSelection(path, type),
    });
    this._wireDirtyCallback(this._tree, options);

    // Create help overlay if needed
    if (options.showHelp) {
      this._help = new KeyboardHelp('ws-help', {
        width: Math.min(54, options.terminalWidth - 8),
        height: Math.min(options.terminalHeight - 4, 30),
      });
      this._wireDirtyCallback(this._help, options);
    }

    const hints = this._buildHints(options);
    this._footer = new Footer('ws-footer', {
      hints,
      separator: '·',
      focused: options.focusedRegion === 'footer',
    });
    this._wireDirtyCallback(this._footer, options);
  }

  // ── Region Accessors ───────────────────────────────────────

  /** Get the sidebar component. */
  get sidebar(): NavigationSidebar {
    return this._sidebar;
  }

  /** Get the info panel component. */
  get infoPanel(): InfoPanel {
    return this._infoPanel;
  }

  /** Get the repository tree component. */
  get tree(): RepositoryTree {
    return this._tree;
  }

  /** Get the breadcrumb bar component. */
  get breadcrumb(): BreadcrumbBar {
    return this._breadcrumb;
  }

  // ── Mutators ─────────────────────────────────────────────────

  /** Update all layout options and mark dirty as needed. */
  setOptions(options: Partial<WorkspaceLayoutOptions>): void {
    let needsRebuild = false;

    // Snapshot old overlay state BEFORE Object.assign overwrites them
    // (used below to detect actual toggle events vs. same-value re-passing)
    const prevShowPalette = this._options.showPalette;
    const prevShowHelp = this._options.showHelp;

    // Update options
    Object.assign(this._options, options);

    // Propagate to child components
    let contentChanged = false;

    if (options.activeView !== undefined) {
      this._sidebar.setActiveView(options.activeView);
      contentChanged = true;
      needsRebuild = true;
    }
    if (options.focusedRegion !== undefined) {
      this._sidebar.setFocused(options.focusedRegion === 'sidebar');
      this._infoPanel.setFocused(options.focusedRegion === 'info');
      this._tree.setFocused(options.focusedRegion === 'tree');
      contentChanged = true;
      needsRebuild = true;
    }
    if (options.breadcrumbs !== undefined) {
      this._breadcrumb.setSegments(options.breadcrumbs);
      contentChanged = true;
    }
    if (options.sidebarWidth !== undefined) {
      contentChanged = true;
      needsRebuild = true;
    }
    if (options.terminalWidth !== undefined) {
      contentChanged = true;
      needsRebuild = true;
      const hasInfo = options.terminalWidth >= MIN_WIDTH_FOR_INFO;
      this._breadcrumb.setWidth(
        options.terminalWidth - this._options.sidebarWidth - (hasInfo ? INFO_PANEL_WIDTH + 2 : 1),
      );
    }
    if (options.terminalHeight !== undefined) {
      this._sidebar.setTerminalHeight(options.terminalHeight);
      contentChanged = true;
      needsRebuild = true;
    }
    if (options.selectedItem !== undefined) {
      // Just a label update on the status line — still affects output
      contentChanged = true;
    }
    if (options.regionSelections !== undefined) {
      this._tree.setSelectedIndex(options.regionSelections.treeIndex);
      contentChanged = true;
    }
    if (options.regionScroll !== undefined) {
      this._tree.setScrollOffset(options.regionScroll.treeOffset);
      contentChanged = true;
    }
    if (options.infoPanelData !== undefined) {
      this._infoPanel.setData(options.infoPanelData);
      contentChanged = true;
    }
    if (options.treeData !== undefined) {
      this._tree.setData(options.treeData);
      contentChanged = true;
    }
    if (options.collapsedPanels !== undefined) {
      this._options.collapsedPanels = options.collapsedPanels;
      contentChanged = true;
      needsRebuild = true;
    }

    // Handle palette toggle — only process when the value actually changes
    if (options.showPalette !== undefined && options.showPalette !== prevShowPalette) {
      this._options.showPalette = options.showPalette;
      contentChanged = true;
      needsRebuild = true;
      // Invalidate workspace cache — overlay state changes the entire output
      this._cachedWorkspaceOutput = null;

      // Create or destroy palette
      if (options.showPalette && !this._palette && options.onPaletteCommand) {
        this._palette = new CommandPalette('workspace-palette', {
          width: Math.min(50, this._options.terminalWidth - 10),
          height: Math.min(18, this._options.terminalHeight - 4),
        });
        this._palette.onCommand(options.onPaletteCommand);
        this._wireDirtyCallback(this._palette, this._options);
      } else if (!options.showPalette) {
        this._palette = null;
      }
    }

    // Handle help overlay toggle — only process when the value actually changes
    if (options.showHelp !== undefined && options.showHelp !== prevShowHelp) {
      this._options.showHelp = options.showHelp;
      contentChanged = true;
      needsRebuild = true;
      // Invalidate workspace cache — overlay state changes the entire output
      this._cachedWorkspaceOutput = null;

      if (options.showHelp) {
        this._help = new KeyboardHelp('ws-help', {
          width: Math.min(54, this._options.terminalWidth - 8),
          height: Math.min(this._options.terminalHeight - 4, 30),
        });
        this._wireDirtyCallback(this._help, this._options);
      } else {
        this._help = null;
      }
    }

    // Handle search query for tree filtering
    if (options.searchQuery !== undefined) {
      this._options.searchQuery = options.searchQuery;
      contentChanged = true;
      // Filter tree visible nodes
      const treeData = this._options.treeData;
      if (treeData && options.searchQuery) {
        this._tree.setFilter(options.searchQuery);
      } else if (options.searchQuery === '') {
        this._tree.setFilter('');
      }
    }

    // Rebuild child components that depend on layout dimensions
    if (needsRebuild) {
      const contentHeight = this._computeContentHeight(this._options);
      const mainWidth = this._computeMainWidth(this._options);
      this._tree.setDimensions(mainWidth, contentHeight);
      this._infoPanel.setDimensions(INFO_PANEL_WIDTH, contentHeight);

      // Update footer hints based on focused region
      this._footer.setHints(this._buildHints(this._options));

      this.markDirty();
    } else if (contentChanged) {
      // Non-structural content change (e.g., info panel data, breadcrumbs,
      // tree selection). The layout composition must be re-evaluated so
      // the final frame includes updated child output.
      this.markDirty();
    }
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    return this._options.terminalHeight;
  }

  protected renderContent(renderer: Renderer): Line[] {
    // Reset frame-level child-rendered tracker
    this._anyChildRendered = false;

    if (!this._options.active) {
      // Inactive state — clear cache
      this._cachedWorkspaceOutput = null;
      return [{
        segments: [{ text: 'Workspace is not active. Run an analysis first.' }],
      }];
    }

    // If keyboard help is active, render it as an overlay (highest priority)
    if (this._help && this._options.showHelp) {
      const helpLines = this._help.render(renderer);
      this._cachedWorkspaceOutput = helpLines;
      return helpLines;
    }

    // If command palette is active, render it as an overlay
    if (this._palette && this._options.showPalette) {
      const paletteLines = this._palette.render(renderer);
      this._cachedWorkspaceOutput = paletteLines;
      return paletteLines;
    }

    const tw = this._options.terminalWidth;
    const th = this._options.terminalHeight;
    const sw = this._options.sidebarWidth;
    const hasInfo = tw >= MIN_WIDTH_FOR_INFO;
    const iw = hasInfo ? INFO_PANEL_WIDTH : 0;
    const mw = tw - sw - (hasInfo ? iw + 2 : 1); // Main content width
    const contentHeight = th - 5; // header(2) + breadcrumb(1) + status(1) + footer(1)
    const focusedRegion = this._options.focusedRegion;

    // ── Phase 1: Render ALL children (collect raw output) ──────
    const sidebarLines = this._renderChildIfDirty(this._sidebar, renderer);
    const mainContent = this._renderMainContent(renderer, mw, contentHeight);
    const infoLines = hasInfo ? this._renderChildIfDirty(this._infoPanel, renderer) : [];
    this._footer.setFocused(focusedRegion === 'footer');
    const footerLines = this._renderChildIfDirty(this._footer, renderer);
    const breadcrumbLines = this._renderChildIfDirty(this._breadcrumb, renderer);

    // ── Cache check ─────────────────────────────────────────
    // If no child actually executed render() this frame (all were
    // clean and returned cached output), and we have a previously
    // cached workspace composition, return it immediately to skip
    // all ANSI conversion and column-joining work.
    //
    // fullRedraw bypasses the cache.
    if (
      !this._anyChildRendered &&
      !this._options.fullRedraw &&
      this._cachedWorkspaceOutput !== null
    ) {
      return this._cachedWorkspaceOutput;
    }

    // ── Phase 2: Compose the full workspace frame ─────────────
    const lines: Line[] = [];
    const sep = renderer.theme.symbol('separator');

    // Header (1 line)
    const headerText = 'repo-map — Interactive Workspace';
    const versionText = `v${CLI_VERSION}`;
    const headerPad = Math.max(1, tw - headerText.length - versionText.length);
    lines.push({
      segments: [
        { text: headerText, style: { bold: true } },
        { text: ' '.repeat(headerPad) + versionText, style: { dim: true } },
      ],
    });

    // Divider
    lines.push({
      segments: [{ text: sep.repeat(tw), style: { dim: true } }],
    });

    // Batch-render each column into ANSI strings, then combine side by side
    const sidebarRendered = renderer.renderFrame(sidebarLines);
    const mainRendered = renderer.renderFrame(mainContent);
    const infoRendered = hasInfo ? renderer.renderFrame(infoLines) : [];

    const maxContentLines = Math.min(
      Math.max(sidebarRendered.length, mainRendered.length, infoRendered.length),
      contentHeight,
    );

    for (let i = 0; i < maxContentLines && lines.length < th - 3; i++) {
      const sidebarText = i < sidebarRendered.length ? sidebarRendered[i] : '';
      const mainText = i < mainRendered.length ? mainRendered[i] : '';
      const infoText = i < infoRendered.length ? infoRendered[i] : '';

      const combined = hasInfo
        ? sidebarText + '│' + mainText + '│' + infoText
        : sidebarText + '│' + mainText;

      lines.push({ segments: [{ text: combined }] });
    }

    // Fill any remaining content lines using cached blank lines
    const currentContentLines = lines.length;
    const headerLines = 2; // header + divider
    const blankPad = _blankLine(tw);
    for (let i = currentContentLines; i < headerLines + contentHeight; i++) {
      lines.push(blankPad);
    }

    // Breadcrumb
    lines.push(...breadcrumbLines);

    // ── Status line — view icon, focused region, repo summary, filter/search indicators ──
    const viewLabel = this._statusViewLabel(this._options.activeView);
    const viewIcon = this._viewIcon(this._options.activeView, renderer);
    const focusLabel = this._regionFocusLabel(focusedRegion);
    const sepBullet = renderer.theme.symbol('bullet');

    // Build left portion: icon + view name + focus
    let leftStatus = ` ${viewIcon} ${viewLabel} ${sepBullet} ${focusLabel}`;

    // Add tree position indicator when tree is focused
    if (focusedRegion === 'tree' && this._options.activeView === 'tree') {
      const pos = this._tree.positionLabel;
      if (pos) {
        leftStatus += ` ${sepBullet} ${pos}`;
      }
    }

    // Add active filter indicator
    if (this._options.searchQuery) {
      leftStatus += ` ${renderer.theme.symbol('warning')} filter:${this._options.searchQuery}`;
    }

    // Build right portion: selection (truncated if needed) + repo summary
    const selectionStr = this._options.selectedItem
      ? this._truncatePath(this._options.selectedItem, Math.floor(tw * 0.35), renderer)
      : '';

    // Add repo summary (prefer repoAnalysis stats, fall back to tree data)
    let repoSummary = '';
    const analysis = this._options.repoAnalysis;
    if (analysis) {
      // Authoritative stats from the analysis pipeline
      repoSummary = `${analysis.stats.totalFiles}f ${analysis.stats.totalDirectories}d`;
      const langCount = analysis.technologies.filter((t) => t.category === 'language').length;
      if (langCount > 0) {
        repoSummary += ` ${langCount}l`;
      }
    } else if (this._options.treeData) {
      // Fallback: compute from tree data
      const fileCount = this._countFiles(this._options.treeData);
      const dirCount = this._countDirs(this._options.treeData);
      repoSummary = `${fileCount}f ${dirCount}d`;
    }

    // Assemble the right side: [repo summary] · [selection]
    const rightParts: string[] = [];
    if (repoSummary) rightParts.push(repoSummary);
    if (selectionStr) rightParts.push(selectionStr);
    const rightStr = rightParts.join(` ${sepBullet} `);

    const padLen = tw - leftStatus.length - (rightStr ? rightStr.length + 2 : 0);
    const statusLine = padLen > 0
      ? leftStatus + ' '.repeat(padLen) + (rightStr ? ` ${sepBullet} ${rightStr}` : '')
      : leftStatus;

    lines.push({
      segments: [
        { text: statusLine.padEnd(tw), style: { dim: true } },
      ],
    });

    // Footer
    lines.push(...footerLines);

    // Cache composed output for next frame
    this._cachedWorkspaceOutput = lines;
    return lines;
  }

  // ── Internal: Main content rendering ────────────────────────

  /** Render the main content area based on active view. */
  private _renderMainContent(renderer: Renderer, width: number, height: number): Line[] {
    const active = this._options.activeView;
    const isFocused = this._options.focusedRegion === 'tree' && active === 'tree';

    switch (active) {
      case 'overview':
        return this._renderOverviewContent(renderer, width, height);
      case 'statistics':
        return this._renderStatsContent(renderer, width, height, this._options.collapsedPanels);
      case 'suggestions':
        return this._renderSuggestContent(renderer, width, height, this._options.collapsedPanels);
      case 'tree': {
        // Update tree focus state
        this._tree.setFocused(isFocused);
        // Conditional: only render if dirty
        return this._renderChildIfDirty(this._tree, renderer);
      }
      case 'help':
        return this._renderHelpContent(renderer, width, height);
      default:
        return [{ segments: [{ text: '  Unknown view' }] }];
    }
  }

  /** Render the Overview content panel. */
  private _renderOverviewContent(renderer: Renderer, _width: number, _height: number): Line[] {
    const lines: Line[] = [];
    const folderIcon = renderer.theme.symbol('folder');
    const statsIcon = renderer.theme.symbol('stats');
    const infoIcon = renderer.theme.symbol('info');
    const searchIcon = renderer.theme.symbol('search');

    const isFocused = this._options.focusedRegion === 'tree';
    const focusPointer = isFocused ? renderer.theme.symbol('pointer') : ' ';

    lines.push({
      segments: [
        { text: ` ${focusPointer} Overview`, style: isFocused ? { bold: true } : { dim: true } },
      ],
    });
    lines.push(blank());
    lines.push({
      segments: [
        { text: '   Select a view from the sidebar to explore', style: { dim: true } },
      ],
    });
    lines.push({
      segments: [
        { text: '   your repository analysis:', style: { dim: true } },
      ],
    });
    lines.push(blank());
    lines.push({
      segments: [
        { text: `   ${statsIcon}  `, style: {} },
        { text: 'Statistics', style: { bold: true } },
        { text: ' — Language breakdown & file metrics', style: { dim: true } },
      ],
    });
    lines.push({
      segments: [
        { text: `   ${infoIcon}  `, style: {} },
        { text: 'Suggestions', style: { bold: true } },
        { text: ' — Improvement recommendations', style: { dim: true } },
      ],
    });
    lines.push({
      segments: [
        { text: `   ${folderIcon}  `, style: {} },
        { text: 'Repository Tree', style: { bold: true } },
        { text: ' — Interactive file explorer', style: { dim: true } },
      ],
    });
    lines.push({
      segments: [
        { text: `   ${searchIcon}  `, style: {} },
        { text: 'Help', style: { bold: true } },
        { text: ' — Keyboard shortcuts reference', style: { dim: true } },
      ],
    });

    return lines;
  }

  /** Render the Statistics content panel with collapsible sections. */
  private _renderStatsContent(renderer: Renderer, _width: number, _height: number, collapsed: PanelCollapseState): Line[] {
    const lines: Line[] = [];
    const statsIcon = renderer.theme.symbol('stats');
    const isFocused = this._options.focusedRegion === 'tree';

    // Main header
    lines.push({
      segments: [
        { text: ` ${isFocused ? renderer.theme.symbol('pointer') : ' '} ${statsIcon}  Statistics`, style: isFocused ? { bold: true } : { dim: true } },
      ],
    });
    lines.push(blank());

    if (collapsed.statsPanel) {
      lines.push({
        segments: [{ text: '   ▶ Statistics panel collapsed (Enter to expand)', style: { dim: true } }],
      });
      return lines;
    }

    // Metrics section
    lines.push({
      segments: [{ text: '   General Metrics', style: { bold: true } }],
    });
    lines.push({
      segments: [{ text: '   File and directory counts, size, and depth', style: { dim: true } }],
    });
    lines.push(blank());

    // Languages section
    if (collapsed.statsPanel) {
      lines.push({
        segments: [{ text: '   ▶ Languages (collapsed)', style: { dim: true } }],
      });
    } else {
      lines.push({
        segments: [{ text: '   Languages', style: { bold: true } }],
      });
      lines.push({
        segments: [{ text: '   Language breakdown with file counts', style: { dim: true } }],
      });
      lines.push(blank());
    }

    // Largest files section
    lines.push({
      segments: [{ text: '   Largest Files & Directories', style: { bold: true } }],
    });
    lines.push({
      segments: [{ text: '   Biggest files and directories by size', style: { dim: true } }],
    });

    return lines;
  }

  /** Render the Suggestions content panel with collapsible sections. */
  private _renderSuggestContent(renderer: Renderer, _width: number, _height: number, collapsed: PanelCollapseState): Line[] {
    const lines: Line[] = [];
    const infoIcon = renderer.theme.symbol('info');
    const isFocused = this._options.focusedRegion === 'tree';
    const checkIcon = renderer.theme.symbol('success');

    lines.push({
      segments: [
        { text: ` ${isFocused ? renderer.theme.symbol('pointer') : ' '} ${infoIcon}  Suggestions`, style: isFocused ? { bold: true } : { dim: true } },
      ],
    });
    lines.push(blank());

    if (collapsed.suggestionsPanel) {
      lines.push({
        segments: [{ text: '   ▶ Suggestions collapsed (Enter to expand)', style: { dim: true } }],
      });
      return lines;
    }

    // Strengths
    lines.push({
      segments: [{ text: `   ${checkIcon} Strengths`, style: { bold: true } }],
    });
    lines.push({
      segments: [{ text: '   Positive aspects of your project', style: { dim: true } }],
    });
    lines.push(blank());

    // Improvements
    lines.push({
      segments: [{ text: '   Improvements', style: { bold: true } }],
    });
    lines.push({
      segments: [{ text: '   Actionable recommendations by priority', style: { dim: true } }],
    });
    lines.push(blank());

    // Architecture
    if (!collapsed.architecturePanel) {
      lines.push({
        segments: [{ text: '   Architecture', style: { bold: true } }],
      });
      lines.push({
        segments: [{ text: '   Code organization and pattern analysis', style: { dim: true } }],
      });
    }

    return lines;
  }

  /** Render the Help content panel. */
  private _renderHelpContent(renderer: Renderer, _width: number, _height: number): Line[] {
    const lines: Line[] = [];
    const searchIcon = renderer.theme.symbol('search');
    const isFocused = this._options.focusedRegion === 'tree';
    const pointer = isFocused ? renderer.theme.symbol('pointer') : ' ';

    lines.push({
      segments: [
        { text: ` ${pointer} ${searchIcon}  Help`, style: isFocused ? { bold: true } : { dim: true } },
      ],
    });
    lines.push(blank());
    lines.push({
      segments: [{ text: '   Keyboard Shortcuts', style: { bold: true } }],
    });
    lines.push(blank());
    lines.push({ segments: [{ text: '   General' }] });
    lines.push({ segments: [{ text: '   Tab/Shift+Tab  Cycle focus between regions', style: { dim: true } }] });
    lines.push({ segments: [{ text: '   ↑↓            Navigate items', style: { dim: true } }] });
    lines.push({ segments: [{ text: '   Enter          Select / toggle', style: { dim: true } }] });
    lines.push({ segments: [{ text: '   Space          Toggle panel collapse', style: { dim: true } }] });
    lines.push({ segments: [{ text: '   q              Quit workspace', style: { dim: true } }] });
    lines.push(blank());
    lines.push({ segments: [{ text: '   Tree View' }] });
    lines.push({ segments: [{ text: '   ←/→            Collapse / Expand', style: { dim: true } }] });
    lines.push({ segments: [{ text: '   Home/End        First / Last item', style: { dim: true } }] });
    lines.push({ segments: [{ text: '   PgUp/PgDn       Scroll page', style: { dim: true } }] });
    lines.push({ segments: [{ text: '   Ctrl+Home/End   Root / Deepest node', style: { dim: true } }] });
    lines.push(blank());
    lines.push({ segments: [{ text: '   Sidebar' }] });
    lines.push({ segments: [{ text: '   ↑↓              Navigate views', style: { dim: true } }] });
    lines.push({ segments: [{ text: '   Enter            Switch to view', style: { dim: true } }] });
    lines.push(blank());
    lines.push({ segments: [{ text: '   Info Panel' }] });
    lines.push({ segments: [{ text: '   ↑↓              Scroll content', style: { dim: true } }] });
    lines.push(blank());
    lines.push({
      segments: [{ text: '   Press Tab to cycle focus between regions.', style: { dim: true } }],
    });

    return lines;
  }

  // ── Internal: Event handlers ─────────────────────────────────

  /** Handle tree node selection → update info panel with analysis data when available. */
  private _onTreeSelection(path: string, type: 'file' | 'directory'): void {
    const analysis = this._options.repoAnalysis ?? null;
    const name = path.split(/[/\\]/).pop() || path;

    const infoData = buildInfoPanelData(
      { name, path, type },
      analysis,
    );

    this._options.infoPanelData = infoData;
    this._options.selectedItem = path;
    this._infoPanel.setData(infoData);
    this.markDirty();
  }

  // ── Internal: Dirty callback wiring ────────────────────────────

  /**
   * Wire a child component's dirty callback to the parent's onDirty handler.
   * This ensures Component.markDirty() propagates to the Store's
   * dirtyComponents set.
   */
  private _wireDirtyCallback(component: Component, options: WorkspaceLayoutOptions): void {
    if (options.onDirty) {
      component.setDirtyCallback(options.onDirty);
    }
  }

  // ── Internal: Conditional child rendering ───────────────────────

  /**
   * Conditionally render a child component based on dirty state.
   *
   * If fullRedraw is true, or the component's ID is in dirtyComponents,
   * or the component itself reports isDirty, then render() is called to
   * produce fresh output.
   *
   * Otherwise, the component's previously cached rendered output is reused
   * via getCachedLines(), falling back to a fresh render() if no cache
   * exists yet.
   *
   * This is the core of component-aware rendering selection: only dirty
   * components execute their renderContent(); clean components skip the
   * call entirely and reuse their last output.
   *
   * @param component - The child component to render.
   * @param renderer - The Renderer for ANSI style resolution.
   * @returns Rendered lines (fresh or cached).
   */
  private _renderChildIfDirty(component: Component, renderer: Renderer): Line[] {
    const dirtyComponents = this._options.dirtyComponents;
    const fullRedraw = this._options.fullRedraw;

    if (fullRedraw || (dirtyComponents && dirtyComponents.has(component.id)) || component.isDirty) {
      // Child actually needs rendering — track that a child rendered this frame
      this._anyChildRendered = true;
      return component.render(renderer);
    }

    // Component is clean — reuse cached output if available
    const cached = component.getCachedLines();
    if (cached !== null) {
      return cached;
    }

    // No cache exists yet (first render) — fall back to fresh render
    this._anyChildRendered = true;
    return component.render(renderer);
  }

  // ── Internal: Helpers ────────────────────────────────────────

  /** Build contextual keyboard hints based on focused region, view, and selected item. */
  private _buildHints(options: WorkspaceLayoutOptions): KeyHintEntry[] {
    const region = options.focusedRegion;
    const view = options.activeView;
    const hints: KeyHintEntry[] = [];

    switch (region) {
      case 'sidebar':
        hints.push({ key: '↑↓', description: 'Select' });
        hints.push({ key: 'Enter', description: 'Open' });
        break;
      case 'tree':
        hints.push({ key: '↑↓', description: 'Navigate' });
        hints.push({ key: '←→', description: 'Expand/Collapse' });
        hints.push({ key: 'Enter', description: 'Toggle' });
        if (view === 'tree') {
          hints.push({ key: '/', description: 'Filter' });
        }
        break;
      case 'info':
        hints.push({ key: '↑↓', description: 'Scroll' });
        break;
      case 'footer':
        hints.push({ key: 'Tab', description: 'Cycle focus' });
        break;
    }

    // Commands palette (available everywhere)
    hints.push({ key: '⌘P', description: 'Commands' });

    // Tab cycling hint (skip when footer has its own Tab hint to avoid redundancy)
    if (region !== 'footer') {
      hints.push({ key: 'Tab', description: 'Focus next' });
    }

    // Keyboard shortcuts reference — displayed when not already on help overlay
    hints.push({ key: '?', description: 'Keyboard shortcuts' });

    hints.push({ key: 'q', description: 'Quit' });

    return hints;
  }

  /** Compute the height available for content regions. */
  private _computeContentHeight(options: WorkspaceLayoutOptions): number {
    return Math.max(5, options.terminalHeight - 5); // header(2) + breadcrumb(1) + status(1) + footer(1)
  }

  /** Compute the main content width. */
  private _computeMainWidth(options: WorkspaceLayoutOptions): number {
    const hasInfo = options.terminalWidth >= MIN_WIDTH_FOR_INFO;
    return options.terminalWidth - options.sidebarWidth - (hasInfo ? INFO_PANEL_WIDTH + 2 : 1);
  }

  /** Get view label for status line. */
  private _statusViewLabel(view: WorkspaceView): string {
    const labels: Record<WorkspaceView, string> = {
      overview: 'Overview',
      statistics: 'Statistics',
      suggestions: 'Suggestions',
      tree: 'Repository Tree',
      help: 'Help',
    };
    return labels[view];
  }

  /** Get concise region focus label. */
  private _regionFocusLabel(region: WorkspaceRegion): string {
    const labels: Record<WorkspaceRegion, string> = {
      sidebar: 'sidebar',
      tree: 'tree',
      info: 'info',
      footer: 'footer',
    };
    return labels[region];
  }

  /** Truncate a path for the status line, keeping the last N chars. */
  private _truncatePath(path: string, maxLen: number, renderer: Renderer): string {
    if (path.length <= maxLen) return path;
    const ellipsis = renderer.theme.symbol('ellipsis');
    return ellipsis + path.slice(-(maxLen - 1));
  }

  /** Get a short symbol for the active view. */
  private _viewIcon(view: WorkspaceView, renderer: Renderer): string {
    const icons: Record<WorkspaceView, string> = {
      overview: renderer.theme.symbol('repo'),
      statistics: renderer.theme.symbol('stats'),
      suggestions: renderer.theme.symbol('info'),
      tree: renderer.theme.symbol('folder'),
      help: renderer.theme.symbol('search'),
    };
    return icons[view];
  }

  /** Count files in tree data recursively. */
  private _countFiles(node: TreeNodeData): number {
    let count = node.type === 'file' ? 1 : 0;
    if (node.children) {
      for (const child of node.children) {
        count += this._countFiles(child);
      }
    }
    return count;
  }

  /** Count directories in tree data recursively. */
  private _countDirs(node: TreeNodeData): number {
    let count = node.type === 'directory' ? 1 : 0;
    if (node.children) {
      for (const child of node.children) {
        count += this._countDirs(child);
      }
    }
    return count;
  }
}
