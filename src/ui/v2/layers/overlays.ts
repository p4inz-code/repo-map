/**
 * Overlay/Modal/Notification layers.
 *
 * Three independent render layers:
 * - Overlay: semi-transparent overlay for modals/dialogs
 * - Modal: centered dialog with focus trapping
 * - Notification: top-right notification queue with slide animation
 *
 * Each renders into its own z-index layer for independent invalidation.
 */

import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import type { ColorToken } from '../theme/theme.js';

// ─── Modal Layer ──────────────────────────────────────────────────

export class ModalLayer {
  private _store: V2Store;
  private _cachedLines: Line[] | null = null;

  constructor(config: { store: V2Store }) {
    this._store = config.store;
  }

  render(ctx: RenderContext): Line[] {
    const state = this._store.getState();
    const modal = state.modal;
    const w = ctx.width;
    const h = ctx.height;
    const theme = ctx.theme;

    if (!modal.visible) return [];

    const lines: Line[] = [];

    // ── Overlay background ──────────────────────────────────
    // Simulate blur/dim by rendering dim lines
    const overlayLines = Math.floor(h * 0.3);
    for (let i = 0; i < overlayLines; i++) {
      lines.push({ segments: [{ text: ' '.repeat(w), style: { dim: true } }] });
    }

    // ── Modal box ─────────────────────────────────────────
    const modalWidth = Math.min(50, w - 8);
    const modalHeight = Math.min(12, h - 8);
    const modalX = Math.floor((w - modalWidth) / 2);
    const modalY = Math.floor((h - modalHeight) / 2) - overlayLines;

    // Top border
    const sep = theme.glyph('separator');
    const topBorder = ' '.repeat(modalX) + '┌' + '─'.repeat(modalWidth - 2) + '┐';
    lines.push({ segments: [{ text: topBorder, style: { bold: true } }] });

    // Title
    const titleStr = `${theme.glyph('info')} ${modal.title}`;
    const titlePad = modalWidth - titleStr.length - 4;
    const titleLine = ' '.repeat(modalX) + '│ ' + titleStr + ' '.repeat(titlePad) + ' │';
    lines.push({ segments: [{ text: titleLine, style: { bold: true } }] });

    // Separator
    const sepLine = ' '.repeat(modalX) + '├' + sep.repeat(modalWidth - 2) + '┤';
    lines.push({ segments: [{ text: sepLine, style: { dim: true } }] });

    // Content
    for (let i = 0; i < modalHeight - 4; i++) {
      const contentLine = ' '.repeat(modalX) + '│' + ' '.repeat(modalWidth - 2) + '│';
      lines.push({ segments: [{ text: contentLine }] });
    }

    // Bottom border
    const bottomBorder = ' '.repeat(modalX) + '└' + '─'.repeat(modalWidth - 2) + '┘';
    lines.push({ segments: [{ text: bottomBorder }] });

    // Fill remaining
    const remaining = h - lines.length;
    for (let i = 0; i < remaining; i++) {
      lines.push({ segments: [{ text: ' '.repeat(w) }] });
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

// ─── Notification Layer ───────────────────────────────────────────

export class NotificationLayer {
  private _store: V2Store;
  private _cachedLines: Line[] | null = null;

  constructor(config: { store: V2Store }) {
    this._store = config.store;
  }

  render(ctx: RenderContext): Line[] {
    const state = this._store.getState();
    const notifications = state.notifications.filter((n) => !n.dismissed);
    const w = ctx.width;
    const theme = ctx.theme;

    if (notifications.length === 0) return [];

    const lines: Line[] = [];

    // Render each notification as a boxed line at the top-right
    for (const notif of notifications.slice(-5)) { // Max 5 visible
      const severityColor = this._severityColor(notif.severity);
      const icon = this._severityIcon(notif.severity, theme);
      const msg = `${icon} ${notif.message}`;
      const boxWidth = Math.min(msg.length + 4, w - 2);
      const padX = w - boxWidth - 1;

      // Top border
      lines.push({
        segments: [
          { text: ' '.repeat(padX) },
          { text: `┌${'─'.repeat(boxWidth - 2)}┐`, style: { color: severityColor } },
        ],
      });

      // Content
      lines.push({
        segments: [
          { text: ' '.repeat(padX) },
          { text: `│ `, style: { color: severityColor } },
          { text: msg },
          { text: ` │`, style: { color: severityColor } },
        ],
      });

      // Bottom border
      lines.push({
        segments: [
          { text: ' '.repeat(padX) },
          { text: `└${'─'.repeat(boxWidth - 2)}┘`, style: { color: severityColor } },
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

  private _severityColor(severity: string): ColorToken {
    switch (severity) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  }

  private _severityIcon(severity: string, theme: { glyph: (name: string) => string }): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    switch (severity) {
      case 'success': return theme.glyph('check');
      case 'warning': return theme.glyph('warning');
      case 'error': return theme.glyph('cross');
      default: return theme.glyph('info');
    }
  }
}
