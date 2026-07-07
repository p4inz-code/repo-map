/**
 * Dashboard — premium landing screen.
 *
 * Uses the unified screen-lib.ts helpers for consistent spacing,
 * card rendering, metric boxes, and progress visualization.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import { DataTable } from '../data-table.js';
import {
  screenTitle, sectionHeader, screenFooter,
  cardWrap, cardWidth, metricRow, kvLine,
  blank, pad, metricCount, LEFT_PAD,
} from './screen-lib.js';

export class DashboardScreen implements ScreenV2 {
  readonly id = 'dashboard';
  readonly title = 'Dashboard';
  private _store: V2Store;
  private _scrollView = new ScrollView();
  private _statsTable = new DataTable();

  constructor(store: V2Store) {
    this._store = store;
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'dashboard' });
    this._store.updateSlice('statusBar', { message: 'Dashboard ready' });
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

    const projectName = analysis?.projectName ?? state.header.projectName;

    // ── Title ──────────────────────────────────────────────────
    lines.push(...screenTitle(theme, 'repo', projectName, 'Dashboard'));

    if (!analysis) {
      // ── Empty State ──────────────────────────────────────────
      lines.push(...blank(2));
      const ci = ' '.repeat(LEFT_PAD + 2);
      lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD)}${g('repo')}`, style: { color: 'primary', bold: true } }] });
      lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD)}  Welcome to Repo-Map`, style: { bold: true } }] });
      lines.push(...blank());
      lines.push({ segments: [{ text: `${ci}No analysis data yet.`, style: { dim: true } }] });
      lines.push({ segments: [{ text: `${ci}Press 2 to scan a repository, or press ? for help.`, style: { dim: true } }] });
      lines.push(...blank());
      lines.push({ segments: [{ text: `${ci}${g('pointer')} `, style: { color: 'primary' } }, { text: '2 — Scan Repository', style: { bold: true } }] });
      lines.push({ segments: [{ text: `${ci}${g('pointer')} `, style: { color: 'primary' } }, { text: '? — Keyboard Shortcuts', style: { bold: true } }] });
      lines.push({ segments: [{ text: `${ci}${g('pointer')} `, style: { color: 'primary' } }, { text: 'q — Quit', style: { bold: true } }] });
      return lines;
    }

    const stats = analysis.stats;
    const health = analysis.intelligence.health;
    const classification = analysis.intelligence.classification;
    const maturity = analysis.intelligence.maturity;
    const technologies = analysis.technologies;
    const suggestions = analysis.intelligence.suggestions ?? [];
    const deps = analysis.intelligence.dependencies;

    // ── Row 1: Quick Metrics ────────────────────────────────────
    const mCount = metricCount(w);
    const items: { icon: string; label: string; value: string; trend?: 'up' | 'down' | 'stable' }[] = [];
    items.push({ icon: 'file', label: 'Files', value: `${stats.totalFiles}` });
    items.push({ icon: 'folder', label: 'Dirs', value: `${stats.totalDirectories}` });
    items.push({ icon: 'stats', label: 'Health', value: `${health.overall}/100` });
    if (mCount >= 4) {
      items.push({ icon: 'lang', label: 'Class', value: `${classification.category.slice(0, 8)}` });
    }
    // Take only as many as fit
    const visibleItems = items.slice(0, mCount);
    lines.push(...metricRow(theme, visibleItems, w));
    lines.push(...blank());

    // ── Row 2: Health + Architecture ────────────────────────────
    const cw = cardWidth(w);
    lines.push(...sectionHeader(theme, 'Health Overview', 'stats'));

    // Health categories
    const healthLines: Line[] = [];
    if (health.categories && health.categories.length > 0) {
      for (const cat of health.categories.slice(0, 3)) {
        const barW = Math.min(16, cw - 20);
        const pct = cat.maxScore > 0 ? cat.score / cat.maxScore : 0;
        const filled = Math.round(pct * barW);
        const empty = barW - filled;
        const catColor = pct >= 0.8 ? 'success' : pct >= 0.5 ? 'warning' : 'error';
        const bar = theme.glyph('filled').repeat(Math.max(0, filled)) + theme.glyph('empty').repeat(Math.max(0, empty));
        healthLines.push({
          segments: [
            { text: `${pad(cat.name, 14)}`, style: { bold: true } },
            { text: bar, style: { color: catColor } },
            { text: ` ${cat.score}/${cat.maxScore}`, style: { dim: true } },
          ],
        });
      }
    } else {
      // Simple overall health bar
      const barW = Math.min(24, cw - 10);
      const filled = Math.round((health.overall / 100) * barW);
      const empty = barW - filled;
      const hColor = health.overall >= 80 ? 'success' : health.overall >= 50 ? 'warning' : 'error';
      healthLines.push({
        segments: [
          { text: 'Overall    ', style: { bold: true } },
          { text: theme.glyph('filled').repeat(filled) + theme.glyph('empty').repeat(empty), style: { color: hColor } },
          { text: ` ${health.overall}/100`, style: { dim: true } },
        ],
      });
    }
    lines.push(...cardWrap(theme, healthLines, { width: cw }));
    lines.push(...blank());

    // ── Row 3: Technology Stack ─────────────────────────────────
    lines.push(...sectionHeader(theme, 'Technology Stack', 'lang'));

    const languages = technologies.filter(t => t.category === 'language');
    const frameworks = technologies.filter(t => t.category === 'framework');
    const tools = technologies.filter(t => t.category === 'tool');

    const ci = ' '.repeat(LEFT_PAD + 2);
    if (languages.length > 0) {
      const langNames = languages.map(l => l.name).join(', ');
      const langCount = languages.reduce((acc, l) => acc + (l.count ?? 0), 0);
      lines.push({ segments: [{ text: `${ci}${g('file')} ${languages.length} languages (${langCount} files): ${langNames}`, style: { dim: true } }] });
    }
    if (frameworks.length > 0) {
      const fwNames = frameworks.map(f => f.name).join(', ');
      lines.push({ segments: [{ text: `${ci}${g('framework')} Frameworks: ${fwNames}`, style: { dim: true } }] });
    }
    if (tools.length > 0) {
      const toolNames = tools.map(t => t.name).join(', ');
      lines.push({ segments: [{ text: `${ci}${g('tool')} Tools: ${toolNames}`, style: { dim: true } }] });
    }
    if (deps) {
      lines.push({ segments: [{ text: `${ci}${g('stats')} Dependencies: ${deps.runtimeCount} runtime, ${deps.devCount} dev`, style: { dim: true } }] });
    }
    lines.push(...blank());

    // ── Row 4: Suggestions ──────────────────────────────────────
    lines.push(...sectionHeader(theme, 'Top Suggestions', 'warning', 'warning'));
    if (suggestions.length > 0) {
      const ci = ' '.repeat(LEFT_PAD + 2);
      for (const s of suggestions.slice(0, 4)) {
        const priColor = s.priority === 'high' ? 'error' : s.priority === 'medium' ? 'warning' : 'primary';
        lines.push({
          segments: [
            { text: `${ci}${g('pointer')} `, style: { color: priColor } },
            { text: s.title.length > cw - 10 ? s.title.slice(0, cw - 13) + '...' : s.title },
          ],
        });
      }
    } else {
      lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}No suggestions yet.`, style: { dim: true } }] });
    }
    lines.push(...blank());

    // ── Row 5: Classification & Maturity ────────────────────────
    lines.push(...sectionHeader(theme, 'Classification & Maturity', 'stats'));
    const ci2 = ' '.repeat(LEFT_PAD + 2);
    lines.push({ segments: [{ text: `${ci2}Type           ${classification.category}` }] });
    lines.push({ segments: [{ text: `${ci2}Confidence     ${classification.confidence}%` }] });
    lines.push({ segments: [{ text: `${ci2}Maturity       ${maturity.level}` }] });
    if (maturity.confidence) {
      lines.push({ segments: [{ text: `${ci2}Maturity Conf. ${maturity.confidence}%` }] });
    }

    // ── Footer ──────────────────────────────────────────────────
    lines.push(...screenFooter(theme));

    return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    if (this._scrollView.handleKey(binding)) return true;
    if (binding === 'tab') {
      this._statsTable.handleKey('tab');
      return true;
    }
    return false;
  }
}
