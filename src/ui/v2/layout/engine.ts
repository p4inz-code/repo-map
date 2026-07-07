/**
 * LayoutEngine v2 — constraint-based flexbox layout for the terminal.
 *
 * # Architecture
 * ```
 * LayoutEngine
 *   ├── computeLayout(root: FlexNode, constraints) → ResolvedLayout[]
 *   │    1. Resolve dimensions (fixed, auto, percent, grow)
 *   │    2. Compute main-axis positions
 *   │    3. Compute cross-axis positions
 *   │    4. Handle grow/shrink distribution
 *   │    5. Apply padding/margin/gap
 *   └── Returns flat array of ResolvedLayout for all nodes (pre-order)
 * ```
 *
 * # Algorithm
 * 1. **Dimension resolution**: Convert DimensionSpecs to concrete sizes.
 * 2. **Main-axis pass**: Distribute children along the main axis.
 * 3. **Cross-axis pass**: Align children along the cross axis.
 * 4. **Grow/Shrink**: Distribute remaining space or handle overflow.
 * 5. **Recurse**: Process children with remaining constraints.
 *
 * # Performance
 * - O(n) where n = total nodes in layout tree.
 * - No recursion beyond layout tree depth.
 * - Allocations are minimized: reuses arrays where possible.
 *
 * # Constraints
 * - Each node receives `LayoutConstraints` from its parent.
 * - `maxWidth`/`maxHeight` are inherited (cannot exceed parent).
 * - `minWidth`/`minHeight` are inherited (cannot be less than content).
 *
 * @example
 * ```ts
 * const engine = new LayoutEngine();
 * const root: FlexNode = {
 *   id: 'root',
 *   direction: 'column',
 *   width: fixed(80),
 *   height: auto(),
 *   grow: 0, shrink: 0,
 *   padding: padding(1),
 *   margin: padding(0),
 *   gap: 1,
 *   align: 'stretch',
 *   justify: 'start',
 *   minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: Infinity,
 *   children: [
 *     { id: 'header', ... },
 *     { id: 'content', grow: 1, ... },
 *   ],
 * };
 * const results = engine.computeLayout(root, exactConstraints(80, 24));
 * // results[0] = { x:0, y:0, width:80, height:24 }
 * // results[1] = { x:1, y:1, width:78, height:1 }  (header)
 * // results[2] = { x:1, y:3, width:78, height:20 }  (content, grown)
 * ```
 */

import type { Padding, LayoutConstraints } from '../types.js';
import type { FlexNode, FlexDirection, DimensionSpec, ResolvedLayout, FlexAlignment, FlexJustify } from './types.js';

// ─── Constants ─────────────────────────────────────────────────────

/** Default gap between children. */
const DEFAULT_GAP = 0;

// ─── LayoutEngine ─────────────────────────────────────────────────

export class LayoutEngine {
  /**
   * Compute the full layout for a FlexNode tree.
   *
   * @param root - The root FlexNode to layout.
   * @param constraints - Available space constraints.
   * @returns Flat array of ResolvedLayout for all nodes (pre-order traversal).
   */
  computeLayout(root: FlexNode, constraints: LayoutConstraints): ResolvedLayout[] {
    const results: ResolvedLayout[] = [];
    this._layoutNode(root, constraints, 0, 0, results, 0);
    return results;
  }

