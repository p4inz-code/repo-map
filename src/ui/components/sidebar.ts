/**
 * NavigationSidebar component — persistent sidebar for workspace navigation.
 *
 * Displays sections: Overview, Statistics, Suggestions, Repository Tree, Help.
 * Supports keyboard navigation (↑/↓), focus indication, and selection highlighting.
 * Updates the workspace activeView when a section is selected.
 *
 * # Usage
 * ```ts
 * const sidebar = new NavigationSidebar('workspace-sidebar', {
 *   activeView: 'overview',
 *   width: 22,
 *   focused: false,
 * });
 * const lines = sidebar.render(renderer);
 * ```
 *
 * # Architecture
 * - Renders as a vertical list of sections with icons.
 * - Active section is highlighted (bold + indicator).
 * - Shows "Navigating..." context line when focused.
 * - Accepts keyboard actions: navigateUp, navigateDown, confirm.
 */

import { Component, blank } from './component.js';
import type { Renderer, Line } from '../renderer.js';
import type { WorkspaceView } from '../state/types.js';
import type { SymbolToken } from '../theme/index.js';

// ─── Types ─────────────────────────────────────────────────────

export interface SidebarOptions {
  /** Currently active view. */
  activeView: WorkspaceView;
  /** Sidebar width in characters. */
  width: number;
  /** Whether this sidebar has keyboard focus. */
  focused: boolean;
  /** Total terminal height for sizing. */
  terminalHeight?: number;
}

interface SidebarSection {
  /** Section identifier. */
  id: WorkspaceView;
  /** Display label. */
  label: string;
  /** Theme symbol key for the icon. */
  icon: string;
}

// ─── Constants ─────────────────────────────────────────────────

const SECTIONS: SidebarSection[] = [
  { id: 'overview', label: 'Overview', icon: 'repo' },
  { id: 'statistics', label: 'Statistics', icon: 'stats' },
  { id: 'suggestions', label: 'Suggestions', icon: 'info' },
  { id: 'tree', label: 'Repository Tree', icon: 'folder' },
  { id: 'help', label: 'Help', icon: 'search' },
];

// ─── NavigationSidebar ─────────────────────────────────────────

export class NavigationSidebar extends Component {
  private _activeView: WorkspaceView;
  private _width: number;
  private _focused: boolean;
  private _terminalHeight: number;

  constructor(id: string, options: SidebarOptions) {
    super(id);
    this._activeView = options.activeView;
    this._width = options.width;
    this._focused = options.focused;
    this._terminalHeight = options.terminalHeight ?? 24;
  }

  // ── Mutators ─────────────────────────────────────────────────

  /** Update the active view. */
  setActiveView(view: WorkspaceView): void {
    if (view !== this._activeView) {
      this._activeView = view;
      this.markDirty();
    }
  }

  /** Update focus state. */
  setFocused(focused: boolean): void {
    if (focused !== this._focused) {
      this._focused = focused;
      this.markDirty();
    }
  }

  /** Update terminal height (for sizing on resize). */
  setTerminalHeight(height: number): void {
    if (height !== this._terminalHeight) {
      this._terminalHeight = height;
      this.markDirty();
    }
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    // Title + sections + blank lines + helper text
    return Math.min(4 + SECTIONS.length, this._terminalHeight - 4);
  }

  protected renderContent(renderer: Renderer): Line[] {
    const lines: Line[] = [];
    const width = this._width;
    const sep = renderer.theme.symbol('separator');
    const pointer = renderer.theme.symbol('pointer');
    const arrowUp = renderer.theme.symbol('arrowUp');
    const arrowDown = renderer.theme.symbol('arrowDown');

    // ── Sidebar title ────────────────────────────────────────
    const navIndicator = this._focused ? pointer : ' ';
    lines.push({
      segments: [
        { text: ` ${navIndicator} `, style: this._focused ? { bold: true } : { dim: true } },
        { text: 'Navigation', style: { bold: true } },
      ],
    });

    // Divider line
    lines.push({
      segments: [{ text: ` ${sep.repeat(width - 2)}`, style: { dim: true } }],
    });

    lines.push(blank());

    // ── Sections ─────────────────────────────────────────────
    for (const section of SECTIONS) {
      const isActive = section.id === this._activeView;
      const icon = renderer.theme.symbol(section.icon as SymbolToken) || ' ';
      const label = section.label;
      const paddedLabel = label.padEnd(width - 6);

      if (isActive) {
        // Active section: pointer + bold when focused, dimmed when blurred
        const f = this._focused;
        lines.push({
          segments: [
            { text: ` ${f ? pointer : ' '} `, style: f ? { bold: true } : { dim: true } },
            { text: icon, style: f ? { bold: true } : { dim: true } },
            { text: ` ${paddedLabel}`, style: f ? { bold: true } : { dim: true } },
          ],
        });
      } else {
        // Inactive section: dim icon + label (same style regardless of focus)
        lines.push({
          segments: [
            { text: '   ' },
            { text: icon, style: { dim: true } },
            { text: ` ${paddedLabel}`, style: { dim: true } },
          ],
        });
      }
    }

    lines.push(blank());

    // ── Helper text (only when focused) ──────────────────────
    if (this._focused) {
      lines.push({
        segments: [{ text: ` ${arrowUp}/${arrowDown} Navigate`, style: { dim: true } }],
      });
      lines.push({
        segments: [{ text: ' Enter Switch view', style: { dim: true } }],
      });
    }

    return lines;
  }
}
