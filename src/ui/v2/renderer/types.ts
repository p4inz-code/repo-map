/**
 * Renderer types for the v2 rendering engine.
 *
 * These types are kept separate to break circular dependencies
 * between the Component system and the Renderer.
 */

import type { TextStyle } from '../theme/theme.js';

// ─── Line / Segment ───────────────────────────────────────────────

/**
 * A single styled segment of text.
 * Segments are the atomic unit of styled content.
 */
export interface Segment {
  text: string;
  style?: TextStyle;
}

/**
 * A single line of content, composed of one or more Segments.
 */
export interface Line {
  segments: Segment[];
}

// ─── Dirty Rectangle ──────────────────────────────────────────────

/**
 * A rectangular region that needs to be redrawn on the next frame.
 */
export interface DirtyRect {
  /** Layer this dirty rect belongs to. */
  layerId: string;
  /** Column (x) position. */
  x: number;
  /** Row (y) position. */
  y: number;
  /** Width in character cells. */
  width: number;
  /** Height in character cells. */
  height: number;
}

// ─── Layer ────────────────────────────────────────────────────────

/**
 * A render layer with z-order and optional clipping.
 *
 * Layers stack on top of each other by zIndex. Higher zIndex = rendered last (on top).
 * Layers below are preserved (not cleared) when an upper layer renders.
 */
export interface RenderLayer {
  /** Unique identifier. */
  id: string;
  /** Stacking order. Higher values render on top. */
  zIndex: number;
  /** Optional clip region. Content outside this rect is not drawn. */
  clip?: { x: number; y: number; width: number; height: number };
  /** Whether this layer is visible. */
  visible: boolean;
  /** Whether this layer needs a full redraw (ignores dirty rectangles). */
  dirty: boolean;
}

// ─── Frame Stats ──────────────────────────────────────────────────

export interface FrameStats {
  frame: number;
  layoutMs: number;
  renderMs: number;
  flushMs: number;
  totalMs: number;
  dirtyRectCount: number;
  fullRedraw: boolean;
}
