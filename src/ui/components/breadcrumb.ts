/**
 * BreadcrumbBar component — displays the current navigation path.
 *
 * Renders a horizontal breadcrumb trail showing the user's current
 * location in the workspace. Updates automatically when the active
 * view changes.
 *
 * # Usage
 * ```ts
 * const breadcrumb = new BreadcrumbBar('breadcrumb', {
 *   segments: [
 *     { label: 'Overview', active: false },
 *     { label: 'Statistics', active: false },
 *     { label: 'Languages', active: true },
 *   ],
 *   width: 80,
 * });
 * breadcrumb.render(renderer); // → Line[]
 * ```
 *
 * # Architecture
 * - Single-line component (height always 1).
 * - Segments separated by arrow symbol (→) or custom separator.
 * - Active segment displayed bold.
 * - Empty state: shows workspace name.
 */

import { Component } from './component.js';
import type { Renderer, Line } from '../renderer.js';
import type { BreadcrumbSegment } from '../state/types.js';

// ─── Types ─────────────────────────────────────────────────────

export interface BreadcrumbBarOptions {
  /** Breadcrumb segments (ordered from root to current). */
  segments: BreadcrumbSegment[];
  /** Total width available. */
  width: number;
  /** Separator character between segments. Default: '→'. */
  separator?: string;
}

// ─── BreadcrumbBar ─────────────────────────────────────────────

export class BreadcrumbBar extends Component {
  private _segments: BreadcrumbSegment[];
  private _width: number;
  private _separator: string;

  constructor(id: string, options: BreadcrumbBarOptions) {
    super(id);
    this._segments = options.segments;
    this._width = options.width;
    this._separator = options.separator ?? '→';
  }

  // ── Mutators ─────────────────────────────────────────────────

  /** Replace all breadcrumb segments. */
  setSegments(segments: BreadcrumbSegment[]): void {
    this._segments = segments;
    this.markDirty();
  }

  /** Update available width. */
  setWidth(width: number): void {
    if (width !== this._width) {
      this._width = width;
      this.markDirty();
    }
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    return 1;
  }

  protected renderContent(_renderer: Renderer): Line[] {
    if (this._segments.length === 0) {
      return [{ segments: [{ text: 'Workspace', style: { dim: true } }] }];
    }

    const segments: { text: string; style?: Record<string, unknown> }[] = [];

    for (let i = 0; i < this._segments.length; i++) {
      const seg = this._segments[i];

      if (i > 0) {
        segments.push({ text: ` ${this._separator} `, style: { dim: true } });
      }

      if (seg.active) {
        segments.push({ text: seg.label, style: { bold: true } });
      } else {
        segments.push({ text: seg.label, style: { dim: true } });
      }
    }

    return [{ segments } as Line];
  }
}