  /**
   * Compute layout for a single node (recursive).
   *
   * @param node - The node to layout.
   * @param constraints - Available space.
   * @param offsetX - Parent-relative x offset.
   * @param offsetY - Parent-relative y offset.
   * @param results - Accumulator for all layouts.
   * @param depth - Recursion depth (for cycle detection).
   */
  private _layoutNode(
    node: FlexNode,
    constraints: LayoutConstraints,
    offsetX: number,
    offsetY: number,
    results: ResolvedLayout[],
    depth: number,
  ): void {
    if (depth > 100) return; // Safety: prevent infinite recursion

    // ── 1. Resolve dimensions ─────────────────────────────────────
    const availWidth = constraints.maxWidth;
    const availHeight = constraints.maxHeight;

    // Resolve width: apply min/max clamping
    let resolvedWidth = this._resolveDimension(
      node.width,
      availWidth,
      availWidth,
    );
    resolvedWidth = Math.max(node.minWidth, Math.min(node.maxWidth || availWidth, resolvedWidth));

    // Resolve height
    let resolvedHeight = this._resolveDimension(
      node.height,
      availHeight,
      availHeight,
    );
    resolvedHeight = Math.max(node.minHeight, Math.min(node.maxHeight || availHeight, resolvedHeight));

    // ── 2. Apply margin ──────────────────────────────────────────
    const marginX = node.margin.left + node.margin.right;
    const marginY = node.margin.top + node.margin.bottom;
    const innerX = offsetX + node.margin.left;
    const innerY = offsetY + node.margin.top;
    const innerWidth = Math.max(0, resolvedWidth - marginX);
    const innerHeight = Math.max(0, resolvedHeight - marginY);

    // Record this node's layout
    const layout: ResolvedLayout = {
      x: offsetX,
      y: offsetY,
      width: resolvedWidth,
      height: resolvedHeight,
      visible: resolvedWidth > 0 && resolvedHeight > 0,
    };
    results.push(layout);

    if (!layout.visible || node.children.length === 0) return;

    // ── 3. Compute inner area (after padding) ────────────────────
    const padX = node.padding.left + node.padding.right;
    const padY = node.padding.top + node.padding.bottom;
    const contentX = innerX + node.padding.left;
    const contentY = innerY + node.padding.top;
    const contentWidth = Math.max(0, innerWidth - padX);
    const contentHeight = Math.max(0, innerHeight - padY);

    if (contentWidth <= 0 || contentHeight <= 0) return;

    const gap = node.gap ?? DEFAULT_GAP;

    // ── 4. Measure children ─────────────────────────────────────
    const childConstraints: LayoutConstraints = {
      maxWidth: contentWidth,
      maxHeight: contentHeight,
      minWidth: 0,
      minHeight: 0,
    };

    if (node.direction === 'column') {
      this._layoutColumn(
        node, childConstraints, contentX, contentY,
        contentWidth, contentHeight, gap, results, depth,
      );
    } else {
      this._layoutRow(
        node, childConstraints, contentX, contentY,
        contentWidth, contentHeight, gap, results, depth,
      );
    }
  }

