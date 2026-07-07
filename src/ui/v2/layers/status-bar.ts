/**
 * Premium Status Bar — professional IDE-style bottom bar.
 *
 * Layout: [MODE] message • background task [████░░ 42%] ... FPS:60 MEM:42MB 12:34:56 ?=Help q=Quit
 *
 * Color-coded mode pill:
 *   NORMAL → dim | SCAN → primary | ANALYZE → warning | PALETTE → info | MODAL → error
 *
 * Auto-collapses hints on narrow terminals.
 */

import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import type { ColorToken } from '../theme/theme.js';

export class StatusBarComponent {
  private _store: V2Store;
  private _cachedLines: Line[] | null = null;

  constructor(config: { store: V2Store }) {
    this._store = config.store;
  }

  render(ctx: RenderContext): Line[] {
    const state = this._store.getState();
    const sb = state.statusBar;
    const h = state.header;
    const w = ctx.width;
    const theme = ctx.theme;
    const g = theme.glyph.bind(theme);

    const isNarrow = w < 60;

    // ── Mode pill with color ─────────────────────────────────
    const mode = state.palette.open
      ? 'PALETTE'
      : state.modal.visible
        ? 'MODAL'
        : state.appMode === 'analyzing'
          ? 'ANALYZE'
          : state.appMode === 'scanning'
            ? 'SCAN'
            : state.appMode === 'error'
              ? 'ERROR'
              : 'NORMAL';

    const modeColors: Record<string, ColorToken> = {
      NORMAL: 'dim', SCAN: 'primary', ANALYZE: 'warning',
      PALETTE: 'info', MODAL: 'info', ERROR: 'error',
    };
    const modeColor = modeColors[mode] ?? 'dim';
    const modePill = `${mode}`;

    // ── Left: Mode + status message + background task + progress ─
    const sbMessage = sb.message || state.appMode;
    let leftStr = `${modePill} ${sbMessage}`;

    // Background task
    if (sb.backgroundTask && !isNarrow) {
      leftStr += ` ${g('bullet')} ${sb.backgroundTask}`;
    }

    // Inline progress bar
    if (sb.progress >= 0) {
      const barW = Math.min(6, Math.floor(w * 0.05));
      const filled = Math.max(0, Math.round((sb.progress / 100) * barW));
      const empty = Math.max(0, barW - filled);
      const bar = theme.glyph('filled').repeat(filled) + theme.glyph('empty').repeat(empty);
      leftStr += ` ${bar} ${Math.round(sb.progress)}%`;
    }

    // ── Right: FPS, memory, clock, hints ─────────────────────
    const rightParts: string[] = [];
    if (h.fps > 0 && !isNarrow) rightParts.push(`FPS:${Math.round(h.fps)}`);
    if (sb.memory > 0 && !isNarrow) rightParts.push(`MEM:${Math.round(sb.memory)}MB`);
    if (!isNarrow && h.clock) rightParts.push(h.clock);

    // Hints — collapse on narrow
    if (w >= 70) {
      rightParts.push('?=Help');
      if (w >= 90) rightParts.push('q=Quit');
    }

    const rightStr = rightParts.length > 0 ? ` ${rightParts.join(' ')}` : '';

    // ── Assemble with clean spacing ──────────────────────────
    const leftLen = leftStr.length;
    const rightLen = rightStr.length;
    const pad = Math.max(1, w - leftLen - rightLen);
    const assembled = leftStr + ' '.repeat(pad) + rightStr;

    this._cachedLines = [
      {
        segments: [{ text: assembled.slice(0, w), style: { dim: true } }],
      },
    ];

    return this._cachedLines;
  }

  get height(): number { return 1; }
  getCachedLines(): Line[] | null { return this._cachedLines; }
}
