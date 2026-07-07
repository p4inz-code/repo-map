/**
 * Results Screen — professional report with all analysis data.
 * Uses the unified screen-lib.ts helpers for consistent card-based layout.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import { DataTable } from '../data-table.js';
import {
  screenTitle, sectionHeader, sectionDivider, screenFooter,
  cardWrap, cardWidth, kvLine,
  blank, LEFT_PAD,
} from './screen-lib.js';

export class ResultsScreen implements ScreenV2 {
  readonly id = 'results';
  readonly title = 'Results';
  private _store: V2Store;
  private _scrollView = new ScrollView();
  private _statsTable = new DataTable();
  private _langTable = new DataTable();

  constructor(store: V2Store) {
    this._store = store;
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'results' });
    this._store.updateSlice('statusBar', { message: 'Analysis results' });
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
    const rawLines: Line[] = [];

    // ── Title ────────────────────────────────────────────────
    rawLines.push(...screenTitle(theme, 'stats', 'Analysis Results', analysis?.projectName ?? ''));
    rawLines.push(...sectionDivider(theme));

    if (!analysis) {
      rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}No analysis data available. Run a scan first.`, style: { dim: true } }] });
      return createScrollableScreen(rawLines, ctx, this._scrollView, 0).lines;
    }

    const stats = analysis.stats;
    const health = analysis.intelligence.health;
    const classification = analysis.intelligence.classification;
    const maturity = analysis.intelligence.maturity;
    const technologies = analysis.technologies;
    const strengths = analysis.intelligence.strengths ?? [];
    const suggestions = analysis.intelligence.suggestions ?? [];
    const insights = analysis.intelligence.insights ?? [];
    const deps = analysis.intelligence.dependencies;

    const cw = cardWidth(w);

    // ██ Summary Section ──────────────────────────────────────────
    rawLines.push(...sectionHeader(theme, 'Summary', 'repo'));
    const summaryLines: Line[] = [
      { segments: [{ text: `${g('repo')} ${analysis.projectName}`, style: { bold: true } }] },
    ];
    summaryLines.push(kvLine('Maturity', maturity.level));
    summaryLines.push(kvLine('Health', `${health.overall}/100  Confidence: ${classification.confidence}%`));
    summaryLines.push(kvLine('Classification', classification.category));
    rawLines.push(...cardWrap(theme, summaryLines, { width: cw }));

    // ██ Statistics Section ───────────────────────────────────────
    rawLines.push(...sectionHeader(theme, 'Statistics', 'stats'));
    const statCols = [
      { key: 'metric', label: 'Metric', width: 16, sortable: true },
      { key: 'value', label: 'Value', width: 16, sortable: true, align: 'right' as const },
      { key: 'detail', label: 'Detail', width: Math.max(8, cw - 38), sortable: false },
    ];
    const statRows = [
      { metric: 'Total Files', value: `${stats.totalFiles}`, detail: '' },
      { metric: 'Total Directories', value: `${stats.totalDirectories}`, detail: '' },
      { metric: 'Max Depth', value: `${stats.maxDepth}`, detail: 'levels' },
      { metric: 'Avg Files/Dir', value: `${stats.avgFilesPerDirectory.toFixed(1)}`, detail: '' },
      { metric: 'Largest File', value: stats.largestFile.split('/').pop() ?? '', detail: `${(stats.largestFileSize / 1024).toFixed(0)}KB` },
      { metric: 'Largest Dir', value: stats.largestDirectory.split('/').pop() ?? '', detail: `${stats.largestDirectoryFiles} files` },
    ];
    rawLines.push(...this._statsTable.render(ctx, {
      columns: statCols, data: statRows, showHeader: true, striped: true, border: true, viewportWidth: w,
    }));

    // ██ Languages & Frameworks ───────────────────────────────────
    const languages = technologies.filter(t => t.category === 'language');
    const frameworks = technologies.filter(t => t.category === 'framework');
    const tools = technologies.filter(t => t.category === 'tool');

    if (languages.length > 0) {
      rawLines.push(...sectionHeader(theme, 'Languages', 'lang'));
      const nameW = Math.max(...languages.map(l => l.name.length + 2), 10);
      const langCols = [
        { key: 'name', label: 'Language', width: nameW, sortable: true },
        { key: 'files', label: 'Files', width: 8, sortable: true, align: 'right' as const },
        { key: 'percent', label: 'Percent', width: 8, sortable: true, align: 'right' as const },
        { key: 'version', label: 'Version', width: Math.max(8, cw - nameW - 26), sortable: false },
      ];
      const langRows = languages.map(lang => ({
        name: lang.name,
        files: `${lang.count ?? 0}`,
        percent: stats.totalFiles > 0 ? ((lang.count! / stats.totalFiles) * 100).toFixed(1) + '%' : 'N/A',
        version: lang.version ?? '',
      }));
      rawLines.push(...this._langTable.render(ctx, {
        columns: langCols, data: langRows, showHeader: true, striped: true, border: true, viewportWidth: w,
      }));
    }

    if (frameworks.length > 0) {
      rawLines.push(...sectionHeader(theme, 'Frameworks', 'framework'));
      for (const fw of frameworks) {
        const verStr = fw.version ? ` (${fw.version})` : '';
        rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}${g('pointer')} ${fw.name}${verStr}` }] });
      }
    }

    if (tools.length > 0) {
      rawLines.push(...sectionHeader(theme, 'Tools', 'tool'));
      for (const tool of tools) {
        rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}${g('pointer')} ${tool.name}` }] });
      }
    }

    // ██ Architecture ──────────────────────────────────────────────
    const arch = analysis.intelligence.architecture;
    if (arch) {
      rawLines.push(...sectionHeader(theme, 'Architecture', 'code'));
      if (arch.archScore) {
        const score = arch.archScore;
        const barW = Math.min(20, cw - 20);
        const owFilled = Math.round((score.overall / (score.maxScore || 100)) * barW);
        rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}Overall Score: ${score.overall}/${score.maxScore}`, style: { bold: true } }] });
        rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}${'█'.repeat(owFilled)}${'░'.repeat(barW - owFilled)}`, style: { color: score.overall >= 70 ? 'success' : 'warning' } }] });
      }
      if (arch.circularDependencies && arch.circularDependencies.length > 0) {
        rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}${g('warning')} Circular Dependencies: ${arch.circularDependencies.length}`, style: { color: 'error', bold: true } }] });
        for (const cd of arch.circularDependencies.slice(0, 3)) {
          rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 4)}${cd.cycle.join(' → ')}`, style: { dim: true } }] });
        }
        if (arch.circularDependencies.length > 3) rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 4)}+${arch.circularDependencies.length - 3} more`, style: { dim: true } }] });
      }
      if (arch.coupling) rawLines.push(kvLine('Coupling', `${arch.coupling.level} (${arch.coupling.score})`, 16));
      if (arch.cohesion) rawLines.push(kvLine('Cohesion', `${arch.cohesion.overall} (${arch.cohesion.score}/100)`, 16));
      if (arch.layerViolations && arch.layerViolations.length > 0) {
        rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}${g('cross')} Layer Violations: ${arch.layerViolations.length}`, style: { color: 'error', bold: true } }] });
      }
      if (arch.refactorSuggestions && arch.refactorSuggestions.length > 0) {
        rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}${g('info')} Refactor Suggestions: ${arch.refactorSuggestions.length}`, style: { color: 'warning', bold: true } }] });
      }
    }

    // ██ Dependencies ─────────────────────────────────────────────
    if (deps) {
      rawLines.push(...sectionHeader(theme, 'Dependencies', 'lang'));
      rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}Runtime: ${deps.runtimeCount}  Dev: ${deps.devCount}  Total: ${deps.totalCount}` }] });
      if (deps.largestGroups && deps.largestGroups.length > 0) {
        rawLines.push(...blank());
        rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}Largest Dependency Groups`, style: { bold: true } }] });
        for (const group of deps.largestGroups.slice(0, 5)) {
          rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 4)}${g('pointer')} ${group.name} (${group.count})`, style: { dim: true } }] });
        }
      }
      if (deps.possibleUnused && deps.possibleUnused.length > 0) {
        rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}${g('warning')} Possible Unused: ${deps.possibleUnused.join(', ')}`, style: { color: 'warning' } }] });
      }
    }

    // ██ Strengths ────────────────────────────────────────────────
    if (strengths.length > 0) {
      rawLines.push(...sectionHeader(theme, 'Strengths', 'check', 'success'));
      for (const s of strengths.slice(0, 5)) {
        rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}${g('check')} ${s.title}`, style: { color: 'success' } }] });
        if (s.detail) rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 4)}${s.detail}`, style: { dim: true } }] });
      }
      if (strengths.length > 5) rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 4)}+${strengths.length - 5} more`, style: { dim: true } }] });
    }

    // ██ Suggestions ─────────────────────────────────────────────
    if (suggestions.length > 0) {
      rawLines.push(...sectionHeader(theme, 'Suggestions', 'warning', 'warning'));
      const priorityOrder = ['high', 'medium', 'low'] as const;
      for (const pri of priorityOrder) {
        const filtered = suggestions.filter(s => s.priority === pri);
        if (filtered.length === 0) continue;
        const priColor = pri === 'high' ? 'error' : pri === 'medium' ? 'warning' : 'primary';
        rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}${pri.toUpperCase()} PRIORITY`, style: { bold: true, color: priColor } }] });
        for (const s of filtered.slice(0, 3)) {
          rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}${g('pointer')} ${s.title}` }] });
          if (s.detail) rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 4)}${s.detail}`, style: { dim: true } }] });
        }
        if (filtered.length > 3) rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 4)}+${filtered.length - 3} more`, style: { dim: true } }] });
      }
    }

    // ██ Insights ─────────────────────────────────────────────────
    if (insights.length > 0) {
      rawLines.push(...sectionHeader(theme, 'Insights', 'info', 'info'));
      for (const ins of insights.slice(0, 5)) {
        rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}${g('info')} ${ins.observation}` }] });
        if (ins.detail) rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 4)}${ins.detail}`, style: { dim: true } }] });
      }
      if (insights.length > 5) rawLines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 4)}+${insights.length - 5} more`, style: { dim: true } }] });
    }

    // ██ Footer ───────────────────────────────────────────────────
    rawLines.push(...screenFooter(theme));

    return createScrollableScreen(rawLines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    if (this._scrollView.handleKey(binding)) return true;
    if (binding === 'enter') {
      this._statsTable.handleKey('enter');
      return true;
    }
    return false;
  }
}
