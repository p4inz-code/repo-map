/**
 * Layout types for the v2 UI engine.
 *
 * Defines the constraint-based layout model used by the LayoutEngine.
 * Modeled after flexbox concepts adapted for terminal rendering.
 *
 * # Layout Model
 * ```
 * FlexNode
 *   ├── direction: 'row' | 'column'
 *   ├── grow / shrink (flex-like)
 *   ├── padding / margin (spacing)
 *   ├── gap (between children)
 *   ├── align (cross-axis alignment)
 *   ├── justify (main-axis distribution)
 *   └── children: FlexNode[]
 * ```
 *
 * # Terminology
 * - **Main axis**: The direction of layout (horizontal for 'row', vertical for 'column').
 * - **Cross axis**: The perpendicular direction.
 * - **grow**: How much remaining space this node absorbs (proportional weight).
 * - **shrink**: How much this node shrinks when space is insufficient.
 */

import type { Padding, LayoutConstraints } from '../types.js';

// ─── Flex Alignment ───────────────────────────────────────────────

/** Direction for flex-style layout. */
export type FlexDirection = 'row' | 'column';

/** Alignment along the cross axis. */
export type FlexAlignment = 'start' | 'center' | 'end' | 'stretch';

/** How remaining space is distributed along the main axis. */
export type FlexJustify = 'start' | 'center' | 'end' | 'space-between' | 'space-around';

// ─── Size specification ───────────────────────────────────────────

/**
 * How a dimension is specified.
 * - `fixed(n)`: exactly n cells
 * - `auto`: content-determined
 * - `percent(n)`: n% of parent
 * - `grow`: fill remaining space (weighted)
 */
export type DimensionSpec =
  | { type: 'fixed'; value: number }
  | { type: 'auto' }
  | { type: 'percent'; value: number }
  | { type: 'grow'; weight: number };

// ─── FlexNode ─────────────────────────────────────────────────────

/**
 * A node in the layout tree.
 * Each component maps to one FlexNode.
 */
export interface FlexNode {
  /** Unique identifier. */
  id: string;

  /** Layout direction. */
  direction: FlexDirection;

  /** Width specification. */
  width: DimensionSpec;

  /** Height specification. */
  height: DimensionSpec;

  /** Flex grow factor (how much to take remaining space). */
  grow: number;

  /** Flex shrink factor (how much to shrink when constrained). */
  shrink: number;

  /** Padding inside the border. */
  padding: Padding;

  /** Margin outside the border. */
  margin: Padding;

  /** Gap between children. */
  gap: number;

  /** Cross-axis alignment for children. */
  align: FlexAlignment;

  /** Main-axis distribution for children. */
  justify: FlexJustify;

  /** Minimum width. */
  minWidth: number;

  /** Maximum width. */
  maxWidth: number;

  /** Minimum height. */
  minHeight: number;

  /** Maximum height. */
  maxHeight: number;

  /** Child nodes. */
  children: FlexNode[];
}

// ─── Resolved layout result ───────────────────────────────────────

/**
 * The result of the layout computation for a single node.
 * Stored and used for rendering.
 */
export interface ResolvedLayout {
  /** Absolute x position from terminal top-left. */
  x: number;

  /** Absolute y position from terminal top-left. */
  y: number;

  /** Resolved width. */
  width: number;

  /** Resolved height. */
  height: number;

  /** Whether this node is visible (has non-zero area). */
  visible: boolean;
}

// ─── Layout constraints factory ───────────────────────────────────

/** Create default layout constraints (unbounded). */
export function defaultConstraints(): LayoutConstraints {
  return {
    maxWidth: Infinity,
    maxHeight: Infinity,
    minWidth: 0,
    minHeight: 0,
  };
}

/** Create constrained layout to exact width/height. */
export function exactConstraints(width: number, height: number): LayoutConstraints {
  return {
    maxWidth: width,
    maxHeight: height,
    minWidth: width,
    minHeight: height,
  };
}

/** Shorthand for creating a fixed dimension. */
export function fixed(value: number): DimensionSpec {
  return { type: 'fixed', value: Math.max(0, value) };
}

/** Shorthand for auto dimension. */
export function auto(): DimensionSpec {
  return { type: 'auto' };
}

/** Shorthand for percentage dimension. */
export function percent(value: number): DimensionSpec {
  return { type: 'percent', value: Math.max(0, Math.min(100, value)) };
}

/** Shorthand for grow dimension. */
export function grow(weight: number = 1): DimensionSpec {
  return { type: 'grow', weight: Math.max(0, weight) };
}
