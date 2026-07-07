/**
 * Help screen — keyboard shortcuts reference organized by category.
 */

import type { ScreenV2 } from '../screen-manager.js';
import type { RenderContext } from '../renderer/renderer.js';
import type { Line } from '../renderer/types.js';
import type { V2Store } from '../state.js';
import { ScrollView, createScrollableScreen } from '../scroll-view.js';
import { screenTitle, cardWrap, cardWidth, blank, sectionDivider, screenFooter } from './screen-lib.js';

interface ShortcutGroup {
  title: string;
  items: { keys: string; description: string }[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Navigation',
    items: [
      { keys: '↑↓', description: 'Navigate items' },
      { keys: '←→', description: 'Expand/Collapse tree' },
      { keys: 'Tab/Shift+Tab', description: 'Cycle focus' },
      { keys: 'Home/End', description: 'First/Last item' },
      { keys: 'PgUp/PgDn', description: 'Scroll page' },
    ],
  },
  {
    title: 'General',
    items: [
      { keys: 'Enter', description: 'Confirm/Select' },
      { keys: 'Escape', description: 'Cancel/Close overlay' },
      { keys: '/', description: 'Search' },
      { keys: '?', description: 'Toggle help' },
      { keys: 'q', description: 'Quit' },
    ],
  },
  {
    title: 'Commands',
    items: [
      { keys: 'Ctrl+P', description: 'Command palette' },
      { keys: '1-9', description: 'Navigate sidebar items' },
    ],
  },
  {
    title: 'Sidebar',
    items: [
      { keys: '1', description: 'Dashboard' }, { keys: '2', description: 'Scan' },
      { keys: '3', description: 'Results' }, { keys: '4', description: 'Architecture' },
      { keys: '5', description: 'Dependencies' }, { keys: '6', description: 'Insights' },
      { keys: '7', description: 'Suggestions' }, { keys: '8', description: 'History' },
      { keys: '9', description: 'Plugins' },
    ],
  },
  {
    title: 'ScrollView',
    items: [
      { keys: '↑↓', description: 'Scroll content' },
      { keys: 'PgUp/PgDn', description: 'Page scroll' },
      { keys: 'Home', description: 'Scroll to top' },
      { keys: 'End', description: 'Scroll to bottom' },
    ],
  },
  {
    title: 'TreeView',
    items: [
      { keys: '←', description: 'Collapse node' },
      { keys: '→', description: 'Expand node' },
      { keys: 'Space', description: 'Toggle expand' },
      { keys: 'Enter', description: 'Open node' },
    ],
  },
];

export class HelpScreen implements ScreenV2 {
  readonly id = 'help';
  readonly title = 'Help';
  private _store: V2Store;
  private _scrollView = new ScrollView();

  constructor(store: V2Store) {
    this._store = store;
  }

  onEnter(): void {
    this._store.updateSlice('header', { currentMode: 'help' });
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

    lines.push(...screenTitle(theme, 'search', 'Keyboard Shortcuts'));

    for (const group of SHORTCUTS) {
      lines.push(...blank());
      lines.push({ segments: [{ text: `  ${group.title}`, style: { bold: true, color: 'primary' } }] });
      lines.push(...sectionDivider(theme));

      const cardContent: Line[] = group.items.map(item => ({
        segments: [
          { text: `${item.keys.padEnd(20)}`, style: { dim: true } },
          { text: item.description },
        ],
      }));
      lines.push(...cardWrap(theme, cardContent, { width: cw }));
    }

    lines.push(...blank());
    lines.push({ segments: [{ text: '   Press ? or Escape to close', style: { dim: true } }] });
    lines.push(...screenFooter(theme));

    return createScrollableScreen(lines, ctx, this._scrollView, 0).lines;
  }

  handleShortcut(binding: string): boolean {
    return this._scrollView.handleKey(binding);
  }
}
