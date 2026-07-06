/**
 * Badge component — a styled label/tag/chip for status indicators.
 *
 * Renders a compact labeled badge with optional color styling.
 * Useful for displaying status, priority, or category information.
 *
 * # Usage
 * ```ts
 * const badge = new Badge('status', {
 *   text: 'Active Development',
 *   color: 'info',
 * });
 * badge.render(renderer); // → Line[]
 * ```
 *
 * # Architecture
 * - Pure visual: produces styled Lines only.
 * - Does NOT know about focus, selection, or input.
 */

import { Component } from './component.js';
import type { Renderer, Line } from '../renderer.js';
import type { ColorToken } from '../theme/index.js';

// ─── Types ─────────────────────────────────────────────────────

export interface BadgeOptions {
  /** Badge text content. */
  text: string;
  /** Optional semantic color for emphasis. */
  color?: ColorToken;
  /** Whether the text should be bold. */
  bold?: boolean;
  /** Label to display before the badge value. */
  label?: string;
  /** Width to pad the label to (if label is provided). */
  labelWidth?: number;
}

// ─── Badge ─────────────────────────────────────────────────────

export class Badge extends Component {
  private _text: string;
  private _color?: ColorToken;
  private _bold: boolean;
  private _label?: string;
  private _labelWidth: number;

  constructor(id: string, options: BadgeOptions) {
    super(id);
    this._text = options.text;
    this._color = options.color;
    this._bold = options.bold ?? false;
    this._label = options.label;
    this._labelWidth = options.labelWidth ?? 20;
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    return 1;
  }

  protected renderContent(_renderer: Renderer): Line[] {
    const segments: { text: string; style?: Record<string, unknown> }[] = [];

    if (this._label) {
      const paddedLabel = this._label.padEnd(this._labelWidth);
      segments.push({ text: paddedLabel, style: { bold: true } });
    }

    segments.push({ text: this._text, style: { color: this._color, bold: this._bold } });

    return [{ segments } as Line];
  }
}
