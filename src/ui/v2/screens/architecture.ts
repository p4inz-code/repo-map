/**
 * Architecture Screen — scrollable architecture analysis with tree view,
 * score cards, violations, coupling, cohesion, smells, and recommendations.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import { TreeView } from '../tree-view.js';
import {
  screenTitle, sectionHeader, screenFooter,
  cardWrap, cardWidth,
  kvLine, blank, pad, LEFT_PAD,
} from './screen-lib.js';

export class ArchitectureScreen implements ScreenV2 {
  readonly id = 'architecture';
  readonly title = 'Architecture';
  private _store: V2Store;
  private _scrollView = new ScrollView();
  private _treeView = new TreeView();
  private _treeExpanded: Set<string> = new Set(['root']);

  constructor(store: V2Store) {
    this._store = store;
    this._treeView.onSelect((id) => {
      this._store.updateSlice('statusBar', { selectedFile: id });
    });
    this._treeView.onToggle((id) => {
      if (this._treeExpanded.has(id)) this._treeExpanded.delete(id);
      else this._treeExpanded.add(id);
    });
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'architecture' });
    this._store.updateSlice('statusBar', { message: 'Architecture analysis' });
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

    lines.push(...screenTitle(theme, 'code', 'Architecture Analysis'));

    if (!analysis?.intelligence?.architecture) {
      lines.push(...blank());
      lines.push({ segments: [{ text: '    No architecture data. Run a scan first.', style: { dim: true } }] });
      return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
    }

    const arch = analysis.intelligence.architecture;
    const cw = cardWidth(w);

    // ██ Architecture Score ────────────────────────────────────────
    lines.push(...sectionHeader(theme, 'Architecture Score', 'stats'));
    if (arch.archScore) {
      const score = arch.archScore;
      const barW = Math.min(20, cw - 24);
      const overallPct = score.maxScore > 0 ? score.overall / score.maxScore : 0;
      const overallColor = overallPct >= 0.7 ? 'success' : overallPct >= 0.5 ? 'warning' : 'error';

      const scoreLines: Line[] = [
        { segments: [{ text: `Overall`, style: { bold: true } }, { text: ` ${'█'.repeat(Math.round(overallPct * barW))}${'░'.repeat(barW - Math.round(overallPct * barW))}`, style: { color: overallColor } }, { text: ` ${score.overall}/${score.maxScore}`, style: { dim: true } }] },
      ];
      const subScores: [string, number, number][] = [
        ['Coupling', score.coupling, 10], ['Cohesion', score.cohesion, 10],
        ['Layering', score.layering, 10], ['Organization', score.organization, 10],
        ['Separation', score.separation, 10],
      ];
      for (const [name, val, max] of subScores) {
        const subPct = max > 0 ? val / max : 0;
        const subColor = subPct >= 0.7 ? 'success' : subPct >= 0.5 ? 'warning' : 'error';
        const subFilled = Math.round(subPct * 12);
        scoreLines.push({
          segments: [
            { text: `${pad(name, 14)}`, style: { dim: true } },
            { text: `${'█'.repeat(subFilled)}${'░'.repeat(12 - subFilled)}`, style: { color: subColor } },
            { text: ` ${val}/${max}`, style: { dim: true } },
          ],
        });
      }
      lines.push(...cardWrap(theme, scoreLines, { width: cw }));
      lines.push(...blank());
    }

    // ██ Dependency Tree ──────────────────────────────────────────
    lines.push(...sectionHeader(theme, 'Dependency Tree', 'code'));
    const treeNodes = this._buildTreeNodes(arch);
    const treeLines = this._treeView.render(ctx, {
      nodes: treeNodes, indent: 2, showGuides: true,
      selectedId: this._treeView.selectedId ?? undefined,
      expandedIds: this._treeExpanded,
    });
    lines.push(...treeLines);
    lines.push(...blank());

    // ██ Layer Violations ─────────────────────────────────────────
    if (arch.layerViolations && arch.layerViolations.length > 0) {
      lines.push(...sectionHeader(theme, 'Layer Violations', 'cross', 'error'));
      const vl: Line[] = [];
      for (const v of arch.layerViolations.slice(0, 5)) {
        vl.push({ segments: [{ text: `${g('cross')} ${v.violation}`, style: { color: 'error' } }] });
        vl.push({ segments: [{ text: `   source: ${v.source}`, style: { dim: true } }] });
      }
      if (arch.layerViolations.length > 5) {
        vl.push({ segments: [{ text: `   +${arch.layerViolations.length - 5} more`, style: { dim: true } }] });
      }
      lines.push(...cardWrap(theme, vl, { width: cw, severity: 'danger' }));
      lines.push(...blank());
    }

    // ██ Circular Dependencies ────────────────────────────────────
    if (arch.circularDependencies && arch.circularDependencies.length > 0) {
      lines.push(...sectionHeader(theme, 'Circular Dependencies', 'warning', 'error'));
      const cdLines: Line[] = [];
      for (const cd of arch.circularDependencies.slice(0, 4)) {
        const cycleStr = cd.cycle.join(' → ');
        cdLines.push({
          segments: [
            { text: ` ${g('cross')} `, style: { color: 'error' } },
            { text: cycleStr.length > cw - 12 ? cycleStr.slice(0, cw - 15) + '...' : cycleStr, style: { dim: true } },
          ],
        });
      }
      if (arch.circularDependencies.length > 4) {
        cdLines.push({ segments: [{ text: `   +${arch.circularDependencies.length - 4} more`, style: { dim: true } }] });
      }
      lines.push(...cardWrap(theme, cdLines, { width: cw, severity: 'danger' }));
      lines.push(...blank());
    }

    // ██ Coupling & Cohesion ──────────────────────────────────────
    if (arch.coupling || arch.cohesion) {
      lines.push(...sectionHeader(theme, 'Coupling & Cohesion', 'stats'));
      const ccLines: Line[] = [];
      if (arch.coupling) {
        const couplingColor = arch.coupling.level === 'Low' ? 'success' : arch.coupling.level === 'Medium' ? 'warning' : 'error';
        ccLines.push({ segments: [{ text: `Coupling: ${arch.coupling.level}`, style: { color: couplingColor } }] });
        ccLines.push(kvLine('Score', `${arch.coupling.score}`, 12));
      }
      if (arch.cohesion) {
        const cohesionColor = arch.cohesion.overall === 'High' ? 'success' : arch.cohesion.overall === 'Medium' ? 'warning' : 'error';
        ccLines.push({ segments: [{ text: `Cohesion: ${arch.cohesion.overall}`, style: { color: cohesionColor } }] });
        ccLines.push(kvLine('Score', `${arch.cohesion.score}/100`, 12));
      }
      lines.push(...cardWrap(theme, ccLines, { width: cw }));
      lines.push(...blank());
    }

    // ██ Architecture Smells ──────────────────────────────────────
    if (arch.smells && arch.smells.length > 0) {
      lines.push(...sectionHeader(theme, 'Architecture Smells', 'warning', 'warning'));
      for (const smell of arch.smells.slice(0, 5)) {
        const sevColor = smell.severity === 'high' ? 'error' : smell.severity === 'medium' ? 'warning' : 'primary';
        lines.push({
          segments: [
            { text: `${' '.repeat(LEFT_PAD + 2)}${g('warning')} `, style: { color: sevColor } },
            { text: smell.type, style: { bold: true } },
            { text: ` — ${smell.detail}`, style: { dim: true } },
          ],
        });
      }
      if (arch.smells.length > 5) lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}+${arch.smells.length - 5} more`, style: { dim: true } }] });
      lines.push(...blank());
    }

    // ██ Refactor Recommendations ─────────────────────────────────
    if (arch.refactorSuggestions && arch.refactorSuggestions.length > 0) {
      lines.push(...sectionHeader(theme, 'Refactor Recommendations', 'info', 'info'));
      for (const ref of arch.refactorSuggestions.slice(0, 4)) {
        const impactColor = ref.impact === 'high' ? 'error' : ref.impact === 'medium' ? 'warning' : 'primary';
        lines.push({
          segments: [
            { text: `${' '.repeat(LEFT_PAD + 2)}${g('pointer')} `, style: { color: impactColor } },
            { text: ref.title, style: { bold: true } },
          ],
        });
        if (ref.detail) lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 4)}${ref.detail}`, style: { dim: true } }] });
        lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 4)}Impact: ${ref.impact.toUpperCase()} Effort: ${ref.effort}`, style: { dim: true } }] });
      }
    }

    lines.push(...screenFooter(theme));
    return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    if (this._treeView.handleKey(binding)) return true;
    return this._scrollView.handleKey(binding);
  }

  private _buildTreeNodes(arch: any): { id: string; label: string; children?: any[]; icon?: string }[] {
    const nodes: any[] = [];
    if (arch.archScore) {
      const score = arch.archScore;
      nodes.push({
        id: 'arch-score', label: `Architecture Score: ${score.overall}/${score.maxScore}`, icon: 'stats',
        children: [
          { id: 'coupling-score', label: `Coupling: ${score.coupling}/10`, icon: 'stats' },
          { id: 'cohesion-score', label: `Cohesion: ${score.cohesion}/10`, icon: 'stats' },
          { id: 'layering-score', label: `Layering: ${score.layering}/10`, icon: 'stats' },
          { id: 'org-score', label: `Organization: ${score.organization}/10`, icon: 'stats' },
          { id: 'separation-score', label: `Separation: ${score.separation}/10`, icon: 'stats' },
        ],
      });
    }
    if (arch.circularDependencies && arch.circularDependencies.length > 0) {
      const children = arch.circularDependencies.slice(0, 8).map((cd: any, i: number) => ({
        id: `circ-${i}`, label: cd.cycle.join(' → ').slice(0, 50), icon: 'warning',
      }));
      nodes.push({ id: 'circular-deps', label: `Circular Dependencies (${arch.circularDependencies.length})`, icon: 'warning', children });
    }
    if (arch.layerViolations && arch.layerViolations.length > 0) {
      const children = arch.layerViolations.slice(0, 8).map((v: any, i: number) => ({
        id: `violation-${i}`, label: v.violation.slice(0, 50), icon: 'cross',
      }));
      nodes.push({ id: 'layer-violations', label: `Layer Violations (${arch.layerViolations.length})`, icon: 'cross', children });
    }
    if (arch.smells && arch.smells.length > 0) {
      const children = arch.smells.slice(0, 8).map((s: any, i: number) => ({
        id: `smell-${i}`, label: `${s.type}: ${(s.detail || '').slice(0, 40)}`, icon: 'warning',
      }));
      nodes.push({ id: 'arch-smells', label: `Architecture Smells (${arch.smells.length})`, icon: 'warning', children });
    }
    if (arch.refactorSuggestions && arch.refactorSuggestions.length > 0) {
      const children = arch.refactorSuggestions.slice(0, 8).map((r: any, i: number) => ({
        id: `refactor-${i}`, label: r.title.slice(0, 50), icon: 'info',
      }));
      nodes.push({ id: 'refactor-suggestions', label: `Refactor Suggestions (${arch.refactorSuggestions.length})`, icon: 'info', children });
    }
    return nodes.length > 0 ? nodes : [{ id: 'no-data', label: 'No architecture data available', icon: 'info' }];
  }
}
