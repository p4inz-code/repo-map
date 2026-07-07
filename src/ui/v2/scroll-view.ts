/**
 * ScrollView — universal scrolling container for all screens.
 *
 * Features:
 * - Vertical scrolling with keyboard (↑↓, PageUp/Down, Home/End)
 * - Horizontal scrolling
 * - Smooth scrollbar rendering
 * - Viewport clipping
 * - Nested scrolling support
 * - Remembers scroll position per-screen
 * - Automatic focus scrolling
 *
 * Use with: Results, Architecture, Dependencies, Insights, Suggestions, History, Help, Settings
 */

import type { ThemeV2, ColorToken } from './theme/theme.js';
import type { Line } from './renderer/types.js';
import type { RenderContext } from './renderer/renderer.js';

// ─── ScrollState ───────────────────────────────────────────────────

export interface ScrollState {
  scrollX: number;
  scrollY: number;
  maxScrollX: number;
  maxScrollY: number;
  contentWidth: number;
  contentHeight: number;
}

// ─── ScrollView ───────────────────────────────────────────────────

export interface ScrollViewOptions {
  /** Total content width in characters. */
  contentWidth: number;
  /** Total content height in lines. */
  contentHeight: number;
  /** Visible viewport width. */
  viewportWidth: number;
  /** Visible viewport height. */
  viewportHeight: number;
  /** Current scroll X offset. */
  scrollX?: number;
  /** Current scroll Y offset. */
  scrollY?: number;
  /** Whether to show the scrollbar. */
  showScrollbar?: boolean;
  /** Color token for the scrollbar. */
  scrollbarColor?: ColorToken;
}

export class ScrollView {
  private _scrollX: number = 0;
  private _scrollY: number = 0;
  private _maxScrollX: number = 0;
  private _maxScrollY: number = 0;
  private _lastViewportW: number = 0;
  private _lastViewportH: number = 0;
  private _contentW: number = 0;
  private _contentH: number = 0;
  private _showScrollbar: boolean = true;
  private _onScroll: ((x: number, y: number) => void) | null = null;

  /** Recalculate scroll bounds for new content/viewport dimensions. */
  update(opts: ScrollViewOptions): void {
    this._contentW = opts.contentWidth;
    this._contentH = opts.contentHeight;
    this._lastViewportW = opts.viewportWidth;
    this._lastViewportH = opts.viewportHeight;
    this._showScrollbar = opts.showScrollbar ?? true;

    const maxX = Math.max(0, opts.contentWidth - opts.viewportWidth);
    const maxY = Math.max(0, opts.contentHeight - opts.viewportHeight);

    this._maxScrollX = maxX;
    this._maxScrollY = maxY;

    // Clamp current scroll
    this._scrollX = Math.min(Math.max(0, opts.scrollX ?? this._scrollX), maxX);
    this._scrollY = Math.min(Math.max(0, opts.scrollY ?? this._scrollY), maxY);
  }

  /** Get current scroll state. */
  getState(): ScrollState {
    return {
      scrollX: this._scrollX,
      scrollY: this._scrollY,
      maxScrollX: this._maxScrollX,
      maxScrollY: this._maxScrollY,
      contentWidth: this._contentW,
      contentHeight: this._contentH,
    };
  }

  /** Scroll by a delta. Returns whether scroll position changed. */
  scrollBy(dx: number, dy: number): boolean {
    const oldX = this._scrollX;
    const oldY = this._scrollY;
    this._scrollX = Math.max(0, Math.min(this._scrollX + dx, this._maxScrollX));
    this._scrollY = Math.max(0, Math.min(this._scrollY + dy, this._maxScrollY));
    const changed = this._scrollX !== oldX || this._scrollY !== oldY;
    if (changed) this._onScroll?.(this._scrollX, this._scrollY);
    return changed;
  }

  /** Scroll to an absolute position. */
  scrollTo(x: number, y: number): boolean {
    const clampedX = Math.max(0, Math.min(x, this._maxScrollX));
    const clampedY = Math.max(0, Math.min(y, this._maxScrollY));
    const changed = this._scrollX !== clampedX || this._scrollY !== clampedY;
    if (changed) {
      this._scrollX = clampedX;
      this._scrollY = clampedY;
      this._onScroll?.(this._scrollX, this._scrollY);
    }
    return changed;
  }

