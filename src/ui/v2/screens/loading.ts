/**
 * Loading screen — displays progress during scanning, analyzing,
 * and other background operations. Uses screen-lib.ts helpers.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import { screenTitle, percentageBar, blank, LEFT_PAD } from './screen-lib.js';

export class LoadingScreen implements ScreenV2 {
  readonly id = 'loading';
  readonly title = 'Loading';
  private _store: V2Store;
  private _scrollView = new ScrollView();

  constructor(store: V2Store) {
    this._store = store;
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'loading' });
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

    const appMode = state.appMode;
    const status = state.statusBar;

    const title = appMode === 'scanning'
      ? 'Scanning Repository'
      : appMode === 'analyzing'
        ? 'Analyzing Repository'
        : 'Loading...';

    const icon = appMode === 'scanning' ? 'search' : appMode === 'analyzing' ? 'stats' : 'search';
    lines.push(...screenTitle(theme, icon, title));

    if (status.message) {
      lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}${status.message}` }] });
    }
    lines.push(...blank());

    if (status.progress >= 0) {
      lines.push(...percentageBar(theme, status.progress / 100, 30));
      lines.push(...blank());
    } else {
      // Show indeterminate bar (animated dots)
      const phase = Math.floor(Date.now() / 500) % 4;
      const dots = '.'.repeat(phase);
      lines.push({ segments: [{ text: `${' '.repeat(LEFT_PAD + 2)}Processing${dots}`, style: { dim: true } }] });
      lines.push(...blank());
    }

    if (appMode === 'scanning' && status.scanSpeed > 0) {
      const ci = ' '.repeat(LEFT_PAD + 2);
      lines.push({
        segments: [
          { text: `${ci}${g('file')} Files: `, style: { bold: true } },
          { text: `${status.scanSpeed}`, style: {} },
        ],
      });
    }

    if (status.backgroundTask) {
      const ci = ' '.repeat(LEFT_PAD + 2);
      lines.push({
        segments: [
          { text: `${ci}${g('search')} `, style: { dim: true } },
          { text: status.backgroundTask, style: { dim: true } },
        ],
      });
    }

    if (status.progress < 0) {
      const ci = ' '.repeat(LEFT_PAD + 2);
      lines.push(...blank());
      lines.push({ segments: [{ text: `${ci}Please wait while processing completes...`, style: { dim: true } }] });
    }

    return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    return this._scrollView.handleKey(binding);
  }
}