  /**
   * Layout children in a column (vertical stack).
   */
  private _layoutColumn(
    node: FlexNode,
    constraints: LayoutConstraints,
    contentX: number,
    contentY: number,
    contentWidth: number,
    contentHeight: number,
    gap: number,
    results: ResolvedLayout[],
    depth: number,
  ): void {
    const children = node.children;
    if (children.length === 0) return;

    // ── Measure children's natural heights ──────────────────────
    const naturalHeights: number[] = [];
    const childConstraints: LayoutConstraints = {
      maxWidth: contentWidth - node.padding.left - node.padding.right,
      maxHeight: Infinity,
      minWidth: 0,
      minHeight: 0,
    };

    let totalNatural = 0;
    let totalGrow = 0;
    const totalGap = (children.length - 1) * gap;

    for (const child of children) {
      const w = this._resolveDimension(child.width, contentWidth, contentWidth);
      const h = this._resolveDimension(child.height, contentHeight, contentHeight);

      // Clamp to available content width
      const clampedW = Math.max(
        child.minWidth,
        Math.min(child.maxWidth || contentWidth, w, contentWidth),
      );

      // Clamp height
      const clampedH = Math.max(
        child.minHeight,
        Math.min(child.maxHeight || Infinity, h),
      );

      naturalHeights.push(clampedH);
      totalNatural += clampedH;
      totalGrow += child.grow;
    }

    // ── Distribute remaining space via grow ─────────────────────
    const remaining = contentHeight - totalNatural - totalGap;
    let extraPerUnit = 0;
    if (remaining > 0 && totalGrow > 0) {
      extraPerUnit = remaining / totalGrow;
    }

    // ── Handle shrink if overflow ───────────────────────────────
    let overflow = totalNatural + totalGap - contentHeight;
    const shrunkHeights = [...naturalHeights];
    if (overflow > 0) {
      let totalShrink = children.reduce((sum, c) => sum + c.shrink, 0);
      if (totalShrink > 0) {
        for (let i = 0; i < children.length; i++) {
          const shrinkFactor = children[i].shrink / totalShrink;
          const shrinkAmount = Math.min(shrunkHeights[i], Math.round(overflow * shrinkFactor));
          shrunkHeights[i] -= shrinkAmount;
          overflow -= shrinkAmount;
        }
      }
    }

    // ── Position children vertically ────────────────────────────
    let cursorY = contentY;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      let childHeight = shrunkHeights[i];

      // Apply grow
      if (remaining > 0 && child.grow > 0) {
        childHeight += Math.round(extraPerUnit * child.grow);
      }

      // Cross-axis alignment
      const childWidth = this._resolveDimension(
        child.width, contentWidth, contentWidth,
      );
      let childX = contentX;

      if (node.align === 'center') {
        childX = contentX + Math.floor((contentWidth - childWidth) / 2);
      } else if (node.align === 'end') {
        childX = contentX + contentWidth - childWidth;
      }

      const childConstraints: LayoutConstraints = {
        maxWidth: contentWidth,
        maxHeight: childHeight,
        minWidth: 0,
        minHeight: 0,
      };

      this._layoutNode(
        child,
        childConstraints,
        childX,
        cursorY,
        results,
        depth + 1,
      );

      cursorY += childHeight + gap;
    }
  }

  /**
   * Layout children in a row (horizontal stack).
   */
  private _layoutRow(
    node: FlexNode,
    constraints: LayoutConstraints,
    contentX: number,
    contentY: number,
    contentWidth: number,
    contentHeight: number,
    gap: number,
    results: ResolvedLayout[],
    depth: number,
  ): void {
    const children = node.children;
    if (children.length === 0) return;

    // ── Measure children's natural widths ────────────────────────
    const naturalWidths: number[] = [];
    let totalNatural = 0;
    let totalGrow = 0;
    const totalGap = (children.length - 1) * gap;

    for (const child of children) {
      const w = this._resolveDimension(child.width, contentWidth, contentWidth);
      const clampedW = Math.max(
        child.minWidth,
        Math.min(child.maxWidth || contentWidth, w, contentWidth),
      );
      naturalWidths.push(clampedW);
      totalNatural += clampedW;
      totalGrow += child.grow;
    }

    // ── Distribute remaining space via grow ─────────────────────
    const remaining = contentWidth - totalNatural - totalGap;
    let extraPerUnit = 0;
    if (remaining > 0 && totalGrow > 0) {
      extraPerUnit = remaining / totalGrow;
    }

    // ── Handle shrink if overflow ───────────────────────────────
    let overflow = totalNatural + totalGap - contentWidth;
    const shrunkWidths = [...naturalWidths];
    if (overflow > 0) {
      let totalShrink = children.reduce((sum, c) => sum + c.shrink, 0);
      if (totalShrink > 0) {
        for (let i = 0; i < children.length; i++) {
          const shrinkFactor = children[i].shrink / totalShrink;
          const shrinkAmount = Math.min(shrunkWidths[i], Math.round(overflow * shrinkFactor));
          shrunkWidths[i] -= shrinkAmount;
          overflow -= shrinkAmount;
        }
      }
    }

    // ── Position children horizontally ──────────────────────────
    let cursorX = contentX;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      let childWidth = shrunkWidths[i];

      // Apply grow
      if (remaining > 0 && child.grow > 0) {
        childWidth += Math.round(extraPerUnit * child.grow);
      }

      // Cross-axis alignment
      const childHeight = this._resolveDimension(
        child.height, contentHeight, contentHeight,
      );
      let childY = contentY;

      if (node.align === 'center') {
        childY = contentY + Math.floor((contentHeight - childHeight) / 2);
      } else if (node.align === 'end') {
        childY = contentY + contentHeight - childHeight;
      }

      const childConstraints: LayoutConstraints = {
        maxWidth: childWidth,
        maxHeight: contentHeight,
        minWidth: 0,
        minHeight: 0,
      };

      this._layoutNode(
        child,
        childConstraints,
        cursorX,
        childY,
        results,
        depth + 1,
      );

      cursorX += childWidth + gap;
    }
  }

  /**
   * Resolve a DimensionSpec to a concrete number.
   */
  private _resolveDimension(
    spec: DimensionSpec,
    available: number,
    fallback: number,
  ): number {
    switch (spec.type) {
      case 'fixed':
        return spec.value;
      case 'auto':
        return fallback;
      case 'percent':
        return Math.round((spec.value / 100) * available);
      case 'grow':
        return 0; // Grow dimensions start at 0, expanded during distribution
      default:
        return fallback;
    }
  }
}
