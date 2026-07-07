/**
 * Panel component — a bordered content panel with optional title,
 * now with expandable/collapsible support.
 *
 * Wraps content in a styled box using border characters from the theme.
 * Supports collapsing/expanding to show or hide content, with state
 * remembered across re-renders.
 *
 * # Usage
 * ```ts
 * const panel = new Panel('main', {
 *   title: 'repo-map · my-project',
 *   width: 80,
 *   collapsible: true,
 *   collapsed: false,
 * });
 * panel.addLabelValue('Classification', 'CLI Tool');
 * panel.renderBoxed(renderer); // → string[]
 * ```
 *
 * # Architecture
 * - Composes child components/sections.
 * - Delegates border rendering to the renderBox primitive.
 * - Remembers collapsed state per panel ID.
 * - Does NOT know about other screens or business logic.
 */

import { Component, blank } from './component.js';
import type { Renderer, Line } from '../renderer.js';
import type { BorderChars } from '../theme/index.js';
import { renderBox } from '../primitives/box.js';

// ─── Types ─────────────────────────────────────────────────────

export interface PanelOptions {
  /** Optional title displayed in the top border. */
  title?: string;
  /** Total width of the panel in character cells (including borders). */
  width?: number;
  /** Internal left/right padding. Default: 1. */
  padding?: number;
  /** Border character set. Defaults to theme's 'round' border. */
  border?: BorderChars;
  /** Whether this panel is collapsible. Default: false. */
  collapsible?: boolean;
  /** Whether this panel starts collapsed. Default: false. */
  collapsed?: boolean;
  /** If true, no border is drawn (free-form). Default: false. */
  borderless?: boolean;
}

// ─── Panel ─────────────────────────────────────────────────────

export class Panel extends Component {
  private _children: Component[] = [];
  private _contentLines: Line[] = [];
  private _width: number;
  private _padding: number;
  private _title: string | undefined;
  private _collapsible: boolean;
  private _collapsed: boolean;
  private _borderless: boolean;
  private _border: BorderChars | undefined;

  constructor(id: string, options: PanelOptions = {}) {
    super(id);
    this._width = options.width ?? 80;
    this._padding = options.padding ?? 1;
    this._title = options.title;
    this._collapsible = options.collapsible ?? false;
    this._borderless = options.borderless ?? false;
    this._border = options.border;

    // Collapsed state comes from the passed option only.
    // The Store's workspace.collapsedPanels is the single source of truth.
    this._collapsed = options.collapsible ? (options.collapsed ?? false) : false;
  }

  // ── Builder API ──────────────────────────────────────────────

  /**
   * Add a child component to the panel.
   */
  addChild(child: Component): this {
    this._children.push(child);
    this.markDirty();
    return this;
  }

  /**
   * Add a raw Line to the panel content.
   */
  addLine(line: Line): this {
    this._contentLines.push(line);
    this.markDirty();
    return this;
  }

  /**
   * Add a blank line for vertical spacing.
   */
  addBlank(): this {
    this._contentLines.push(blank());
    this.markDirty();
    return this;
  }

  /**
   * Add a section header (bold title).
   */
  addSection(title: string): this {
    this._contentLines.push({
      segments: [{ text: title, style: { bold: true } }],
    });
    this.markDirty();
    return this;
  }

  /**
   * Add a label-value pair line.
   */
  addLabelValue(
    label: string,
    value: string,
    valueStyle?: { dim?: boolean; bold?: boolean },
    labelWidth?: number,
  ): this {
    const lw = labelWidth ?? 20;
    const segments: { text: string; style?: Record<string, unknown> }[] = [
      { text: ' '.repeat(this._padding + 1) + label.padEnd(lw), style: { bold: true } },
      { text: value, ...(valueStyle ? { style: valueStyle } : {}) },
    ];
    this._contentLines.push({ segments } as Line);
    this.markDirty();
    return this;
  }

  /**
   * Add a simple text line.
   */
  addText(text: string, style?: { bold?: boolean; dim?: boolean }): this {
    this._contentLines.push({
      segments: [style ? { text, style } : { text }],
    });
    this.markDirty();
    return this;
  }

  /**
   * Get the current content lines (for inspection/modification).
   */
  get contentLines(): Line[] {
    return this._contentLines;
  }

  // ── Expand / Collapse ────────────────────────────────────────

  /**
   * Toggle expand/collapse state.
   */
  toggleCollapse(): void {
    if (!this._collapsible) return;
    this._collapsed = !this._collapsed;
    this.markDirty();
  }

  /**
   * Expand the panel.
   */
  expand(): void {
    if (!this._collapsible || !this._collapsed) return;
    this._collapsed = false;
    this.markDirty();
  }

  /**
   * Collapse the panel.
   */
  collapse(): void {
    if (!this._collapsible || this._collapsed) return;
    this._collapsed = true;
    this.markDirty();
  }

  /**
   * Whether the panel is currently collapsed.
   */
  get isCollapsed(): boolean {
    return this._collapsed;
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    if (this._collapsed) {
      return 1; // Just the title line
    }
    return 1 + this._contentLines.length + this._children.reduce((h, c) => h + c.height, 0);
  }

  protected renderContent(renderer: Renderer): Line[] {
    if (this._collapsed) {
      // Show collapsed indicator
      const expandSymbol = renderer.theme.symbol('pointer');
      const titleStr = this._title ? `${expandSymbol} ${this._title}` : `${expandSymbol} (collapsed)`;
      return [{
        segments: [{ text: titleStr, style: { dim: true } }],
      }];
    }

    // Merge content lines and child renders
    const allLines: Line[] = [...this._contentLines];
    for (const child of this._children) {
      allLines.push(...child.render(renderer));
    }
    return allLines;
  }

  /**
   * Render the panel with box borders applied.
   * Returns the final ANSI-wrapped string array ready for terminal output.
   */
  renderBoxed(renderer: Renderer): string[] {
    if (this._borderless) {
      const contentLines = this.render(renderer);
      return renderer.renderFrame(contentLines);
    }

    const contentLines = this.render(renderer);
    const styledStrings = renderer.renderFrame(contentLines);

    const border = this._border ?? renderer.theme.border('round');
    const boxWidth = Math.min(this._width, renderer.width.columns);

    // Build title with collapse indicator
    let title = this._title;
    if (this._collapsible && title) {
      const indicator = this._collapsed ? '▶' : '▼';
      title = `${indicator} ${title}`;
    }

    return renderBox(styledStrings, {
      title,
      width: boxWidth,
      padding: this._padding,
      border: border.tl ? border : undefined,
    });
  }

  /**
   * Write the boxed panel directly to stderr.
   */
  write(renderer: Renderer): void {
    const lines = this.renderBoxed(renderer);
    for (const line of lines) {
      process.stderr.write(line + '\n');
    }
  }
}
