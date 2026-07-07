/**
 * Dependencies Screen — scrollable dependency explorer with cards, tables,
 * and status indicators for runtime, dev, unused, and outdated packages.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import { DataTable } from '../data-table.js';
import {
  screenTitle, sectionHeader, screenFooter,
  cardWrap, cardWidth, kvLine, blank,
} from './screen-lib.js';

export class DependenciesScreen implements ScreenV2 {
  readonly id = 'dependencies';
  readonly title = 'Dependencies';
  private _store: V2Store;
  private _scrollView = new ScrollView();
  private _groupsTable = new DataTable();

  constructor(store: V2Store) {
    this._store = store;
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'dependencies' });
    this._store.updateSlice('statusBar', { message: 'Dependency analysis' });
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

    lines.push(...screenTitle(theme, 'lang', 'Dependency Explorer'));

    if (!analysis?.intelligence?.dependencies) {
      lines.push(...blank());
      lines.push({ segments: [{ text: '  No dependency data available.', style: { dim: true } }] });
      return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
    }

    const deps = analysis.intelligence.dependencies;
    const cw = cardWidth(w);

    // ██ Overview Cards ──────────────────────────────────────────
    lines.push(...sectionHeader(theme, 'Overview', 'stats'));
    const overviewLines: Line[] = [
      kvLine('Runtime', `${deps.runtimeCount}`, 14),
      kvLine('Dev', `${deps.devCount}`, 14),
      kvLine('Total', `${deps.totalCount}`, 14),
    ];
    lines.push(...cardWrap(theme, overviewLines, { width: cw }));

    // ██ Largest Groups (DataTable) ─────────────────────────────
    if (deps.largestGroups && deps.largestGroups.length > 0) {
      lines.push(...sectionHeader(theme, 'Largest Dependency Groups', 'stats'));
      const groupCols = [
        { key: 'name', label: 'Group', width: Math.max(...deps.largestGroups.map(g => g.name.length + 2), 12), sortable: true },
        { key: 'count', label: 'Packages', width: 10, sortable: true, align: 'right' as const },
      ];
      const groupRows = deps.largestGroups.slice(0, 10).map(g => ({ name: g.name, count: `${g.count}` }));
      lines.push(...this._groupsTable.render(ctx, {
        columns: groupCols, data: groupRows, showHeader: true, striped: true, border: true, viewportWidth: w,
      }));
      lines.push(...blank());
    }

    // ██ Possible Unused ────────────────────────────────────────
    if (deps.possibleUnused && deps.possibleUnused.length > 0) {
      lines.push(...sectionHeader(theme, 'Possible Unused Dependencies', 'warning', 'warning'));
      const unusedLines: Line[] = deps.possibleUnused.slice(0, 8).map(pkg => ({
        segments: [{ text: ` ${g('warning')} ${pkg}`, style: { color: 'warning' } }],
      }));
      if (deps.possibleUnused.length > 8) {
        unusedLines.push({ segments: [{ text: `   +${deps.possibleUnused.length - 8} more`, style: { dim: true } }] });
      }
      lines.push(...cardWrap(theme, unusedLines, { width: cw, severity: 'warning' }));
      lines.push(...blank());
    } else {
      lines.push({ segments: [{ text: ` ${g('check')} No unused dependencies detected`, style: { color: 'success' } }] });
      lines.push(...blank());
    }

    // ██ Outdated Warnings ───────────────────────────────────────
    if (deps.outdatedWarnings && deps.outdatedWarnings.length > 0) {
      lines.push(...sectionHeader(theme, 'Outdated Dependencies', 'warning', 'warning'));
      for (const warn of deps.outdatedWarnings.slice(0, 5)) {
        lines.push({
          segments: [
            { text: `   ${g('warning')} `, style: { color: 'warning' } },
            { text: warn, style: { dim: true } },
          ],
        });
      }
    }

    lines.push(...screenFooter(theme));
    return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    if (this._scrollView.handleKey(binding)) return true;
    if (binding === 'tab' || binding === 'enter') {
      this._groupsTable.handleKey(binding);
      return true;
    }
    return false;
  }
}
