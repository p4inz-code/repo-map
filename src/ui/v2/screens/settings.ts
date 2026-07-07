/**
 * Settings screen — configure application settings.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import { screenTitle, cardWrap, cardWidth, blank, sectionDivider, screenFooter } from './screen-lib.js';

export class SettingsScreen implements ScreenV2 {
  readonly id = 'settings';
  readonly title = 'Settings';
  private _store: V2Store;
  private _scrollView = new ScrollView();

  constructor(store: V2Store) {
    this._store = store;
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'settings' });
  }
  onLeave(): void {}
  onPause(): void {}
  onResume(): void {}
  onDestroy(): void {}

  render(ctx: RenderContext): Line[] {
    const theme = ctx.theme;
    const w = ctx.width;
    const cw = cardWidth(w);
    const lines: Line[] = [];

    lines.push(...screenTitle(theme, 'stats', 'Settings'));

    // Theme settings
    lines.push(...blank());
    lines.push({ segments: [{ text: '  Theme', style: { bold: true, color: 'primary' as const } }] });
    lines.push(...sectionDivider(theme));
    lines.push(...cardWrap(theme, [
      { segments: [{ text: 'Theme preset — default', style: { dim: true } }] },
    ], { width: cw }));

    // Display settings
    lines.push(...blank());
    lines.push({ segments: [{ text: '  Display', style: { bold: true, color: 'primary' as const } }] });
    lines.push(...sectionDivider(theme));
    lines.push(...cardWrap(theme, [
      { segments: [{ text: 'Sidebar width — 24', style: { dim: true } }] },
      { segments: [{ text: 'Inspector visible — yes', style: { dim: true } }] },
    ], { width: cw }));

    // Behavior settings
    lines.push(...blank());
    lines.push({ segments: [{ text: '  Behavior', style: { bold: true, color: 'primary' as const } }] });
    lines.push(...sectionDivider(theme));
    lines.push(...cardWrap(theme, [
      { segments: [{ text: 'Animation enabled — yes', style: { dim: true } }] },
      { segments: [{ text: 'Auto-save — no', style: { dim: true } }] },
    ], { width: cw }));

    lines.push(...screenFooter(theme));
    return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    return this._scrollView.handleKey(binding);
  }
}
