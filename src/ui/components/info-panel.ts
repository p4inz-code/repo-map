/**
 * InfoPanel — contextual information panel for the interactive workspace.
 *
 * Displays information based on the selected object:
 * - Files: path, size, language, imports, exports
 * - Folders: path, file count, subdirectories, role
 * - Languages: file count, percentage, frameworks used
 * - Frameworks: version, usage count, dependencies
 * - Architecture issues: description, severity, location
 * - Statistics: key metrics and breakdowns
 * - Suggestions: improvement recommendations
 *
 * Every state type (loading, empty, unavailable, no-selection) is handled
 * with a professional display.
 *
 * # Architecture
 * - Reads state from the Store's workspace.infoPanel field.
 * - Uses Panel component for structural layout.
 * - Dirty-state rendering — only re-renders when content changes.
 * - Never leaves the panel empty.
 */

import { Component, blank } from './component.js';
import type { Renderer, Line } from '../renderer.js';
import type { InfoPanelData, InfoContentType } from '../state/types.js';
import type { ColorToken } from '../theme/index.js';
import { renderScoreBar } from '../shared/score-bar.js';

// ─── Types ─────────────────────────────────────────────────────

export interface InfoPanelOptions {
  /** Width of the info panel in characters. */
  width: number;
  /** Height available for the info panel. */
  height: number;
  /** Whether this panel has focus. */
  focused: boolean;
  /** Content data to display. */
  data: InfoPanelData;
}

// ─── InfoPanel ─────────────────────────────────────────────────

export class InfoPanel extends Component {
  private _width: number;
  private _height: number;
  private _focused: boolean;
  private _data: InfoPanelData;

  constructor(id: string, options: InfoPanelOptions) {
    super(id);
    this._width = options.width;
    this._height = options.height;
    this._focused = options.focused;
    this._data = options.data;
  }

  // ── Mutators ─────────────────────────────────────────────────

  /** Update panel dimensions. */
  setDimensions(width: number, height: number): void {
    if (width !== this._width || height !== this._height) {
      this._width = width;
      this._height = height;
      this.markDirty();
    }
  }

  /** Update focus state. */
  setFocused(focused: boolean): void {
    if (focused !== this._focused) {
      this._focused = focused;
      this.markDirty();
    }
  }

  /** Update content data. */
  setData(data: InfoPanelData): void {
    this._data = data;
    this.markDirty();
  }

  /** Width of the panel. */
  get panelWidth(): number {
    return this._width;
  }

  // ── Component implementation ─────────────────────────────────

  get height(): number {
    return Math.min(this._computeContentHeight(), this._height);
  }

  protected renderContent(renderer: Renderer): Line[] {
    const lines: Line[] = [];
    const sep = renderer.theme.symbol('separator');

    // ── Header ────────────────────────────────────────────────
    const headerText = this._focused
      ? ` ${renderer.theme.symbol('pointer')} Details`
      : '   Details';
    lines.push({
      segments: [{ text: headerText, style: this._focused ? { bold: true } : { dim: true } }],
    });
    lines.push({
      segments: [{ text: ` ${sep.repeat(Math.max(0, this._width - 2))}`, style: { dim: true } }],
    });

    // ── Content (based on type) ───────────────────────────────
    const contentLines = this._renderContentByType(renderer);
    lines.push(...contentLines);

    // ── Pad remaining space ────────────────────────────────────
    const usedLines = lines.length;
    const remaining = this._height - usedLines;
    if (remaining > 0) {
      for (let i = 0; i < remaining; i++) {
        lines.push(blank());
      }
    }

    return lines;
  }

  // ── Content rendering ────────────────────────────────────────

  private _renderContentByType(renderer: Renderer): Line[] {
    const lines: Line[] = [];
    const { contentType, title, subtitle, metadata, relationships, description, riskLevel, score } = this._data;

    switch (contentType) {
      case 'loading':
        return this._renderLoadingState(renderer, lines);
      case 'empty':
        return this._renderEmptyState(renderer, lines);
      case 'unavailable':
        return this._renderUnavailableState(renderer, lines);
      case 'no-selection':
        return this._renderNoSelectionState(renderer, lines);
      default:
        return this._renderContent(renderer, lines, contentType, title, subtitle, metadata, relationships, description, riskLevel, score);
    }
  }

  private _renderLoadingState(renderer: Renderer, lines: Line[]): Line[] {
    const ellipsis = renderer.theme.symbol('ellipsis');
    lines.push(blank());
    lines.push({
      segments: [{ text: '   Loading analysis data', style: { dim: true } }],
    });
    lines.push({
      segments: [{ text: `   ${ellipsis}`, style: { dim: true } }],
    });
    return lines;
  }

