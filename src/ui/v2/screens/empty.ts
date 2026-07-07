/**
 * Empty state screen — displayed when no project is loaded.
 * Shows a clean welcome message with next steps.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import { screenTitle, blank } from './screen-lib.js';

export class EmptyStateScreen implements ScreenV2 {
  readonly id = 'empty';
  readonly title = 'Welcome';
  private _store: V2Store;
  private _scrollView = new ScrollView();

  constructor(store: V2Store) {
    this._store = store;
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'idle' });
    this._store.updateSlice('statusBar', { message: 'Ready' });
  }
  onLeave(): void {}
  onPause(): void {}
  onResume(): void {}
  onDestroy(): void {}

  render(ctx: RenderContext): Line[] {
    const theme = ctx.theme;
    const g = theme.glyph.bind(theme);
    const w = ctx.width;
    const lines: Line[] = [];

    // Centered welcome
    const centerCol = Math.floor((w - 30) / 2);
    const padStr = ' '.repeat(Math.max(0, centerCol));

    for (let i = 0; i < Math.floor(ctx.height * 0.2); i++) {
      lines.push({ segments: [{ text: '' }] });
    }

    lines.push({
      segments: [
        { text: `${padStr}${g('repo')} `, style: { color: 'primary', bold: true } },
        { text: 'Repo-Map', style: { bold: true } },
      ],
    });
    lines.push(...blank());
    lines.push({ segments: [{ text: `${padStr}  Welcome to Repo-Map`, style: { dim: true } }] });
    lines.push({ segments: [{ text: `${padStr}  Terminal-based repository analysis`, style: { dim: true } }] });
    lines.push(...blank());

    // Next steps
    const sep = theme.glyph('separator');
    lines.push({ segments: [{ text: `${padStr}${sep.repeat(Math.min(24, w - 4))}`, style: { dim: true } }] });
    lines.push(...blank());

    lines.push({
      segments: [
        { text: `${padStr}  ${g('pointer')} `, style: { color: 'primary' } },
        { text: 'Press 2 to scan a repository', style: { bold: true } },
      ],
    });
    lines.push({
      segments: [
        { text: `${padStr}  ${g('pointer')} `, style: { color: 'primary' } },
        { text: 'Press ? for keyboard shortcuts', style: { bold: true } },
      ],
    });
    lines.push({
      segments: [
        { text: `${padStr}  ${g('pointer')} `, style: { color: 'primary' } },
        { text: 'Press q to quit', style: { bold: true } },
      ],
    });

    return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    return this._scrollView.handleKey(binding);
  }
}
