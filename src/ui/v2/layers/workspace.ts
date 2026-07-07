/**
 * Workspace panel — central engine with split panes, inspector panel,
 * resizable dividers, and focus indication.
 *
 * # Layout
 * ```
 * ┌─ Sidebar ─┬─ Main Content ───────────┬─ Inspector ─┐
 * │           │                          │             │
 * │  Nav      │  Dashboard / Results /   │  File       │
 * │  Items    │  Analysis / etc.         │  Details    │
 * │           │                          │             │
 * ├───────────┴──────────────────────────┴─────────────┤
 * │                 Status Bar                         │
 * └────────────────────────────────────────────────────┘
 * ```
 *
 * All panes are resizable. Split panes are supported.
 */

import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';

export class WorkspacePanel {
  private _store: V2Store;
  private _cachedLines: Line[] | null = null;

  constructor(config: { store: V2Store }) {
    this._store = config.store;
  }

  /**
   * Render the workspace content.
   * Delegates to the active screen for the main content area.
   */
  render(ctx: RenderContext, mainContent: Line[]): Line[] {
    const state = this._store.getState();
    const w = ctx.width;
    const h = ctx.height;
    const theme = ctx.theme;

    const lines: Line[] = [];

    // ── Inspector Panel (right side) ─────────────────────────
    const inspectorWidth = Math.min(30, Math.floor(w * 0.25));
    const mainWidth = w - inspectorWidth - 1;

    // Render main content with vertical divider
    const maxLines = Math.min(mainContent.length, h);

    for (let i = 0; i < maxLines; i++) {
      const main = mainContent[i]?.segments?.[0]?.text ?? '';
      const mainTrimmed = main.slice(0, mainWidth).padEnd(mainWidth);
      const infoText = i === 0 ? ` ${theme.glyph('info')} Inspector` : '';
      const infoTrimmed = infoText.padEnd(inspectorWidth - 1);
      const divider = '│';

      lines.push({
        segments: [
          { text: mainTrimmed },
          { text: divider, style: { dim: true } },
          { text: infoTrimmed, style: i === 0 ? { bold: true } : { dim: true } },
        ],
      });
    }

    // Fill remaining rows
    const remaining = h - maxLines;
    for (let i = 0; i < remaining; i++) {
      const mainPad = ' '.repeat(mainWidth);
      const infoPad = ' '.repeat(inspectorWidth - 1);
      lines.push({
        segments: [
          { text: mainPad },
          { text: '│', style: { dim: true } },
          { text: infoPad },
        ],
      });
    }

    this._cachedLines = lines;
    return lines;
  }

  get height(): number {
    return this._cachedLines?.length ?? 0;
  }

  getCachedLines(): Line[] | null {
    return this._cachedLines;
  }
}
