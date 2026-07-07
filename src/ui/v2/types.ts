/**
 * Core types for the repo-map v2 UI engine.
 *
 * Every subsystem in the v2 architecture depends on these primitive
 * types. They are intentionally small and composable.
 *
 * # Coordinate System
 * - (0,0) is top-left of the terminal.
 * - x increases right, y increases down.
 * - All measurements are in character cells (monospace).
 *
 * # Spacing
 * Spacing values follow a 4-cell grid: {0, 1, 2, 4, 8, 12, 16, 24}
 * (matching the theme's spacing scale).
 */

// ─── Geometry ─────────────────────────────────────────────────────

/** Width and height in character cells. */
export interface Size {
  width: number;
  height: number;
}

/** A rectangular region in terminal coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Padding or margin on all four sides. */
export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Convenience: create uniform padding. */
export function padding(all: number): Padding;
export function padding(vertical: number, horizontal: number): Padding;
export function padding(top: number, right: number, bottom: number, left: number): Padding;
export function padding(a: number, b?: number, c?: number, d?: number): Padding {
  if (b === undefined) return { top: a, right: a, bottom: a, left: a };
  if (c === undefined) return { top: a, right: b!, bottom: a, left: b! };
  return { top: a, right: b!, bottom: c!, left: d! };
}

// ─── Layout ───────────────────────────────────────────────────────

/** Direction for flex-style layout. */
export type FlexDirection = 'row' | 'column';

/** Alignment along the cross axis. */
export type FlexAlignment = 'start' | 'center' | 'end' | 'stretch';

/** How remaining space is distributed along the main axis. */
export type FlexJustify = 'start' | 'center' | 'end' | 'space-between' | 'space-around';

/** Layout constraints passed from parent to child during measure/layout phase. */
export interface LayoutConstraints {
  /** Maximum width available. */
  maxWidth: number;
  /** Maximum height available. */
  maxHeight: number;
  /** Minimum width. */
  minWidth: number;
  /** Minimum height. */
  minHeight: number;
}

/**
 * Resolved position and size of a single layout node after the layout pass.
 * Stored on each component after layout() is called.
 */
export interface LayoutBox {
  /** Absolute x position from terminal top-left. */
  x: number;
  /** Absolute y position from terminal top-left. */
  y: number;
  /** Allocated width. */
  width: number;
  /** Allocated height. */
  height: number;
}

// ─── Layers ───────────────────────────────────────────────────────

/** A render layer with z-ordering and optional clipping. */
export interface LayerDef {
  /** Unique layer identifier. */
  id: string;
  /** Stacking order (higher = on top). */
  zIndex: number;
  /** Optional clip region in terminal coordinates. */
  clip?: Rect;
}

// ─── Rendering ────────────────────────────────────────────────────

/**
 * A dirty rectangle that needs to be redrawn.
 * Tracks both the region and the layer it belongs to.
 */
export interface DirtyRect {
  /** Layer this dirty rect belongs to. */
  layerId: string;
  /** Region that needs redrawing. */
  rect: Rect;
}

// ─── Component identification ─────────────────────────────────────

/** Globally unique component identifier. */
export type ComponentId = string;

// ─── Focus ────────────────────────────────────────────────────────

/** Direction for focus navigation. */
export type FocusDirection = 'up' | 'down' | 'left' | 'right' | 'next' | 'prev';

// ─── Animation ────────────────────────────────────────────────────

/** Easing function for animations. */
export type EasingFn = (t: number) => number;

/** Pre-defined easing functions. */
export const Easings: Record<string, EasingFn> = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInBack: (t: number) => {
    const c1 = 1.70158; const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutBack: (t: number) => {
    const c1 = 1.70158; const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInElastic: (t: number) => {
    if (t === 0) return 0; if (t === 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  easeOutElastic: (t: number) => {
    if (t === 0) return 0; if (t === 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

// ─── Performance tracking ─────────────────────────────────────────

/** Frame timing statistics. */
export interface FrameStats {
  /** Frame number (monotonic counter). */
  frame: number;
  /** Time to compute layout in ms. */
  layoutMs: number;
  /** Time to render dirty rects in ms. */
  renderMs: number;
  /** Time to write to terminal in ms. */
  flushMs: number;
  /** Total frame time in ms. */
  totalMs: number;
  /** Number of dirty rects this frame. */
  dirtyRectCount: number;
  /** Whether a full redraw was triggered. */
  fullRedraw: boolean;
}
