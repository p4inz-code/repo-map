/**
 * StatusBar component — a bottom status bar for displaying
 * application state, file counts, and context information.
 *
 * Renders a single-line status bar at the bottom of the screen.
 * Supports left-aligned and right-aligned content segments.
 *
 * # Usage
 * ```ts
 * const statusBar = new StatusBar('status', {
 *   left: 'Scanning my-project...',
 *   right: '42 files',
 * });
 * statusBar.render(renderer); // → Line[]
 * ```
 *
 * # Architecture
 * - Single-line component.
 * - Produces a Line with segments for left and right content.
 * - Applied dim styling by default.
 */

import { Component } from './component.js';
import type { Renderer, Line } from '../renderer.js';

// ─── Types ─────────────────────────────────────────────────────

export interface StatusBarOptions {
  /** Left-aligned status text. */
  left?: string;
  /** Right-aligned status text. */
  right?: string;
  /** Whether to use dim styling. Default: true. */
  dim?: boolean;
  /** Available width for proper right-alignment. Default: 0 (falls back to gap). */
  width?: number;
  /** Custom style overrides. */
  style?: { bold?: boolean; dim?: boolean };
}

// ─── StatusBar ─────────────────────────────────────────────────

export class StatusBar extends Component {
  private _left: string;
  private _right: string;
  private _style: { dim?: boolean; bold?: boolean };
  private _width: number;

  constructor(id: string, options: StatusBarOptions = {}) {
    super(id);
    this._left = options.left ?? '';
    this._right = options.right ?? '';    this._style = options.style ?? { dim: options.dim !== false };
    this._width = options.width ?? 0;

  }

  // ── Mutators ─────────────────────────────────────────────────

  /**
   * Update the left-aligned text.
   */
  setLeft(text: string): void {
    this._left = text;
  }

  /**
   * Update the right-aligned text.
   */
  setRight(text: string): void {
    this._right = text;
  }

  /**
   * Set available width for proper right-alignment.
   */
  setWidth(width: number): void {
    this._width = width;
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    return 1;
  }

  protected renderContent(_renderer: Renderer): Line[] {
    if (!this._left && !this._right) {
      return [{ segments: [{ text: '' }] }];
    }

    const segments: { text: string; style?: Record<string, unknown> }[] = [];

    if (this._left) {
      segments.push({ text: this._left, style: this._style });
    }

    if (this._right) {
      if (this._width > 0) {
        // True right-alignment: push right text to the right edge
        const leftLen = this._left.length;
        const rightLen = this._right.length;
        const padLen = Math.max(1, this._width - leftLen - rightLen);
        segments.push({ text: ' '.repeat(padLen) + this._right, style: this._style });
      } else {
        // Fallback: minimal gap when width is unknown
        segments.push({ text: '    ' + this._right, style: this._style });
      }
    }

    return [{ segments } as Line];
  }
}
