/**
 * History screen — scrollable display of previous analysis sessions
 * with timestamps and key metrics for comparison.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import { screenTitle, cardWrap, cardWidth, blank, kvLine, screenFooter, LEFT_PAD } from './screen-lib.js';

export class HistoryScreen implements ScreenV2 {
  readonly id = 'history';
  readonly title = 'History';
  private _store: V2Store;
  private _scrollView = new ScrollView();

  constructor(store: V2Store) {
    this._store = store;
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'history' });
    this._store.updateSlice('statusBar', { message: 'Analysis history' });
  }
  onLeave(): void {}
  onPause(): void {}
  onResume(): void {}
  onDestroy(): void {}

  render(ctx: RenderContext): Line[] {
    const state = this._store.getState();
    const analysis = state.analysis;
    const theme = ctx.theme;
    const g = theme.glyph.bind(theme);
    const w = ctx.width;
    const cw = cardWidth(w);
    const lines: Line[] = [];

    lines.push(...screenTitle(theme, 'repo', 'History'));

    if (!analysis) {
      lines.push(...blank());
      lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}No analysis history yet.`, style: { dim: true } }] });
      lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}Completed analyses will appear here.`, style: { dim: true } }] });
      lines.push(...screenFooter(theme));
      return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
    }

    // Current session card
    const cardContent: Line[] = [
      kvLine('Files', `${analysis.stats.totalFiles}`, 20),
      kvLine('Directories', `${analysis.stats.totalDirectories}`, 20),
      kvLine('Health', `${analysis.intelligence.health.overall}/100`, 20),
      kvLine('Type', analysis.intelligence.classification.category, 20),
    ];
    lines.push(...blank());
    lines.push({ segments: [{ text: '  Current Session', style: { bold: true } }] });
    lines.push(...blank());
    lines.push(...cardWrap(theme, cardContent, { width: cw }));
    lines.push(...screenFooter(theme));

    return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    return this._scrollView.handleKey(binding);
  }
}