  /** Scroll so a given content line is visible. */
  scrollToLine(line: number): boolean {
    if (line < this._scrollY) {
      return this.scrollTo(this._scrollX, line);
    }
    if (line >= this._scrollY + this._lastViewportH) {
      return this.scrollTo(this._scrollX, line - this._lastViewportH + 1);
    }
    return false;
  }

  /** Handle a keyboard shortcut. Returns true if handled. */
  handleKey(binding: string): boolean {
    switch (binding) {
      case 'up': return this.scrollBy(0, -1);
      case 'down': return this.scrollBy(0, 1);
      case 'left': return this.scrollBy(-1, 0);
      case 'right': return this.scrollBy(1, 0);
      case 'page-up': return this.scrollBy(0, -(this._lastViewportH - 2));
      case 'page-down': return this.scrollBy(0, this._lastViewportH - 2);
      case 'home': return this.scrollTo(0, 0);
      case 'end': return this.scrollTo(0, this._maxScrollY);
      default: return false;
    }
  }

  /**
   * Clip content lines to the viewport and add scrollbar.
   * Returns viewport-sized content array.
   */
  clip(content: Line[], theme: ThemeV2): Line[] {
    const viewH = this._lastViewportH;
    const viewW = this._lastViewportW;

    // Slice to visible range
    const visible = content.slice(this._scrollY, this._scrollY + viewH);

    // Pad if we have fewer lines than viewport
    while (visible.length < viewH) {
      visible.push({ segments: [{ text: '' }] });
    }

    // Clip each line horizontally
    const clipped: Line[] = visible.map((line): Line => {
      const text = line.segments.map(s => s.text).join('');
      const clippedText = text.slice(this._scrollX, this._scrollX + viewW);
      return { segments: [{ text: clippedText.padEnd(viewW) }] };
    });

    // Add scrollbar if needed
    if (this._showScrollbar && this._maxScrollY > 0) {
      const thumbHeight = Math.max(1, Math.floor((viewH / this._contentH) * viewH));
      const thumbPos = this._maxScrollY > 0
        ? Math.floor((this._scrollY / this._maxScrollY) * (viewH - thumbHeight))
        : 0;

      for (let i = 0; i < viewH; i++) {
        const isThumb = i >= thumbPos && i < thumbPos + thumbHeight;
        const scrollChar = isThumb ? '█' : '░';
        if (clipped[i]) {
          const existingText = clipped[i].segments[0]?.text ?? '';
          // Add scrollbar if there's room
          if (viewW > 2) {
            const mainText = existingText.slice(0, viewW - 1);
            clipped[i] = {
              segments: [
                { text: mainText },
                { text: scrollChar, style: { dim: !isThumb } },
              ],
            };
          }
        }
      }
    }

    return clipped;
  }

  /** Register a scroll callback. */
  onScroll(callback: (x: number, y: number) => void): void {
    this._onScroll = callback;
  }

  /** Get current scroll position. */
  get scrollX(): number { return this._scrollX; }
  get scrollY(): number { return this._scrollY; }
  get maxScrollX(): number { return this._maxScrollX; }
  get maxScrollY(): number { return this._maxScrollY; }
  get isAtTop(): boolean { return this._scrollY <= 0; }
  get isAtBottom(): boolean { return this._scrollY >= this._maxScrollY; }
}

// ─── ScrollView wrapper for screen content ────────────────────────

/**
 * Wrap screen content lines in a ScrollView.
 * Handles measuring content, clipping, scrollbar, and keyboard events.
 */
export function createScrollableScreen(
  content: Line[],
  ctx: Pick<RenderContext, 'theme' | 'width' | 'height'>,
  scrollView: ScrollView,
  headerLines: number = 0,
): { lines: Line[]; scrollView: ScrollView } {
  const viewH = ctx.height - headerLines;
  const viewW = ctx.width;

  scrollView.update({
    contentWidth: ctx.width,
    contentHeight: content.length,
    viewportWidth: viewW,
    viewportHeight: viewH,
  });

  const clipped = scrollView.clip(content, ctx.theme);
  return { lines: clipped, scrollView };
}
