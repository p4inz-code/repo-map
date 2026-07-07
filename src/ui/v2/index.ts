/**
 * repo-map UI Engine v2 — master barrel export.
 *
 * The v2 engine is a parallel UI infrastructure that coexists with v1.
 * It provides enhanced rendering, layout, focus, resize, animation,
 * and component lifecycle for future premium UI features.
 *
 * # Migration Strategy
 * - v1 (old) and v2 (new) engines coexist.
 * - `useV2Engine()` activates the v2 engine.
 * - `isV2Engine()` returns whether v2 is active.
 * - Old screens continue working on v1.
 * - New screens are built on v2.
 * - When all screens are migrated, v1 is removed.
 *
 * # Architecture
 * ```
 * v2/index.ts
 *   ├── renderer/   LayerRenderer (dirty rects, double buffering, layers)
 *   ├── layout/     LayoutEngine (flexbox-style constraint layout)
 *   ├── component/  Component base class (full lifecycle)
 *   ├── focus/      FocusManager (focus stack, tab order, arrow nav)
 *   ├── resize/     ResizeManager (terminal resize, min/max constraints)
 *   ├── theme/      ThemeV2 (spacing scale, glyph packs, enhanced colors)
 *   └── animation/  AnimationScheduler (frame-based, easing, queue)
 * ```
 *
 * # Usage
 * ```ts
 * import { isV2Engine, useV2Engine } from './ui/v2/index.js';
 * import { LayerRenderer } from './ui/v2/renderer/renderer.js';
 * import { LayoutEngine } from './ui/v2/layout/engine.js';
 * import { FocusManager } from './ui/v2/focus/manager.js';
 * ```
 */

// ─── Engine Selector ──────────────────────────────────────────────

/** Whether the v2 engine is active. */
let _v2Active = false;

/**
 * Activate the v2 engine.
 * Call this at application startup.
 */
export function useV2Engine(): void {
  _v2Active = true;
}

/**
 * Check whether the v2 engine is currently active.
 */
export function isV2Engine(): boolean {
  return _v2Active;
}

/**
 * Get the engine version string.
 */
export function engineVersion(): string {
  return _v2Active ? '2.0.0' : '1.0.0';
}

// ─── Re-exports ───────────────────────────────────────────────────

// Renderer
export { LayerRenderer } from './renderer/renderer.js';
export type { RenderContext, LayerRendererOptions } from './renderer/renderer.js';
export type { Line, Segment, DirtyRect, RenderLayer } from './renderer/types.js';

// Layout
export { LayoutEngine } from './layout/engine.js';
export type { FlexNode, FlexDirection, FlexAlignment, FlexJustify, DimensionSpec, ResolvedLayout } from './layout/types.js';
export { fixed, auto, percent, grow, defaultConstraints, exactConstraints } from './layout/types.js';

// Component
export { Component } from './component/component.js';

// Focus
export { FocusManager } from './focus/manager.js';
export type { FocusManagerOptions } from './focus/manager.js';

// Resize
export { ResizeManager } from './resize/manager.js';
export type { ResizeCallback, ResizeManagerOptions, TerminalSize } from './resize/manager.js';

// Theme
export { getThemeV2 } from './theme/index.js';
export type { ThemeV2, ColorToken, TextStyle, GlyphSet } from './theme/theme.js';

// Animation
export { AnimationScheduler } from './animation/scheduler.js';
export type { AnimationDef, QueuedAnimation, TransitionDef, AnimationState, AnimationValueType, SchedulerStats } from './animation/types.js';

// Core Types
export type {
  Size, Rect, Padding,
  FlexDirection as CoreFlexDirection,
  FlexAlignment as CoreFlexAlignment,
  LayoutConstraints,
  LayoutBox,
  DirtyRect as CoreDirtyRect,
  LayerDef,
  FocusDirection,
  EasingFn,
  FrameStats,
} from './types.js';
export { padding, Easings } from './types.js';