  private _renderEmptyState(_renderer: Renderer, lines: Line[]): Line[] {
    lines.push(blank());
    lines.push({
      segments: [{ text: '   No data available', style: { dim: true } }],
    });
    lines.push({
      segments: [{ text: '   No issues or metrics to', style: { dim: true } }],
    });
    lines.push({
      segments: [{ text: '   display at this time.', style: { dim: true } }],
    });
    return lines;
  }

  private _renderUnavailableState(renderer: Renderer, lines: Line[]): Line[] {
    const infoIcon = renderer.theme.symbol('info');
    lines.push(blank());
    lines.push({
      segments: [
        { text: ` ${infoIcon} `, style: { dim: true } },
        { text: 'No analysis results', style: { dim: true } },
      ],
    });
    lines.push({
      segments: [{ text: '   This information requires', style: { dim: true } }],
    });
    lines.push({
      segments: [{ text: '   a complete repository', style: { dim: true } }],
    });
    lines.push({
      segments: [{ text: '   analysis to populate.', style: { dim: true } }],
    });
    return lines;
  }

  private _renderNoSelectionState(renderer: Renderer, lines: Line[]): Line[] {
    const infoIcon = renderer.theme.symbol('info');
    lines.push(blank());
    lines.push({
      segments: [
        { text: ` ${infoIcon} `, style: { dim: true } },
        { text: 'Waiting for selection', style: { dim: true } },
      ],
    });
    lines.push({
      segments: [{ text: '   Select a file or directory', style: { dim: true } }],
    });
    lines.push({
      segments: [{ text: '   in the sidebar or', style: { dim: true } }],
    });
    lines.push({
      segments: [{ text: '   repository tree above.', style: { dim: true } }],
    });
    return lines;
  }

  private _renderContent(
    renderer: Renderer,
    lines: Line[],
    _contentType: InfoContentType,
    title: string,
    subtitle?: string,
    metadata?: { label: string; value: string }[],
    relationships?: string[],
    description?: string[],
    riskLevel?: 'low' | 'medium' | 'high',
    score?: number,
  ): Line[] {
    const { sections } = this._data;

    // If structured sections are provided, render inspector mode
    if (sections && sections.length > 0) {
      return this._renderInspectorMode(renderer, lines, title, subtitle, sections);
    }

    lines.push(blank());

    // ── Content header row: icon + title ─────────────────────
    lines.push({
      segments: [
        { text: ` ${this._getIconForType(_contentType, renderer)} `, style: {} },
        { text: title, style: { bold: true } },
      ],
    });

    // ── Subtitle (path) — compact, dim ────────────────────────
    if (subtitle) {
      lines.push({
        segments: [{ text: `   ${subtitle}`, style: { dim: true } }],
      });
    }

    lines.push(blank());

    // ── Score bar (compact, single line) ───────────────────────
    if (score !== undefined) {
      const barWidth = Math.min(this._width - 8, 16);
      const { filled, empty } = renderScoreBar(score, barWidth);
      const filledChar = renderer.theme.symbol('filled');
      const emptyChar = renderer.theme.symbol('empty');
      lines.push({
        segments: [
          { text: '   Score ', style: { bold: true } },
          { text: filledChar.repeat(filled), style: { color: this._scoreColor(score) } },
          { text: emptyChar.repeat(empty), style: { dim: true } },
          { text: ` ${score}/100`, style: { dim: true } },
        ],
      });
      lines.push(blank());
    }

    // ── Risk level (compact, single line) ──────────────────────
    if (riskLevel) {
      const riskColor = this._riskColor(riskLevel);
      lines.push({
        segments: [
          { text: '   Risk: ', style: { bold: true } },
          { text: riskLevel.toUpperCase(), style: { color: riskColor } },
        ],
      });
      lines.push(blank());
    }

    // ── Metadata section — stronger visual hierarchy ───────────
    if (metadata && metadata.length > 0) {
      const labelWidth = Math.max(...metadata.map((m) => m.label.length)) + 1;
      for (const item of metadata) {
        const paddedLabel = item.label.padEnd(labelWidth);
        lines.push({
          segments: [
            { text: `   ${paddedLabel}`, style: { bold: true } },
            { text: item.value, style: {} },
          ],
        });
      }
      lines.push(blank());
    }

    // ── Description — minimal, grouped ────────────────────────
    if (description && description.length > 0) {
      const descIcon = renderer.theme.symbol('bullet');
      for (const desc of description) {
        lines.push({
          segments: [
            { text: `   ${descIcon} `, style: { dim: true } },
            { text: desc },
          ],
        });
      }
      lines.push(blank());
    }

    // ── Relationships — compact with arrow icons ───────────────
    if (relationships && relationships.length > 0) {
      const relIcon = renderer.theme.symbol('arrow');
      for (const rel of relationships.slice(0, 5)) {
        lines.push({
          segments: [
            { text: `   ${relIcon} `, style: { dim: true } },
            { text: rel, style: { dim: true } },
          ],
        });
      }
      if (relationships.length > 5) {
        lines.push({
          segments: [{ text: `   +${relationships.length - 5} more`, style: { dim: true } }],
        });
      }
    }

    return lines;
  }

