/**
 * Plugins screen — displays available plugins and their status.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import { screenTitle, cardWrap, cardWidth, blank, sectionDivider, screenFooter } from './screen-lib.js';

export class PluginsScreen implements ScreenV2 {
  readonly id = 'plugins';
  readonly title = 'Plugins';
  private _store: V2Store;
  private _scrollView = new ScrollView();

  constructor(store: V2Store) {
    this._store = store;
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'plugins' });
    this._store.updateSlice('statusBar', { message: 'Plugin manager' });
  }
  onLeave(): void {}
  onPause(): void {}
  onResume(): void {}
  onDestroy(): void {}

  render(ctx: RenderContext): Line[] {
    const state = this._store.getState();
    const theme = ctx.theme;
    const g = theme.glyph.bind(theme);
    const w = ctx.width;
    const cw = cardWidth(w);
    const lines: Line[] = [];

    lines.push(...screenTitle(theme, 'tool', 'Plugins'));

    // Built-in plugins
    lines.push(...blank());
    lines.push({ segments: [{ text: '  Built-in', style: { bold: true, color: 'primary' } }] });
    lines.push(...sectionDivider(theme));
    lines.push(...cardWrap(theme, [
      { segments: [{ text: `${g('check')} Scanner  File system scanner`, style: {} }] },
      { segments: [{ text: `${g('check')} Analyzer  Repository analyzer`, style: {} }] },
      { segments: [{ text: `${g('check')} Architecture  Architecture analysis`, style: {} }] },
    ], { width: cw }));

    // Installed plugins
    lines.push(...blank());
    lines.push({ segments: [{ text: '  Installed', style: { bold: true, color: 'primary' } }] });
    lines.push(...sectionDivider(theme));

    const plugins = state.plugins;
    if (plugins.size === 0) {
      lines.push(...cardWrap(theme, [
        { segments: [{ text: 'No plugins installed.', style: { dim: true } }] },
        { segments: [{ text: 'Plugin support coming soon.', style: { dim: true } }] },
      ], { width: cw }));
    } else {
      const pluginLines: { text: string; style?: {} }[] = [];
      for (const [name] of plugins) {
        pluginLines.push({ text: `○ ${name}` });
      }
      lines.push(...cardWrap(theme, pluginLines.map(p => ({ segments: [{ text: p.text, style: p.style }] })), { width: cw }));
    }

    lines.push(...screenFooter(theme));
    return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    return this._scrollView.handleKey(binding);
  }
}
