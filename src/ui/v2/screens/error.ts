/**
 * Error screen — professional diagnostic layout with calm, actionable feedback.
 * Uses double-border card for emphasis.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import { cardDouble, cardWidth, blank, screenFooter } from './screen-lib.js';

export class ErrorScreen implements ScreenV2 {
  readonly id = 'error';
  readonly title = 'Error';
  private _store: V2Store;
  private _message: string = '';
  private _suggestion: string = '';
  private _scrollView = new ScrollView();

  constructor(store: V2Store) {
    this._store = store;
  }

  setError(message: string, suggestion?: string): void {
    this._message = message;
    this._suggestion = suggestion ?? '';
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'error' });
  }
  onLeave(): void {}
  onPause(): void {}
  onResume(): void {}
  onDestroy(): void {}

  render(ctx: RenderContext): Line[] {
    const theme = ctx.theme;
    const g = theme.glyph.bind(theme);
    const w = ctx.width;
    const cw = cardWidth(w);
    const lines: Line[] = [];

    lines.push(...blank(2));

    // Double-border error card
    const content: Line[] = [
      { segments: [{ text: `${g('cross')} ${this._message}`, style: { bold: true } }] },
    ];

    if (this._suggestion) {
      content.push({ segments: [{ text: '' }] });
      content.push({ segments: [{ text: `${g('info')} Recommendation`, style: { bold: true } }] });
      content.push({ segments: [{ text: `  ${this._suggestion}`, style: { dim: true } }] });
    }

    content.push({ segments: [{ text: '' }] });
    content.push({ segments: [{ text: 'Press q to exit', style: { dim: true } }] });

    lines.push(...cardDouble(theme, content, { width: cw, title: 'Error', color: 'error' }));
    lines.push(...screenFooter(theme));

    return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    return this._scrollView.handleKey(binding);
  }
}
