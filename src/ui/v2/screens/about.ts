/**
 * About screen — displays application version, license, credits, and links.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import { screenTitle, cardWrap, cardWidth, kvLine, blank, screenFooter } from './screen-lib.js';

import { CLI_VERSION } from '../../../types.js';

export class AboutScreen implements ScreenV2 {
  readonly id = 'about';
  readonly title = 'About';
  private _store: V2Store;
  private _scrollView = new ScrollView();

  constructor(store: V2Store) {
    this._store = store;
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'about' });
    this._store.updateSlice('statusBar', { message: `About repo-map v${CLI_VERSION}` });
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

    lines.push(...screenTitle(theme, 'repo', `Repo-Map v${CLI_VERSION}`));
    lines.push(...blank());

    const cardContent: Line[] = [
      { segments: [{ text: 'A terminal-based repository mapping and analysis tool', style: { dim: true } }] },
      { segments: [{ text: 'that provides deep insights into your codebase', style: { dim: true } }] },
      { segments: [{ text: 'architecture, dependencies, and health metrics.', style: { dim: true } }] },
      ...blank(),
      kvLine('Version', CLI_VERSION),
      kvLine('License', 'MIT'),
      kvLine('Engine', 'v3 (RuntimeManager + FrameGraph)'),
      ...blank(),
      { segments: [{ text: 'Press q to quit', style: { dim: true } }] },
      { segments: [{ text: 'Press ? for help', style: { dim: true } }] },
    ];

    lines.push(...cardWrap(theme, cardContent, { width: cw }));
    lines.push(...screenFooter(theme));

    return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    return this._scrollView.handleKey(binding);
  }
}
