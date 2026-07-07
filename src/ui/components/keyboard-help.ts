/**
 * KeyboardHelp — lightweight modal overlay for keyboard shortcut reference.
 *
 * Activated by pressing ?. Displays categorized keyboard shortcuts
 * organized by feature area. Dismissed by Esc or ?.
 *
 * # Architecture
 * - Rendered as an overlay in the workspace (temporarily replaces content).
 * - Does NOT destroy or modify workspace state.
 * - Returns to previous focus state when dismissed.
 * - Uses theme symbols where appropriate.
 *
 * # Usage
 * ```ts
 * const help = new KeyboardHelp('ws-help', { width: 50, height: 20 });
 * const lines = help.render(renderer);
 * ```
 */

import { Component, blank } from './component.js';
import type { Renderer, Line } from '../renderer.js';

// ─── Types ─────────────────────────────────────────────────────

export interface KeyboardHelpOptions {
  /** Available width for the overlay. */
  width: number;
  /** Available height for the overlay. */
  height: number;
}

// ─── Help entry types ──────────────────────────────────────────

interface HelpSection {
  title: string;
  items: { keys: string; description: string }[];
}

// ─── Help content ──────────────────────────────────────────────

const HELP_SECTIONS: HelpSection[] = [
  {
    title: 'Navigation',
    items: [
      { keys: 'Tab / Shift+Tab', description: 'Cycle focus between regions' },
      { keys: '↑↓', description: 'Navigate within focused region' },
      { keys: '←→', description: 'Collapse / Expand tree nodes' },
      { keys: 'Enter', description: 'Confirm / Select / Toggle' },
      { keys: 'Space', description: 'Toggle panel collapse' },
    ],
  },
  {
    title: 'Tree',
    items: [
      { keys: '/', description: 'Activate incremental filter search' },
      { keys: 'n / p', description: 'Next / Previous filter match' },
      { keys: 'Home / End', description: 'First / Last visible node' },
      { keys: 'PgUp / PgDn', description: 'Scroll one page' },
      { keys: 'Ctrl+Home / Ctrl+End', description: 'Root / Deepest node' },
    ],
  },
  {
    title: 'Sidebar',
    items: [
      { keys: '↑↓', description: 'Select a sidebar view' },
      { keys: 'Enter', description: 'Open selected view' },
    ],
  },
  {
    title: 'Single-letter Shortcuts',
    items: [
      { keys: 'g', description: 'Go to Repository Tree' },
      { keys: 's', description: 'Go to Statistics' },
      { keys: 'o', description: 'Go to Overview' },
      { keys: 'i', description: 'Focus Info Panel' },
      { keys: 't', description: 'Focus Tree' },
      { keys: 'b', description: 'Focus Sidebar' },
      { keys: 'r', description: 'Refresh / Redraw' },
      { keys: '?', description: 'Toggle this keyboard reference' },
      { keys: 'q', description: 'Quit workspace' },
    ],
  },
  {
    title: 'Commands',
    items: [
      { keys: '⌘P', description: 'Open command palette' },
      { keys: 'Esc', description: 'Cancel / Close overlay / Clear search' },
    ],
  },
];

// ─── KeyboardHelp ──────────────────────────────────────────────

export class KeyboardHelp extends Component {
  private _width: number;
  private _height: number;

  constructor(id: string, options: KeyboardHelpOptions) {
    super(id);
    this._width = options.width;
    this._height = options.height;
  }

  // ── Mutators ─────────────────────────────────────────────────

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
    return this._height;
  }

  protected renderContent(renderer: Renderer): Line[] {
    const lines: Line[] = [];
    const sep = renderer.theme.symbol('separator');
    const pointer = renderer.theme.symbol('pointer');
    const searchIcon = renderer.theme.symbol('search');

    // ── Header ─────────────────────────────────────────────
    lines.push({
      segments: [
        { text: ` ${searchIcon} Keyboard Shortcuts`, style: { bold: true } },
      ],
    });
    lines.push({
      segments: [{ text: ` ${sep.repeat(Math.min(this._width - 4, 40))}`, style: { dim: true } }],
    });
    lines.push(blank());

    // ── Sections ───────────────────────────────────────────
    let totalLines = 3; // header + sep + blank

    for (const section of HELP_SECTIONS) {
      // Check if section fits
      const sectionHeader = 1; // section title
      const sectionLines = section.items.length;
      const sectionGap = 1; // blank after section
      const sectionTotal = sectionHeader + sectionLines + sectionGap;

      if (totalLines + sectionTotal > this._height) {
        // Not enough room — truncate
        lines.push({
          segments: [{ text: ` ${pointer} more shortcuts available`, style: { dim: true } }],
        });
        break;
      }

      // Section header
      lines.push({
        segments: [{ text: `   ${section.title}`, style: { bold: true } }],
      });

      // Section items
      for (const item of section.items) {
        const paddedKeys = item.keys.padEnd(Math.min(22, this._width - 8));
        lines.push({
          segments: [
            { text: `     ${paddedKeys}`, style: { dim: true } },
            { text: item.description },
          ],
        });
      }

      lines.push(blank());
      totalLines += sectionTotal;
    }

    // ── Footer hint ────────────────────────────────────────
    lines.push({
      segments: [
        { text: '   Esc or ? to close', style: { dim: true } },
      ],
    });

    return lines;
  }
}
