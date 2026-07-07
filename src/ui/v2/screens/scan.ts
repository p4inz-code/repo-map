/**
 * Scan screen — initiates and monitors repository scanning.
 * Shows progress, file count, and detected technologies in real-time.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import { screenTitle, percentageBar, blank, sectionDivider, LEFT_PAD } from './screen-lib.js';

export class ScanScreen implements ScreenV2 {
  readonly id = 'scan';
  readonly title = 'Scan Repository';
  private _store: V2Store;
  private _scrollView = new ScrollView();

  constructor(store: V2Store) {
    this._store = store;
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'scan' });
    this._store.updateSlice('statusBar', { message: 'Ready to scan' });
  }
  onLeave(): void {}
  onPause(): void {}
  onResume(): void {}
  onDestroy(): void {}

  render(ctx: RenderContext): Line[] {
    const state = this._store.getState();
    const theme = ctx.theme;
    const g = theme.glyph.bind(theme);
    const lines: Line[] = [];

    // Scanning state
    if (state.appMode === 'scanning') {
      lines.push(...screenTitle(theme, 'search', 'Scanning...'));
      lines.push(...blank());

      const sb = state.statusBar;
      const ci = ' '.repeat(LEFT_PAD + 2)
      if (sb.scanSpeed > 0) {
        lines.push({
          segments: [
            { text: `${ci}Files scanned: `, style: { bold: true } },
            { text: `${sb.scanSpeed}`, style: {} },
          ],
        });
      }
      if (sb.progress >= 0) {
        lines.push(...percentageBar(theme, sb.progress / 100, 30));
      }

      if (sb.backgroundTask) {
        lines.push({
          segments: [{ text: `${ci}${g('search')} ${sb.backgroundTask}`, style: { dim: true } }],
        });
      }
      return lines;
    }

    // Ready to scan
    lines.push(...screenTitle(theme, 'repo', 'Scan Repository'));
    const ci = ' '.repeat(LEFT_PAD + 2);
    lines.push(...blank());

    lines.push({ segments: [{ text: `${ci}Scan the current directory to analyze`, style: { dim: true } }] });
    lines.push({ segments: [{ text: `${ci}its structure, technologies, and architecture.`, style: { dim: true } }] });
    lines.push(...blank());

    lines.push({
      segments: [
        { text: `${ci}${g('pointer')} `, style: { color: 'primary' } },
        { text: 'Press Enter to start scanning', style: { bold: true } },
      ],
    });

    // Analysis results if available
    if (state.analysis) {
      lines.push(...blank());
      lines.push(...sectionDivider(theme));
    lines.push({
      segments: [{ text: `  ${g('check')} `, style: { color: 'success' } }, { text: 'Previous scan results available', style: { dim: true } }],
    });
    }

    return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    return this._scrollView.handleKey(binding);
  }
}
