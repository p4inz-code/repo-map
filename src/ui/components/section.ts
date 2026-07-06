/**
 * Section component — a labeled content section with optional items.
 *
 * Used to group related content under a bold section header.
 * Supports indented items, dividers, and custom content.
 *
 * # Usage
 * ```ts
 * const section = new Section('languages', 'Languages');
 * section.addItem('TypeScript  30 files (71%)');
 * section.addItem('JavaScript   8 files (19%)');
 * section.render(renderer); // → Line[]
 * ```
 *
 * # Architecture
 * - Pure composition: produces Lines only.
 * - Does NOT know about panels, screens, or business logic.
 */

import { Component, blank } from './component.js';
import type { Renderer, Line } from '../renderer.js';

// ─── Types ─────────────────────────────────────────────────────

export interface SectionOptions {
  /** Section header text (displayed bold). */
  title: string;
  /** Indentation level for items. Default: 0. */
  indent?: number;
}

// ─── Section ───────────────────────────────────────────────────

export class Section extends Component {
  private _title: string;
  private _items: string[] = [];
  private _customLines: Line[] = [];
  private _indent: number;

  constructor(id: string, options: SectionOptions) {
    super(id);
    this._title = options.title;
    this._indent = options.indent ?? 0;
  }

  // ── Builder API ──────────────────────────────────────────────

  /**
   * Add an item (indented text) to the section.
   */
  addItem(text: string, style?: { dim?: boolean; bold?: boolean }): this {
    if (style) {
      this._customLines.push({
        segments: [{ text: `${' '.repeat(this._indent + 2)}${text}`, style }],
      });
    } else {
      this._items.push(text);
    }
    return this;
  }

  /**
   * Add a custom styled line to the section.
   */
  addLine(line: Line): this {
    this._customLines.push(line);
    return this;
  }

  /**
   * Add a blank line for spacing.
   */
  addBlank(): this {
    this._customLines.push(blank());
    return this;
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    return 1 + this._items.length + this._customLines.length;
  }

  protected renderContent(_renderer: Renderer): Line[] {
    const lines: Line[] = [
      { segments: [{ text: `${' '.repeat(this._indent)}${this._title}`, style: { bold: true } }] },
    ];

    // Add indented items
    for (const item of this._items) {
      lines.push({
        segments: [{ text: `${' '.repeat(this._indent + 2)}${item}` }],
      });
    }

    // Add custom lines
    lines.push(...this._customLines);

    return lines;
  }
}
