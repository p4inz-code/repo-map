/**
 * KeyHint component — an individual keyboard shortcut hint.
 *
 * Displays a single key binding with its description text.
 * Used by the Footer component to build the key hints bar.
 *
 * # Usage
 * ```ts
 * const hint = new KeyHint('up-down', {
 *   key: '↑/↓',
 *   description: 'Navigate',
 * });
 * hint.render(renderer); // → Line[]
 * ```
 *
 * # Architecture
 * - Single-line component.
 * - Key is displayed in bold, description in dim.
 * - Does NOT handle input — it's purely visual.
 */

import { Component } from './component.js';
import type { Renderer, Line } from '../renderer.js';
import type { TextStyle } from '../theme/index.js';

// ─── Types ─────────────────────────────────────────────────────

export interface KeyHintOptions {
  /** The key combination text (e.g. '↑/↓', 'Enter', 'q'). */
  key: string;
  /** Description of what the key does. */
  description: string;
  /** Optional separator between key and description. Default: ' '. */
  separator?: string;
  /** Optional style for the key text. */
  keyStyle?: TextStyle;
  /** Optional style for the description text. */
  descStyle?: TextStyle;
}

// ─── KeyHint ───────────────────────────────────────────────────

export class KeyHint extends Component {
  private _key: string;
  private _description: string;
  private _separator: string;
  private _keyStyle: TextStyle;
  private _descStyle: TextStyle;

  constructor(id: string, options: KeyHintOptions) {
    super(id);
    this._key = options.key;
    this._description = options.description;
    this._separator = options.separator ?? ' ';
    this._keyStyle = options.keyStyle ?? { bold: true };
    this._descStyle = options.descStyle ?? {};
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    return 1;
  }

  protected renderContent(_renderer: Renderer): Line[] {
    const fullText = `${this._key}${this._separator}${this._description}`;
    return [
      { segments: [{ text: fullText, style: { dim: true } }] },
    ];
  }

  /**
   * Render as a compact segment (for use in Footer).
   */
  renderSegment(): { text: string; style?: TextStyle } {
    return {
      text: `${this._key} ${this._description}`,
      style: { dim: true },
    };
  }
}
