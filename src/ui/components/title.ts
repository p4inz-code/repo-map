/**
 * Title component — a screen title or header line.
 *
 * Renders a styled title line for screens. Supports primary brand
 * styling and optional metadata (like version).
 *
 * # Usage
 * ```ts
 * const title = new Title('header', {
 *   text: 'repo-map',
 *   subtitle: 'Professional repository analysis',
 *   version: '2.2.0',
 * });
 * title.render(renderer); // → Line[]
 * ```
 *
 * # Architecture
 * - Single-line component.
 * - Uses primary color for the main title.
 * - Can include right-aligned version info.
 */

import { Component } from './component.js';
import type { Renderer, Line } from '../renderer.js';

// ─── Types ─────────────────────────────────────────────────────

export interface TitleOptions {
  /** Main title text (bold + primary color). */
  text: string;
  /** Optional subtitle (displayed after the title). */
  subtitle?: string;
  /** Optional version string (right-aligned, dim). */
  version?: string;
  /** Width of the terminal/content area (for right-alignment). */
  width?: number;
}

// ─── Title ─────────────────────────────────────────────────────

export class Title extends Component {
  private _text: string;
  private _subtitle?: string;
  private _version?: string;
  private _width: number;

  constructor(id: string, options: TitleOptions) {
    super(id);
    this._text = options.text;
    this._subtitle = options.subtitle;
    this._version = options.version;
    this._width = options.width ?? 80;
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    return 1;
  }

  protected renderContent(_renderer: Renderer): Line[] {
    const segments: { text: string; style?: Record<string, unknown> }[] = [];

    // Title (bold + primary)
    segments.push({ text: this._text, style: { bold: true } });

    // Subtitle
    if (this._subtitle) {
      segments.push({ text: ` ${this._subtitle}` });
    }

    // Version (right-aligned, dim)
    if (this._version) {
      const mainLen = this._text.length + (this._subtitle ? this._subtitle.length + 1 : 0);
      const versionPad = Math.max(1, this._width - mainLen - this._version.length);
      segments.push({ text: ' '.repeat(versionPad) + this._version, style: { dim: true } });
    }

    return [{ segments } as Line];
  }
}
