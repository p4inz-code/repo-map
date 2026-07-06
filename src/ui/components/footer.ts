/**
 * Footer component — a bottom footer displaying keyboard hints.
 *
 * Shows available keyboard shortcuts at the bottom of the screen.
 * Composes multiple KeyHint instances into a single line.
 *
 * # Usage
 * ```ts
 * const footer = new Footer('footer', [
 *   { key: '↑/↓', description: 'Navigate' },
 *   { key: 'Enter', description: 'Select' },
 *   { key: 'q', description: 'Quit' },
 * ]);
 * footer.render(renderer); // → Line[]
 * ```
 *
 * # Architecture
 * - Single-line component.
 * - Key hints are dim by default.
 * - Does NOT know about input handling or screen state.
 */

import { Component } from './component.js';
import type { Renderer, Line } from '../renderer.js';

// ─── Types ─────────────────────────────────────────────────────

export interface KeyHintEntry {
  /** Key combination text (e.g. '↑/↓', 'Enter'). */
  key: string;
  /** Description of what the key does. */
  description: string;
  /** Whether to hide this hint. */
  hidden?: boolean;
}

export interface FooterOptions {
  /** Key hints to display. */
  hints: KeyHintEntry[];
  /** Character for separating hints. Default: '·'. */
  separator?: string;
}

// ─── Footer ────────────────────────────────────────────────────

export class Footer extends Component {
  private _hints: KeyHintEntry[];
  private _separator: string;

  constructor(id: string, options: FooterOptions) {
    super(id);
    this._hints = options.hints;
    this._separator = options.separator ?? '·';
  }

  // ── Mutators ─────────────────────────────────────────────────

  /**
   * Replace all hints.
   */
  setHints(hints: KeyHintEntry[]): void {
    this._hints = hints;
  }

  /**
   * Show or hide a hint by key.
   */
  setHintVisible(key: string, visible: boolean): void {
    const hint = this._hints.find((h) => h.key === key);
    if (hint) {
      hint.hidden = !visible;
    }
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    return 1;
  }

  protected renderContent(_renderer: Renderer): Line[] {
    const visibleHints = this._hints.filter((h) => !h.hidden);

    if (visibleHints.length === 0) {
      return [{ segments: [{ text: '' }] }];
    }

    const parts = visibleHints.map((hint) => `${hint.key} ${hint.description}`);

    return [
      {
        segments: [
          { text: parts.join(` ${this._separator} `), style: { dim: true } },
        ],
      },
    ];
  }
}
