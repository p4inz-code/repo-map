/**
 * Suggestions Screen — scrollable roadmap layout with priority grouping,
 * impact, effort, and cards. Uses screen-lib.ts helpers.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import { DataTable } from '../data-table.js';
import {
  screenTitle, sectionDivider, screenFooter,
  cardWrap, cardWidth, blank,
} from './screen-lib.js';

export class SuggestionsScreen implements ScreenV2 {
  readonly id = 'suggestions';
  readonly title = 'Suggestions';
  private _store: V2Store;
  private _scrollView = new ScrollView();
  private _priorityTable = new DataTable();

  constructor(store: V2Store) {
    this._store = store;
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'suggestions' });
    this._store.updateSlice('statusBar', { message: 'Improvement suggestions' });
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

    lines.push(...screenTitle(theme, 'info', 'Improvement Roadmap'));

    if (!analysis?.intelligence?.suggestions || analysis.intelligence.suggestions.length === 0) {
      lines.push(...blank());
      lines.push({ segments: [{ text: '  No suggestions generated yet.', style: { dim: true } }] });
      lines.push(...screenFooter(theme));
      return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
    }

    const suggestions = analysis.intelligence.suggestions;
    const cw = cardWidth(w);

    // Summary via DataTable
    const highCount = suggestions.filter(s => s.priority === 'high').length;
    const medCount = suggestions.filter(s => s.priority === 'medium').length;
    const lowCount = suggestions.filter(s => s.priority === 'low').length;

    const priCols = [
      { key: 'priority', label: 'Priority', width: 18, sortable: true },
      { key: 'count', label: 'Count', width: 10, sortable: true, align: 'right' as const },
    ];
    const priRows = [
      { priority: `${g('cross')} High Priority`, count: `${highCount}` },
      { priority: `${g('warning')} Medium`, count: `${medCount}` },
      { priority: `${g('info')} Low`, count: `${lowCount}` },
    ];
    lines.push(...this._priorityTable.render(ctx, {
      columns: priCols, data: priRows, showHeader: true, striped: true, border: true, viewportWidth: w,
    }));
    lines.push(...blank());

    // Group by priority
    const priorityOrder = ['high', 'medium', 'low'] as const;
    for (const priority of priorityOrder) {
      const filtered = suggestions.filter(s => s.priority === priority);
      if (filtered.length === 0) continue;

      const priColor = priority === 'high' ? 'error' : priority === 'medium' ? 'warning' : 'primary';
      const priIcon = priority === 'high' ? g('cross') : priority === 'medium' ? g('warning') : g('info');

      lines.push({ segments: [{ text: ` ${priIcon} ${priority.toUpperCase()} PRIORITY — ${filtered.length} items`, style: { bold: true, color: priColor } }] });
      lines.push(...sectionDivider(theme));

      for (const s of filtered.slice(0, 4)) {
        const cardContent: Line[] = [
          { segments: [{ text: `${g('pointer')} ${s.title}`, style: { bold: true } }] },
        ];
        if (s.detail) {
          cardContent.push({ segments: [{ text: s.detail, style: { dim: true } }] });
        }
        cardContent.push({ segments: [{ text: `Priority: ${s.priority.toUpperCase()}`, style: { dim: true } }] });
        lines.push(...cardWrap(theme, cardContent, { width: cw, severity: priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'info' }));
        lines.push(...blank());
      }

      if (filtered.length > 4) {
        lines.push({ segments: [{ text: `   ${g('ellipsis')} +${filtered.length - 4} more ${priority} priority items`, style: { dim: true } }] });
        lines.push(...blank());
      }
    }

    lines.push(...screenFooter(theme));
    return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    if (this._scrollView.handleKey(binding)) return true;
    if (binding === 'tab') {
      this._priorityTable.handleKey('tab');
      return true;
    }
    return false;
  }
}
