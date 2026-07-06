/**
 * CommandPalette — searchable command overlay for the interactive workspace.
 *
 * Activated by Ctrl+P. Displays a list of commands that can be filtered
 * by typing. The user can navigate with ↑↓, select with Enter, or dismiss
 * with Escape.
 *
 * # Supported Commands
 * - Go to Overview
 * - Go to Statistics
 * - Go to Suggestions
 * - Go to Repository Tree
 * - Go to Help
 * - Expand All Tree Nodes
 * - Collapse All Tree Nodes
 * - Focus Sidebar
 * - Focus Tree
 * - Focus Inspector
 * - Quit
 *
 * # Architecture
 * - Rendered as an overlay in the workspace (temporarily replaces content).
 * - Commands are searchable by fuzzy prefix matching.
 * - Returns the selected command ID via callback.
 * - Dismisses on Escape or blur.
 *
 * # Usage
 * ```ts
 * const palette = new CommandPalette('palette');
 * palette.onCommand((id) => handleCommand(id));
 * const lines = palette.render(renderer);
 * ```
 */

import { Component, blank } from './component.js';
import type { Renderer, Line } from '../renderer.js';

// ─── Types ─────────────────────────────────────────────────────

export interface CommandEntry {
  /** Unique command identifier. */
  id: string;
  /** Display label shown in the palette. */
  label: string;
  /** Optional category for visual grouping. */
  category?: string;
  /** Optional key shortcut hint. */
  shortcut?: string;
}

export type CommandCallback = (id: string) => void;

// ─── Built-in Commands ─────────────────────────────────────────

export const DEFAULT_COMMANDS: CommandEntry[] = [
  { id: 'go-overview', label: 'Go to Overview', category: 'Navigation', shortcut: '↑↓' },
  { id: 'go-statistics', label: 'Go to Statistics', category: 'Navigation' },
  { id: 'go-suggestions', label: 'Go to Suggestions', category: 'Navigation' },
  { id: 'go-tree', label: 'Go to Repository Tree', category: 'Navigation' },
  { id: 'go-help', label: 'Go to Help', category: 'Navigation' },
  { id: 'sep1', label: '', category: '', shortcut: '' },
  { id: 'focus-sidebar', label: 'Focus Sidebar', category: 'Focus', shortcut: 'Tab' },
  { id: 'focus-tree', label: 'Focus Tree', category: 'Focus' },
  { id: 'focus-inspector', label: 'Focus Inspector', category: 'Focus' },
  { id: 'sep2', label: '', category: '', shortcut: '' },
  { id: 'quit', label: 'Quit Workspace', category: 'Exit', shortcut: 'q' },
];

// ─── CommandPalette ────────────────────────────────────────────

export class CommandPalette extends Component {
  private _commands: CommandEntry[];
  private _filter: string = '';
  private _selectedIndex: number = 0;
  private _callback: CommandCallback | null = null;
  private _width: number;
  private _height: number;

  constructor(id: string, options?: { width?: number; height?: number; commands?: CommandEntry[] }) {
    super(id);
    this._commands = options?.commands ?? DEFAULT_COMMANDS;
    this._width = options?.width ?? 50;
    this._height = options?.height ?? 20;
  }

  // ── Public API ───────────────────────────────────────────────

  /** Register a callback for when a command is selected. */
  onCommand(callback: CommandCallback): void {
    this._callback = callback;
  }

  /** Get the current filter text. */
  get filter(): string {
    return this._filter;
  }

  /** Append a character to the filter. */
  appendFilter(char: string): void {
    this._filter += char;
    this._selectedIndex = 0;
    this.markDirty();
  }

  /** Remove the last character from the filter. */
  backspaceFilter(): void {
    if (this._filter.length > 0) {
      this._filter = this._filter.slice(0, -1);
      this._selectedIndex = 0;
      this.markDirty();
    }
  }

  /** Clear the filter. */
  clearFilter(): void {
    this._filter = '';
    this._selectedIndex = 0;
    this.markDirty();
  }

  /** Navigate selection down. */
  selectNext(): void {
    const filtered = this._getFilteredCommands();
    if (this._selectedIndex < filtered.length - 1) {
      this._selectedIndex++;
      this.markDirty();
    }
  }

  /** Navigate selection up. */
  selectPrev(): void {
    if (this._selectedIndex > 0) {
      this._selectedIndex--;
      this.markDirty();
    }
  }

  /** Confirm the current selection. */
  confirmSelection(): void {
    const filtered = this._getFilteredCommands();
    const cmd = filtered[this._selectedIndex];
    if (cmd && this._callback) {
      this._callback(cmd.id);
    }
  }

  /** Update dimensions. */
  setDimensions(width: number, height: number): void {
    if (width !== this._width || height !== this._height) {
      this._width = width;
      this._height = height;
      this.markDirty();
    }
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    return Math.min(this._getFilteredCommands().length + 3, this._height);
  }

  protected renderContent(renderer: Renderer): Line[] {
    const lines: Line[] = [];
    const pw = renderer.theme.symbol('pointer');
    const searchIcon = renderer.theme.symbol('search');

    // ── Header with filter input ──────────────────────────
    const filterDisplay = this._filter.length > 0 ? this._filter : 'Type to filter...';
    lines.push({
      segments: [
        { text: ` ${searchIcon} Command Palette`, style: { bold: true } },
      ],
    });
    lines.push({
      segments: [
        { text: `   > ${filterDisplay}`, style: this._filter.length > 0 ? { bold: true } : { dim: true } },
      ],
    });
    lines.push(blank());

    // ── Filtered commands ─────────────────────────────────
    const filtered = this._getFilteredCommands();
    if (filtered.length === 0) {
      lines.push({
        segments: [{ text: '   No matching commands', style: { dim: true } }],
      });
      return lines;
    }

    for (let i = 0; i < filtered.length; i++) {
      const cmd = filtered[i];

      // Separator
      if (!cmd.label) {
        lines.push({
          segments: [{ text: `   ${renderer.theme.symbol('separator').repeat(Math.min(this._width - 4, 30))}`, style: { dim: true } }],
        });
        continue;
      }

      const isSelected = i === this._selectedIndex;
      const shortcut = cmd.shortcut ? `  ${cmd.shortcut}` : '';

      if (isSelected) {
        lines.push({
          segments: [
            { text: ` ${pw} `, style: { bold: true } },
            { text: cmd.label, style: { bold: true } },
            { text: shortcut, style: { dim: true } },
          ],
        });
      } else {
        lines.push({
          segments: [
            { text: '   ' },
            { text: cmd.label },
            { text: shortcut, style: { dim: true } },
          ],
        });
      }
    }

    // ── Footer hint ───────────────────────────────────────
    lines.push(blank());
    lines.push({
      segments: [
        { text: '   ↑↓ Navigate  ·  Enter Select  ·  Esc Close', style: { dim: true } },
      ],
    });

    return lines;
  }

  // ── Internal ─────────────────────────────────────────────────

  /** Get filtered command list based on current filter. */
  private _getFilteredCommands(): CommandEntry[] {
    if (!this._filter) {
      return this._commands.filter((c) => c.label !== '');
    }

    const lower = this._filter.toLowerCase();
    return this._commands.filter((cmd) => {
      if (!cmd.label) return false;
      return cmd.label.toLowerCase().includes(lower);
    });
  }
}