  // ── Inspector Mode ────────────────────────────────────────────

  /** Render content in structured inspector mode with sections. */
  private _renderInspectorMode(
    renderer: Renderer,
    lines: Line[],
    title: string,
    subtitle: string | undefined,
    sections: { title: string; items: { label: string; value: string; dim?: boolean }[] }[],
  ): Line[] {
    const sep = renderer.theme.symbol('separator');

    // ── Title bar ──────────────────────────────────────────
    lines.push(blank());
    const icon = this._getIconForType(this._data.contentType, renderer);
    lines.push({
      segments: [
        { text: ` ${icon} `, style: { bold: true } },
        { text: title, style: { bold: true } },
      ],
    });

    if (subtitle) {
      lines.push({
        segments: [{ text: `   ${subtitle}`, style: { dim: true } }],
      });
    }

    lines.push(blank());

    // ── Score bar ─────────────────────────────────────────
    if (this._data.score !== undefined) {
      const score = this._data.score;
      const barWidth = Math.min(this._width - 8, 16);
      const { filled, empty } = renderScoreBar(score, barWidth);
      const filledChar = renderer.theme.symbol('filled');
      const emptyChar = renderer.theme.symbol('empty');
      lines.push({
        segments: [
          { text: '   Score ', style: { bold: true } },
          { text: filledChar.repeat(filled), style: { color: this._scoreColor(score) } },
          { text: emptyChar.repeat(empty), style: { dim: true } },
          { text: ` ${score}/100`, style: { dim: true } },
        ],
      });
      lines.push(blank());
    }

    // ── Risk level ────────────────────────────────────────
    if (this._data.riskLevel) {
      const riskColor = this._riskColor(this._data.riskLevel);
      lines.push({
        segments: [
          { text: '   Risk: ', style: { bold: true } },
          { text: this._data.riskLevel.toUpperCase(), style: { color: riskColor } },
        ],
      });
      lines.push(blank());
    }

    // ── Sections ────────────────────────────────────────────
    for (const section of sections) {
      if (!section.items || section.items.length === 0) continue;

      lines.push({
        segments: [{ text: ` ${sep.repeat(Math.min(this._width - 4, section.title.length + 4))}`, style: { dim: true } }],
      });
      lines.push({
        segments: [{ text: `   ${section.title}`, style: { bold: true } }],
      });

      const labelWidth = Math.max(...section.items.map((i) => i.label.length)) + 1;
      for (const item of section.items) {
        const paddedLabel = item.label.padEnd(labelWidth);
        lines.push({
          segments: [
            { text: `   ${paddedLabel}`, style: { bold: true } },
            { text: item.value, ...(item.dim ? { style: { dim: true } } : {}) },
          ],
        });
      }
      lines.push(blank());
    }

    return lines;
  }

  // ── Helpers ──────────────────────────────────────────────────

  private _getIconForType(type: InfoContentType, renderer: Renderer): string {
    switch (type) {
      case 'file': return renderer.theme.symbol('file');
      case 'folder': return renderer.theme.symbol('folder');
      case 'module': return renderer.theme.symbol('repo');
      case 'language': return renderer.theme.symbol('language');
      case 'framework': return renderer.theme.symbol('stats');
      case 'architecture-issue': return renderer.theme.symbol('warning');
      case 'statistics': return renderer.theme.symbol('stats');
      case 'suggestion': return renderer.theme.symbol('info');
      default: return renderer.theme.symbol('info');
    }
  }

  private _scoreColor(score: number): ColorToken {
    if (score >= 80) return 'success';
    if (score >= 50) return 'warning';
    return 'error';
  }

  private _riskColor(risk: 'low' | 'medium' | 'high'): ColorToken {
    switch (risk) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
    }
  }

  private _computeContentHeight(): number {
    const baseHeight = 3; // header + sep + breathing
    const titleLine = 2; // title + blank
    const subtitleLine = this._data.subtitle ? 2 : 0;
    const scoreLine = this._data.score !== undefined ? 2 : 0;
    const riskLine = this._data.riskLevel ? 2 : 0;
    const metaLines = this._data.metadata ? this._data.metadata.length + 1 : 0;
    const descLines = this._data.description ? this._data.description.length + 1 : 0;
    const relLines = this._data.relationships
      ? 1 + Math.min(this._data.relationships.length, 5) + (this._data.relationships.length > 5 ? 1 : 0)
      : 0;

    return baseHeight + titleLine + subtitleLine + scoreLine + riskLine + metaLines + descLines + relLines;
  }
}
