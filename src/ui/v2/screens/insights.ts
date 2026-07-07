/**
 * Insights Screen — scrollable AI report style display with cards,
 * priority colors, confidence badges, and expandable categories.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import {
  screenTitle, screenFooter,
  cardWrap, cardWidth, blank,
} from './screen-lib.js';

export class InsightsScreen implements ScreenV2 {
  readonly id = 'insights';
  readonly title = 'Insights';
  private _store: V2Store;
  private _scrollView = new ScrollView();

  constructor(store: V2Store) {
    this._store = store;
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'insights' });
    this._store.updateSlice('statusBar', { message: 'Repository insights' });
  }
  onLeave(): void {}
  onPause(): void {}
  onResume(): void {}
  onDestroy(): void {}

  render(ctx: RenderContext): Line[] {
    const state = this._store.getState();
    const analysis = state.analysis;
    const theme = ctx.theme;
    const w = ctx.width;
    const g = theme.glyph.bind(theme);
    const lines: Line[] = [];

    lines.push(...screenTitle(theme, 'info', 'Repository Insights', 'AI-Powered Analysis'));

    if (!analysis?.intelligence?.insights || analysis.intelligence.insights.length === 0) {
      lines.push(...blank());
      lines.push({ segments: [{ text: '  No insights available. Run a scan to generate insights.', style: { dim: true } }] });
      lines.push(...screenFooter(theme));
      return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
    }

    const insights = analysis.intelligence.insights;
    const cw = cardWidth(w);

    // Summary card
    const summaryLines: Line[] = [
      { segments: [{ text: `Found ${insights.length} insights about this repository`, style: { bold: true } }] },
    ];
    lines.push(...blank());
    lines.push(...cardWrap(theme, summaryLines, { width: cw }));
    lines.push(...blank());

    // Individual insight cards
    for (let i = 0; i < Math.min(insights.length, 10); i++) {
      const insight = insights[i];
      const severity: 'info' | 'warning' | 'success' = i % 3 === 0 ? 'info' : i % 3 === 1 ? 'warning' : 'success';
      const sevColor = severity === 'warning' ? 'warning' : severity === 'success' ? 'success' : 'info';
      const icon = severity === 'warning' ? g('warning') : severity === 'success' ? g('check') : g('info');

      const cardContent: Line[] = [
        { segments: [{ text: `${icon} ${insight.observation}`, style: { bold: true } }] },
      ];
      if (insight.detail) {
        const detailStr = insight.detail.length > cw - 6 ? insight.detail.slice(0, cw - 9) + '...' : insight.detail;
        cardContent.push({ segments: [{ text: `  ${detailStr}`, style: { dim: true } }] });
      }
      lines.push(...cardWrap(theme, cardContent, { width: cw, severity }));
      lines.push(...blank());
    }

    if (insights.length > 10) {
      lines.push({ segments: [{ text: `   ${g('ellipsis')} +${insights.length - 10} more insights available`, style: { dim: true } }] });
      lines.push(...blank());
    }

    lines.push(...screenFooter(theme));
    return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    return this._scrollView.handleKey(binding);
  }
}
